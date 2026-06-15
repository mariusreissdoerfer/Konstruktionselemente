import { describe, expect, it } from 'vitest'
import {
  berechneBolzen,
  biegemoment,
  bolzenflaeche,
  legeBolzenAus,
  widerstandsmoment,
  type BolzenInput,
} from './bolzen'
import { MATERIAL_BY_ID } from '../materials'

const S235 = MATERIAL_BY_ID.get('S235JR')!
const CuSn8 = MATERIAL_BY_ID.get('CuSn8')!

const base: BolzenInput = {
  F: 20000,
  d: 20,
  tS: 20,
  tG: 12,
  spalt: 0,
  einbaufall: 1,
  lastfall: 'schwellend',
  material: S235,
}

describe('Querschnittswerte', () => {
  it('A = π·d²/4', () => {
    expect(bolzenflaeche(20)).toBeCloseTo(314.159, 2)
  })
  it('W = π·d³/32', () => {
    expect(widerstandsmoment(20)).toBeCloseTo(785.398, 2)
  })
})

describe('Biegemoment je Einbaufall (ohne Spalt)', () => {
  const F = 20000
  const tS = 20
  const tG = 12
  it('Fall 1: F/8·(t_S + 2·t_G)', () => {
    expect(biegemoment(F, tS, tG, 0, 1)).toBeCloseTo(110000, 6)
  })
  it('Fall 2: F/8·t_S', () => {
    expect(biegemoment(F, tS, tG, 0, 2)).toBeCloseTo(50000, 6)
  })
  it('Fall 3: F/4·t_G', () => {
    expect(biegemoment(F, tS, tG, 0, 3)).toBeCloseTo(60000, 6)
  })
  it('Fall 1 liefert das größte Moment', () => {
    const m1 = biegemoment(F, tS, tG, 0, 1)
    expect(m1).toBeGreaterThanOrEqual(biegemoment(F, tS, tG, 0, 2))
    expect(m1).toBeGreaterThanOrEqual(biegemoment(F, tS, tG, 0, 3))
  })
})

describe('Biegemoment mit Spalt a', () => {
  const F = 20000
  const tS = 20
  const tG = 12
  const a = 5
  it('Fall 1: + F·a/2', () => {
    // 110000 + 20000·5/2 = 110000 + 50000 = 160000
    expect(biegemoment(F, tS, tG, a, 1)).toBeCloseTo(160000, 6)
  })
  it('Fall 2: F/8·(t_S + 2·a)', () => {
    // 20000/8 · (20 + 10) = 2500 · 30 = 75000
    expect(biegemoment(F, tS, tG, a, 2)).toBeCloseTo(75000, 6)
  })
  it('Fall 3: F/4·(t_G + 2·a)', () => {
    // 5000 · (12 + 10) = 110000
    expect(biegemoment(F, tS, tG, a, 3)).toBeCloseTo(110000, 6)
  })
  it('Spalt vergrößert das Biegemoment', () => {
    expect(biegemoment(F, tS, tG, a, 1)).toBeGreaterThan(
      biegemoment(F, tS, tG, 0, 1),
    )
  })
})

