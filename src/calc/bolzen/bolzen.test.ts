import { describe, expect, it } from 'vitest'
import {
  ZUL_FAKTOREN,
  berechneBolzen,
  berechnePassbolzenFeld,
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

describe('Ausreißen am Kopf (Scherausriss, Randabstand c)', () => {
  it('Ausreißen Stange τ = F/(2·(c_S − d/2)·t_S)', () => {
    const r = berechneBolzen(base)
    const a = r.nachweise.find((n) => n.name === 'Ausreißen Stange')!
    // 20000 / (2·(25−10)·20) = 20000/600 = 33,33
    expect(a.vorhanden).toBeCloseTo(33.33, 1)
    expect(a.zulaessig).toBeCloseTo(0.15 * S235.Rm, 2)
  })
  it('Ausreißen Gabel τ = F/(4·(c_G − d/2)·t_G)', () => {
    const r = berechneBolzen(base)
    const a = r.nachweise.find((n) => n.name === 'Ausreißen Gabel')!
    expect(a.vorhanden).toBeCloseTo(27.78, 1)
  })
  it('zu kleiner Randabstand → Ausreißen nicht erfüllt', () => {
    const r = berechneBolzen({ ...base, cS: 11 })
    const a = r.nachweise.find((n) => n.name === 'Ausreißen Stange')!
    expect(a.erfuellt).toBe(false)
  })
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
    // innen: F/(d·L_B) = 20000/(20·16) = 62,5 ; zul = 0,25·Rm des weicheren
    // Kontaktpartners (Bolzen S235: 360 < CuSn8: 390)
    expect(innen.vorhanden).toBeCloseTo(62.5, 2)
    expect(innen.zulaessig).toBeCloseTo(0.25 * Math.min(S235.Rm, CuSn8.Rm), 2)
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

describe('Aufdopplung – Passbolzenfeld', () => {
  const auf = { tM: 10, tL: 5, dP: 10 }

  it('Laschenanteil F_L = F·2t_L/(t_M+2t_L)', () => {
    const feld = berechnePassbolzenFeld(20000, 40, auf, ZUL_FAKTOREN.schwellend, S235)
    // 2·5/(10+10) = 0,5 → F_L = 10 kN
    expect(feld.FL).toBeCloseTo(10000, 6)
  })

  it('Paketdicke ersetzt t_S in den Auge-Nachweisen', () => {
    const r = berechneBolzen({ ...base, aufdopplung: auf })
    const p = r.nachweise.find((n) => n.name === 'Lochleibung Stange')!
    // t_S = 10+2·5 = 20 → identisch zur base ohne Aufdopplung
    expect(p.vorhanden).toBeCloseTo(20000 / (20 * 20), 2)
    expect(r.passfeld).toBeDefined()
  })

  it('Anordnung: Summe der Reihen ≥ nErf, Teilung 3·d_P', () => {
    const feld = berechnePassbolzenFeld(20000, 40, auf, ZUL_FAKTOREN.schwellend, S235)
    expect(feld.n).toBeGreaterThanOrEqual(feld.nErf)
    expect(feld.reihen.reduce((a, b) => a + b, 0)).toBe(feld.n)
    expect(feld.nReihen).toBe(feld.reihen.length)
    expect(feld.teilung).toBe(30)
    expect(feld.feldLaenge).toBeCloseTo((feld.nReihen - 1) * 30 + 40, 6)
  })

  it('Staffelung: Reihen wachsen zum Auge hin (letzte Reihe = Rest)', () => {
    // breites Blech, dünnes Mittelblech → 1. Reihe eng begrenzt, danach mehr
    const feld = berechnePassbolzenFeld(150000, 120, { tM: 8, tL: 6, dP: 12 }, ZUL_FAKTOREN.schwellend, S235)
    // bis zur vorletzten Reihe monoton nicht abnehmend (letzte trägt den Rest)
    for (let i = 1; i < feld.reihen.length - 1; i++) {
      expect(feld.reihen[i]).toBeGreaterThanOrEqual(feld.reihen[i - 1])
    }
    // gestaffelt ist kürzer als einspaltig (n Reihen à 1)
    expect(feld.nReihen).toBeLessThan(feld.nErf)
    expect(feld.n).toBeGreaterThanOrEqual(feld.nErf)
  })

  it('zu dünnes Mittelblech → Nettozug an der 1. Reihe versagt', () => {
    const feld = berechnePassbolzenFeld(200000, 60, { tM: 4, tL: 10, dP: 12 }, ZUL_FAKTOREN.schwellend, S235)
    const zugM = feld.nachweise.find((n) => n.name.startsWith('Zug Mittelblech'))!
    expect(zugM.erfuellt).toBe(false)
  })

  it('Auslegung mit Aufdopplung: Kontrolle besteht, t_M+2t_L ≥ Paket', () => {
    const r = legeBolzenAus({
      F: 100000, spalt: 0, einbaufall: 1, lastfall: 'schwellend',
      material: S235, aufdopplung: { tM: 0, tL: 0, dP: 12 },
    })
    expect(r.aufdopplung).toBeTruthy()
    const a = r.aufdopplung!
    if (a.feld) {
      expect(a.tM + 2 * a.tL).toBeGreaterThanOrEqual(r.tS)
      expect(a.feld.nachweise.every((n) => n.erfuellt)).toBe(true)
    } else {
      expect(a.tM).toBe(r.tS)
    }
    expect(r.kontrolle.bestanden).toBe(true)
  })

  it('Auslegung ohne Aufdopplungs-Wunsch liefert kein Feld', () => {
    const r = legeBolzenAus({ F: 50000, spalt: 0, einbaufall: 1, lastfall: 'schwellend', material: S235 })
    expect(r.aufdopplung ?? null).toBeNull()
  })
})

describe('Aufdopplung – Blechdicken-Nachweise', () => {
  const auf = { tM: 10, tL: 5, dP: 10 }

  it('Zug Mittelblech (freie Länge): σ = F/(b_S·t_M)', () => {
    const r = berechneBolzen({ ...base, aufdopplung: auf })
    const n = r.nachweise.find((x) => x.name === 'Zug Mittelblech (freie Länge)')!
    // 20000/(40·10) = 50 N/mm²
    expect(n.vorhanden).toBeCloseTo(50, 2)
    expect(n.zulaessig).toBeCloseTo(0.33 * S235.Rm, 2)
  })

  it('zu dünnes Mittelblech versagt auf der freien Länge', () => {
    const r = berechneBolzen({ ...base, F: 200000, aufdopplung: { tM: 3, tL: 10, dP: 10 } })
    const n = r.nachweise.find((x) => x.name === 'Zug Mittelblech (freie Länge)')!
    expect(n.erfuellt).toBe(false)
  })

  it('mindestMasse liefert t_M- und t_L-Mindestwerte', () => {
    const m = mindestMasse({ ...base, aufdopplung: auf })
    // Vollquerschnitt: 20000/(40·118,8) = 4,21 mm; Netto 1. Reihe kann mehr fordern
    expect(m.tMmin).toBeGreaterThanOrEqual(4.2)
    // Paket aus Lochleibung: t_S,min = 20000/(20·90) = 11,11 → t_L ≥ (11,11−10)/2
    expect(m.tLmin).toBeCloseTo((20000 / (20 * 0.25 * S235.Rm) - 10) / 2, 1)
  })

  it('ohne Aufdopplung keine t_M/t_L-Mindestwerte', () => {
    const m = mindestMasse(base)
    expect(m.tMmin).toBeUndefined()
    expect(m.tLmin).toBeUndefined()
  })
})

describe('Auslegung – Mittelblech ans Limit', () => {
  it('t_M exakt aus S = 1 (Ausnutzung ~100 %), Kontrolle besteht', () => {
    const r = legeBolzenAus({
      F: 100000, spalt: 0, einbaufall: 1, lastfall: 'schwellend',
      material: S235, aufdopplung: { tM: 0, tL: 0, dP: 16 },
    })
    const a = r.aufdopplung!
    expect(a.feld).toBeTruthy()
    expect(r.kontrolle.bestanden).toBe(true)
    // Mittelblech exakt am Limit: höchste Ausnutzung seiner Nachweise ≈ 100 %
    const mNamen = [
      'Zug Mittelblech (freie Länge)',
      'Zug Mittelblech (maßgebende Passbolzenreihe)',
      'Passbolzen – Lochleibung Mittelblech',
    ]
    const eta = Math.max(
      ...r.kontrolle.nachweise.filter((n) => mNamen.includes(n.name)).map((n) => n.vorhanden / n.zulaessig),
    )
    expect(eta).toBeGreaterThanOrEqual(0.97)
    expect(eta).toBeLessThanOrEqual(1.0)
  })

  it('t_M höchstens +40 % über dem Vollquerschnitts-Limit (kurze-Lasche-Deckel)', () => {
    const r = legeBolzenAus({
      F: 100000, spalt: 0, einbaufall: 1, lastfall: 'schwellend',
      material: S235, aufdopplung: { tM: 0, tL: 0, dP: 16 },
    })
    const sigZ = 0.33 * S235.Rm
    const tMLimit = 100000 / (r.bS * sigZ)
    expect(r.aufdopplung!.tM).toBeLessThanOrEqual(1.4 * Math.max(tMLimit, 2) + 3)
  })
})

describe('Getrennte Werkstoffe Bolzen/Blech', () => {
  const S355 = MATERIAL_BY_ID.get('S355JR')!
  const CrMo = MATERIAL_BY_ID.get('42CrMo4')!
  const both = { ...base, material: S355, bolzenMaterial: CrMo }

  it('Abscherung und Biegung nutzen den Bolzenwerkstoff', () => {
    const r = berechneBolzen(both)
    expect(r.nachweise.find((n) => n.name.startsWith('Abscherung'))!.zulaessig).toBeCloseTo(0.15 * CrMo.Rm, 2)
    expect(r.nachweise.find((n) => n.name === 'Biegung')!.zulaessig).toBeCloseTo(0.2 * CrMo.Rm, 2)
  })

  it('Zug und Ausreißen nutzen den Blechwerkstoff', () => {
    const r = berechneBolzen(both)
    expect(r.nachweise.find((n) => n.name === 'Zug Stange')!.zulaessig).toBeCloseTo(0.33 * S355.Rm, 2)
    expect(r.nachweise.find((n) => n.name === 'Ausreißen Stange')!.zulaessig).toBeCloseTo(0.15 * S355.Rm, 2)
  })

  it('Lochleibung nutzt den weicheren Kontaktpartner (Blech)', () => {
    const r = berechneBolzen(both)
    expect(r.nachweise.find((n) => n.name === 'Lochleibung Stange')!.zulaessig).toBeCloseTo(0.25 * S355.Rm, 2)
  })

  it('ohne bolzenMaterial identisch zu vorher (Default = material)', () => {
    const a = berechneBolzen(base)
    const b = berechneBolzen({ ...base, bolzenMaterial: S235 })
    expect(a.nachweise.map((n) => n.vorhanden)).toEqual(b.nachweise.map((n) => n.vorhanden))
    expect(a.nachweise.map((n) => n.zulaessig)).toEqual(b.nachweise.map((n) => n.zulaessig))
  })

  it('Auslegung: härterer Bolzen → kleinerer erforderlicher Durchmesser', () => {
    const weich = legeBolzenAus({ F: 100000, spalt: 0, einbaufall: 1, lastfall: 'schwellend', material: S355 })
    const hart = legeBolzenAus({ F: 100000, spalt: 0, einbaufall: 1, lastfall: 'schwellend', material: S355, bolzenMaterial: CrMo })
    expect(hart.dErf).toBeLessThan(weich.dErf)
    expect(hart.kontrolle.bestanden).toBe(true)
  })
})

describe('Plausibilität – Eigenschaften der Auslegung', () => {
  const S355 = MATERIAL_BY_ID.get('S355JR')!
  const CrMo = MATERIAL_BY_ID.get('42CrMo4')!

  it('Fuzz 100: Auslegung besteht ihre Kontrolle (inkl. Buchse/Aufdopplung)', () => {
    let seed = 7777
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    const mats = [S355, S235, CrMo]
    for (let i = 0; i < 100; i++) {
      const F = 3000 + rnd() * 9e6
      const einbaufall = ([1, 2, 3] as const)[Math.floor(rnd() * 3)]
      const lastfall = (['ruhend', 'schwellend', 'wechselnd'] as const)[Math.floor(rnd() * 3)]
      const material = mats[Math.floor(rnd() * 3)]
      const bolzenMaterial = mats[Math.floor(rnd() * 3)]
      const aufd = rnd() < 0.5 ? { tM: 0, tL: 0, dP: 6 + Math.floor(rnd() * 90) } : null
      const methode = rnd() < 0.5 ? ('schaeffler' as const) : ('rm' as const)
      const fb = 1 + rnd() * 3
      let buchse = null
      if (rnd() < 0.4) {
        const probe = legeBolzenAus({ F, spalt: 0, einbaufall, lastfall, material, bolzenMaterial, methode, fb, aufdopplung: aufd })
        buchse = {
          daStange: Math.round(probe.d * (1.2 + rnd() * 0.3)),
          daGabel: Math.round(probe.d * (1.1 + rnd() * 0.3)),
          laengeStange: probe.tS, laengeGabel: probe.tG,
          material: CuSn8, ort: 'beide' as const,
        }
      }
      const r = legeBolzenAus({ F, spalt: Math.floor(rnd() * 60), einbaufall, lastfall, material, bolzenMaterial, methode, fb, buchse, aufdopplung: aufd })
      expect(r.kontrolle.bestanden, `Fall ${i}: F=${Math.round(F)} EF=${einbaufall} ${lastfall} ${material.id}/${bolzenMaterial.id}`).toBe(true)
    }
  })

  it('größere Kraft → größerer erforderlicher Durchmesser', () => {
    const d1 = legeBolzenAus({ F: 50000, spalt: 0, einbaufall: 1, lastfall: 'schwellend', material: S355 }).dErf
    const d2 = legeBolzenAus({ F: 200000, spalt: 0, einbaufall: 1, lastfall: 'schwellend', material: S355 }).dErf
    expect(d2).toBeGreaterThan(d1)
  })

  it('Aufdopplung mit Paket = t_S liefert identische Auge-Nachweise', () => {
    const ohne = berechneBolzen({ ...base, tS: 20 })
    const mit = berechneBolzen({ ...base, aufdopplung: { tM: 10, tL: 5, dP: 8 } })
    for (const name of ['Lochleibung Stange', 'Zug Stange', 'Ausreißen Stange', 'Biegung', 'Abscherung (zweischnittig)']) {
      expect(mit.nachweise.find((n) => n.name === name)!.vorhanden).toBeCloseTo(
        ohne.nachweise.find((n) => n.name === name)!.vorhanden, 6)
    }
  })
})

describe('Gelenklager (Herstellernachweis, Schaeffler GE360-DW)', () => {
  const S355_100 = MATERIAL_BY_ID.get('S355J2_100')!
  const CrMo = MATERIAL_BY_ID.get('42CrMo4')!
  const Ring = MATERIAL_BY_ID.get('LagerStahl')!
  const input: BolzenInput = {
    F: 6125000, d: 360, tS: 165, tG: 118, bS: 1010, bG: 1130, cS: 705, cG: 515,
    spalt: 40, einbaufall: 2, lastfall: 'schwellend',
    material: S355_100, bolzenMaterial: CrMo,
    buchse: {
      daStange: 480, daGabel: 392, laengeStange: 160, laengeGabel: 118,
      material: Ring, ort: 'stange',
      gelenk: { C0r: 23800000, fb: 2.75 },
    },
  }

  it('statische Tragzahl: F·f_b ≤ C_0r (in kN), ersetzt Innen-Pressung', () => {
    const r = berechneBolzen(input)
    const g = r.nachweise.find((n) => n.name === 'Gelenklager Stange – statische Tragzahl')!
    // 6.125 kN · 2,75 = 16.843,75 kN ≤ 23.800 kN → S = 1,41 (Schaeffler: C0min=16.843.750 N)
    expect(g.vorhanden).toBeCloseTo(16843.75, 1)
    expect(g.zulaessig).toBeCloseTo(23800, 1)
    expect(g.erfuellt).toBe(true)
    expect(g.einheit).toBe('kN')
    expect(r.nachweise.find((n) => n.name.includes('Stange innen'))).toBeUndefined()
    // außen (Sitz im Auge) bleibt als Pressung
    expect(r.nachweise.find((n) => n.name.includes('Stange außen'))).toBeDefined()
  })

  it('Nettozug am Auge entspricht der Schaeffler-Kopfrechnung (70 N/mm²)', () => {
    const r = berechneBolzen(input)
    const z = r.nachweise.find((n) => n.name === 'Zug Stange')!
    // F/((d2−D)·C1) = 6.125.000/((1010−480)·165) = 70,0 — identisch zu Schaeffler A_x-x
    expect(z.vorhanden).toBeCloseTo(70.03, 1)
  })

  it('ohne gelenk unverändert (Pressung innen erscheint)', () => {
    const r = berechneBolzen({ ...input, buchse: { ...input.buchse!, gelenk: null } })
    expect(r.nachweise.find((n) => n.name.includes('Stange innen'))).toBeDefined()
    expect(r.nachweise.find((n) => n.name.includes('Gelenklager'))).toBeUndefined()
  })
})

describe('Kopfnachweis nach Herstellermethode (Gelenklager aktiv)', () => {
  const S355_100 = MATERIAL_BY_ID.get('S355J2_100')!
  const CrMo = MATERIAL_BY_ID.get('42CrMo4')!
  const Ring = MATERIAL_BY_ID.get('LagerStahl')!
  const input: BolzenInput = {
    F: 6125000, d: 360, tS: 165, tG: 118, bS: 1010, bG: 1130, cS: 705, cG: 515,
    spalt: 40, einbaufall: 2, lastfall: 'schwellend',
    material: S355_100, bolzenMaterial: CrMo,
    buchse: {
      daStange: 480, daGabel: 392, laengeStange: 160, laengeGabel: 118,
      material: Ring, ort: 'stange', gelenk: { C0r: 23800000, fb: 2.75 },
    },
  }

  it('Zug Stange: zulässig = R_p0,2/(1,5·f_b) — deckungsgleich zu Schaeffler', () => {
    const r = berechneBolzen(input)
    const z = r.nachweise.find((n) => n.name === 'Zug Stange')!
    // 295/(1,5·2,75) = 71,52 ; vorhanden 70,03 → S = 1,02 (Schaeffler: 1,021)
    expect(z.zulaessig).toBeCloseTo(295 / (1.5 * 2.75), 1)
    expect(z.vorhanden).toBeCloseTo(70.03, 1)
    expect(z.erfuellt).toBe(true)
    expect(z.sicherheit).toBeCloseTo(1.02, 2)
  })

  it('Gabel bleibt bei R/M (0,33·R_m)', () => {
    const r = berechneBolzen(input)
    expect(r.nachweise.find((n) => n.name === 'Zug Gabel')!.zulaessig).toBeCloseTo(0.33 * S355_100.Rm, 1)
  })

  it('ohne Gelenklager weiterhin 0,33·R_m an der Stange', () => {
    const r = berechneBolzen({ ...input, buchse: { ...input.buchse!, gelenk: null } })
    expect(r.nachweise.find((n) => n.name === 'Zug Stange')!.zulaessig).toBeCloseTo(0.33 * S355_100.Rm, 1)
  })

  it('Auslegung: Herstellergrenze vergrößert die Stangenbreite; Kontrolle besteht', () => {
    const mit = legeBolzenAus({
      F: 6125000, spalt: 40, einbaufall: 2, lastfall: 'schwellend',
      material: S355_100, bolzenMaterial: CrMo,
      buchse: { daStange: 480, daGabel: 392, laengeStange: 165, laengeGabel: 118, material: Ring, ort: 'stange', gelenk: { C0r: 23800000, fb: 2.75 } },
    })
    const ohne = legeBolzenAus({
      F: 6125000, spalt: 40, einbaufall: 2, lastfall: 'schwellend',
      material: S355_100, bolzenMaterial: CrMo,
      buchse: { daStange: 480, daGabel: 392, laengeStange: 165, laengeGabel: 118, material: Ring, ort: 'stange', gelenk: null },
    })
    expect(mit.bS).toBeGreaterThan(ohne.bS)
    expect(mit.kontrolle.bestanden).toBe(true)
  })
})

describe('Feldgeometrie – breite Reihen bevorzugt', () => {
  it('Quer-Teilung 2,4·d_P erlaubt breitere Reihen als 3·d_P (kurzes Feld)', () => {
    // dickes Mittelblech → Nettozug bindet nicht; Geometrie limitiert:
    // b_S=1010, d_P=40 → quer passen (1010−120)/96+1 = 10 (statt 8 bei 3·d_P)
    const feld = berechnePassbolzenFeld(9e6, 1010, { tM: 200, tL: 100, dP: 40 }, ZUL_FAKTOREN.schwellend, MATERIAL_BY_ID.get('S355JR')!, MATERIAL_BY_ID.get('42CrMo4')!)
    expect(feld.teilungQuer).toBeCloseTo(96, 6)
    // breiteste Reihe nutzt die engere Quer-Teilung (> 8 = altes Maximum)
    expect(Math.max(...feld.reihen)).toBeGreaterThanOrEqual(9)
    expect(feld.nReihen).toBeLessThanOrEqual(2)
    expect(feld.nachweise.every((n) => n.erfuellt)).toBe(true)
  })
})

describe('Methode Schaeffler (global)', () => {
  const S355_100 = MATERIAL_BY_ID.get('S355J2_100')!
  const CrMo = MATERIAL_BY_ID.get('42CrMo4')!
  const sch: BolzenInput = {
    F: 6125000, d: 360, tS: 165, tG: 118, bS: 1010, bG: 1130, cS: 705, cG: 515,
    spalt: 40, einbaufall: 2, lastfall: 'schwellend',
    material: S355_100, bolzenMaterial: CrMo, methode: 'schaeffler', fb: 2.75,
  }

  it('beide Augen (Stange + Gabel) mit R_p0,2/(1,5·f_b)', () => {
    const r = berechneBolzen(sch)
    const grenze = 295 / (1.5 * 2.75)
    expect(r.nachweise.find((n) => n.name === 'Zug Stange')!.zulaessig).toBeCloseTo(grenze, 1)
    expect(r.nachweise.find((n) => n.name === 'Zug Gabel')!.zulaessig).toBeCloseTo(grenze, 1)
  })

  it('Passbolzenreihen-Nettozug ebenfalls mit Kerbgrenze; freie Länge bleibt R/M', () => {
    const r = berechneBolzen({ ...sch, tS: 236, aufdopplung: { tM: 118, tL: 59, dP: 80 } })
    const grenze = 295 / (1.5 * 2.75)
    expect(r.nachweise.find((n) => n.name === 'Zug Mittelblech (maßgebende Passbolzenreihe)')!.zulaessig).toBeCloseTo(grenze, 1)
    expect(r.nachweise.find((n) => n.name === 'Zug Laschen (maßgebende Passbolzenreihe)')!.zulaessig).toBeCloseTo(grenze, 1)
    expect(r.nachweise.find((n) => n.name === 'Zug Mittelblech (freie Länge)')!.zulaessig).toBeCloseTo(0.33 * S355_100.Rm, 1)
  })

  it('Lochleibung/Abscherung/Biegung/Ausreißen unverändert R/M', () => {
    const r = berechneBolzen(sch)
    expect(r.nachweise.find((n) => n.name === 'Lochleibung Stange')!.zulaessig).toBeCloseTo(0.25 * S355_100.Rm, 1)
    expect(r.nachweise.find((n) => n.name.startsWith('Abscherung'))!.zulaessig).toBeCloseTo(0.15 * CrMo.Rm, 1)
    expect(r.nachweise.find((n) => n.name === 'Ausreißen Stange')!.zulaessig).toBeCloseTo(0.15 * S355_100.Rm, 1)
  })

  it('Auslegung nach Schaeffler: deutlich breitere Augen, Kontrolle besteht', () => {
    const schA = legeBolzenAus({ F: 6125000, spalt: 40, einbaufall: 2, lastfall: 'schwellend', material: S355_100, bolzenMaterial: CrMo, methode: 'schaeffler', fb: 2.75 })
    const rmA = legeBolzenAus({ F: 6125000, spalt: 40, einbaufall: 2, lastfall: 'schwellend', material: S355_100, bolzenMaterial: CrMo })
    expect(schA.bS).toBeGreaterThan(rmA.bS)
    expect(schA.bG).toBeGreaterThan(rmA.bG)
    expect(schA.kontrolle.bestanden).toBe(true)
  })

  it('ohne methode-Angabe bleibt alles beim R/M-Verhalten', () => {
    const r = berechneBolzen({ ...sch, methode: undefined, fb: undefined })
    expect(r.nachweise.find((n) => n.name === 'Zug Stange')!.zulaessig).toBeCloseTo(0.33 * S355_100.Rm, 1)
  })
})
