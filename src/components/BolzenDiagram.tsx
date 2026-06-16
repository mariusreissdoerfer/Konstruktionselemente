import { fmt } from '../calc/format'
import type { Einbaufall } from '../calc/types'

export interface BolzenDiagramProps {
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
  buchseStangeDa: number | null
  buchseGabelDa: number | null
  buchseLenStange: number | null
  buchseLenGabel: number | null
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
  mass: '#334155',
  kraft: '#dc2626',
}

/** gemeinsamer Maßstab (px pro mm) für beide Ansichten */
function useScale({ d, tS, tG, bS, bG, cS, cG, spalt, buchseStangeDa, buchseGabelDa }: BolzenDiagramProps) {
  const dMax = Math.max(d, buchseStangeDa ?? 0, buchseGabelDa ?? 0, 6)
  const wMax = Math.max(bS, bG, dMax)
  const hMax = Math.max(2 * cS, 2 * cG, dMax)
  const L = 2 * tG + 2 * spalt + tS || 1
  const s = Math.min(300 / L, 150 / Math.max(wMax, hMax), 80 / dMax, 4)
  return { s }
}

export function BolzenDiagram(props: BolzenDiagramProps) {
  const { d, tS, tG, bS, bG, cS, cG, spalt, einbaufall, buchseStangeDa, buchseGabelDa, buchseLenStange, buchseLenGabel } = props
  const { s } = useScale(props)

  const dp = d * s
  const ehG = Math.max(2 * cG, d) * s // Augenhöhe Gabel
  const ehS = Math.max(2 * cS, d) * s // Augenhöhe Stange
  const hHalf = Math.max(ehG, ehS) / 2

  const gabelFest = einbaufall === 2
  const stangeFest = einbaufall === 3
  const earFill = gabelFest ? COL.fest : COL.gabel
  const earStroke = gabelFest ? COL.festStroke : COL.stroke
  const rodFill = stangeFest ? COL.fest : COL.stange
  const rodStroke = stangeFest ? COL.festStroke : COL.stroke

  // ---------------- Seitenansicht (links) ----------------
  const wG = Math.max(bG, d) * s
  const wS = Math.max(bS, d) * s
  const wOuter = Math.max(wG, wS)
  const sideMargin = 34
  const sideW = wOuter + 2 * sideMargin
  const sideCx = sideMargin + wOuter / 2
  const rp = dp / 2

  // ---------------- Vorderansicht (rechts) ----------------
  const gW = tG * s
  const gapW = spalt * s
  const sW = tS * s
  const xOff = sideW + 26
  const xLeftDim = xOff + 78
  const xG1 = xLeftDim
  const xGap1 = xG1 + gW
  const xStange = xGap1 + gapW
  const xGap2 = xStange + sW
  const xG2 = xGap2 + gapW
  const xEnd = xG2 + gW
  const yokeH = Math.max(10, ehG * 0.22)
  const shankH = 24

  // ---- gemeinsame Bolzenachse cy ----
  const aboveSide = hHalf + 58 // Gabelstiel/Ground + b_G-Maß
  const aboveFront = shankH + yokeH + ehG / 2 + 10
  const cy = Math.max(aboveSide, aboveFront) + 6

  const boltTop = cy - dp / 2
  const boltBottom = cy + dp / 2
  const earsTopG = cy - ehG / 2
  const earsTopS = cy - ehS / 2

  // untere Bereiche
  const dimY = cy + hHalf + 22 // Dickenmaße (Front)
  const rodBottomF = dimY + 30
  const fEndYF = rodBottomF + 22
  const legendY = fEndYF + 26

  const sideShaftBottom = cy + hHalf + 54
  const sideFEnd = sideShaftBottom + 26
  const bSdimY = cy + hHalf + 18

  const H = Math.max(legendY + 8, sideFEnd + 14)
  const W = xEnd + 84

  // Buchse-Band (Front): Breite = tragende Länge ≤ Blechdicke, zentriert
  const bushingF = (xMitte: number, t: number, da: number | null, len: number | null, key: string) => {
    if (!da) return null
    const w = Math.min(len ?? t, t) * s
    return <rect key={key} x={xMitte - w / 2} y={cy - (da * s) / 2} width={w} height={da * s} fill={COL.buchse} stroke={COL.buchseStroke} strokeWidth={1.2} />
  }
  const sideDa = buchseStangeDa ?? buchseGabelDa
  const rb = sideDa ? (sideDa * s) / 2 : 0

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Bolzenverbindung – Seiten- und Vorderansicht">
      <defs>
        <pattern id="hatchF" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" stroke={COL.stroke} strokeWidth="0.7" />
        </pattern>
      </defs>

      {/* Titel */}
      <text x={sideCx} y={14} fontSize="11" textAnchor="middle" fill={COL.stroke}>Seitenansicht</text>
      <text x={(xG1 + xEnd) / 2} y={14} fontSize="11" textAnchor="middle" fill={COL.stroke}>Vorderansicht</text>

      {/* gemeinsame Bolzenachse (Hilfslinie) */}
      <line x1={6} y1={cy} x2={W - 6} y2={cy} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4 4" />

      {/* ===================== Seitenansicht ===================== */}
      <g>
        <Ground x={sideCx - 30} y={cy - hHalf - 50} w={60} />
        {/* Gabel: Stiel + Auge (hinten) */}
        <rect x={sideCx - Math.min(wG, wS) * 0.3} y={cy - hHalf - 50} width={Math.min(wG, wS) * 0.6} height={hHalf + 50} fill={earFill} stroke={earStroke} strokeWidth={1.5} />
        <rect x={sideCx - wG / 2} y={cy - ehG / 2} width={wG} height={ehG} rx={Math.min(wG, ehG) / 2} fill={earFill} stroke={earStroke} strokeWidth={1.5} />
        {/* Stange: Auge (vorne) + Stiel nach unten */}
        <rect x={sideCx - Math.min(wG, wS) * 0.3} y={cy} width={Math.min(wG, wS) * 0.6} height={sideShaftBottom - cy} fill={rodFill} stroke={rodStroke} strokeWidth={1.5} />
        <rect x={sideCx - wS / 2} y={cy - ehS / 2} width={wS} height={ehS} rx={Math.min(wS, ehS) / 2} fill={rodFill} stroke={rodStroke} strokeWidth={1.5} />
        {rb > 0 && <circle cx={sideCx} cy={cy} r={rb} fill={COL.buchse} stroke={COL.buchseStroke} strokeWidth={1.2} />}
        <circle cx={sideCx} cy={cy} r={rp} fill={COL.bolzen} stroke={COL.bolzenStroke} strokeWidth={1.5} />
        {/* Kraft F */}
        <g stroke={COL.kraft} strokeWidth={2.5} fill={COL.kraft}>
          <line x1={sideCx} y1={sideShaftBottom} x2={sideCx} y2={sideFEnd} />
          <polygon points={`${sideCx - 6},${sideFEnd - 8} ${sideCx + 6},${sideFEnd - 8} ${sideCx},${sideFEnd + 2}`} />
          <text x={sideCx + 11} y={sideFEnd - 6} fontSize="14" fontWeight="700">F</text>
        </g>
        {/* Steg-Breiten b */}
        <HBemassung y={cy - hHalf - 14} x1={sideCx - wG / 2} x2={sideCx + wG / 2} refY={cy - ehG / 2} label={`b_G ${fmt(bG)}`} up />
        <HBemassung y={bSdimY} x1={sideCx - wS / 2} x2={sideCx + wS / 2} refY={cy + ehS / 2} label={`b_S ${fmt(bS)}`} />
        <text x={sideCx + rp + 5} y={cy - rp - 2} fontSize="10" fill={COL.bolzenStroke}>⌀d {fmt(d)}</text>
      </g>

      {/* ===================== Vorderansicht ===================== */}
      <g>
        <Ground x={(xG1 + xEnd) / 2 - 30} y={earsTopG - yokeH - shankH} w={60} />
        <rect x={(xG1 + xEnd) / 2 - gW / 2} y={earsTopG - yokeH - shankH} width={gW} height={shankH} fill={earFill} stroke={earStroke} strokeWidth={1.5} />
        <rect x={xG1} y={earsTopG - yokeH} width={xEnd - xG1} height={yokeH} fill={earFill} stroke={earStroke} strokeWidth={1.5} />
        <Lasche x={xG1} w={gW} top={earsTopG} h={ehG} fill={earFill} stroke={earStroke} />
        <Lasche x={xG2} w={gW} top={earsTopG} h={ehG} fill={earFill} stroke={earStroke} />

        <Lasche x={xStange} w={sW} top={earsTopS} h={ehS} fill={rodFill} stroke={rodStroke} />
        <rect x={xStange + sW / 2 - Math.max(sW * 0.32, 6)} y={cy + ehS / 2} width={Math.max(sW * 0.64, 12)} height={rodBottomF - (cy + ehS / 2)} fill={rodFill} stroke={rodStroke} strokeWidth={1.5} />
        <g stroke={COL.kraft} strokeWidth={2.5} fill={COL.kraft}>
          <line x1={xStange + sW / 2} y1={rodBottomF} x2={xStange + sW / 2} y2={fEndYF} />
          <polygon points={`${xStange + sW / 2 - 6},${fEndYF - 8} ${xStange + sW / 2 + 6},${fEndYF - 8} ${xStange + sW / 2},${fEndYF + 2}`} />
          <text x={xStange + sW / 2 + 10} y={fEndYF - 6} fontSize="14" fontWeight="700">F</text>
        </g>

        {bushingF(xG1 + gW / 2, tG, buchseGabelDa, buchseLenGabel, 'bg1')}
        {bushingF(xG2 + gW / 2, tG, buchseGabelDa, buchseLenGabel, 'bg2')}
        {bushingF(xStange + sW / 2, tS, buchseStangeDa, buchseLenStange, 'bs')}

        {/* Bolzen + Kopf + Splint */}
        <rect x={xG1 - 24} y={boltTop} width={xEnd - xG1 + 48} height={dp} rx={3} fill={COL.bolzen} opacity={0.92} stroke={COL.bolzenStroke} strokeWidth={1.5} />
        <rect x={xG1 - 34} y={boltTop - 5} width={11} height={dp + 10} rx={2} fill={COL.bolzen} stroke={COL.bolzenStroke} strokeWidth={1.5} />
        <line x1={xEnd + 18} y1={boltTop - 4} x2={xEnd + 18} y2={boltBottom + 4} stroke={COL.bolzenStroke} strokeWidth={2} />

        {/* Dickenmaße */}
        <Bemassung x1={xG1} x2={xGap1} y={dimY} label={`t_G ${fmt(tG)}`} />
        {spalt > 0 && <Bemassung x1={xGap1} x2={xStange} y={dimY} label={`a ${fmt(spalt)}`} />}
        <Bemassung x1={xStange} x2={xGap2} y={dimY} label={`t_S ${fmt(tS)}`} />
        {spalt > 0 && <Bemassung x1={xGap2} x2={xG2} y={dimY} label={`a ${fmt(spalt)}`} />}
        <Bemassung x1={xG2} x2={xEnd} y={dimY} label={`t_G ${fmt(tG)}`} />

        {/* ⌀d links */}
        <g stroke={COL.mass} strokeWidth={1} fill={COL.mass}>
          <line x1={xLeftDim - 48} y1={boltTop} x2={xLeftDim - 48} y2={boltBottom} />
          <Pfeilkopf x={xLeftDim - 48} y={boltTop} dir={1} />
          <Pfeilkopf x={xLeftDim - 48} y={boltBottom} dir={-1} />
          <text x={xLeftDim - 60} y={cy} fontSize="11" textAnchor="middle" stroke="none" transform={`rotate(-90 ${xLeftDim - 60} ${cy})`}>⌀d = {fmt(d)}</text>
        </g>

        {/* Randabstände c rechts */}
        <CDim x={xEnd + 22} refX={xG2 + gW} yMitte={cy} yKante={earsTopG} label={`c_G ${fmt(cG)}`} />
        <CDim x={xEnd + 52} refX={xGap2} yMitte={cy} yKante={earsTopS} label={`c_S ${fmt(cS)}`} />
      </g>

      {/* Legende */}
      <g fontSize="10.5" fill={COL.stroke}>
        <Legende x={xG1} y={legendY} color={COL.bolzen} label="Bolzen" />
        <Legende x={xG1 + 66} y={legendY} color={COL.gabel} label="Gabel" />
        <Legende x={xG1 + 128} y={legendY} color={COL.stange} label="Stange" />
        {(buchseGabelDa || buchseStangeDa) && <Legende x={xG1 + 196} y={legendY} color={COL.buchse} label="Buchse" />}
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
