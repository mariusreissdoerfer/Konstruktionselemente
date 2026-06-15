// Berechnung einer Bolzenverbindung (Stange in Gabel, durch Bolzen verbunden)
// nach Roloff/Matek Maschinenelemente.
//
// Geometrie (Längsachse des Bolzens), mit optionalem Spalt a je Seite:
//
//   │ Gabel │ a │      Stange      │ a │ Gabel │
//   │  t_G  │   │       t_S        │   │  t_G  │
//   ─────────────●══════════════════●─────────────   ← Bolzen, Durchmesser d
//                       ▲ F  (Zugkraft der Stange)
//
// Optionen: Buchsen in den Bohrungen (Außendurchmesser d_a, eigener
// Werkstoff) und ein Kugelgelenk/Gelenklager in der Stange.
//
// Nachgewiesen werden: Flächenpressung (Lochleibung) in Stange und Gabel
// (bzw. innen/außen bei Buchse, bzw. Lagerpressung bei Kugelgelenk),
// Abscherung des Bolzens (zweischnittig) und Biegung des Bolzens.

import { fmt } from '../format'
import type { Einbaufall, Lastfall, Material, Nachweis } from '../types'

/** Zulässige Spannungen als Anteil von R_m, abhängig vom Lastfall.
 *  Referenz (verifiziert): schwellende Belastung, mittlere Stöße →
 *  p_zul = 0,25·R_m, σ_b,zul = 0,20·R_m, τ_a,zul = 0,15·R_m (Roloff/Matek).
 *  Die Werte für ruhend/wechselnd sind übliche Richtwerte und im UI editierbar. */
export interface ZulFaktoren {
  /** Faktor für zulässige Lochleibung/Flächenpressung: p_zul = cP · R_m */
  cP: number
  /** Faktor für zulässige Biegespannung: σ_b,zul = cSigma · R_m */
  cSigma: number
  /** Faktor für zulässige Schubspannung: τ_a,zul = cTau · R_m */
  cTau: number
  /** Faktor für zulässige Zugspannung (Nettoquerschnitt): σ_z,zul = cZug · R_m */
  cZug: number
}

export const ZUL_FAKTOREN: Record<Lastfall, ZulFaktoren> = {
  ruhend: { cP: 0.35, cSigma: 0.3, cTau: 0.2, cZug: 0.45 },
  schwellend: { cP: 0.25, cSigma: 0.2, cTau: 0.15, cZug: 0.33 },
  wechselnd: { cP: 0.15, cSigma: 0.15, cTau: 0.1, cZug: 0.22 },
}

export const LASTFALL_LABEL: Record<Lastfall, string> = {
  ruhend: 'ruhend (statisch)',
  schwellend: 'schwellend',
  wechselnd: 'wechselnd',
}

export const EINBAUFALL_INFO: Record<
  Einbaufall,
  { titel: string; modell: string }
> = {
  1: {
    titel: 'Bolzen lose in Gabel und Stange',
    modell: 'frei aufliegender Träger',
  },
  2: {
    titel: 'Bolzen fest in Gabel, lose in Stange',
    modell: 'beidseitig eingespannter Träger',
  },
  3: {
    titel: 'Bolzen fest in Stange, lose in Gabel',
    modell: 'Kragträger ab Stangenfläche',
  },
}

/** Wo die Buchse(n) sitzen. */
export type BuchseOrt = 'beide' | 'stange' | 'gabel'

/** Optionale Buchse in den Bohrungen. */
export interface BuchseConfig {
  /** Außendurchmesser der Buchse in mm */
  da: number
  /** Buchsenwerkstoff */
  material: Material
  /** Einbauort der Buchse(n); Standard: beide */
  ort?: BuchseOrt
}

/** Optionales Kugelgelenk / Gelenklager in der Stange. */
export interface KugelgelenkConfig {
  /** Lagerbreite B in mm (tragende Breite des Innenrings) */
  B: number
  /** zulässige spezifische Lagerbelastung in N/mm² (herstellerabhängig) */
  pzul: number
}

