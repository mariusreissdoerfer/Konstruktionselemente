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
// Optionen: Buchsen in den Bohrungen (getrennter Außendurchmesser und Länge
// für Stange und Gabel, eigener Werkstoff).
//
// Nachgewiesen werden: Lochleibung (Stange/Gabel, ggf. innen/außen bei Buchse),
// Zug im Nettoquerschnitt, Ausreißen am Kopf, Abscherung und Biegung des Bolzens.

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

/**
 * Aufdopplung der Stange am Auge (Blechbauweise): Das Mittelblech (Dicke t_M)
 * trägt den Zug über die freie Länge; nur am Auge wird beidseitig je eine
 * Lasche (Dicke t_L) aufgelegt → Paketdicke t_S = t_M + 2·t_L. Der Laschen-
 * anteil der Kraft wird auf der Zugseite über ein Passbolzenfeld in das
 * Mittelblech ein-/ausgeleitet (vgl. genietete Augenstäbe im Brückenbau).
 */
export interface AufdopplungConfig {
  /** Dicke des Mittelblechs in mm */
  tM: number
  /** Laschendicke je Seite in mm */
  tL: number
  /** Passbolzendurchmesser d_P in mm */
  dP: number
}

/** Ergebnis der Passbolzenfeld-Auslegung (Anordnung + Nachweise). */
export interface PassbolzenFeld {
  /** Kraftanteil der beiden Laschen (über das Feld übertragen) in N */
  FL: number
  /** rechnerisch erforderliche Passbolzenanzahl */
  nErf: number
  /** Bolzen je Reihe, gestaffelt: Reihe 1 (schaftseitig, wenige wegen
   *  Nettozug bei voller Kraft) → letzte Reihe (augenseitig, viele) */
  reihen: number[]
  /** größte Bolzenzahl einer Reihe (Feldbreite) */
  nProReihe: number
  /** Anzahl Reihen (in Kraftrichtung) */
  nReihen: number
  /** verbaute Bolzenanzahl = Summe der Reihen */
  n: number
  /** Lochabstand (Teilung) 3·d_P in mm */
  teilung: number
  /** Randabstand in Kraftrichtung 2·d_P in mm */
  randLaengs: number
  /** Länge des Feldes in Kraftrichtung in mm */
  feldLaenge: number
  /** Nachweise des Feldes (auch in BolzenErgebnis.nachweise enthalten) */
  nachweise: Nachweis[]
}

/**
 * Passbolzenfeld berechnen – gestaffelte Anordnung für eine möglichst kurze
 * Lasche (Vorbild: genietete Zugstoß-Anschlüsse im Brückenbau):
 *  1. Laschenanteil F_L = F · 2·t_L / (t_M + 2·t_L) (Steifigkeitsverhältnis
 *     der Querschnitte, gleiche Breite und gleicher Werkstoff).
 *  2. Tragfähigkeit je Passbolzen = min(Abscherung zweischnittig,
 *     Lochleibung Mittelblech, Lochleibung Laschen) → n_erf.
 *  3. Staffelung: Die 1. Reihe (schaftseitig) sieht das Mittelblech mit der
 *     vollen Kraft F und darf nur wenige Löcher haben; jede weitere Reihe
 *     hat mehr Restkraft abgegeben und darf mehr Bolzen tragen – bis zum
 *     geometrischen Maximum der Breite (Teilung 3·d_P, Rand 1,5·d_P quer).
 *     Auf der Laschenseite gilt das Gleiche spiegelbildlich (Kraft wächst
 *     zum Auge hin). So wird das Feld so kurz wie möglich.
 */
