import { fmt } from '../calc/format'
import type { Einbaufall } from '../calc/types'

export interface BolzenDiagramProps {
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

const COL = {
  gabel: '#94a3b8',
  gabelLight: '#cbd5e1',
  stange: '#e2e8f0',
  stroke: '#475569',
  fest: '#fcd34d',
  festStroke: '#d97706',
  bolzen: '#0ea5e9',
  bolzenStroke: '#0369a1',
  buchse: '#fbbf24',
  buchseStroke: '#b45309',
  ball: '#9ca3af',
  ballDark: '#374151',
  mass: '#334155',
  kraft: '#dc2626',
}

export function BolzenDiagram(props: BolzenDiagramProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <figure className="lg:w-[38%]">
        <Seitenansicht {...props} />
        <figcaption className="mt-1 text-center text-xs text-slate-400">
          Seitenansicht
        </figcaption>
      </figure>
      <figure className="lg:flex-1">
        <Laengsschnitt {...props} />
        <figcaption className="mt-1 text-center text-xs text-slate-400">
          Längsschnitt (Schnitt durch die Bolzenachse)
        </figcaption>
      </figure>
    </div>
  )
}

/* ----------------------------- Seitenansicht ----------------------------- */

function Seitenansicht({ d, einbaufall, buchseDa, kugelB }: BolzenDiagramProps) {
  const W = 220
  const H = 300
  const cx = W / 2
  const cy = 158

  const dMax = Math.max(d, buchseDa ?? 0, 6)
  const rp = (d / dMax) * 38 // Bolzenradius
  const rb = buchseDa ? (buchseDa / dMax) * 38 : 0 // Buchsenaußenradius
  const rEye = Math.max(rp, rb) + 16 // Augenradius Stange
  const rFork = rEye + 10 // Gabel-Halo

  const gabelFest = einbaufall === 2
  const stangeFest = einbaufall === 3

  const stemW = rEye * 1.2

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Seitenansicht der Bolzenverbindung">
      {/* feste Einspannung oben (Gabel angebunden) */}
      <Ground x={cx - 34} y={16} w={68} />

      {/* Gabel: Stiel nach oben + Augenring (hinter der Stange) */}
      <rect x={cx - stemW / 2} y={20} width={stemW} height={cy - 20} fill={gabelFest ? COL.fest : COL.gabel} stroke={COL.stroke} strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={rFork} fill={gabelFest ? COL.fest : COL.gabel} stroke={COL.stroke} strokeWidth={1.5} />

      {/* Stange: Augenring (vorne) + Stiel nach unten */}
      <rect x={cx - stemW / 2} y={cy} width={stemW} height={H - 40 - cy} fill={stangeFest ? COL.fest : COL.stange} stroke={COL.stroke} strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={rEye} fill={stangeFest ? COL.fest : COL.stange} stroke={COL.stroke} strokeWidth={1.5} />

      {/* Buchse als Ring */}
      {buchseDa && (
        <>
          <circle cx={cx} cy={cy} r={rb} fill={COL.buchse} stroke={COL.buchseStroke} strokeWidth={1.2} />
        </>
      )}

      {/* Kugelgelenk: Kalotte angedeutet */}
      {kugelB && (
        <circle cx={cx} cy={cy} r={rEye - 5} fill="none" stroke={COL.ballDark} strokeWidth={1.5} strokeDasharray="3 3" />
      )}

      {/* Bolzen (Loch / Stift) */}
      <circle cx={cx} cy={cy} r={rp} fill={COL.bolzen} stroke={COL.bolzenStroke} strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={Math.max(rp - 3, 1)} fill="none" stroke={COL.bolzenStroke} strokeWidth={0.8} opacity={0.5} />

      {/* Kraft F nach unten an der Stange */}
      <g stroke={COL.kraft} strokeWidth={2.5} fill={COL.kraft}>
        <line x1={cx} y1={H - 40} x2={cx} y2={H - 8} />
        <polygon points={`${cx - 6},${H - 14} ${cx + 6},${H - 14} ${cx},${H - 2}`} />
        <text x={cx + 11} y={H - 16} fontSize="15" fontWeight="700">F</text>
      </g>

      {/* Beschriftung */}
      <text x={cx + rFork + 4} y={40} fontSize="11" fill={COL.stroke}>Gabel</text>
      <text x={cx + rEye + 6} y={H - 56} fontSize="11" fill={COL.stroke}>Stange</text>
    </svg>
  )
}

/* ----------------------------- Längsschnitt ------------------------------ */

