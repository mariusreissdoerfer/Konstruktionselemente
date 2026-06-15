// Berechnung einer Bolzenverbindung (Stange in Gabel, durch Bolzen verbunden)
// nach Roloff/Matek Maschinenelemente.
//
// Geometrie (Längsachse des Bolzens):
//
//     │ Gabel │      Stange      │ Gabel │
//     │  t_G  │       t_S        │  t_G  │
//     ────────●══════════════════●────────   ← Bolzen, Durchmesser d
//                     ▲ F  (Zugkraft der Stange)
//
// Nachgewiesen werden: Flächenpressung (Lochleibung) in Stange und Gabel,
// Abscherung des Bolzens (zweischnittig) und Biegung des Bolzens.

import type { Einbaufall, Lastfall, Material, Nachweis } from '../types'

/** Zulässige Spannungen als Anteil von R_m, abhängig vom Lastfall.
 *  Referenz (verifiziert): schwellende Belastung, mittlere Stöße →
 *  p_zul = 0,25·R_m, σ_b,zul = 0,20·R_m, τ_a,zul = 0,15·R_m (Roloff/Matek).
 *  Die Werte für ruhend/wechselnd sind übliche Richtwerte und im UI editierbar. */
export interface ZulFaktoren {
  /** Faktor für zulässige Flächenpressung: p_zul = cP · R_m */
  cP: number
  /** Faktor für zulässige Biegespannung: σ_b,zul = cSigma · R_m */
  cSigma: number
  /** Faktor für zulässige Schubspannung: τ_a,zul = cTau · R_m */
  cTau: number
}

export const ZUL_FAKTOREN: Record<Lastfall, ZulFaktoren> = {
  ruhend: { cP: 0.35, cSigma: 0.3, cTau: 0.2 },
  schwellend: { cP: 0.25, cSigma: 0.2, cTau: 0.15 },
  wechselnd: { cP: 0.15, cSigma: 0.15, cTau: 0.1 },
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

export interface BolzenInput {
  /** Belastung (Stangenkraft) F in N */
  F: number
  /** Bolzendurchmesser d in mm */
  d: number
  /** Stangendicke t_S in mm */
  tS: number
  /** Gabeldicke je Lasche t_G in mm */
  tG: number
  einbaufall: Einbaufall
  lastfall: Lastfall
  material: Material
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
 * Maßgebendes Biegemoment des Bolzens in N·mm, abhängig vom Einbaufall.
 *   Fall 1: M_b = F/8 · (t_S + 2·t_G)
 *   Fall 2: M_b = F/8 · t_S
 *   Fall 3: M_b = F/4 · t_G
 */
export function biegemoment(
  F: number,
  tS: number,
  tG: number,
  einbaufall: Einbaufall,
): number {
  switch (einbaufall) {
    case 1:
      return (F / 8) * (tS + 2 * tG)
    case 2:
      return (F / 8) * tS
    case 3:
      return (F / 4) * tG
  }
}

/** Symbolische Biegemoment-Formel als Text (für die Anzeige). */
export function biegemomentFormel(einbaufall: Einbaufall): string {
  switch (einbaufall) {
    case 1:
      return 'M_b = F/8 · (t_S + 2·t_G)'
    case 2:
      return 'M_b = F/8 · t_S'
    case 3:
      return 'M_b = F/4 · t_G'
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
  const { F, d, tS, tG, einbaufall, lastfall, material } = input
  const faktoren = input.faktoren ?? ZUL_FAKTOREN[lastfall]
  const { Rm } = material

  const pZul = faktoren.cP * Rm
  const sigmaZul = faktoren.cSigma * Rm
  const tauZul = faktoren.cTau * Rm

  const A = bolzenflaeche(d)
  const Wb = widerstandsmoment(d)
  const Mb = biegemoment(F, tS, tG, einbaufall)

  // 1) Flächenpressung Stange (Bolzen trägt F über die Stangendicke)
  const pS = F / (d * tS)
  // 2) Flächenpressung Gabel (zwei Laschen teilen sich F)
  const pG = F / (2 * d * tG)
  // 3) Abscherung – zweischnittig
  const tau = F / (2 * A)
  // 4) Biegung
  const sigmaB = Mb / Wb

  const nachweise: Nachweis[] = [
    nachweis(
      'Flächenpressung Stange',
      'p_S = F / (d · t_S)',
      `${F} / (${d} · ${tS})`,
      pS,
      pZul,
    ),
    nachweis(
      'Flächenpressung Gabel',
      'p_G = F / (2 · d · t_G)',
      `${F} / (2 · ${d} · ${tG})`,
      pG,
      pZul,
    ),
    nachweis(
      'Abscherung (zweischnittig)',
      'τ_a = F / (2 · A) ,  A = π·d²/4',
      `${F} / (2 · ${round(A)})`,
      tau,
      tauZul,
    ),
    nachweis(
      'Biegung',
      `σ_b = M_b / W ,  ${biegemomentFormel(einbaufall)}`,
      `${round(Mb)} / ${round(Wb)}`,
      sigmaB,
      sigmaZul,
    ),
  ]

  const minSicherheit = round(
    Math.min(...nachweise.map((n) => n.sicherheit)),
  )
  const bestanden = nachweise.every((n) => n.erfuellt)

  return { Mb, Wb, A, faktoren, nachweise, minSicherheit, bestanden }
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
  const { F, tS, tG, einbaufall, lastfall, material } = input
  const faktoren = input.faktoren ?? ZUL_FAKTOREN[lastfall]
  const tauZul = faktoren.cTau * material.Rm
  const sigmaZul = faktoren.cSigma * material.Rm

  // Abscherung: τ = F/(2·π·d²/4) ≤ τ_zul  →  d ≥ sqrt(2·F/(π·τ_zul))
  const dAbscherung = Math.sqrt((2 * F) / (Math.PI * tauZul))

  // Biegung: σ = M_b/(π·d³/32) ≤ σ_zul  →  d ≥ (32·M_b/(π·σ_zul))^(1/3)
  const Mb = biegemoment(F, tS, tG, einbaufall)
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
