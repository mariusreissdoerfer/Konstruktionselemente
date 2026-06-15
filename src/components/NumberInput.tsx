interface NumberInputProps {
  label: string
  value: number
  onChange: (v: number) => void
  unit?: string
  min?: number
  max?: number
  step?: number
  /** Symbol für die Formel, z. B. "d" */
  symbol?: string
}

export function NumberInput({
  label,
  value,
  onChange,
  unit,
  min = 0,
  max,
  step = 1,
  symbol,
}: NumberInputProps) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-sm font-medium text-slate-700">
        <span>
          {label}
          {symbol && (
            <span className="ml-1 font-mono text-slate-400">({symbol})</span>
          )}
        </span>
        {unit && <span className="text-xs text-slate-400">{unit}</span>}
      </span>
      <div className="mt-1 flex items-center gap-3">
        {max !== undefined && (
          <input
            type="range"
            className="h-2 flex-1 cursor-pointer accent-sky-600"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => onChange(Number(e.target.value))}
          />
        )}
        <input
          type="number"
          className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-right text-sm tabular-nums shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
    </label>
  )
}