function Laengsschnitt({ d, tS, tG, spalt, einbaufall, buchseDa, kugelB }: BolzenDiagramProps) {
  const W = 560
  const H = 300
  const cy = H / 2 - 12

  const totalReal = 2 * tG + 2 * spalt + tS || 1
  const x0 = 104
  const usable = W - x0 - 56
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

  const dMax = Math.max(d, buchseDa ?? 0, 6)
  const vScale = Math.min(70 / dMax, 6)
  const boltH = Math.max(10, d * vScale)
  const daH = (buchseDa ?? 0) * vScale
  const partH = Math.min(160, Math.max(boltH, daH) * 1.7 + 26)

  const boltTop = cy - boltH / 2
  const boltBottom = cy + boltH / 2
  const partTop = cy - partH / 2
  const partBottom = cy + partH / 2

  const gabelFest = einbaufall === 2
  const stangeFest = einbaufall === 3

  const plate = (x: number, w: number, fest: boolean, key: string) => (
    <g key={key}>
      <rect x={x} y={partTop} width={w} height={partH} fill={fest ? COL.fest : COL.gabelLight} stroke={fest ? COL.festStroke : COL.stroke} strokeWidth={1.5} />
      <rect x={x} y={partTop} width={w} height={partH} fill="url(#hatch)" opacity={0.5} />
    </g>
  )

  const bushing = (x: number, w: number, key: string) =>
    buchseDa ? (
      <rect key={key} x={x} y={cy - daH / 2} width={w} height={daH} rx={Math.min(4, daH / 2)} fill={COL.buchse} stroke={COL.buchseStroke} strokeWidth={1.3} />
    ) : null

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Längsschnitt der Bolzenverbindung">
      <defs>
        <pattern id="hatch" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" stroke={COL.stroke} strokeWidth="0.8" />
        </pattern>
      </defs>

      {/* Bauteile (Schnitt) */}
      {plate(xG1, gW, gabelFest, 'g1')}
      {plate(xG2, gW, gabelFest, 'g2')}
      {!kugelB && plate(xStange, sW, stangeFest, 's')}

      {/* Kugelgelenk in der Stange */}
      {kugelB && (
        <g>
          <rect x={xStange} y={partTop} width={sW} height={partH} rx={Math.min(sW, partH) / 2} fill={COL.gabelLight} stroke={COL.stroke} strokeWidth={1.5} />
          <ellipse cx={xStange + sW / 2} cy={cy} rx={Math.max(sW / 2 - 3, 6)} ry={partH / 2 - 6} fill={COL.ball} stroke={COL.ballDark} strokeWidth={1.5} />
          <ellipse cx={xStange + sW / 2} cy={cy} rx={Math.max(sW / 2 - 10, 4)} ry={partH / 2 - 15} fill="#e5e7eb" stroke={COL.ballDark} strokeWidth={1.2} />
        </g>
      )}

      {/* Buchsen */}
      {bushing(xG1, gW, 'bg1')}
      {bushing(xG2, gW, 'bg2')}
      {!kugelB && bushing(xStange, sW, 'bs')}

      {/* Bolzen mit Kopf (links) und Splint (rechts) */}
      <rect x={x0 - 30} y={boltTop} width={xEnd - x0 + 60} height={boltH} rx={3} fill={COL.bolzen} opacity={0.92} stroke={COL.bolzenStroke} strokeWidth={1.5} />
      {/* Kopf */}
      <rect x={x0 - 40} y={boltTop - 5} width={12} height={boltH + 10} rx={2} fill={COL.bolzen} stroke={COL.bolzenStroke} strokeWidth={1.5} />
      {/* Splint */}
      <line x1={xEnd + 22} y1={boltTop - 4} x2={xEnd + 22} y2={boltBottom + 4} stroke={COL.bolzenStroke} strokeWidth={2} />

      {/* Lastpfeil F an der Stange */}
      <g stroke={COL.kraft} strokeWidth={2.5} fill={COL.kraft}>
        <line x1={xStange + sW / 2} y1={partTop - 6} x2={xStange + sW / 2} y2={partTop - 44} />
        <polygon points={`${xStange + sW / 2 - 6},${partTop - 6} ${xStange + sW / 2 + 6},${partTop - 6} ${xStange + sW / 2},${partTop + 4}`} />
        <text x={xStange + sW / 2 + 10} y={partTop - 24} fontSize="15" fontWeight="700">F</text>
      </g>

      {/* Maßlinien unten */}
      <Bemassung x1={xG1} x2={xGap1} y={partBottom + 22} label={`t_G ${fmt(tG)}`} />
      {spalt > 0 && <Bemassung x1={xGap1} x2={xStange} y={partBottom + 22} label={`a ${fmt(spalt)}`} />}
      <Bemassung x1={xStange} x2={xGap2} y={partBottom + 22} label={`t_S ${fmt(tS)}`} />
      {spalt > 0 && <Bemassung x1={xGap2} x2={xG2} y={partBottom + 22} label={`a ${fmt(spalt)}`} />}
      <Bemassung x1={xG2} x2={xEnd} y={partBottom + 22} label={`t_G ${fmt(tG)}`} />

      {/* Durchmesser d / d_a links (vertikal beschriftet) */}
      <g stroke={COL.mass} strokeWidth={1} fill={COL.mass}>
        <line x1={x0 - 50} y1={boltTop} x2={x0 - 50} y2={boltBottom} />
        <Pfeilkopf x={x0 - 50} y={boltTop} dir={1} />
        <Pfeilkopf x={x0 - 50} y={boltBottom} dir={-1} />
        <text x={x0 - 62} y={cy} fontSize="11" textAnchor="middle" fontStyle="italic" stroke="none" transform={`rotate(-90 ${x0 - 62} ${cy})`}>
          ⌀d = {fmt(d)}
        </text>
        {buchseDa && (
          <>
            <line x1={x0 - 72} y1={cy - daH / 2} x2={x0 - 72} y2={cy + daH / 2} stroke={COL.buchseStroke} />
            <Pfeilkopf x={x0 - 72} y={cy - daH / 2} dir={1} />
            <Pfeilkopf x={x0 - 72} y={cy + daH / 2} dir={-1} />
            <text x={x0 - 84} y={cy} fontSize="10" textAnchor="middle" fill={COL.buchseStroke} stroke="none" transform={`rotate(-90 ${x0 - 84} ${cy})`}>
              ⌀dₐ = {fmt(buchseDa)}
            </text>
          </>
        )}
      </g>

      {/* Legende */}
      <g fontSize="10.5" fill={COL.stroke}>
        <Legende x={x0} y={H - 6} color={COL.bolzen} label="Bolzen" />
        <Legende x={x0 + 70} y={H - 6} color={COL.gabelLight} label="Blech" />
        {(gabelFest || stangeFest) && <Legende x={x0 + 135} y={H - 6} color={COL.fest} label="Übermaß (fest)" />}
        {buchseDa && <Legende x={x0 + 255} y={H - 6} color={COL.buchse} label="Buchse" />}
        {kugelB && <Legende x={x0 + 255} y={H - 6} color={COL.ball} label="Kugelgelenk" />}
      </g>
    </svg>
  )
}

