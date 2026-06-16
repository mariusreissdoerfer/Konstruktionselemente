import { fmt } from '../calc/format'
import { biegemoment } from '../calc/bolzen/bolzen'
import type { Einbaufall } from '../calc/types'

export interface BolzenDiagramProps {
  F: number
  d: number
  tS: number
  tG: number
  /** Stangen-Steg (Breite senkrecht zur Kraft) b_S in mm */
  bS: number
  /** Gabel-Steg je Lasche b_G in mm */
  bG: number
  /** Randabstand Stange in Kraftrichtung c_S in mm */
  cS: number
  /** Randabstand Gabel je Lasche c_G in mm */
  cG: number
  spalt: number
  einbaufall: Einbaufall
  /** Buchsen-Außendurchmesser in der Stange (mm) oder null */
  buchseStangeDa: number | null
  /** Buchsen-Außendurchmesser in der Gabel (mm) oder null */
  buchseGabelDa: number | null
  /** Lagerbreite des Kugelgelenks (mm) oder null */
  kugelB: number | null
}

const COL = {
  gabel: '#94a3b8',
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
  moment: '#0ea5e9',
}

/** gemeinsamer Maßstab (px pro mm) für beide Ansichten */
function useScale({ d, tS, tG, bS, bG, cS, cG, spalt, buchseStangeDa, buchseGabelDa }: BolzenDiagramProps) {
  const dMax = Math.max(d, buchseStangeDa ?? 0, buchseGabelDa ?? 0, 6)
  const wMax = Math.max(bS, bG, dMax) // Breiten (quer)
  const hMax = Math.max(2 * cS, 2 * cG, dMax) // Höhen (Kraftrichtung)
  const L = 2 * tG + 2 * spalt + tS || 1
  const s = Math.min(300 / L, 150 / Math.max(wMax, hMax), 80 / dMax, 4)
  return { s }
}

export function BolzenDiagram(props: BolzenDiagramProps) {
  const { s } = useScale(props)
  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <figure className="lg:w-[36%]">
        <Seitenansicht {...props} s={s} />
        <figcaption className="mt-1 text-center text-xs text-slate-400">
          Seitenansicht – Stegbreite b (quer zur Kraft)
        </figcaption>
      </figure>
      <figure className="lg:flex-1">
        <Vorderansicht {...props} s={s} />
        <figcaption className="mt-1 text-center text-xs text-slate-400">
          Vorderansicht – Randabstand c (in Kraftrichtung) + Biegemoment
        </figcaption>
      </figure>
    </div>
  )
}

type ViewProps = BolzenDiagramProps & { s: number }

/* ----------------------------- Seitenansicht ----------------------------- */
/* Blick entlang der Bolzenachse: Augenfläche. Zeigt Steg-Breite b (quer)
   und Randabstand c (Höhe). */

