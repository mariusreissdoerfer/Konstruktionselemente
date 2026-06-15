interface Option<T extends string | number> {
  value: T
  label: string
}

interface SelectInputProps<T extends string | number> {
  label: string
  value: T
  options: Option<T>[]
  onChange: (v: T) => void
  hint?: string
}

export function SelectInput<T extends string | number>({
  label,
  value,
  options,
  onChange,
  hint,
}: SelectInputProps<T>) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        value={value}
        onChange={(e) => {
          const raw = e.target.value
          const parsed = (
            typeof options[0]?.value === 'number' ? Number(raw) : raw
          ) as T
          onChange(parsed)
        }}
      >
        {options.map((o) => (
          <option key={String(o.value)} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  )
}
