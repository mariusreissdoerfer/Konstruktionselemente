import type { Einbaufall } from '../calc/types'

interface BolzenDiagramProps {
  d: number
  tS: number
  tG: number
  einbaufall: Einbaufall
}

/**
 * Schematische Längsschnitt-Darstellung der Bolzenverbindung:
 * Gabel (t_G) | Stange (t_S) | Gabel (t_G), Bolzen waagerecht hindurch.
 * Die Breiten skalieren mit den Eingaben, der Durchmesser mit d.
 */
export function BolzenDiagram({ d, tS, tG, einbaufall }: BolzenDiagramProps) {
  const W = 520
  const H = 300
  const cy = H / 2

  // Skalierung der Achsbreiten auf die Zeichenfläche
  const totalReal = tG + tS + tG || 1
  const usable = W - 120 // Rand links/rechts für Bolzenüberstand
  const scale = usable / totalReal
  const gW = tG * scale
  const sW = tS * scale
  const x0 = 60 // linker Beginn der Gabel

  // Bolzendurchmesser proportional, begrenzt
  const maxBolt = H * 0.45
  const boltH = Math.min(maxBolt, Math.max(16, (d / totalReal) * usable * 0.9))

  const partH = boltH * 1.9 // Bauteilhöhe (Lasche/Stange) größer als Bolzen

  const xGabel1 = x0
  const xStange = x0 + gW
  const xGabel2 = x0 + gW + sW
  const xEnd = x0 + gW + sW + gW

  const boltTop = cy - boltH / 2
  const boltBottom = cy + boltH / 2

  // feste Einspannung markieren (Schraffur-Andeutung per Farbe)
  const gabelFest = einbaufall === 2
  const stangeFest = einbaufall === 3

  const partFill = '#e2e8f0'
  const festFill = '#fcd34d'

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Schematische Darstellung der Bolzenverbindung"
    >
      {/* Bauteile */}
      <rect
        x={xGabel1}
        y={cy - partH / 2}
        width={gW}
        height={partH}
        rx={4}
        fill={gabelFest ? festFill : partFill}
        stroke="#94a3b8"
      />
      <rect
        x={xStange}
        y={cy - partH / 2}
        width={sW}
        height={partH}
        rx={4}
        fill={stangeFest ? festFill : partFill}
        stroke="#94a3b8"
      />
      <rect
        x={xGabel2}
        y={cy - partH / 2}
        width={gW}
        height={partH}
        rx={4}
        fill={gabelFest ? festFill : partFill}
        stroke="#94a3b8"
      />

      {/* Bolzen */}
      <rect
        x={x0 - 28}
        y={boltTop}
        width={xEnd - x0 + 56}
        height={boltH}
        rx={boltH / 2}
        fill="#0ea5e9"
        opacity={0.9}
        stroke="#0369a1"
      />

      {/* Lastpfeil F an der Stange */}
      <g stroke="#dc2626" strokeWidth={2.5} fill="#dc2626">
        <line
          x1={xStange + sW / 2}
          y1={cy - partH / 2 - 8}
          x2={xStange + sW / 2}
          y2={cy - partH / 2 - 48}
        />
        <polygon
          points={`${xStange + sW / 2 - 6},${cy - partH / 2 - 8} ${
            xStange + sW / 2 + 6
          },${cy - partH / 2 - 8} ${xStange + sW / 2},${cy - partH / 2 + 2}`}
        />
        <text
          x={xStange + sW / 2 + 10}
          y={cy - partH / 2 - 30}
          fontSize="15"
          fontWeight="700"
        >
          F
        </text>
      </g>

      {/* Maßlinien t_G, t_S, t_G */}
      <Bemassung x1={xGabel1} x2={xStange} y={cy + partH / 2 + 26} label="t_G" />
      <Bemassung x1={xStange} x2={xGabel2} y={cy + partH / 2 + 26} label="t_S" />
      <Bemassung x1={xGabel2} x2={xEnd} y={cy + partH / 2 + 26} label="t_G" />

      {/* Durchmesser d */}
      <g stroke="#64748b" strokeWidth={1} fill="#475569">
        <line x1={x0 - 38} y1={boltTop} x2={x0 - 38} y2={boltBottom} />
        <text
          x={x0 - 44}
          y={cy + 4}
          fontSize="13"
          textAnchor="end"
          fontStyle="italic"
        >
          d
        </text>
      </g>
    </svg>
  )
}

function Bemassung({
  x1,
  x2,
  y,
  label,
}: {
  x1: number
  x2: number
  y: number
  label: string
}) {
  const mid = (x1 + x2) / 2
  return (
    <g stroke="#64748b" strokeWidth={1} fill="#475569">
      <line x1={x1} y1={y - 4} x2={x1} y2={y + 4} />
      <line x1={x2} y1={y - 4} x2={x2} y2={y + 4} />
      <line x1={x1} y1={y} x2={x2} y2={y} />
      <text
        x={mid}
        y={y + 16}
        fontSize="12"
        textAnchor="middle"
        fontStyle="italic"
        stroke="none"
      >
        {label}
      </text>
    </g>
  )
}