function Seitenansicht({ d, bS, bG, cS, cG, einbaufall, buchseStangeDa, buchseGabelDa, kugelB, s }: ViewProps) {
  const wG = Math.max(bG, d) * s
  const wS = Math.max(bS, d) * s
  const hG = Math.max(2 * cG, d) * s
  const hS = Math.max(2 * cS, d) * s
  const rp = (d * s) / 2
  const da = buchseStangeDa ?? buchseGabelDa
  const rb = da ? (da * s) / 2 : 0

  const wOuter = Math.max(wG, wS)
  const hOuter = Math.max(hG, hS)
  const W = Math.max(220, wOuter + 120)
  const cx = W * 0.46
  const top = 16
  const cy = top + 50 + hOuter / 2
  const H = cy + hOuter / 2 + 96

  const gabelFest = einbaufall === 2
  const stangeFest = einbaufall === 3
  const stemW = Math.min(wG, wS) * 0.6

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Seitenansicht">
      <Ground x={cx - 32} y={top} w={64} />
      {/* Gabel: Stiel + Auge (hinten) */}
      <rect x={cx - stemW / 2} y={top} width={stemW} height={cy - top} fill={gabelFest ? COL.fest : COL.gabel} stroke={COL.stroke} strokeWidth={1.5} />
      <rect x={cx - wG / 2} y={cy - hG / 2} width={wG} height={hG} rx={Math.min(wG, hG) / 2} fill={gabelFest ? COL.fest : COL.gabel} stroke={COL.stroke} strokeWidth={1.5} />
      {/* Stange: Auge (vorne) + Stiel nach unten */}
      <rect x={cx - stemW / 2} y={cy} width={stemW} height={H - 44 - cy} fill={stangeFest ? COL.fest : COL.stange} stroke={COL.stroke} strokeWidth={1.5} />
      <rect x={cx - wS / 2} y={cy - hS / 2} width={wS} height={hS} rx={Math.min(wS, hS) / 2} fill={stangeFest ? COL.fest : COL.stange} stroke={COL.stroke} strokeWidth={1.5} />

      {rb > 0 && <circle cx={cx} cy={cy} r={rb} fill={COL.buchse} stroke={COL.buchseStroke} strokeWidth={1.2} />}
      {kugelB && (
        <>
          <circle cx={cx} cy={cy} r={Math.min(wS, hS) / 2 - 3} fill={COL.ball} stroke={COL.ballDark} strokeWidth={1.3} />
          <circle cx={cx} cy={cy} r={Math.min(wS, hS) / 2 - 8} fill="#eef2f7" stroke={COL.ballDark} strokeWidth={1.1} />
        </>
      )}
      {/* Bolzen (Loch) */}
      <circle cx={cx} cy={cy} r={rp} fill={COL.bolzen} stroke={COL.bolzenStroke} strokeWidth={1.5} />

      {/* Kraft F */}
      <g stroke={COL.kraft} strokeWidth={2.5} fill={COL.kraft}>
        <line x1={cx} y1={H - 42} x2={cx} y2={H - 10} />
        <polygon points={`${cx - 6},${H - 16} ${cx + 6},${H - 16} ${cx},${H - 4}`} />
        <text x={cx + 11} y={H - 22} fontSize="14" fontWeight="700">F</text>
      </g>

      {/* Steg-Breiten b (horizontal) */}
      <HBemassung y={cy + hOuter / 2 + 20} x1={cx - wS / 2} x2={cx + wS / 2} refY={cy + hS / 2} label={`b_S ${fmt(bS)}`} />
      <HBemassung y={cy - hOuter / 2 - 16} x1={cx - wG / 2} x2={cx + wG / 2} refY={cy - hG / 2} label={`b_G ${fmt(bG)}`} up />

      {/* Loch ⌀d (klein, in der Mitte) */}
      <text x={cx + rp + 6} y={cy - rp - 2} fontSize="10" fill={COL.bolzenStroke}>⌀d {fmt(d)}</text>
    </svg>
  )
}

/* ----------------------------- Vorderansicht ----------------------------- */
/* Schnitt durch die Bolzenachse: zeigt Dicken t, Loch d, Randabstand c
   (in Kraftrichtung) und den Biegemomentverlauf. */