describe('berechneBolzen – Standardnachweise', () => {
  it('Flächenpressung Stange p_S = F/(d·t_S)', () => {
    const r = berechneBolzen(base)
    const ps = r.nachweise.find((n) => n.name === 'Flächenpressung Stange')!
    expect(ps.vorhanden).toBeCloseTo(50, 2)
  })

  it('Flächenpressung Gabel p_G = F/(2·d·t_G)', () => {
    const r = berechneBolzen(base)
    const pg = r.nachweise.find((n) => n.name === 'Flächenpressung Gabel')!
    expect(pg.vorhanden).toBeCloseTo(41.67, 1)
  })

  it('Abscherung τ = F/(2·A)', () => {
    const r = berechneBolzen(base)
    const tau = r.nachweise.find((n) => n.name.startsWith('Abscherung'))!
    expect(tau.vorhanden).toBeCloseTo(31.83, 1)
  })

  it('Biegung σ_b = M_b/W', () => {
    const r = berechneBolzen(base)
    const b = r.nachweise.find((n) => n.name === 'Biegung')!
    expect(b.vorhanden).toBeCloseTo(140.06, 1)
  })

  it('zulässige Werte schwellend: 0,25/0,20/0,15 · R_m', () => {
    const r = berechneBolzen(base)
    const ps = r.nachweise.find((n) => n.name === 'Flächenpressung Stange')!
    const b = r.nachweise.find((n) => n.name === 'Biegung')!
    const tau = r.nachweise.find((n) => n.name.startsWith('Abscherung'))!
    expect(ps.zulaessig).toBeCloseTo(0.25 * S235.Rm, 2)
    expect(b.zulaessig).toBeCloseTo(0.2 * S235.Rm, 2)
    expect(tau.zulaessig).toBeCloseTo(0.15 * S235.Rm, 2)
  })

  it('Biegung maßgebend → nicht bestanden', () => {
    const r = berechneBolzen(base)
    expect(r.bestanden).toBe(false)
    const b = r.nachweise.find((n) => n.name === 'Biegung')!
    expect(b.erfuellt).toBe(false)
  })
})

describe('berechneBolzen – Buchse', () => {
  it('liefert innen/außen Nachweise mit getrennten Werkstoffen', () => {
    const r = berechneBolzen({
      ...base,
      buchse: { da: 30, material: CuSn8 },
    })
    const innen = r.nachweise.find((n) => n.name.includes('Stange innen'))!
    const aussen = r.nachweise.find((n) => n.name.includes('Stange außen'))!
    // innen: F/(d·tS) = 50 ; zul = 0,25·Rm(CuSn8)
    expect(innen.vorhanden).toBeCloseTo(50, 2)
    expect(innen.zulaessig).toBeCloseTo(0.25 * CuSn8.Rm, 2)
    // außen: F/(da·tS) = 20000/(30·20) = 33,33 ; zul = 0,25·Rm(S235)
    expect(aussen.vorhanden).toBeCloseTo(33.33, 1)
    expect(aussen.zulaessig).toBeCloseTo(0.25 * S235.Rm, 2)
    // keine einfache "Flächenpressung Stange" mehr
    expect(r.nachweise.find((n) => n.name === 'Flächenpressung Stange')).toBeUndefined()
  })
})

describe('berechneBolzen – Kugelgelenk', () => {
  it('ersetzt die Stangenpressung durch Lagerpressung', () => {
    const r = berechneBolzen({
      ...base,
      kugelgelenk: { B: 16, pzul: 150 },
    })
    const lager = r.nachweise.find((n) => n.name.startsWith('Kugelgelenk'))!
    // F/(d·B) = 20000/(20·16) = 62,5
    expect(lager.vorhanden).toBeCloseTo(62.5, 2)
    expect(lager.zulaessig).toBeCloseTo(150, 2)
    expect(r.nachweise.find((n) => n.name === 'Flächenpressung Stange')).toBeUndefined()
  })
})

describe('legeBolzenAus – Auslegung', () => {
  it('liefert genormten Durchmesser, der den Nachweis besteht', () => {
    const r = legeBolzenAus({
      F: 20000,
      tS: 20,
      tG: 12,
      spalt: 0,
      einbaufall: 1,
      lastfall: 'schwellend',
      material: S235,
    })
    expect(r.dGewaehlt).toBeGreaterThanOrEqual(r.dErf)
    expect(r.kontrolle.bestanden).toBe(true)
  })

  it('Spalt erhöht den erforderlichen Durchmesser', () => {
    const ohne = legeBolzenAus({
      F: 20000, tS: 20, tG: 12, spalt: 0,
      einbaufall: 1, lastfall: 'schwellend', material: S235,
    })
    const mit = legeBolzenAus({
      F: 20000, tS: 20, tG: 12, spalt: 10,
      einbaufall: 1, lastfall: 'schwellend', material: S235,
    })
    expect(mit.dErf).toBeGreaterThan(ohne.dErf)
  })
})