export interface BolzenInput {
  /** Belastung (Stangenkraft) F in N */
  F: number
  /** Bolzendurchmesser d in mm */
  d: number
  /** Stangendicke t_S in mm */
  tS: number
  /** Gabeldicke je Lasche t_G in mm */
  tG: number
  /** Stangenbreite (Augenbreite) b_S in mm */
  bS: number
  /** Gabelbreite je Lasche b_G in mm */
  bG: number
  /** Spalt a zwischen Stange und je Gabellasche in mm */
  spalt: number
  einbaufall: Einbaufall
  lastfall: Lastfall
  material: Material
  /** optionale Buchse */
  buchse?: BuchseConfig | null
  /** optionales Kugelgelenk in der Stange */
  kugelgelenk?: KugelgelenkConfig | null
  /** optionale Überschreibung der zulässigen-Faktoren (sonst aus Lastfall) */
  faktoren?: ZulFaktoren
}

export interface BolzenErgebnis {
  /** maßgebendes Biegemoment in N·mm */
  Mb: number
  /** Widerstandsmoment des Bolzenquerschnitts in mm³ */
  Wb: number
  /** Querschnittsfläche des Bolzens in mm² */
  A: number
  /** verwendete zulässige Faktoren */
  faktoren: ZulFaktoren
  /** Einzelnachweise */
  nachweise: Nachweis[]
  /** kleinste Sicherheit über alle Nachweise */
  minSicherheit: number
  /** true, wenn alle Nachweise erfüllt sind */
  bestanden: boolean
}

/** Kreisquerschnittsfläche des Bolzens, A = π·d²/4 [mm²]. */
export function bolzenflaeche(d: number): number {
  return (Math.PI * d * d) / 4
}

/** Axiales Widerstandsmoment des Kreisquerschnitts, W = π·d³/32 [mm³]. */
export function widerstandsmoment(d: number): number {
  return (Math.PI * d * d * d) / 32
}

/**
 * Maßgebendes Biegemoment des Bolzens in N·mm, abhängig vom Einbaufall und
 * dem Spalt a zwischen Stange und Gabel:
 *   Fall 1: M_b = F/8 · (t_S + 2·t_G + 4·a)
 *   Fall 2: M_b = F/8 · (t_S + 2·a)
 *   Fall 3: M_b = F/4 · (t_G + 2·a)
 */
export function biegemoment(
  F: number,
  tS: number,
  tG: number,
  spalt: number,
  einbaufall: Einbaufall,
): number {
  switch (einbaufall) {
    case 1:
      return (F / 8) * (tS + 2 * tG + 4 * spalt)
    case 2:
      return (F / 8) * (tS + 2 * spalt)
    case 3:
      return (F / 4) * (tG + 2 * spalt)
  }
}

/** Symbolische Biegemoment-Formel als Text (für die Anzeige). */
export function biegemomentFormel(einbaufall: Einbaufall): string {
  switch (einbaufall) {
    case 1:
      return 'M_b = F/8 · (t_S + 2·t_G + 4·a)'
    case 2:
      return 'M_b = F/8 · (t_S + 2·a)'
    case 3:
      return 'M_b = F/4 · (t_G + 2·a)'
  }
}

const round = (x: number, n = 2): number => {
  const f = 10 ** n
  return Math.round(x * f) / f
}

function nachweis(
  name: string,
  formel: string,
  einsetzen: string,
  vorhanden: number,
  zulaessig: number,
): Nachweis {
  const sicherheit = vorhanden > 0 ? zulaessig / vorhanden : Infinity
  return {
    name,
    formel,
    einsetzen,
    vorhanden: round(vorhanden),
    zulaessig: round(zulaessig),
    sicherheit: round(sicherheit),
    erfuellt: vorhanden <= zulaessig,
  }
}

