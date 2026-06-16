import { useRef, useState } from 'react'
import { fmt } from '../calc/format'
import type { Einbaufall } from '../calc/types'

/** Bemaßbare Größen (per Klick in der Zeichnung editierbar). */
export type DimKey =
  | 'd'
  | 'tS'
  | 'tG'
  | 'bS'
  | 'bG'
  | 'cS'
  | 'cG'
  | 'spalt'
  | 'daStange'
  | 'daGabel'
  | 'lenStange'
  | 'lenGabel'

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
  /** wenn gesetzt: Maße sind per Klick änderbar */
  onEditDim?: (key: DimKey, value: number) => void
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
  const { d, tS, tG, bS, bG, cS, cG, spalt, einbaufall, buchseStangeDa, buchseGabelDa, buchseLenStange, buchseLenGabel, onEditDim } = props
  const { s } = useScale(props)

  // Inline-Editor für Maße (per Klick)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [edit, setEdit] = useState<{ key: DimKey; value: number; left: number; top: number } | null>(null)

  const dimClick =
    onEditDim &&
    ((key: DimKey, value: number) => (e: React.MouseEvent) => {
      const wrap = wrapRef.current?.getBoundingClientRect()
      const r = (e.currentTarget as Element).getBoundingClientRect()
      setEdit({
        key,
        value,
        left: r.left - (wrap?.left ?? 0),
        top: r.top - (wrap?.top ?? 0) + r.height + 2,
      })
    })

  const commit = (raw: string) => {
    if (!edit || !onEditDim) return setEdit(null)
    const n = Number(raw.replace(',', '.'))
    if (Number.isFinite(n)) onEditDim(edit.key, n)
    setEdit(null)
  }

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
  const sideLeft = 30
  const sideCRight = 96 // Platz rechts für die c-Maße
  const sideW = sideLeft + wOuter + sideCRight
  const sideCx = sideLeft + wOuter / 2
  const rp = dp / 2

  // ---------------- Vorderansicht (rechts) ----------------
  const gW = tG * s
  const gapW = spalt * s
  const sW = tS * s
  const xOff = sideW + 28
  const xLeftDim = xOff + 96
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
  const dimY = cy + hHalf + 22 // Dickenmaße (Front), Reihe 1 (gestaffelt +14/+28)
  const dimY2 = dimY + 42 // Buchsenlängen, Reihe 2 (unter den gestaffelten t-Maßen)
  const rodBottomF = dimY2 + 18 // Stangenschaft endet unter den Maßreihen
  const fEndYF = rodBottomF + 22
  const legendY = fEndYF + 24

  const sideShaftBottom = cy + hHalf + 54
  const sideFEnd = sideShaftBottom + 26
  const bSdimY = cy + hHalf + 18

  const H = Math.max(legendY + 8, sideFEnd + 14)
  const W = xEnd + 40

  // Buchse-Band (Front): Breite = tragende Länge ≤ Blechdicke, zentriert
  const bushingF = (xMitte: number, t: number, da: number | null, len: number | null, key: string) => {
    if (!da) return null
    const w = Math.min(len ?? t, t) * s
    return <rect key={key} x={xMitte - w / 2} y={cy - (da * s) / 2} width={w} height={da * s} fill={COL.buchse} stroke={COL.buchseStroke} strokeWidth={1.2} />
  }
  const sideDa = buchseStangeDa ?? buchseGabelDa
  const rb = sideDa ? (sideDa * s) / 2 : 0

  return (
    <div ref={wrapRef} className="relative">
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
        <HDim x1={sideCx - wG / 2} x2={sideCx + wG / 2} y={cy - hHalf - 14} wy={cy - ehG / 2} below={false} label={`b_G ${fmt(bG)}`} onClick={dimClick && dimClick('bG', bG)} />
        <HDim x1={sideCx - wS / 2} x2={sideCx + wS / 2} y={bSdimY} wy={cy + ehS / 2} label={`b_S ${fmt(bS)}`} onClick={dimClick && dimClick('bS', bS)} />
        {/* Randabstände c (in Kraftrichtung) – kleineres Maß innen */}
        {[
          { key: 'cS' as DimKey, val: cS, label: `c_S ${fmt(cS)}` },
          { key: 'cG' as DimKey, val: cG, label: `c_G ${fmt(cG)}` },
        ]
          .sort((a, b) => a.val - b.val)
          .map((cd, i) => (
            <VDim key={cd.key} x={sideCx + wOuter / 2 + 18 + i * 30} yTop={cy - cd.val * s} yBot={cy} wx={sideCx + wOuter / 2} side="right" label={cd.label} onClick={dimClick && dimClick(cd.key, cd.val)} />
          ))}
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

        {/* Dickenmaße – symmetrisch, daher t_G und Spalt a nur einmal (links) */}
        {[
          { x1: xG1, x2: xGap1, label: `t_G ${fmt(tG)}`, key: 'tG' as DimKey, val: tG },
          ...(spalt > 0 ? [{ x1: xGap1, x2: xStange, label: `a ${fmt(spalt)}`, key: 'spalt' as DimKey, val: spalt }] : []),
          { x1: xStange, x2: xGap2, label: `t_S ${fmt(tS)}`, key: 'tS' as DimKey, val: tS },
        ].map((seg, i) => (
          <HDim key={i} x1={seg.x1} x2={seg.x2} y={dimY} wy={cy + hHalf} labelDy={i % 2 === 0 ? 14 : 28} label={seg.label} onClick={dimClick && dimClick(seg.key, seg.val)} />
        ))}

        {/* Buchsenlängen L_B (2. Reihe, mit Hilfslinien, nur wenn ≠ Blechdicke) */}
        {buchseStangeDa && buchseLenStange != null && buchseLenStange !== tS && (
          <HDim x1={xStange + sW / 2 - (buchseLenStange * s) / 2} x2={xStange + sW / 2 + (buchseLenStange * s) / 2} y={dimY2} wy={cy + (buchseStangeDa * s) / 2} autoFlip={false} label={`L_B,S ${fmt(buchseLenStange)}`} onClick={dimClick && dimClick('lenStange', buchseLenStange)} />
        )}
        {buchseGabelDa && buchseLenGabel != null && buchseLenGabel !== tG && (
          <HDim x1={xG1 + gW / 2 - (buchseLenGabel * s) / 2} x2={xG1 + gW / 2 + (buchseLenGabel * s) / 2} y={dimY2} wy={cy + (buchseGabelDa * s) / 2} autoFlip={false} label={`L_B,G ${fmt(buchseLenGabel)}`} onClick={dimClick && dimClick('lenGabel', buchseLenGabel)} />
        )}

        {/* Durchmesser links: ⌀d, ⌀d_a,S, ⌀d_a,G – nach Größe gestaffelt, mit Hilfslinien */}
        {[
          { key: 'd' as DimKey, val: d, label: `⌀d ${fmt(d)}` },
          ...(buchseStangeDa ? [{ key: 'daStange' as DimKey, val: buchseStangeDa, label: `⌀d_a,S ${fmt(buchseStangeDa)}` }] : []),
          ...(buchseGabelDa ? [{ key: 'daGabel' as DimKey, val: buchseGabelDa, label: `⌀d_a,G ${fmt(buchseGabelDa)}` }] : []),
        ]
          .sort((a, b) => a.val - b.val)
          .map((dd, i) => (
            <VDim
              key={dd.key}
              x={xLeftDim - 44 - i * 22}
              yTop={cy - (dd.val * s) / 2}
              yBot={cy + (dd.val * s) / 2}
              wx={xG1 - 34}
              side="left"
              label={dd.label}
              onClick={dimClick && dimClick(dd.key, dd.val)}
            />
          ))}

      </g>

      {/* Legende */}
      <g fontSize="10.5" fill={COL.stroke}>
        <Legende x={xG1} y={legendY} color={COL.bolzen} label="Bolzen" />
        <Legende x={xG1 + 66} y={legendY} color={COL.gabel} label="Gabel" />
        <Legende x={xG1 + 128} y={legendY} color={COL.stange} label="Stange" />
        {(buchseGabelDa || buchseStangeDa) && <Legende x={xG1 + 196} y={legendY} color={COL.buchse} label="Buchse" />}
      </g>
    </svg>
      {edit && (
        <input
          autoFocus
          type="number"
          inputMode="decimal"
          defaultValue={edit.value}
          onFocus={(e) => e.currentTarget.select()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit(e.currentTarget.value)
            if (e.key === 'Escape') setEdit(null)
          }}
          onBlur={(e) => commit(e.currentTarget.value)}
          className="absolute z-10 w-20 rounded-md border border-sky-400 bg-white px-1.5 py-0.5 text-right text-sm tabular-nums shadow-lg outline-none ring-2 ring-sky-200"
          style={{ left: Math.max(0, edit.left - 30), top: edit.top }}
        />
      )}
    </div>
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