export function berechnePassbolzenFeld(
  F: number,
  bS: number,
  auf: AufdopplungConfig,
  fak: ZulFaktoren,
  material: Material,
  bolzenMaterial?: Material,
): PassbolzenFeld {
  const { tM, tL, dP } = auf
  const matB = bolzenMaterial ?? material
  const tPaket = tM + 2 * tL
  const FL = (F * 2 * tL) / tPaket
  // Abscherung im Passbolzen; Lochleibung am weicheren Partner; Zug im Blech
  const tauZul = fak.cTau * matB.Rm
  const pZul = fak.cP * Math.min(material.Rm, matB.Rm)
  const sigZ = fak.cZug * material.Rm
  const AP = (Math.PI * dP * dP) / 4

  // Tragfähigkeit je Bolzen (zweischnittig; Lochleibung Mittelblech/Laschen)
  const FproBolzen = Math.min(2 * AP * tauZul, dP * tM * pZul, dP * 2 * tL * pZul)
  const nErf = Math.max(1, Math.ceil(FL / FproBolzen))

  const teilung = 3 * dP
  const randLaengs = 2 * dP
  // geometrisch möglich je Reihe (Randabstand quer ≥ 1,5·d_P je Seite)
  const nGeo = Math.max(1, Math.floor((bS - teilung) / teilung) + 1)

  // Staffel-Layout: je Reihe so viele Bolzen, wie Nettozug (Mittelblech mit
  // Restkraft, Laschen mit bereits eingeleiteter Kraft) und Breite zulassen.
  // Der Kraftabtrag je Bolzen (F_L/n) hängt von der Endanzahl ab → wenige
  // Fixpunkt-Iterationen über n.
  let reihen: number[] = [nErf]
  let nTotal = nErf
  for (let iter = 0; iter < 6; iter++) {
    const dFproBolzen = FL / nTotal
    const neu: number[] = []
    let uebertragen = 0 // Bolzen vor der aktuellen Reihe
    while (uebertragen < nErf && neu.length < 400) {
      const FMittel = F - uebertragen * dFproBolzen // Restkraft Mittelblech
      const kMittel = Math.floor((bS - FMittel / (tM * sigZ)) / dP)
      const maxNoetig = nErf - uebertragen
      let k = Math.max(1, Math.min(nGeo, kMittel, maxNoetig))
      // Laschenseite: Kraft nach dieser Reihe (inkl. eigener Bolzen)
      for (; k > 1; k--) {
        const FLasche = Math.min((uebertragen + k) * dFproBolzen, FL)
        if ((bS - k * dP) * 2 * tL * sigZ >= FLasche) break
      }
      neu.push(k)
      uebertragen += k
    }
    const nNeu = neu.reduce((a, b) => a + b, 0)
    reihen = neu
    if (nNeu === nTotal) break
    nTotal = nNeu
  }
  const n = reihen.reduce((a, b) => a + b, 0)
  const nReihen = reihen.length
  const nProReihe = Math.max(...reihen)
  const feldLaenge = (nReihen - 1) * teilung + 2 * randLaengs

  // Maßgebende Reihe je Blech: Mittelblech trägt vor Reihe i noch die
  // Restkraft (Reihe 1 = volle F), die Laschen nach Reihe i die bereits
  // eingeleitete Kraft (letzte Reihe = volle F_L). Kritisch ist jeweils die
  // Reihe mit dem höchsten Verhältnis Kraft/Nettoquerschnitt.
  let cum = 0
  let mMax = { sigma: 0, i: 0, Fk: F, net: Math.max(bS - reihen[0] * dP, 0) }
  let lMax = { sigma: 0, i: 0, Fk: FL, net: Math.max(bS - reihen[nReihen - 1] * dP, 0) }
  for (let i = 0; i < nReihen; i++) {
    const net = bS - reihen[i] * dP
    const FRest = F - cum * (FL / n)
    const sigM = net > 0 ? FRest / (net * tM) : Infinity
    if (sigM > mMax.sigma) mMax = { sigma: sigM, i, Fk: FRest, net: Math.max(net, 0) }
    cum += reihen[i]
    const FLk = Math.min(cum * (FL / n), FL)
    const sigL = net > 0 ? FLk / (net * 2 * tL) : Infinity
    if (sigL > lMax.sigma) lMax = { sigma: sigL, i, Fk: FLk, net: Math.max(net, 0) }
  }
  const nachweise: Nachweis[] = [
    nachweis(
      'Passbolzen – Abscherung',
      `τ = F_L / (n · 2 · A_P) ,  n = ${n}, A_P = π·d_P²/4`,
      `${fmt(FL)} / (${n} · 2 · ${fmt(AP)})`,
      FL / (n * 2 * AP),
      tauZul,
    ),
    nachweis(
      'Passbolzen – Lochleibung Mittelblech',
      'p = F_L / (n · d_P · t_M)',
      `${fmt(FL)} / (${n} · ${fmt(dP)} · ${fmt(tM)})`,
      FL / (n * dP * tM),
      pZul,
    ),
    nachweis(
      'Passbolzen – Lochleibung Laschen',
      'p = F_L / (n · d_P · 2·t_L)',
      `${fmt(FL)} / (${n} · ${fmt(dP)} · ${fmt(2 * tL)})`,
      FL / (n * dP * 2 * tL),
      pZul,
    ),
    nachweis(
      'Zug Mittelblech (maßgebende Passbolzenreihe)',
      `σ_z = F_${mMax.i + 1} / ((b_S − ${reihen[mMax.i]}·d_P) · t_M) ,  Reihe ${mMax.i + 1}`,
      `${fmt(mMax.Fk)} / (${fmt(mMax.net)} · ${fmt(tM)})`,
      mMax.sigma,
      sigZ,
    ),
    nachweis(
      'Zug Laschen (maßgebende Passbolzenreihe)',
      `σ_z = F_L,${lMax.i + 1} / ((b_S − ${reihen[lMax.i]}·d_P) · 2·t_L) ,  Reihe ${lMax.i + 1}`,
      `${fmt(lMax.Fk)} / (${fmt(lMax.net)} · ${fmt(2 * tL)})`,
      lMax.sigma,
      sigZ,
    ),
  ]

  return { FL, nErf, reihen, nProReihe, nReihen, n, teilung, randLaengs, feldLaenge, nachweise }
}