function Vorderansicht({ F, d, tS, tG, cS, cG, spalt, einbaufall, buchseStangeDa, buchseGabelDa, kugelB, s }: ViewProps) {
  const dp = d * s
  const ehG = Math.max(2 * cG, d) * s // Augenhöhe Gabel (Kraftrichtung)
  const ehS = Math.max(2 * cS, d) * s // Augenhöhe Stange
  const hMax = Math.max(ehG, ehS)
  const gW = tG * s
  const gapW = spalt * s
  const sW = tS * s

  const xLeftDim = 80
  const xG1 = xLeftDim
  const xGap1 = xG1 + gW
  const xStange = xGap1 + gapW
  const xGap2 = xStange + sW
  const xG2 = xGap2 + gapW
  const xEnd = xG2 + gW
  const W = xEnd + 84

  const groundY = 6
  const shankH = 24
  const yokeH = Math.max(10, ehG * 0.22)
  const cy = groundY + shankH + yokeH + hMax / 2
  const earsTopG = cy - ehG / 2
  const earsTopS = cy - ehS / 2
  const bottom = cy + hMax / 2
  const dimY = bottom + 22
  const rodBottom = dimY + 32
  const fEndY = rodBottom + 24
  const momBase = fEndY + 34
  const momAmp = 26
  const momLabelY = momBase + momAmp + 22
  const legendY = momLabelY + 20
  const H = legendY + 8

  const gabelFest = einbaufall === 2
  const stangeFest = einbaufall === 3
  const boltTop = cy - dp / 2
  const boltBottom = cy + dp / 2
  const earFill = gabelFest ? COL.fest : COL.gabel
  const earStroke = gabelFest ? COL.festStroke : COL.stroke
  const rodFill = stangeFest ? COL.fest : COL.stange
  const rodStroke = stangeFest ? COL.festStroke : COL.stroke

  // Biegemoment (qualitativ)
  const Mb = biegemoment(F, tS, tG, spalt, einbaufall)
  const relL = (xStange - xG1) / (xEnd - xG1)
  const relR = (xGap2 - xG1) / (xEnd - xG1)
  const profil = (t: number): number => {
    const a = 2 * t - 1
    if (einbaufall === 1) return 1 - a * a
    if (einbaufall === 2) return -Math.cos(2 * Math.PI * t)
    if (t < relL) return relL > 0 ? t / relL : 1
    if (t > relR) return relR < 1 ? (1 - t) / (1 - relR) : 1
    return 1
  }
  const N = 60
  const momPts: string[] = []
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const x = xG1 + t * (xEnd - xG1)
    momPts.push(`${(x).toFixed(1)},${(momBase + profil(t) * momAmp).toFixed(1)}`)
  }

  const bushing = (x: number, w: number, da: number | null, key: string) =>
    da ? (
      <rect key={key} x={x} y={cy - (da * s) / 2} width={w} height={da * s} fill={COL.buchse} stroke={COL.buchseStroke} strokeWidth={1.2} />
    ) : null

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Vorderansicht mit Biegemoment">
      <defs>
        <pattern id="hatchF" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" stroke={COL.stroke} strokeWidth="0.7" />
        </pattern>
      </defs>

      {/* Gabel: Einspannung + Stiel + Joch + zwei Laschen */}
      <Ground x={(xG1 + xEnd) / 2 - 30} y={groundY} w={60} />
      <rect x={(xG1 + xEnd) / 2 - gW / 2} y={groundY} width={gW} height={shankH} fill={earFill} stroke={earStroke} strokeWidth={1.5} />
      <rect x={xG1} y={earsTopG - yokeH} width={xEnd - xG1} height={yokeH} fill={earFill} stroke={earStroke} strokeWidth={1.5} />
      <Lasche x={xG1} w={gW} top={earsTopG} h={ehG} fill={earFill} stroke={earStroke} />
      <Lasche x={xG2} w={gW} top={earsTopG} h={ehG} fill={earFill} stroke={earStroke} />

      {/* Stange */}
      {!kugelB && <Lasche x={xStange} w={sW} top={earsTopS} h={ehS} fill={rodFill} stroke={rodStroke} />}
      {kugelB &&
        (() => {
          const cxk = xStange + sW / 2
          const rOut = Math.max(6, Math.min(sW, ehS) / 2 - 2)
          const rBall = Math.max(4, rOut - 4)
          return (
            <g>
              <rect x={xStange} y={earsTopS} width={sW} height={ehS} rx={Math.min(sW / 2, 8)} fill={rodFill} stroke={rodStroke} strokeWidth={1.5} />
              <circle cx={cxk} cy={cy} r={rOut} fill={COL.ball} stroke={COL.ballDark} strokeWidth={1.3} />
              <circle cx={cxk} cy={cy} r={rBall} fill="#eef2f7" stroke={COL.ballDark} strokeWidth={1.1} />
              <circle cx={cxk - rBall * 0.3} cy={cy - rBall * 0.3} r={Math.max(rBall * 0.22, 2)} fill="#ffffff" opacity={0.7} stroke="none" />
            </g>
          )
        })()}
      <rect x={xStange + sW / 2 - Math.max(sW * 0.32, 6)} y={cy + ehS / 2} width={Math.max(sW * 0.64, 12)} height={rodBottom - (cy + ehS / 2)} fill={rodFill} stroke={rodStroke} strokeWidth={1.5} />
      <g stroke={COL.kraft} strokeWidth={2.5} fill={COL.kraft}>
        <line x1={xStange + sW / 2} y1={rodBottom} x2={xStange + sW / 2} y2={fEndY} />
        <polygon points={`${xStange + sW / 2 - 6},${fEndY - 8} ${xStange + sW / 2 + 6},${fEndY - 8} ${xStange + sW / 2},${fEndY + 2}`} />
        <text x={xStange + sW / 2 + 10} y={fEndY - 6} fontSize="14" fontWeight="700">F</text>
      </g>

      {bushing(xG1, gW, buchseGabelDa, 'bg1')}
      {bushing(xG2, gW, buchseGabelDa, 'bg2')}
      {!kugelB && bushing(xStange, sW, buchseStangeDa, 'bs')}

      {/* Bolzen + Kopf + Splint */}
      <rect x={xG1 - 24} y={boltTop} width={xEnd - xG1 + 48} height={dp} rx={3} fill={COL.bolzen} opacity={0.92} stroke={COL.bolzenStroke} strokeWidth={1.5} />
      <rect x={xG1 - 34} y={boltTop - 5} width={11} height={dp + 10} rx={2} fill={COL.bolzen} stroke={COL.bolzenStroke} strokeWidth={1.5} />
      <line x1={xEnd + 18} y1={boltTop - 4} x2={xEnd + 18} y2={boltBottom + 4} stroke={COL.bolzenStroke} strokeWidth={2} />

      {/* Maße unten: t_G a t_S a t_G */}
      <Bemassung x1={xG1} x2={xGap1} y={dimY} label={`t_G ${fmt(tG)}`} />
      {spalt > 0 && <Bemassung x1={xGap1} x2={xStange} y={dimY} label={`a ${fmt(spalt)}`} />}
      <Bemassung x1={xStange} x2={xGap2} y={dimY} label={`t_S ${fmt(tS)}`} />
      {spalt > 0 && <Bemassung x1={xGap2} x2={xG2} y={dimY} label={`a ${fmt(spalt)}`} />}
      <Bemassung x1={xG2} x2={xEnd} y={dimY} label={`t_G ${fmt(tG)}`} />

      {/* ⌀d links */}
      <g stroke={COL.mass} strokeWidth={1} fill={COL.mass}>
        <line x1={xLeftDim - 50} y1={boltTop} x2={xLeftDim - 50} y2={boltBottom} />
        <Pfeilkopf x={xLeftDim - 50} y={boltTop} dir={1} />
        <Pfeilkopf x={xLeftDim - 50} y={boltBottom} dir={-1} />
        <text x={xLeftDim - 62} y={cy} fontSize="11" textAnchor="middle" stroke="none" transform={`rotate(-90 ${xLeftDim - 62} ${cy})`}>
          ⌀d = {fmt(d)}
        </text>
      </g>

      {/* Randabstände c (Lochmitte → Stirnkante) rechts */}
      <CDim x={xEnd + 22} refX={xG2 + gW} yMitte={cy} yKante={earsTopG} label={`c_G ${fmt(cG)}`} />
      <CDim x={xEnd + 52} refX={xGap2} yMitte={cy} yKante={earsTopS} label={`c_S ${fmt(cS)}`} />

      {/* Biegemoment */}
      <g>
        <line x1={xG1} y1={momBase} x2={xEnd} y2={momBase} stroke={COL.stroke} strokeWidth={1} />
        <polyline points={momPts.join(' ')} fill={COL.moment} fillOpacity={0.18} stroke={COL.moment} strokeWidth={1.6} />
        <text x={(xG1 + xEnd) / 2} y={momLabelY} fontSize="11" textAnchor="middle" fill={COL.stroke}>
          Biegemoment (qual.) · max M_b = {fmt(Mb)} N·mm
        </text>
      </g>

      {/* Legende */}
      <g fontSize="10.5" fill={COL.stroke}>
        <Legende x={xG1} y={legendY} color={COL.bolzen} label="Bolzen" />
        <Legende x={xG1 + 66} y={legendY} color={COL.gabel} label="Gabel" />
        <Legende x={xG1 + 128} y={legendY} color={COL.stange} label="Stange" />
        {(buchseGabelDa || buchseStangeDa) && <Legende x={xG1 + 196} y={legendY} color={COL.buchse} label="Buchse" />}
        {kugelB && <Legende x={xG1 + 196} y={legendY} color={COL.ball} label="Kugelgelenk" />}
      </g>
    </svg>
  )
}