function Legende({ x, y, color, label }: { x: number; y: number; color: string; label: string }) {
  return (
    <g>
      <rect x={x} y={y - 9} width={12} height={12} rx={2} fill={color} stroke="#94a3b8" />
      <text x={x + 17} y={y} stroke="none">{label}</text>
    </g>
  )
}

// ---- einheitliche Bemaßung: Maßlinie + Hilfslinien + Pfeile an beiden Enden ----
const AL = 7 // Pfeillänge
const AW = 2.4 // halbe Pfeilbreite

function ArrowH({ x, y, dir }: { x: number; y: number; dir: number }) {
  return <polygon points={`${x},${y} ${x - dir * AL},${y - AW} ${x - dir * AL},${y + AW}`} stroke="none" />
}
function ArrowV({ x, y, dir }: { x: number; y: number; dir: number }) {
  return <polygon points={`${x},${y} ${x - AW},${y - dir * AL} ${x + AW},${y - dir * AL}`} stroke="none" />
}

interface DimText {
  label: string
  onClick?: (e: React.MouseEvent) => void
}
function DimLabel({ x, y, rotate, label, onClick }: { x: number; y: number; rotate?: number } & DimText) {
  return (
    <text
      x={x}
      y={y}
      fontSize="10.5"
      textAnchor="middle"
      stroke="none"
      transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}
      className={onClick ? 'dim-edit' : undefined}
      onClick={onClick}
    >
      {label}
    </text>
  )
}