/** Optionale Buchse(n) in den Bohrungen – getrennt für Stange und Gabel. */
export interface BuchseConfig {
  /** Außendurchmesser der Buchse in der Stange in mm */
  daStange: number
  /** Außendurchmesser der Buchse in der Gabel in mm */
  daGabel: number
  /** Buchsenlänge in der Stange in mm (tragende Länge) */
  laengeStange: number
  /** Buchsenlänge in der Gabel je Lasche in mm */
  laengeGabel: number
  /** Buchsen-/Ringwerkstoff (bei Gelenklager: Außenring gegen das Blech) */
  material: Material
  /** Einbauort der Buchse(n); Standard: beide */
  ort?: BuchseOrt
  /** Die Stangen-„Buchse" ist ein Gelenklager (z. B. Schaeffler GE..):
   *  statt der Pressung Bolzen–Buchse gilt der statische Tragzahlnachweis
   *  des Herstellers F·f_b ≤ C_0r (f_b: Belastungsfaktor, z. B. 2,75 für
   *  schwellende Last wartungspflichtiger Serien). */
  gelenk?: {
    /** statische Tragzahl C_0r in N */
    C0r: number
    /** Belastungsfaktor f_b (Herstellerangabe je Lastbild) */
    fb: number
  } | null
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
  /** Stangenbreite (Steg, senkrecht zur Kraft) b_S in mm */
  bS: number
  /** Gabelbreite je Lasche (Steg) b_G in mm */
  bG: number
  /** Randabstand Stange in Kraftrichtung (Lochmitte→Stirnkante) c_S in mm */
  cS: number
  /** Randabstand Gabel in Kraftrichtung je Lasche c_G in mm */
  cG: number
  /** Spalt a zwischen Stange und je Gabellasche in mm */
  spalt: number
  einbaufall: Einbaufall
  lastfall: Lastfall
  /** Werkstoff der Bleche (Stange, Gabel, Mittelblech/Laschen) */
  material: Material
  /** Werkstoff des Bolzens (Default: material). Abscherung und Biegung
   *  rechnen mit dem Bolzen; Pressungen mit dem weicheren Kontaktpartner. */
  bolzenMaterial?: Material
  /** optionale Buchse */
  buchse?: BuchseConfig | null
  /** optionale Aufdopplung der Stange (dann gilt t_S = t_M + 2·t_L) */
  aufdopplung?: AufdopplungConfig | null
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
  /** Passbolzenfeld (nur bei Aufdopplung) */
  passfeld?: PassbolzenFeld
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
  einheit = 'N/mm²',
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
    einheit,
  }
}

/**
 * Erforderlicher Randabstand c (Lochmitte → Stirnkante) aus Scherausriss (R/M).
 *  nFlaechen = 2 (Stange, ein Blech, 2 Scherflächen) bzw. 4 (Gabel, zwei Laschen).
 */
export function randAbstandErf(
  F: number,
  t: number,
  dLoch: number,
  nFlaechen: number,
  fak: ZulFaktoren,
  material: Material,
): number {
  return dLoch / 2 + F / (nFlaechen * t * fak.cTau * material.Rm)
}

/** Ausreißnachweis am Augenkopf (Scherausriss nach Roloff/Matek). */
function ausreissNachweis(
  name: string,
  F: number,
  t: number,
  dLoch: number,
  c: number,
  nFlaechen: number,
  fak: ZulFaktoren,
  material: Material,
): Nachweis {
  const L = Math.max(c - dLoch / 2, 0) // tragende Steglänge
  const n = nFlaechen
  return nachweis(
    `Ausreißen ${name}`,
    `τ = F / (${n} · (c − d/2) · t)`,
    `${fmt(F)} / (${n} · ${fmt(L)} · ${fmt(t)})`,
    L > 0 ? F / (n * L * t) : Infinity,
    fak.cTau * material.Rm,
  )
}

