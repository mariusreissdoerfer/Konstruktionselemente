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

describe('Querschnittswerte', () => {
  it('A = π·d²/4', () => {
    expect(bolzenflaeche(20)).toBeCloseTo(314.159, 2)
  })
  it('W = π·d³/32', () => {
    expect(widerstandsmoment(20)).toBeCloseTo(785.398, 2)
  })
})

describe('Biegemoment je Einbaufall', () => {
  const F = 20000
  const tS = 20
  const tG = 12
  it('Fall 1: F/8·(t_S + 2·t_G)', () => {
    expect(biegemoment(F, tS, tG, 1)).toBeCloseTo((F / 8) * (tS + 2 * tG), 6)
    expect(biegemoment(F, tS, tG, 1)).toBeCloseTo(110000, 6)
  })
  it('Fall 2: F/8·t_S', () => {
    expect(biegemoment(F, tS, tG, 2)).toBeCloseTo(50000, 6)
  })
  it('Fall 3: F/4·t_G', () => {
    expect(biegemoment(F, tS, tG, 3)).toBeCloseTo(60000, 6)
  })
  it('Fall 1 liefert das größte Moment', () => {
    const m1 = biegemoment(F, tS, tG, 1)
    expect(m1).toBeGreaterThanOrEqual(biegemoment(F, tS, tG, 2))
    expect(m1).toBeGreaterThanOrEqual(biegemoment(F, tS, tG, 3))
  })
})

describe('berechneBolzen – Nachweise', () => {
  const input: BolzenInput = {
    F: 20000,
    d: 20,
    tS: 20,
    tG: 12,
    einbaufall: 1,
    lastfall: 'schwellend',
    material: S235,
  }

  it('Flächenpressung Stange p_S = F/(d·t_S)', () => {
    const r = berechneBolzen(input)
    const ps = r.nachweise.find((n) => n.name === 'Flächenpressung Stange')!
    expect(ps.vorhanden).toBeCloseTo(50, 2) // 20000/(20·20)
  })

  it('Flächenpressung Gabel p_G = F/(2·d·t_G)', () => {
    const r = berechneBolzen(input)
    const pg = r.nachweise.find((n) => n.name === 'Flächenpressung Gabel')!
    expect(pg.vorhanden).toBeCloseTo(41.67, 1) // 20000/(2·20·12)
  })

  it('Abscherung τ = F/(2·A)', () => {
    const r = berechneBolzen(input)
    const tau = r.nachweise.find((n) => n.name.startsWith('Abscherung'))!
    expect(tau.vorhanden).toBeCloseTo(31.83, 1) // 20000/(2·314.16)
  })

  it('Biegung σ_b = M_b/W', () => {
    const r = berechneBolzen(input)
    const b = r.nachweise.find((n) => n.name === 'Biegung')!
    // M_b = 110000 ; W = 785.398 ; σ = 140.06
    expect(b.vorhanden).toBeCloseTo(140.06, 1)
  })

  it('zulässige Werte schwellend: 0,25/0,20/0,15 · R_m', () => {
    const r = berechneBolzen(input)
    const ps = r.nachweise.find((n) => n.name === 'Flächenpressung Stange')!
    const b = r.nachweise.find((n) => n.name === 'Biegung')!
    const tau = r.nachweise.find((n) => n.name.startsWith('Abscherung'))!
    expect(ps.zulaessig).toBeCloseTo(0.25 * S235.Rm, 2) // 90
    expect(b.zulaessig).toBeCloseTo(0.2 * S235.Rm, 2) // 72
    expect(tau.zulaessig).toBeCloseTo(0.15 * S235.Rm, 2) // 54
  })

  it('Sicherheit = zulässig/vorhanden und Gesamtbewertung', () => {
    const r = berechneBolzen(input)
    // Biegung ist hier maßgebend (140 > 72 zulässig) → nicht bestanden
    expect(r.bestanden).toBe(false)
    const b = r.nachweise.find((n) => n.name === 'Biegung')!
    expect(b.erfuellt).toBe(false)
    expect(b.sicherheit).toBeCloseTo(72 / 140.06, 2)
  })
})

describe('legeBolzenAus – Auslegung', () => {
  it('liefert genormten Durchmesser, der den Nachweis besteht', () => {
    const r = legeBolzenAus({
      F: 20000,
      tS: 20,
      tG: 12,
      einbaufall: 1,
      lastfall: 'schwellend',
      material: S235,
    })
    expect(r.dGewaehlt).toBeGreaterThanOrEqual(r.dErf)
    expect(r.kontrolle.bestanden).toBe(true)
    expect(['Biegung', 'Abscherung']).toContain(r.massgebend)
  })

  it('größere Kraft → größerer erforderlicher Durchmesser', () => {
    const klein = legeBolzenAus({
      F: 5000,
      tS: 20,
      tG: 12,
      einbaufall: 1,
      lastfall: 'schwellend',
      material: S235,
    })
    const gross = legeBolzenAus({
      F: 50000,
      tS: 20,
      tG: 12,
      einbaufall: 1,
      lastfall: 'schwellend',
      material: S235,
    })
    expect(gross.dErf).toBeGreaterThan(klein.dErf)
  })
})