/** Waagerechtes Maß zwischen x1..x2 auf Höhe y; Hilfslinien ab wy (optional).
 *  Passt die Zahl nicht zwischen die Maßpfeile, wandert sie auf die andere
 *  Seite der Maßlinie (kein Überlappen mit Nachbarn). autoFlip=false erzwingt
 *  die Standardseite. */
function HDim({ x1, x2, y, wy, label, onClick, below = true, autoFlip = true, labelDy }: { x1: number; x2: number; y: number; wy?: number; below?: boolean; autoFlip?: boolean; labelDy?: number } & DimText) {
  const w = x2 - x1
  const big = w >= 3 * AL
  const fits = w >= label.length * 5.6 + 4
  const ext = wy != null ? (wy <= y ? 5 : -5) : 0
  // feste Label-Höhe (gestaffelte Kette) oder automatische Seitenwahl
  const ly = labelDy != null ? y + labelDy : (autoFlip && !fits ? !below : below) ? y + 13 : y - 5
  return (
    <g stroke={COL.mass} strokeWidth={1} fill={COL.mass}>
      {wy != null && <line x1={x1} y1={wy} x2={x1} y2={y + ext} strokeWidth={0.6} opacity={0.7} />}
      {wy != null && <line x1={x2} y1={wy} x2={x2} y2={y + ext} strokeWidth={0.6} opacity={0.7} />}
      <line x1={big ? x1 : x1 - AL} y1={y} x2={big ? x2 : x2 + AL} y2={y} />
      <ArrowH x={x1} y={y} dir={big ? -1 : 1} />
      <ArrowH x={x2} y={y} dir={big ? 1 : -1} />
      <DimLabel x={(x1 + x2) / 2} y={ly} label={label} onClick={onClick} />
    </g>
  )
}

/** Senkrechtes Maß zwischen yTop..yBot bei x; Hilfslinien ab wx (optional). */
function VDim({ x, yTop, yBot, wx, label, onClick, side = 'left' }: { x: number; yTop: number; yBot: number; wx?: number; side?: 'left' | 'right' } & DimText) {
  const big = yBot - yTop >= 3 * AL
  const ext = wx != null ? (wx <= x ? 5 : -5) : 0
  const mid = (yTop + yBot) / 2
  const lx = side === 'right' ? x + 11 : x - 11
  return (
    <g stroke={COL.mass} strokeWidth={1} fill={COL.mass}>
      {wx != null && <line x1={wx} y1={yTop} x2={x + ext} y2={yTop} strokeWidth={0.6} opacity={0.7} />}
      {wx != null && <line x1={wx} y1={yBot} x2={x + ext} y2={yBot} strokeWidth={0.6} opacity={0.7} />}
      <line x1={x} y1={big ? yTop : yTop - AL} x2={x} y2={big ? yBot : yBot + AL} />
      <ArrowV x={x} y={yTop} dir={big ? -1 : 1} />
      <ArrowV x={x} y={yBot} dir={big ? 1 : -1} />
      <DimLabel x={lx} y={mid} rotate={-90} label={label} onClick={onClick} />
    </g>
  )
}