/** Vollständige Berechnung (Nachweis) der Bolzenverbindung. */
export function berechneBolzen(input: BolzenInput): BolzenErgebnis {
  const { F, d, tG, bS, bG, cS, cG, spalt, einbaufall, lastfall, material } = input
  const auf = input.aufdopplung ?? null
  // Bei Aufdopplung wirkt am Auge die Paketdicke t_S = t_M + 2·t_L
  const tS = auf ? auf.tM + 2 * auf.tL : input.tS
  const buchse = input.buchse ?? null
  const faktoren = input.faktoren ?? ZUL_FAKTOREN[lastfall]
  const { cP, cSigma, cTau, cZug } = faktoren

  const A = bolzenflaeche(d)
  const Wb = widerstandsmoment(d)
  const Mb = biegemoment(F, tS, tG, spalt, einbaufall)

  // Bolzenwerkstoff (Abscherung/Biegung); Pressung am weicheren Partner
  const matBolzen = input.bolzenMaterial ?? material
  const weicher = (a: Material, b: Material) => (a.Rm <= b.Rm ? a : b)
  const pZulMat = (m: Material) => cP * m.Rm
  const nachweise: Nachweis[] = []

  const ort = buchse?.ort ?? 'beide'
  const buchseStange = buchse && (ort === 'beide' || ort === 'stange')
  const buchseGabel = buchse && (ort === 'beide' || ort === 'gabel')

  // ---- Lochleibung Stange (ggf. mit Buchse: innen/außen) ----
  if (buchseStange && buchse) {
    const lenS = buchse.laengeStange
    const lenSa = Math.min(lenS, tS) // Überdeckung Buchse–Blech
    if (buchse.gelenk) {
      // Gelenklager: statischer Tragzahlnachweis des Herstellers statt
      // Flächenpressung Bolzen–Buchse (Gleitgewebe trägt deutlich mehr)
      nachweise.push(
        nachweis(
          'Gelenklager Stange – statische Tragzahl',
          'F · f_b ≤ C_0r',
          `${fmt(F / 1000)} · ${fmt(buchse.gelenk.fb)} ≤ ${fmt(buchse.gelenk.C0r / 1000)}`,
          (F * buchse.gelenk.fb) / 1000,
          buchse.gelenk.C0r / 1000,
          'kN',
        ),
      )
    } else {
      nachweise.push(
        nachweis(
          'Pressung Stange innen (Bolzen–Buchse)',
          'p = F / (d · L_B)',
          `${fmt(F)} / (${fmt(d)} · ${fmt(lenS)})`,
          F / (d * lenS),
          pZulMat(weicher(matBolzen, buchse.material)),
        ),
      )
    }
    nachweise.push(
      nachweis(
        'Pressung Stange außen (Buchse–Stange)',
        'p = F / (d_a · min(L_B, t_S))',
        `${fmt(F)} / (${fmt(buchse.daStange)} · ${fmt(lenSa)})`,
        F / (buchse.daStange * lenSa),
        pZulMat(weicher(buchse.material, material)),
      ),
    )
  } else {
    nachweise.push(
      nachweis(
        'Lochleibung Stange',
        'p_S = F / (d · t_S)',
        `${fmt(F)} / (${fmt(d)} · ${fmt(tS)})`,
        F / (d * tS),
        pZulMat(weicher(matBolzen, material)),
      ),
    )
  }

  // ---- Lochleibung Gabel ----
  if (buchseGabel && buchse) {
    const lenG = buchse.laengeGabel
    const lenGa = Math.min(lenG, tG)
    nachweise.push(
      nachweis(
        'Pressung Gabel innen (Bolzen–Buchse)',
        'p = F / (2 · d · L_B)',
        `${fmt(F)} / (2 · ${fmt(d)} · ${fmt(lenG)})`,
        F / (2 * d * lenG),
        pZulMat(weicher(matBolzen, buchse.material)),
      ),
    )
    nachweise.push(
      nachweis(
        'Pressung Gabel außen (Buchse–Gabel)',
        'p = F / (2 · d_a · min(L_B, t_G))',
        `${fmt(F)} / (2 · ${fmt(buchse.daGabel)} · ${fmt(lenGa)})`,
        F / (2 * buchse.daGabel * lenGa),
        pZulMat(weicher(buchse.material, material)),
      ),
    )
  } else {
    nachweise.push(
      nachweis(
        'Lochleibung Gabel',
        'p_G = F / (2 · d · t_G)',
        `${fmt(F)} / (2 · ${fmt(d)} · ${fmt(tG)})`,
        F / (2 * d * tG),
        pZulMat(weicher(matBolzen, material)),
      ),
    )
  }

  // ---- Zug im Nettoquerschnitt (am Loch) ----
  // wirksamer Lochdurchmesser: bei Buchse der jeweilige Außendurchmesser
  const dLochS = buchseStange && buchse ? buchse.daStange : d
  const dLochG = buchseGabel && buchse ? buchse.daGabel : d
  const netS = Math.max(bS - dLochS, 0)
  const netG = Math.max(bG - dLochG, 0)
  const sigmaZZul = cZug * material.Rm

  // Gelenklager in der Stange: Der Kopfnachweis folgt der Herstellermethode
  // (Schaeffler-Gelenkkopf): σ_netto ≤ R_p0,2/(1,5·f_b). Der Faktor f_b
  // stammt aus Dauerfestigkeitsversuchen und enthält Formzahl α_k und die
  // 83-%-Ausnutzung der Streckgrenze — deutlich strenger als 0,33·R_m.
  const gelenkS = buchseStange && buchse?.gelenk ? buchse.gelenk : null
  const sigZulKopfS = gelenkS ? material.Re / (1.5 * gelenkS.fb) : sigmaZZul

  nachweise.push(
    nachweis(
      'Zug Stange',
      gelenkS
        ? `σ_z = F / ((b_S − d) · t_S) ≤ R_p0,2/(1,5·f_b)  [Herstellermethode]`
        : 'σ_z = F / ((b_S − d) · t_S)',
      `${fmt(F)} / ((${fmt(bS)} − ${fmt(dLochS)}) · ${fmt(tS)})`,
      netS > 0 ? F / (netS * tS) : Infinity,
      sigZulKopfS,
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

  // ---- Ausreißen am Augenkopf (Scherausriss, Randabstand in Kraftrichtung) ----
  nachweise.push(ausreissNachweis('Stange', F, tS, dLochS, cS, 2, faktoren, material))
  nachweise.push(ausreissNachweis('Gabel', F, tG, dLochG, cG, 4, faktoren, material))

  // ---- Aufdopplung: Mittelblech über die freie Länge + Passbolzenfeld ----
  if (auf && auf.tL > 0) {
    // Vollquerschnitt des Mittelblechs allein (außerhalb der Laschen trägt
    // nur t_M die gesamte Kraft) – der Kern der Blechbauweise.
    nachweise.push(
      nachweis(
        'Zug Mittelblech (freie Länge)',
        'σ_z = F / (b_S · t_M)',
        `${fmt(F)} / (${fmt(bS)} · ${fmt(auf.tM)})`,
        F / (bS * auf.tM),
        sigmaZZul,
      ),
    )
  }
  const passfeld = auf && auf.tL > 0 ? berechnePassbolzenFeld(F, bS, auf, faktoren, material, matBolzen) : undefined
  if (passfeld) nachweise.push(...passfeld.nachweise)

  // ---- Abscherung (zweischnittig) ----
  nachweise.push(
    nachweis(
      'Abscherung (zweischnittig)',
      'τ_a = F / (2 · A) ,  A = π·d²/4',
      `${fmt(F)} / (2 · ${fmt(A)})`,
      F / (2 * A),
      cTau * matBolzen.Rm,
    ),
  )

  // ---- Biegung ----
  nachweise.push(
    nachweis(
      'Biegung',
      `σ_b = M_b / W ,  ${biegemomentFormel(einbaufall)}`,
      `${fmt(Mb)} / ${fmt(Wb)}`,
      Mb / Wb,
      cSigma * matBolzen.Rm,
    ),
  )

  const minSicherheit = round(Math.min(...nachweise.map((n) => n.sicherheit)))
  const bestanden = nachweise.every((n) => n.erfuellt)

  return { Mb, Wb, A, faktoren, nachweise, minSicherheit, bestanden, passfeld }
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
  /** erforderlicher Randabstand Stange aus Ausreißen in mm */
  cSmin: number
  /** erforderlicher Randabstand Gabel (je Lasche) aus Ausreißen in mm */
  cGmin: number
  /** Aufdopplung: erforderliche Mittelblechdicke (Vollquerschnitt freie
   *  Länge + Nettozug an der maßgebenden Passbolzenreihe) in mm */
  tMmin?: number
  /** Aufdopplung: erforderliche Laschendicke je Seite (Rest zum Paket aus
   *  Lochleibung, mit aktuellem t_M) in mm */
  tLmin?: number
}

/**
 * Erforderliche Mindestmaße:
 *  - Blechdicke aus Lochleibung:  t ≥ F / (d · p_zul)   (Gabel: 2·d)
 *  - Blechbreite aus Zug:         b ≥ d_Loch + F / (t · σ_z,zul)  (Gabel: 2·t)
 * Die Breiten werden mit den aktuell eingestellten Dicken berechnet.
 */
export function mindestMasse(input: BolzenInput): MindestMasse {
  const { F, d, tG, material } = input
  const auf = input.aufdopplung ?? null
  const tS = auf ? auf.tM + 2 * auf.tL : input.tS
  const buchse = input.buchse ?? null
  const matBolzen = input.bolzenMaterial ?? material
  const faktoren = input.faktoren ?? ZUL_FAKTOREN[input.lastfall]
  const pZul = faktoren.cP * Math.min(material.Rm, matBolzen.Rm)
  const sigmaZ = faktoren.cZug * material.Rm

  const ort = buchse?.ort ?? 'beide'
  const buchseS = buchse && (ort === 'beide' || ort === 'stange')
  const buchseG = buchse && (ort === 'beide' || ort === 'gabel')
  const dLochS = buchseS && buchse ? buchse.daStange : d
  const dLochG = buchseG && buchse ? buchse.daGabel : d

  const round = (x: number) => Math.round(x * 100) / 100
  // Lochleibung: mit Buchse zählt außen d_a gegen das Blech (innen trägt die
  // Buchsenlänge, nicht die Blechdicke) – wie in der Auslegung
  const pKon = (a: Material, b: Material) => faktoren.cP * Math.min(a.Rm, b.Rm)
  const tSmin = buchseS && buchse ? F / (buchse.daStange * pKon(buchse.material, material)) : F / (d * pZul)
  const tGmin = buchseG && buchse ? F / (2 * buchse.daGabel * pKon(buchse.material, material)) : F / (2 * d * pZul)

  // Aufdopplung: Mindestdicken für Mittelblech und Laschen
  let tMmin: number | undefined
  let tLmin: number | undefined
  if (auf && auf.tL > 0) {
    const { bS } = input
    // Vollquerschnitt über die freie Länge …
    let tMerf = F / (bS * sigmaZ)
    // … und Nettozug an der maßgebenden Passbolzenreihe (Restkraft, Lochabzug
    // mit der Reihenbelegung der aktuellen Konfiguration)
    const feld = berechnePassbolzenFeld(F, bS, auf, faktoren, material, matBolzen)
    let cum = 0
    for (let i = 0; i < feld.reihen.length; i++) {
      const netto = bS - feld.reihen[i] * auf.dP
      const FRest = F - cum * (feld.FL / feld.n)
      if (netto > 0) tMerf = Math.max(tMerf, FRest / (netto * sigmaZ))
      cum += feld.reihen[i]
    }
    tMmin = round(tMerf)
    // Laschen: Rest zum erforderlichen Paket (Lochleibung am Auge), mit
    // aktuellem t_M
    tLmin = round(Math.max((tSmin - auf.tM) / 2, 0))
  }

  const gelenkS = buchseS && buchse?.gelenk ? buchse.gelenk : null
  const sigZKopfS = gelenkS ? material.Re / (1.5 * gelenkS.fb) : sigmaZ
  return {
    tSmin: round(tSmin),
    tGmin: round(tGmin),
    bSmin: round(dLochS + F / (tS * sigZKopfS)),
    bGmin: round(dLochG + F / (2 * tG * sigmaZ)),
    cSmin: round(randAbstandErf(F, tS, dLochS, 2, faktoren, material)),
    cGmin: round(randAbstandErf(F, tG, dLochG, 4, faktoren, material)),
    tMmin,
    tLmin,
  }
}

// Genormte Bolzendurchmesser (Auswahl nach DIN, R10/R20), für die Auslegung.
// Bis 800 mm erweitert, damit auch sehr große Kräfte (bis ~10 MN) ausgelegt
// werden können.
export const NORM_DURCHMESSER = [
  3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 30, 32, 36, 40, 45, 50,
  56, 63, 70, 80, 90, 100, 110, 125, 140, 160, 180, 200, 220, 250, 280, 320,
  360, 400, 450, 500, 560, 630, 710, 800,
]

export interface AuslegungErgebnis {
  /** gewählter genormter Bolzendurchmesser in mm */
  d: number
  /** erforderliche Stangendicke in mm */
  tS: number
  /** erforderliche Gabeldicke (je Lasche) in mm */
  tG: number
  /** erforderliche Stangenbreite in mm */
  bS: number
  /** erforderliche Gabelbreite (je Lasche) in mm */
  bG: number
  /** erforderlicher Randabstand Stange in Kraftrichtung in mm */
  cS: number
  /** erforderlicher Randabstand Gabel (je Lasche) in mm */
  cG: number
  /** rechnerisch erforderlicher Mindestdurchmesser (vor Normung) in mm */
  dErf: number
  /** für den Durchmesser maßgebender Nachweis ("Abscherung" oder "Biegung") */
  massgebend: string
  /** Kontrolle mit den ausgelegten Maßen (sollte alle Nachweise erfüllen) */
  kontrolle: BolzenErgebnis
  /** optimale Aufteilung bei Aufdopplung: Mittelblech + Laschen + Feld */
  aufdopplung?: {
    tM: number
    tL: number
    /** null, wenn das Mittelblech allein reicht (keine Laschen nötig) */
    feld: PassbolzenFeld | null
  } | null
}

function naechsterNorm(d: number): number {
  return (
    NORM_DURCHMESSER.find((x) => x >= d) ??
    NORM_DURCHMESSER[NORM_DURCHMESSER.length - 1]
  )
}

/**
 * Vollständige Auslegung: bestimmt d, t_S, t_G, b_S, b_G so, dass ALLE
 * Nachweise erfüllt sind (jeweils das erforderliche Minimum):
 *  - Lochleibung → Dicken t_S, t_G
 *  - Zug         → Breiten b_S, b_G
 *  - Abscherung + Biegung → Durchmesser d (genormt)
 * d, t und b hängen voneinander ab (Biegung über t, Lochleibung über d),
 * daher wird iteriert. Dicken/Breiten werden auf ganze mm aufgerundet.
 */
export function legeBolzenAus(
  input: Omit<BolzenInput, 'd' | 'tS' | 'tG' | 'bS' | 'bG' | 'cS' | 'cG'> &
    Partial<Pick<BolzenInput, 'tS' | 'tG' | 'bS' | 'bG' | 'cS' | 'cG'>>,
): AuslegungErgebnis {
  const { F, spalt, einbaufall, lastfall, material } = input
  const buchse = input.buchse ?? null
  const matBolzen = input.bolzenMaterial ?? material
  const fak = input.faktoren ?? ZUL_FAKTOREN[lastfall]
  // Pressung am weicheren Kontaktpartner; Biegung/Abscherung im Bolzen;
  // Zug/Ausreißen im Blech
  const pKontakt = (a: Material, b: Material) => fak.cP * Math.min(a.Rm, b.Rm)
  const pZul = pKontakt(material, matBolzen)
  const sigB = fak.cSigma * matBolzen.Rm
  const tauZul = fak.cTau * matBolzen.Rm
  const sigZ = fak.cZug * material.Rm

  const ort = buchse?.ort ?? 'beide'
  const bStange = !!buchse && (ort === 'beide' || ort === 'stange')
  const bGabel = !!buchse && (ort === 'beide' || ort === 'gabel')

  // Lochleibung → erforderliche Dicken (Annahme: Buchsenlänge = Blechdicke)
  const tSmin = (d: number): number => {
    if (bStange && buchse) {
      const aussen = F / (buchse.daStange * pKontakt(buchse.material, material))
      // Gelenklager: innen gilt die Hersteller-Tragzahl, nicht die Pressung
      if (buchse.gelenk) return aussen
      return Math.max(F / (d * pKontakt(matBolzen, buchse.material)), aussen)
    }
    return F / (d * pZul)
  }
  const tGmin = (d: number): number => {
    if (bGabel && buchse)
      return Math.max(F / (2 * d * pKontakt(matBolzen, buchse.material)), F / (2 * buchse.daGabel * pKontakt(buchse.material, material)))
    return F / (2 * d * pZul)
  }

  const dAbscherung = Math.sqrt((2 * F) / (Math.PI * tauZul))

  // Die Auslegung wird als Ganzes wiederholt, falls die Endkontrolle knapp
  // scheitert (z. B. weil die Aufdopplung das Paket durch Aufrunden von t_L
  // minimal über das ausgelegte t_S hebt und damit das Biegemoment wächst):
  // dann wird der Durchmesser eine Normstufe angehoben und alles neu bemessen.
  let dMinNorm = 0
  for (let versuch = 0; ; versuch++) {
    // iterativ konsistente Dicken und Durchmesser
    let d = Math.max(naechsterNorm(dAbscherung), dMinNorm)
    let tS = 1
    let tG = 1
    for (let k = 0; k < 25; k++) {
      tS = Math.ceil(tSmin(d))
      tG = Math.ceil(tGmin(d))
      const Mb = biegemoment(F, tS, tG, spalt, einbaufall)
      const dBiegung = Math.cbrt((32 * Mb) / (Math.PI * sigB))
      const dNorm = Math.max(naechsterNorm(Math.max(dAbscherung, dBiegung)), dMinNorm)
      if (dNorm <= d) break
      d = dNorm
    }

    // maßgebender Nachweis für d (mit finalen Dicken)
    const MbF = biegemoment(F, tS, tG, spalt, einbaufall)
    const dBiegungF = Math.cbrt((32 * MbF) / (Math.PI * sigB))
    const massgebend = dBiegungF >= dAbscherung ? 'Biegung' : 'Abscherung'
    const dErf = Math.max(dAbscherung, dBiegungF)

    // Zug → erforderliche Breiten (mit finalen Dicken und d).
    // Stange mit Gelenklager: Herstellergrenze R_p0,2/(1,5·f_b) am Kopf.
    const gelenkS = bStange && buchse?.gelenk ? buchse.gelenk : null
    const sigZKopfS = gelenkS ? material.Re / (1.5 * gelenkS.fb) : sigZ
    const dLochS = bStange && buchse ? buchse.daStange : d
    const dLochG = bGabel && buchse ? buchse.daGabel : d
    const bS = Math.ceil(dLochS + F / (tS * sigZKopfS))
    const bG = Math.ceil(dLochG + F / (2 * tG * sigZ))

    // Ausreißen → erforderliche Randabstände in Kraftrichtung (Scherausriss)
    const cS = Math.ceil(randAbstandErf(F, tS, dLochS, 2, fak, material))
    const cG = Math.ceil(randAbstandErf(F, tG, dLochG, 4, fak, material))

    // ---- Aufdopplung: optimale Aufteilung des Pakets t_S in t_M + 2·t_L ----
    // Das Mittelblech ist der Kostentreiber (volle Bauteillänge!) und wird
    // exakt auf Sicherheit S = 1 gelegt: Fixpunkt-Iteration über das
    // erforderliche t_M aus allen Mittelblech-Bedingungen des jeweils
    // resultierenden (gestaffelten) Passbolzenfelds — Vollquerschnitt der
    // freien Länge, Nettozug der maßgebenden Reihe und Lochleibung. Die
    // Dickenreserve steckt in den kurzen, günstigen Laschen.
    let aufdopplungOut: AuslegungErgebnis['aufdopplung'] = null
    let aufCfg: AufdopplungConfig | null = null
    if (input.aufdopplung) {
      const dP = input.aufdopplung.dP
      const tPaket = tS
      const pZulF = fak.cP * Math.min(material.Rm, matBolzen.Rm)
      let tM = F / (bS * sigZ) // exaktes Limit des Vollquerschnitts (S = 1)
      let tL = Math.ceil(Math.max(tPaket - tM, 0) / 2)
      let feld: PassbolzenFeld | null = null
      for (let i = 0; i < 80 && tL > 0; i++) {
        const kand = berechnePassbolzenFeld(F, bS, { tM, tL, dP }, fak, material, matBolzen)
        // maßgebendes t_M dieses Layouts (S = 1 je Bedingung): Vollquerschnitt,
        // Nettozug der maßgebenden Reihe (Restkraft!) und Lochleibung
        let cum = 0
        let tMNetto = 0
        for (let k = 0; k < kand.reihen.length; k++) {
          const net = bS - kand.reihen[k] * dP
          const FRest = F - cum * (kand.FL / kand.n)
          tMNetto = Math.max(tMNetto, net > 0 ? FRest / (net * sigZ) : Infinity)
          cum += kand.reihen[k]
        }
        const tMerf = Math.max(
          F / (bS * sigZ),
          tMNetto,
          kand.FL / (kand.n * dP * pZulF),
        )
        if (tMerf <= tM + 1e-9 && kand.nachweise.every((n) => n.erfuellt)) {
          feld = kand
          break
        }
        tM = Number.isFinite(tMerf) ? Math.max(tMerf, tM + 0.05) : tM + 1
        tL = Math.ceil(Math.max(tPaket - tM, 0) / 2)
        feld = null
      }
      // auf 0,01 mm aufrunden, damit S ≥ 1 sicher bleibt
      tM = Math.ceil(tM * 100 - 1e-6) / 100
      if (tL > 0 && feld) feld = berechnePassbolzenFeld(F, bS, { tM, tL, dP }, fak, material, matBolzen)
      if (tL <= 0) {
        // Mittelblech braucht ohnehin die volle Paketdicke → Laschen unnötig
        aufdopplungOut = { tM: tPaket, tL: 0, feld: null }
      } else {
        aufCfg = { tM, tL, dP }
        aufdopplungOut = { tM, tL, feld }
        // tatsächliche Paketdicke (t_L aufgerundet) als t_S ausweisen
        tS = tM + 2 * tL
      }
    }

    // Kontrolle: Die Buchsenlänge wächst mit der ausgelegten Blechdicke mit
    // (Annahme der Dickenformeln oben: Buchsenlänge = Blechdicke)
    const kontrolle = berechneBolzen({
      ...input, d, tS, tG, bS, bG, cS, cG, aufdopplung: aufCfg,
      buchse: buchse
        ? { ...buchse, laengeStange: Math.max(buchse.laengeStange, tS), laengeGabel: Math.max(buchse.laengeGabel, tG) }
        : null,
    })

    if (kontrolle.bestanden || versuch >= 3 || d >= NORM_DURCHMESSER[NORM_DURCHMESSER.length - 1]) {
      return { d, tS, tG, bS, bG, cS, cG, dErf: round(dErf, 2), massgebend, kontrolle, aufdopplung: aufdopplungOut }
    }
    dMinNorm = naechsterNorm(d + 1)
  }
}