/* ------------------------------- Helfer ---------------------------------- */

function Lasche({ x, w, top, h, fill, stroke }: { x: number; w: number; top: number; h: number; fill: string; stroke: string }) {
  return (
    <g>
      <rect x={x} y={top} width={w} height={h} rx={Math.min(w, 6)} fill={fill} stroke={stroke} strokeWidth={1.5} />
      <rect x={x} y={top} width={w} height={h} rx={Math.min(w, 6)} fill="url(#hatchF)" opacity={0.45} />
    </g>
  )
}

function Ground({ x, y, w }: { x: number; y: number; w: number }) {
  const ticks = []
  for (let i = 0; i <= w; i += 8) {
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

/** waagerechtes Maß (Breite) mit Hilfslinien zur Kante. */
function HBemassung({ x1, x2, y, refY, label, up }: { x1: number; x2: number; y: number; refY: number; label: string; up?: boolean }) {
  const mid = (x1 + x2) / 2
  return (
    <g stroke={COL.mass} strokeWidth={1} fill={COL.mass}>
      <line x1={x1} y1={refY} x2={x1} y2={y} strokeWidth={0.6} opacity={0.6} />
      <line x1={x2} y1={refY} x2={x2} y2={y} strokeWidth={0.6} opacity={0.6} />
      <line x1={x1} y1={y} x2={x2} y2={y} />
      <Pfeilkopf x={x1} y={y} dir={0} />
      <text x={mid} y={up ? y - 5 : y + 13} fontSize="10.5" textAnchor="middle" stroke="none">{label}</text>
    </g>
  )
}

/** senkrechtes Randabstands-Maß von Lochmitte zur Stirnkante. */
function CDim({ x, refX, yMitte, yKante, label }: { x: number; refX: number; yMitte: number; yKante: number; label: string }) {
  const mid = (yMitte + yKante) / 2
  return (
    <g stroke={COL.mass} strokeWidth={1} fill={COL.mass}>
      <line x1={refX} y1={yKante} x2={x} y2={yKante} strokeWidth={0.6} opacity={0.6} />
      <line x1={refX} y1={yMitte} x2={x} y2={yMitte} strokeWidth={0.6} opacity={0.6} />
      <line x1={x} y1={yMitte} x2={x} y2={yKante} />
      <Pfeilkopf x={x} y={yKante} dir={1} />
      <Pfeilkopf x={x} y={yMitte} dir={-1} />
      <text x={x + 11} y={mid} fontSize="10" textAnchor="middle" stroke="none" transform={`rotate(-90 ${x + 11} ${mid})`}>{label}</text>
    </g>
  )
}
