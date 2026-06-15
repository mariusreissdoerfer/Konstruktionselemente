import { fmt } from '../calc/format'
import type { Nachweis } from '../calc/types'

function Ampel({ erfuellt }: { erfuellt: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        erfuellt
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-rose-100 text-rose-700'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          erfuellt ? 'bg-emerald-500' : 'bg-rose-500'
        }`}
      />
      {erfuellt ? 'erfüllt' : 'nicht erfüllt'}
    </span>
  )
}

export function ResultCard({ n }: { n: Nachweis }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800">{n.name}</h3>
        <Ampel erfuellt={n.erfuellt} />
      </div>

      <div className="mt-2 font-mono text-xs text-slate-500">{n.formel}</div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Kennwert label="vorhanden" value={n.vorhanden} unit="N/mm²" />
        <Kennwert label="zulässig" value={n.zulaessig} unit="N/mm²" />
        <Kennwert
          label="Sicherheit"
          value={n.sicherheit}
          highlight={n.erfuellt ? 'good' : 'bad'}
        />
      </div>

      <details className="mt-3 text-xs text-slate-500">
        <summary className="cursor-pointer select-none text-slate-400 hover:text-slate-600">
          Rechenweg
        </summary>
        <div className="mt-1 font-mono">
          = {n.einsetzen} = {fmt(n.vorhanden)} N/mm²
        </div>
      </details>
    </div>
  )
}

function Kennwert({
  label,
  value,
  unit,
  highlight,
}: {
  label: string
  value: number
  unit?: string
  highlight?: 'good' | 'bad'
}) {
  const color =
    highlight === 'good'
      ? 'text-emerald-600'
      : highlight === 'bad'
        ? 'text-rose-600'
        : 'text-slate-800'
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className={`text-sm font-semibold tabular-nums ${color}`}>
        {fmt(value)}
        {unit && <span className="ml-0.5 text-[10px] font-normal text-slate-400">{unit}</span>}
      </div>
    </div>
  )
}
