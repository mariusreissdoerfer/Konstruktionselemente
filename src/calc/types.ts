// Gemeinsame Typen für alle Berechnungsmodule.

/** Belastungsart – bestimmt die zulässigen Spannungen. */
export type Lastfall = 'ruhend' | 'schwellend' | 'wechselnd'

/**
 * Einbaufall des Bolzens (Roloff/Matek). Bestimmt das maßgebende Biegemoment.
 *  1 – Bolzen lose in Gabel UND Stange (Spielpassung) → frei aufliegender Träger
 *  2 – Bolzen fest in Gabel (Übermaß), lose in Stange  → beidseitig eingespannt
 *  3 – Bolzen fest in Stange (Übermaß), lose in Gabel  → Kragträger
 */
export type Einbaufall = 1 | 2 | 3

export interface Material {
  /** stabiler Schlüssel */
  id: string
  /** Kurzbezeichnung, z. B. "S235JR" */
  kurz: string
  /** alte Bezeichnung / Klartext, z. B. "St 37 – Allgemeiner Baustahl" */
  name: string
  /** Streckgrenze R_e in N/mm² */
  Re: number
  /** Zugfestigkeit R_m in N/mm² */
  Rm: number
}

/** Ergebnis eines einzelnen Festigkeitsnachweises. */
export interface Nachweis {
  /** Anzeigename, z. B. "Flächenpressung Stange" */
  name: string
  /** symbolische Formel, z. B. "p_S = F / (d · t_S)" */
  formel: string
  /** Formel mit eingesetzten Zahlenwerten */
  einsetzen: string
  /** vorhandener Wert (Spannung/Pressung) in N/mm² */
  vorhanden: number
  /** zulässiger Wert in N/mm² */
  zulaessig: number
  /** Sicherheit S = zulässig / vorhanden */
  sicherheit: number
  /** true, wenn vorhanden <= zulässig */
  erfuellt: boolean
  /** Einheit der Werte (Default "N/mm²"); z. B. "mm" beim Eurocode-Nachweis */
  einheit?: string
}
