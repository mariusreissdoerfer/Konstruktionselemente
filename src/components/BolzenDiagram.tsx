import { fmt } from '../calc/format'
import { biegemoment } from '../calc/bolzen/bolzen'
import type { Einbaufall } from '../calc/types'

export interface BolzenDiagramProps {
  F: number
  d: number
  tS: number
  tG: number
  /** Stangenbreite (Augenbreite) b_S in mm */
  bS: number
  /** Gabelbreite je Lasche b_G in mm */
  bG: number
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
  blech: '#cbd5e1',
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
function useScale({ d, tS, tG, bS, bG, spalt, buchseStangeDa, buchseGabelDa }: BolzenDiagramProps) {
  const dMax = Math.max(d, buchseStangeDa ?? 0, buchseGabelDa ?? 0, 6)
  const bMax = Math.max(bS, bG, dMax + 4)
  const L = 2 * tG + 2 * spalt + tS || 1
  const s = Math.min(300 / L, 150 / bMax, 80 / dMax, 4)
  return { s }
}

export function BolzenDiagram(props: BolzenDiagramProps) {
  const { s } = useScale(props)
  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <figure className="lg:w-[34%]">
        <Seitenansicht {...props} s={s} />
        <figcaption className="mt-1 text-center text-xs text-slate-400">Seitenansicht</figcaption>
      </figure>
      <figure className="lg:flex-1">
        <Vorderansicht {...props} s={s} />
        <figcaption className="mt-1 text-center text-xs text-slate-400">
          Vorderansicht mit Biegemomentverlauf
        </figcaption>
      </figure>
    </div>
  )
}

type ViewProps = BolzenDiagramProps & { s: number }

/* ----------------------------- Seitenansicht ----------------------------- */

function Seitenansicht({ d, bS, bG, einbaufall, buchseStangeDa, buchseGabelDa, kugelB, s }: ViewProps) {
  // Auge umschließt immer den Bolzen (b ≥ d)
  const rGab = (Math.max(bG, d) * s) / 2 // Gabel-Auge (hinten)
  const rEye = (Math.max(bS, d) * s) / 2 // Stangen-Auge (vorne)
  const rOuter = Math.max(rGab, rEye)
  const rp = (d * s) / 2
  const da = buchseStangeDa ?? buchseGabelDa
  const rb = da ? (da * s) / 2 : 0
  const stemW = Math.max(rEye, rGab) * 1.0

  const W = Math.max(200, 2 * rOuter + 60)
  const cx = W / 2
  const top = 14
  const cy = top + 64 + rOuter
  const H = cy + rOuter + 84

  const gabelFest = einbaufall === 2
  const stangeFest = einbaufall === 3

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Seitenansicht">
      <Ground x={cx - 32} y={top} w={64} />
      {/* Gabel: Stiel + Auge (hinten) */}
      <rect x={cx - stemW / 2} y={top} width={stemW} height={cy - top} fill={gabelFest ? COL.fest : COL.gabel} stroke={COL.stroke} strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={rGab} fill={gabelFest ? COL.fest : COL.gabel} stroke={COL.stroke} strokeWidth={1.5} />
      {/* Stange: Auge (vorne) + Stiel nach unten */}
      <rect x={cx - stemW / 2} y={cy} width={stemW} height={H - 40 - cy} fill={stangeFest ? COL.fest : COL.stange} stroke={COL.stroke} strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={rEye} fill={stangeFest ? COL.fest : COL.stange} stroke={COL.stroke} strokeWidth={1.5} />
      {/* Buchse */}
      {rb > 0 && <circle cx={cx} cy={cy} r={rb} fill={COL.buchse} stroke={COL.buchseStroke} strokeWidth={1.2} />}
      {/* Kugelgelenk (Kugel) */}
      {kugelB && (
        <>
          <circle cx={cx} cy={cy} r={rEye - 3} fill={COL.ball} stroke={COL.ballDark} strokeWidth={1.3} />
          <circle cx={cx} cy={cy} r={rEye - 8} fill="#eef2f7" stroke={COL.ballDark} strokeWidth={1.1} />
          <circle cx={cx - (rEye - 8) * 0.28} cy={cy - (rEye - 8) * 0.3} r={Math.max((rEye - 8) * 0.2, 2)} fill="#ffffff" opacity={0.65} stroke="none" />
        </>
      )}
      {/* Bolzen (Loch) */}
      <circle cx={cx} cy={cy} r={rp} fill={COL.bolzen} stroke={COL.bolzenStroke} strokeWidth={1.5} />
      {/* Kraft F */}
      <g stroke={COL.kraft} strokeWidth={2.5} fill={COL.kraft}>
        <line x1={cx} y1={H - 38} x2={cx} y2={H - 8} />
        <polygon points={`${cx - 6},${H - 14} ${cx + 6},${H - 14} ${cx},${H - 2}`} />
        <text x={cx + 11} y={H - 18} fontSize="14" fontWeight="700">F</text>
      </g>
      <text x={cx + rOuter + 6} y={top + 26} fontSize="11" fill={COL.stroke}>Gabel</text>
      <text x={cx + rOuter + 6} y={H - 50} fontSize="11" fill={COL.stroke}>Stange</text>
    </svg>
  )
}