/** Vollständige Berechnung (Nachweis) der Bolzenverbindung. */
export function berechneBolzen(input: BolzenInput): BolzenErgebnis {
  const { F, d, tS, tG, bS, bG, spalt, einbaufall, lastfall, material } = input
  const buchse = input.buchse ?? null
  const kugelgelenk = input.kugelgelenk ?? null
  const faktoren = input.faktoren ?? ZUL_FAKTOREN[lastfall]
  const { cP, cSigma, cTau, cZug } = faktoren

  const A = bolzenflaeche(d)
  const Wb = widerstandsmoment(d)
  const Mb = biegemoment(F, tS, tG, spalt, einbaufall)

  const pZulMat = (m: Material) => cP * m.Rm
  const nachweise: Nachweis[] = []

  const ort = buchse?.ort ?? 'beide'
  const buchseStange = buchse && (ort === 'beide' || ort === 'stange')
  const buchseGabel = buchse && (ort === 'beide' || ort === 'gabel')

  // ---- Flächenpressung Stange (bzw. Kugelgelenk) ----
  if (kugelgelenk) {
    const p = F / (d * kugelgelenk.B)
    nachweise.push(
      nachweis(
        'Kugelgelenk – Lagerpressung',
        'p = F / (d · B)',
        `${fmt(F)} / (${fmt(d)} · ${fmt(kugelgelenk.B)})`,
        p,
        kugelgelenk.pzul,
      ),
    )
  } else if (buchseStange && buchse) {
    nachweise.push(
      nachweis(
        'Pressung Stange innen (Bolzen–Buchse)',
        'p = F / (d · t_S)',
        `${fmt(F)} / (${fmt(d)} · ${fmt(tS)})`,
        F / (d * tS),
        pZulMat(buchse.material),
      ),
    )
    nachweise.push(
      nachweis(
        'Pressung Stange außen (Buchse–Stange)',
        'p = F / (d_a · t_S)',
        `${fmt(F)} / (${fmt(buchse.da)} · ${fmt(tS)})`,
        F / (buchse.da * tS),
        pZulMat(material),
      ),
    )
  } else {
    nachweise.push(
      nachweis(
        'Lochleibung Stange',
        'p_S = F / (d · t_S)',
        `${fmt(F)} / (${fmt(d)} · ${fmt(tS)})`,
        F / (d * tS),
        pZulMat(material),
      ),
    )
  }

  // ---- Flächenpressung Gabel ----
  if (buchseGabel && buchse) {
    nachweise.push(
      nachweis(
        'Pressung Gabel innen (Bolzen–Buchse)',
        'p = F / (2 · d · t_G)',
        `${fmt(F)} / (2 · ${fmt(d)} · ${fmt(tG)})`,
        F / (2 * d * tG),
        pZulMat(buchse.material),
      ),
    )
    nachweise.push(
      nachweis(
        'Pressung Gabel außen (Buchse–Gabel)',
        'p = F / (2 · d_a · t_G)',
        `${fmt(F)} / (2 · ${fmt(buchse.da)} · ${fmt(tG)})`,
        F / (2 * buchse.da * tG),
        pZulMat(material),
      ),
    )
  } else {
    nachweise.push(
      nachweis(
        'Lochleibung Gabel',
        'p_G = F / (2 · d · t_G)',
        `${fmt(F)} / (2 · ${fmt(d)} · ${fmt(tG)})`,
        F / (2 * d * tG),
        pZulMat(material),
      ),
    )
  }

  // ---- Zug im Nettoquerschnitt (am Loch) ----
  // wirksamer Lochdurchmesser: bei Buchse der Außendurchmesser
  const dLochS = buchseStange && buchse ? buchse.da : d
  const dLochG = buchseGabel && buchse ? buchse.da : d
  const netS = Math.max(bS - dLochS, 0)
  const netG = Math.max(bG - dLochG, 0)
  const sigmaZZul = cZug * material.Rm

  nachweise.push(
    nachweis(
      'Zug Stange',
      'σ_z = F / ((b_S − d) · t_S)',
      `${fmt(F)} / ((${fmt(bS)} − ${fmt(dLochS)}) · ${fmt(tS)})`,
      netS > 0 ? F / (netS * tS) : Infinity,
      sigmaZZul,
    ),
  )
  nachweise.push(
    nachweis(
      'Zug Gabel',
      'σ_z = F / (2 · (b_G − d) · t_G)',
      `${fmt(F)} / (2 · (${fmt(bG)} − ${fmt(dLochG)}) · ${fmt(tG)})`,
      netG > 0 ? F / (2 * netG * tG) : Infinity,
      sigmaZZul,
    ),
  )

  // ---- Abscherung (zweischnittig) ----
  nachweise.push(
    nachweis(
      'Abscherung (zweischnittig)',
      'τ_a = F / (2 · A) ,  A = π·d²/4',
      `${fmt(F)} / (2 · ${fmt(A)})`,
      F / (2 * A),
      cTau * material.Rm,
    ),
  )

  // ---- Biegung ----
  nachweise.push(
    nachweis(
      'Biegung',
      `σ_b = M_b / W ,  ${biegemomentFormel(einbaufall)}`,
      `${fmt(Mb)} / ${fmt(Wb)}`,
      Mb / Wb,
      cSigma * material.Rm,
    ),
  )

  const minSicherheit = round(Math.min(...nachweise.map((n) => n.sicherheit)))
  const bestanden = nachweise.every((n) => n.erfuellt)

  return { Mb, Wb, A, faktoren, nachweise, minSicherheit, bestanden }
}