/* ------------------------------- Helfer ---------------------------------- */

function Ground({ x, y, w }: { x: number; y: number; w: number }) {
  const ticks = []
  for (let i = 0; i < w; i += 8) {
    ticks.push(<line key={i} x1={x + i} y1={y} x2={x + i - 6} y2={y + 7} stroke={COL.stroke} strokeWidth={1} />)
  }
  return (
    <g>
      <line x1={x} y1={y} x2={x + w} y2={y} stroke={COL.stroke} strokeWidth={1.5} />
      {ticks}
    </g>
  )
}

function Pfeilkopf({ x, y, dir }: { x: number; y: number; dir: number }) {
  return <polygon points={`${x - 3},${y + dir * 6} ${x + 3},${y + dir * 6} ${x},${y}`} stroke="none" />
}

function Legende({ x, y, color, label }: { x: number; y: number; color: string; label: string }) {
  return (
    <g>
      <rect x={x} y={y - 9} width={12} height={12} rx={2} fill={color} stroke="#94a3b8" />
      <text x={x + 17} y={y} stroke="none">{label}</text>
    </g>
  )
}

function Bemassung({ x1, x2, y, label }: { x1: number; x2: number; y: number; label: string }) {
  const mid = (x1 + x2) / 2
  return (
    <g stroke={COL.mass} strokeWidth={1} fill={COL.mass}>
      <line x1={x1} y1={y - 4} x2={x1} y2={y + 4} />
      <line x1={x2} y1={y - 4} x2={x2} y2={y + 4} />
      <line x1={x1} y1={y} x2={x2} y2={y} />
      <text x={mid} y={y + 14} fontSize="10.5" textAnchor="middle" stroke="none">{label}</text>
    </g>
  )
}