/* ----------------------------- Vorderansicht ----------------------------- */

function Vorderansicht({ F, d, tS, tG, bS, bG, spalt, einbaufall, buchseStangeDa, buchseGabelDa, kugelB, s }: ViewProps) {
  const dp = d * s
  const bGp = Math.max(bG, d) * s // Augenhöhe Gabel-Lasche (≥ Bolzen)
  const bSp = Math.max(bS, d) * s // Augenhöhe Stange (≥ Bolzen)
  const hMax = Math.max(bGp, bSp)
  const gW = tG * s
  const gapW = spalt * s
  const sW = tS * s

  const xLeftDim = 78 // Platz links für ⌀d
  const xG1 = xLeftDim
  const xGap1 = xG1 + gW
  const xStange = xGap1 + gapW
  const xGap2 = xStange + sW
  const xG2 = xGap2 + gapW
  const xEnd = xG2 + gW
  const W = xEnd + 78 // Platz rechts für b_G/b_S

  const groundY = 6
  const shankH = 26
  const yokeH = Math.max(10, bGp * 0.26)
  const cy = groundY + shankH + yokeH + hMax / 2
  const earsTopG = cy - bGp / 2
  const earsTopS = cy - bSp / 2
  const earsBottom = cy + hMax / 2
  const dimY = earsBottom + 22
  const rodBottom = dimY + 34
  const fEndY = rodBottom + 26
  const momBase = fEndY + 36
  const momAmp = 28
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

  // Biegemoment-Verlauf (qualitativ)
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
    const y = momBase + profil(t) * momAmp
    momPts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
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

      {/* Gabel: feste Einspannung + Stiel + Joch + zwei Laschen */}
      <Ground x={(xG1 + xEnd) / 2 - 30} y={groundY} w={60} />
      <rect x={(xG1 + xEnd) / 2 - gW / 2} y={groundY} width={gW} height={shankH} fill={earFill} stroke={earStroke} strokeWidth={1.5} />
      <rect x={xG1} y={earsTopG - yokeH} width={xEnd - xG1} height={yokeH} fill={earFill} stroke={earStroke} strokeWidth={1.5} />
      {/* zwei Laschen */}
      <Lasche x={xG1} w={gW} top={earsTopG} h={bGp} fill={earFill} stroke={earStroke} />
      <Lasche x={xG2} w={gW} top={earsTopG} h={bGp} fill={earFill} stroke={earStroke} />

      {/* Stange: Auge + Stiel nach unten + Kraft */}
      {!kugelB && <Lasche x={xStange} w={sW} top={earsTopS} h={bSp} fill={rodFill} stroke={rodStroke} />}
      {kugelB &&
        (() => {
          const cxk = xStange + sW / 2
          // echte Kugel: Kreis, der in die Lagerbreite passt
          const rOut = Math.max(6, Math.min(sW, bSp) / 2 - 2)
          const rBall = Math.max(4, rOut - 4)
          return (
            <g>
              {/* Gehäuse / Augenstange (Höhe = Auge) */}
              <rect x={xStange} y={earsTopS} width={sW} height={bSp} rx={Math.min(sW / 2, 8)} fill={rodFill} stroke={rodStroke} strokeWidth={1.5} />
              {/* sphärische Kalotte angedeutet */}
              <circle cx={cxk} cy={cy} r={bSp / 2 - 4} fill="none" stroke={COL.ballDark} strokeWidth={1} strokeDasharray="2 3" opacity={0.5} />
              {/* Außenring + Kugel + Glanzpunkt */}
              <circle cx={cxk} cy={cy} r={rOut} fill={COL.ball} stroke={COL.ballDark} strokeWidth={1.3} />
              <circle cx={cxk} cy={cy} r={rBall} fill="#eef2f7" stroke={COL.ballDark} strokeWidth={1.1} />
              <circle cx={cxk - rBall * 0.3} cy={cy - rBall * 0.3} r={Math.max(rBall * 0.22, 2)} fill="#ffffff" opacity={0.7} stroke="none" />
            </g>
          )
        })()}
      <rect x={xStange + sW / 2 - Math.max(sW * 0.32, 6)} y={cy + bSp / 2} width={Math.max(sW * 0.64, 12)} height={rodBottom - (cy + bSp / 2)} fill={rodFill} stroke={rodStroke} strokeWidth={1.5} />
      <g stroke={COL.kraft} strokeWidth={2.5} fill={COL.kraft}>
        <line x1={xStange + sW / 2} y1={rodBottom} x2={xStange + sW / 2} y2={fEndY} />
        <polygon points={`${xStange + sW / 2 - 6},${fEndY - 8} ${xStange + sW / 2 + 6},${fEndY - 8} ${xStange + sW / 2},${fEndY + 2}`} />
        <text x={xStange + sW / 2 + 10} y={fEndY - 6} fontSize="14" fontWeight="700">F</text>
      </g>

      {/* Buchsen */}
      {bushing(xG1, gW, buchseGabelDa, 'bg1')}
      {bushing(xG2, gW, buchseGabelDa, 'bg2')}
      {!kugelB && bushing(xStange, sW, buchseStangeDa, 'bs')}

      {/* Bolzen mit Kopf + Splint */}
      <rect x={xG1 - 24} y={boltTop} width={xEnd - xG1 + 48} height={dp} rx={3} fill={COL.bolzen} opacity={0.92} stroke={COL.bolzenStroke} strokeWidth={1.5} />
      <rect x={xG1 - 34} y={boltTop - 5} width={11} height={dp + 10} rx={2} fill={COL.bolzen} stroke={COL.bolzenStroke} strokeWidth={1.5} />
      <line x1={xEnd + 18} y1={boltTop - 4} x2={xEnd + 18} y2={boltBottom + 4} stroke={COL.bolzenStroke} strokeWidth={2} />

      {/* Maße unten */}
      <Bemassung x1={xG1} x2={xGap1} y={dimY} label={`t_G ${fmt(tG)}`} />
      {spalt > 0 && <Bemassung x1={xGap1} x2={xStange} y={dimY} label={`a ${fmt(spalt)}`} />}
      <Bemassung x1={xStange} x2={xGap2} y={dimY} label={`t_S ${fmt(tS)}`} />
      {spalt > 0 && <Bemassung x1={xGap2} x2={xG2} y={dimY} label={`a ${fmt(spalt)}`} />}
      <Bemassung x1={xG2} x2={xEnd} y={dimY} label={`t_G ${fmt(tG)}`} />

      {/* ⌀d links */}
      <g stroke={COL.mass} strokeWidth={1} fill={COL.mass}>
        <line x1={xLeftDim - 46} y1={boltTop} x2={xLeftDim - 46} y2={boltBottom} />
        <Pfeilkopf x={xLeftDim - 46} y={boltTop} dir={1} />
        <Pfeilkopf x={xLeftDim - 46} y={boltBottom} dir={-1} />
        <text x={xLeftDim - 58} y={cy} fontSize="11" textAnchor="middle" stroke="none" transform={`rotate(-90 ${xLeftDim - 58} ${cy})`}>
          ⌀d = {fmt(d)}
        </text>
      </g>

      {/* Breiten b_G / b_S rechts */}
      <VBemassung x={xEnd + 20} refX={xEnd} yTop={cy - bGp / 2} yBot={cy + bGp / 2} label={`b_G ${fmt(bG)}`} />
      <VBemassung x={xEnd + 50} refX={xGap2} yTop={cy - bSp / 2} yBot={cy + bSp / 2} label={`b_S ${fmt(bS)}`} />

      {/* Biegemomentverlauf */}
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

function VBemassung({ x, refX, yTop, yBot, label }: { x: number; refX: number; yTop: number; yBot: number; label: string }) {
  const midY = (yTop + yBot) / 2
  return (
    <g stroke={COL.mass} strokeWidth={1} fill={COL.mass}>
      {/* Hilfslinien */}
      <line x1={refX} y1={yTop} x2={x} y2={yTop} strokeWidth={0.6} opacity={0.6} />
      <line x1={refX} y1={yBot} x2={x} y2={yBot} strokeWidth={0.6} opacity={0.6} />
      {/* Maßlinie */}
      <line x1={x} y1={yTop} x2={x} y2={yBot} />
      <Pfeilkopf x={x} y={yTop} dir={1} />
      <Pfeilkopf x={x} y={yBot} dir={-1} />
      <text x={x + 11} y={midY} fontSize="10.5" textAnchor="middle" stroke="none" transform={`rotate(-90 ${x + 11} ${midY})`}>
        {label}
      </text>
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