export interface MindestMasse {
  /** erforderliche Stangendicke aus Lochleibung in mm */
  tSmin: number
  /** erforderliche Gabeldicke (je Lasche) aus Lochleibung in mm */
  tGmin: number
  /** erforderliche Stangenbreite aus Zug (mit aktueller t_S) in mm */
  bSmin: number
  /** erforderliche Gabelbreite (je Lasche) aus Zug (mit aktueller t_G) in mm */
  bGmin: number
}

/**
 * Erforderliche Mindestmaße:
 *  - Blechdicke aus Lochleibung:  t ≥ F / (d · p_zul)   (Gabel: 2·d)
 *  - Blechbreite aus Zug:         b ≥ d_Loch + F / (t · σ_z,zul)  (Gabel: 2·t)
 * Die Breiten werden mit den aktuell eingestellten Dicken berechnet.
 */
export function mindestMasse(input: BolzenInput): MindestMasse {
  const { F, d, tS, tG, material } = input
  const buchse = input.buchse ?? null
  const faktoren = input.faktoren ?? ZUL_FAKTOREN[input.lastfall]
  const pZul = faktoren.cP * material.Rm
  const sigmaZ = faktoren.cZug * material.Rm

  const ort = buchse?.ort ?? 'beide'
  const dLochS = buchse && (ort === 'beide' || ort === 'stange') ? buchse.da : d
  const dLochG = buchse && (ort === 'beide' || ort === 'gabel') ? buchse.da : d

  const round = (x: number) => Math.round(x * 100) / 100
  return {
    tSmin: round(F / (d * pZul)),
    tGmin: round(F / (2 * d * pZul)),
    bSmin: round(dLochS + F / (tS * sigmaZ)),
    bGmin: round(dLochG + F / (2 * tG * sigmaZ)),
  }
}

// Genormte Bolzendurchmesser (Auswahl nach DIN, R10/R20), für die Auslegung.
export const NORM_DURCHMESSER = [
  3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 30, 32, 36, 40, 45, 50,
  56, 63, 70, 80, 90, 100,
]

export interface AuslegungErgebnis {
  /** rechnerisch erforderlicher Mindestdurchmesser in mm */
  dErf: number
  /** nächstgrößerer genormter Durchmesser in mm */
  dGewaehlt: number
  /** maßgebender Nachweis ("Abscherung" oder "Biegung") */
  massgebend: string
  /** Nachweis-Ergebnis mit dem gewählten Durchmesser */
  kontrolle: BolzenErgebnis
}

/**
 * Auslegung: kleinster Bolzendurchmesser, der Abscherung und Biegung erfüllt.
 * (Flächenpressung hängt von t_S/t_G ab und wird über die Kontrolle geprüft.)
 */
export function legeBolzenAus(
  input: Omit<BolzenInput, 'd'>,
): AuslegungErgebnis {
  const { F, tS, tG, spalt, einbaufall, lastfall, material } = input
  const faktoren = input.faktoren ?? ZUL_FAKTOREN[lastfall]
  const tauZul = faktoren.cTau * material.Rm
  const sigmaZul = faktoren.cSigma * material.Rm

  // Abscherung: τ = F/(2·π·d²/4) ≤ τ_zul  →  d ≥ sqrt(2·F/(π·τ_zul))
  const dAbscherung = Math.sqrt((2 * F) / (Math.PI * tauZul))

  // Biegung: σ = M_b/(π·d³/32) ≤ σ_zul  →  d ≥ (32·M_b/(π·σ_zul))^(1/3)
  const Mb = biegemoment(F, tS, tG, spalt, einbaufall)
  const dBiegung = Math.cbrt((32 * Mb) / (Math.PI * sigmaZul))

  const massgebend = dBiegung >= dAbscherung ? 'Biegung' : 'Abscherung'
  const dErf = Math.max(dAbscherung, dBiegung)

  const dGewaehlt =
    NORM_DURCHMESSER.find((d) => d >= dErf) ??
    NORM_DURCHMESSER[NORM_DURCHMESSER.length - 1]

  const kontrolle = berechneBolzen({ ...input, d: dGewaehlt })

  return {
    dErf: round(dErf, 2),
    dGewaehlt,
    massgebend,
    kontrolle,
  }
}
