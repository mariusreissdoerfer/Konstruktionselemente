import { describe, expect, it } from 'vitest'
import {
  berechneBolzen,
  biegemoment,
  bolzenflaeche,
  legeBolzenAus,
  mindestMasse,
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
  bS: 40,
  bG: 40,
  cS: 25,
  cG: 25,
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
    const ps = r.nachweise.find((n) => n.name === 'Lochleibung Stange')!
    expect(ps.vorhanden).toBeCloseTo(50, 2)
  })

  it('Flächenpressung Gabel p_G = F/(2·d·t_G)', () => {
    const r = berechneBolzen(base)
    const pg = r.nachweise.find((n) => n.name === 'Lochleibung Gabel')!
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
    const ps = r.nachweise.find((n) => n.name === 'Lochleibung Stange')!
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

describe('Zug im Nettoquerschnitt', () => {
  it('Zug Stange σ_z = F/((b_S − d)·t_S)', () => {
    const r = berechneBolzen(base)
    const z = r.nachweise.find((n) => n.name === 'Zug Stange')!
    // 20000 / ((40−20)·20) = 50
    expect(z.vorhanden).toBeCloseTo(50, 2)
    expect(z.zulaessig).toBeCloseTo(0.33 * S235.Rm, 2)
  })
  it('Zug Gabel σ_z = F/(2·(b_G − d)·t_G)', () => {
    const r = berechneBolzen(base)
    const z = r.nachweise.find((n) => n.name === 'Zug Gabel')!
    // 20000 / (2·(40−20)·12) = 41,67
    expect(z.vorhanden).toBeCloseTo(41.67, 1)
  })
  it('zu schmale Stange → Zug nicht erfüllt', () => {
    const r = berechneBolzen({ ...base, bS: 20 })
    const z = r.nachweise.find((n) => n.name === 'Zug Stange')!
    expect(z.erfuellt).toBe(false)
  })
})

describe('Ausreißen am Kopf (Randabstand c)', () => {
  it('Scherausriss Stange τ = F/(2·(c_S − d/2)·t_S)', () => {
    const r = berechneBolzen(base)
    const a = r.nachweise.find((n) => n.name === 'Stange – Scherausriss')!
    // 20000 / (2·(25−10)·20) = 20000/600 = 33,33
    expect(a.vorhanden).toBeCloseTo(33.33, 1)
    expect(a.zulaessig).toBeCloseTo(0.15 * S235.Rm, 2)
  })
  it('Scherausriss Gabel τ = F/(4·(c_G − d/2)·t_G)', () => {
    const r = berechneBolzen(base)
    const a = r.nachweise.find((n) => n.name === 'Gabel – Scherausriss')!
    expect(a.vorhanden).toBeCloseTo(27.78, 1)
  })
  it('Kopfzug nutzt σ_z,zul (größerer zulässiger Wert)', () => {
    const r = berechneBolzen({ ...base, ausreissModell: 'kopfzug' })
    const a = r.nachweise.find((n) => n.name === 'Stange – Kopfzug')!
    expect(a.vorhanden).toBeCloseTo(33.33, 1)
    expect(a.zulaessig).toBeCloseTo(0.33 * S235.Rm, 2)
  })
  it('Eurocode liefert mm-Nachweis (a_erf ≤ c−d/2)', () => {
    const r = berechneBolzen({ ...base, ausreissModell: 'eurocode' })
    const a = r.nachweise.find((n) => n.name.includes('Stange') && n.name.includes('EC'))!
    expect(a.einheit).toBe('mm')
    // a_erf = 20000/(2·20·235) + 2·20/3 = 2,13 + 13,33 = 15,46 ; a = 25−10 = 15
    expect(a.vorhanden).toBeCloseTo(15.46, 1)
    expect(a.zulaessig).toBeCloseTo(15, 1)
  })
  it('zu kleiner Randabstand → Scherausriss nicht erfüllt', () => {
    const r = berechneBolzen({ ...base, cS: 11 })
    const a = r.nachweise.find((n) => n.name === 'Stange – Scherausriss')!
    expect(a.erfuellt).toBe(false)
  })
})

describe('Auslegung deckt das gewählte Ausreißmodell', () => {
  for (const m of ['schub', 'kopfzug', 'eurocode'] as const) {
    it(`alle Nachweise erfüllt – Modell ${m}`, () => {
      const r = legeBolzenAus({
        F: 60000, spalt: 0, einbaufall: 1, lastfall: 'schwellend',
        material: S235, ausreissModell: m,
      })
      expect(r.kontrolle.bestanden).toBe(true)
    })
  }
})

describe('mindestMasse – Blechdicke & Breite', () => {
  it('liefert positive Mindestmaße', () => {
    const m = mindestMasse(base)
    expect(m.tSmin).toBeGreaterThan(0)
    expect(m.tGmin).toBeGreaterThan(0)
    expect(m.bSmin).toBeGreaterThan(base.d)
    expect(m.bGmin).toBeGreaterThan(base.d)
  })
  it('tSmin = F/(d·p_zul)', () => {
    const m = mindestMasse(base)
    // 20000 / (20 · 0,25·360) = 20000/1800 = 11,11
    expect(m.tSmin).toBeCloseTo(11.11, 1)
  })
})

describe('berechneBolzen – Buchse (getrennt Stange/Gabel, mit Länge)', () => {
  it('innen über Buchsenlänge, außen über d_a und min(L_B, t)', () => {
    const r = berechneBolzen({
      ...base,
      buchse: {
        daStange: 30, daGabel: 28,
        laengeStange: 16, laengeGabel: 12,
        material: CuSn8, ort: 'beide',
      },
    })
    const innen = r.nachweise.find((n) => n.name.includes('Stange innen'))!
    const aussen = r.nachweise.find((n) => n.name.includes('Stange außen'))!
    // innen: F/(d·L_B) = 20000/(20·16) = 62,5 ; zul = 0,25·Rm(CuSn8)
    expect(innen.vorhanden).toBeCloseTo(62.5, 2)
    expect(innen.zulaessig).toBeCloseTo(0.25 * CuSn8.Rm, 2)
    // außen: F/(daS·min(16,20)) = 20000/(30·16) = 41,67 ; zul = 0,25·Rm(S235)
    expect(aussen.vorhanden).toBeCloseTo(41.67, 1)
    expect(aussen.zulaessig).toBeCloseTo(0.25 * S235.Rm, 2)
    expect(r.nachweise.find((n) => n.name === 'Lochleibung Stange')).toBeUndefined()
  })

  it('Zug nutzt den jeweiligen Buchsen-Außendurchmesser', () => {
    const r = berechneBolzen({
      ...base,
      buchse: { daStange: 30, daGabel: 28, laengeStange: 20, laengeGabel: 12, material: CuSn8, ort: 'beide' },
    })
    const zugS = r.nachweise.find((n) => n.name === 'Zug Stange')!
    // F/((bS−daS)·tS) = 20000/((40−30)·20) = 100
    expect(zugS.vorhanden).toBeCloseTo(100, 1)
  })
})

describe('legeBolzenAus – vollständige Auslegung', () => {
  it('alle Nachweise erfüllt (genormter d, aufgerundete t/b)', () => {
    const r = legeBolzenAus({
      F: 20000, spalt: 0, einbaufall: 1, lastfall: 'schwellend', material: S235,
    })
    expect(r.d).toBeGreaterThanOrEqual(r.dErf)
    expect(r.tS).toBeGreaterThan(0)
    expect(r.bS).toBeGreaterThan(r.d)
    expect(r.bG).toBeGreaterThan(r.d)
    expect(r.kontrolle.bestanden).toBe(true)
  })

  it('erfüllt alle Nachweise auch bei großer Kraft', () => {
    const r = legeBolzenAus({
      F: 120000, spalt: 8, einbaufall: 1, lastfall: 'wechselnd', material: S235,
    })
    expect(r.kontrolle.bestanden).toBe(true)
  })

  it('erfüllt alle Nachweise bei 10 MN', () => {
    const r = legeBolzenAus({
      F: 10_000_000, spalt: 0, einbaufall: 1, lastfall: 'schwellend', material: S235,
    })
    expect(r.kontrolle.bestanden).toBe(true)
    expect(r.d).toBeLessThanOrEqual(800)
  })

  it('erfüllt alle Nachweise mit Buchse', () => {
    const r = legeBolzenAus({
      F: 40000, spalt: 0, einbaufall: 1, lastfall: 'schwellend', material: S235,
      buchse: { daStange: 30, daGabel: 30, laengeStange: 20, laengeGabel: 12, material: CuSn8, ort: 'beide' },
    })
    expect(r.kontrolle.bestanden).toBe(true)
  })

  it('Spalt erhöht den erforderlichen Durchmesser', () => {
    const ohne = legeBolzenAus({
      F: 20000, spalt: 0, einbaufall: 1, lastfall: 'schwellend', material: S235,
    })
    const mit = legeBolzenAus({
      F: 20000, spalt: 10, einbaufall: 1, lastfall: 'schwellend', material: S235,
    })
    expect(mit.dErf).toBeGreaterThan(ohne.dErf)
  })
})
