import { fmt } from '../calc/format'
import type { Einbaufall } from '../calc/types'

interface BolzenDiagramProps {
  d: number
  tS: number
  tG: number
  spalt: number
  einbaufall: Einbaufall
  /** Außendurchmesser der Buchse in mm, oder null wenn keine Buchse */
  buchseDa: number | null
  /** Lagerbreite des Kugelgelenks in mm, oder null wenn keins */
  kugelB: number | null
}

const W = 580
const H = 340

const COL = {
  stahl: '#cbd5e1',
  stahlStroke: '#64748b',
  fest: '#fcd34d',
  festStroke: '#d97706',
  bolzen: '#0ea5e9',
  bolzenStroke: '#0369a1',
  buchse: '#d97706',
  buchseFill: '#fde68a',
  ball: '#94a3b8',
  ballDark: '#475569',
  mass: '#475569',
  kraft: '#dc2626',
}

/**
 * Schematischer Längsschnitt der Bolzenverbindung:
 * Gabel · Spalt · Stange · Spalt · Gabel, Bolzen waagerecht hindurch.
 * Optional mit Buchsen (Ringe) und Kugelgelenk in der Stange.
 */
export function BolzenDiagram({
  d,
  tS,
  tG,
  spalt,
  einbaufall,
  buchseDa,
  kugelB,
}: BolzenDiagramProps) {
  const cy = H / 2 - 10

  // Breitenskalierung
  const totalReal = 2 * tG + 2 * spalt + tS || 1
  const x0 = 72
  const usable = W - 2 * x0
  const sc = usable / totalReal
  const gW = tG * sc
  const gapW = spalt * sc
  const sW = tS * sc

  const xG1 = x0
  const xGap1 = xG1 + gW
  const xStange = xGap1 + gapW
  const xGap2 = xStange + sW
  const xG2 = xGap2 + gapW
  const xEnd = xG2 + gW

  // Höhenskalierung: größter Durchmesser (Bolzen oder Buchse) → max. Höhe
  const dMax = Math.max(d, buchseDa ?? 0, 6)
  const vScale = Math.min(72 / dMax, 6)
  const boltH = Math.max(10, d * vScale)
  const daH = (buchseDa ?? 0) * vScale
  const partH = Math.min(170, Math.max(boltH, daH) * 1.7 + 24)

  const boltTop = cy - boltH / 2
  const boltBottom = cy + boltH / 2
  const partTop = cy - partH / 2
  const partBottom = cy + partH / 2

  const gabelFest = einbaufall === 2
  const stangeFest = einbaufall === 3

  const plate = (x: number, w: number, fest: boolean) => (
    <rect
      x={x}
      y={partTop}
      width={w}
      height={partH}
      rx={3}
      fill={fest ? COL.fest : COL.stahl}
      stroke={fest ? COL.festStroke : COL.stahlStroke}
      strokeWidth={1.5}
    />
  )

  const bushing = (x: number, w: number) =>
    buchseDa ? (
      <rect
        x={x}
        y={cy - daH / 2}
        width={w}
        height={daH}
        rx={daH / 2}
        fill={COL.buchseFill}
        stroke={COL.buchse}
        strokeWidth={1.5}
      />
    ) : null

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Schematische Darstellung der Bolzenverbindung"
    >
      {/* Bauteile */}
      {plate(xG1, gW, gabelFest)}
      {plate(xG2, gW, gabelFest)}
      {!kugelB && plate(xStange, sW, stangeFest)}

      {/* Buchsen (in den Bohrungen, hinter dem Bolzen) */}
      {bushing(xG1, gW)}
      {bushing(xG2, gW)}
      {!kugelB && bushing(xStange, sW)}

      {/* Kugelgelenk in der Stange */}
      {kugelB && (
        <g>
          {/* Augenstange als Ring */}
          <rect
            x={xStange}
            y={partTop}
            width={sW}
            height={partH}
            rx={Math.min(sW, partH) / 2}
            fill={COL.stahl}
            stroke={COL.stahlStroke}
            strokeWidth={1.5}
          />
          {/* Außenring / Kalotte */}
          <ellipse
            cx={xStange + sW / 2}
            cy={cy}
            rx={Math.max(sW / 2 - 3, 6)}
            ry={partH / 2 - 6}
            fill={COL.ball}
            stroke={COL.ballDark}
            strokeWidth={1.5}
          />
          {/* Innenring / Kugel */}
          <ellipse
            cx={xStange + sW / 2}
            cy={cy}
            rx={Math.max(sW / 2 - 9, 4)}
            ry={partH / 2 - 14}
            fill="#e2e8f0"
            stroke={COL.ballDark}
            strokeWidth={1.2}
          />
        </g>
      )}

      {/* Bolzen */}
      <rect
        x={x0 - 26}
        y={boltTop}
        width={xEnd - x0 + 52}
        height={boltH}
        rx={boltH / 2}
        fill={COL.bolzen}
        opacity={0.92}
        stroke={COL.bolzenStroke}
        strokeWidth={1.5}
      />

      {/* Lastpfeil F an der Stange */}
      <g stroke={COL.kraft} strokeWidth={2.5} fill={COL.kraft}>
        <line
          x1={xStange + sW / 2}
          y1={partTop - 6}
          x2={xStange + sW / 2}
          y2={partTop - 46}
        />
        <polygon
          points={`${xStange + sW / 2 - 6},${partTop - 6} ${xStange + sW / 2 + 6},${partTop - 6} ${xStange + sW / 2},${partTop + 4}`}
        />
        <text
          x={xStange + sW / 2 + 11}
          y={partTop - 26}
          fontSize="15"
          fontWeight="700"
        >
          F
        </text>
      </g>

      {/* Maßlinien unten: t_G [a] t_S [a] t_G */}
      <Bemassung x1={xG1} x2={xGap1} y={partBottom + 24} label={`t_G ${fmt(tG)}`} />
      {spalt > 0 && (
        <Bemassung x1={xGap1} x2={xStange} y={partBottom + 24} label={`a ${fmt(spalt)}`} />
      )}
      <Bemassung x1={xStange} x2={xGap2} y={partBottom + 24} label={`t_S ${fmt(tS)}`} />
      {spalt > 0 && (
        <Bemassung x1={xGap2} x2={xG2} y={partBottom + 24} label={`a ${fmt(spalt)}`} />
      )}
      <Bemassung x1={xG2} x2={xEnd} y={partBottom + 24} label={`t_G ${fmt(tG)}`} />

      {/* Durchmesser d (und d_a) links */}
      <g stroke={COL.mass} strokeWidth={1} fill={COL.mass}>
        <line x1={x0 - 40} y1={boltTop} x2={x0 - 40} y2={boltBottom} />
        <text x={x0 - 45} y={cy + 4} fontSize="12" textAnchor="end" fontStyle="italic">
          d {fmt(d)}
        </text>
        {buchseDa && (
          <>
            <line x1={x0 - 58} y1={cy - daH / 2} x2={x0 - 58} y2={cy + daH / 2} />
            <text
              x={x0 - 63}
              y={cy + 4}
              fontSize="11"
              textAnchor="end"
              fill={COL.buchse}
            >
              d_a {fmt(buchseDa)}
            </text>
          </>
        )}
      </g>

      {/* Legende */}
      <g fontSize="11" fill="#475569">
        <Legende x={x0} y={H - 8} color={COL.bolzen} label="Bolzen" />
        <Legende x={x0 + 80} y={H - 8} color={COL.stahl} label="Blech" />
        {(gabelFest || stangeFest) && (
          <Legende x={x0 + 150} y={H - 8} color={COL.fest} label="Übermaß (fest)" />
        )}
        {buchseDa && (
          <Legende x={x0 + 270} y={H - 8} color={COL.buchseFill} label="Buchse" />
        )}
        {kugelB && (
          <Legende x={x0 + 270} y={H - 8} color={COL.ball} label="Kugelgelenk" />
        )}
      </g>
    </svg>
  )
}

function Legende({
  x,
  y,
  color,
  label,
}: {
  x: number
  y: number
  color: string
  label: string
}) {
  return (
    <g>
      <rect x={x} y={y - 9} width={12} height={12} rx={3} fill={color} stroke="#94a3b8" />
      <text x={x + 17} y={y} stroke="none">
        {label}
      </text>
    </g>
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
    <g stroke={COL.mass} strokeWidth={1} fill={COL.mass}>
      <line x1={x1} y1={y - 4} x2={x1} y2={y + 4} />
      <line x1={x2} y1={y - 4} x2={x2} y2={y + 4} />
      <line x1={x1} y1={y} x2={x2} y2={y} />
      <text x={mid} y={y + 15} fontSize="11" textAnchor="middle" stroke="none">
        {label}
      </text>
    </g>
  )
}
