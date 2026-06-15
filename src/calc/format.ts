// Zahlformatierung mit deutschem Tausender-Trennzeichen (Punkt) und Komma.
export function fmt(x: number, maxFractionDigits = 2): string {
  if (!Number.isFinite(x)) return '∞'
  return x.toLocaleString('de-DE', { maximumFractionDigits: maxFractionDigits })
}

/** Deutschen Zahlstring ("20.000,5") in eine Zahl parsen. */
export function parseDe(s: string): number {
  const cleaned = s.replace(/\./g, '').replace(/\s/g, '').replace(',', '.')
  const n = Number.parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}
