import { useMemo, useState } from 'react'
import { NumberInput } from '../components/NumberInput'
import { SelectInput } from '../components/SelectInput'
import { ResultCard } from '../components/ResultCard'
import { BolzenDiagram } from '../components/BolzenDiagram'
import {
  BUCHSEN_MATERIALS,
  MATERIALS,
  MATERIAL_BY_ID,
} from '../calc/materials'
import {
  EINBAUFALL_INFO,
  LASTFALL_LABEL,
  berechneBolzen,
  legeBolzenAus,
  type BuchseConfig,
  type BuchseOrt,
  type KugelgelenkConfig,
} from '../calc/bolzen/bolzen'
import { fmt } from '../calc/format'
import type { Einbaufall, Lastfall } from '../calc/types'

type Modus = 'nachweis' | 'auslegung'

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition ${
          checked ? 'bg-sky-600' : 'bg-slate-300'
        }`}
      >
        <span
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all"
          style={{ left: checked ? '1.125rem' : '0.125rem' }}
        />
      </button>
    </label>
  )
}

export function BolzenverbindungPage() {
  const [modus, setModus] = useState<Modus>('nachweis')
  const [F, setF] = useState(20000)
  const [d, setD] = useState(20)
  const [tS, setTS] = useState(20)
  const [tG, setTG] = useState(12)
  const [spalt, setSpalt] = useState(0)
  const [einbaufall, setEinbaufall] = useState<Einbaufall>(1)
  const [lastfall, setLastfall] = useState<Lastfall>('schwellend')
  const [materialId, setMaterialId] = useState('S235JR')

  // Optionen
  const [buchseOn, setBuchseOn] = useState(false)
  const [buchseDa, setBuchseDa] = useState(30)
  const [buchseMatId, setBuchseMatId] = useState('CuSn8')
  const [buchseOrt, setBuchseOrt] = useState<BuchseOrt>('beide')
  const [kugelOn, setKugelOn] = useState(false)
  const [kugelB, setKugelB] = useState(20)
  const [kugelPzul, setKugelPzul] = useState(150)

  const material = MATERIAL_BY_ID.get(materialId) ?? MATERIALS[0]
  const buchseMat = MATERIAL_BY_ID.get(buchseMatId) ?? BUCHSEN_MATERIALS[0]

  const buchse: BuchseConfig | null = buchseOn
    ? { da: buchseDa, material: buchseMat, ort: buchseOrt }
    : null
  const kugelgelenk: KugelgelenkConfig | null = kugelOn
    ? { B: kugelB, pzul: kugelPzul }
    : null

  const gemeinsam = {
    F,
    tS,
    tG,
    spalt,
    einbaufall,
    lastfall,
    material,
    buchse,
    kugelgelenk,
  }

  const nachweis = useMemo(
    () => berechneBolzen({ ...gemeinsam, d }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [F, d, tS, tG, spalt, einbaufall, lastfall, material, buchse, kugelgelenk],
  )

  const auslegung = useMemo(
    () => legeBolzenAus(gemeinsam),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [F, tS, tG, spalt, einbaufall, lastfall, material, buchse, kugelgelenk],
  )

  const ergebnis = modus === 'nachweis' ? nachweis : auslegung.kontrolle
  const anzeigeD = modus === 'nachweis' ? d : auslegung.dGewaehlt

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      {/* Eingaben */}
      <aside className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex rounded-lg bg-slate-100 p-1 text-sm font-medium">
          <button
            className={`flex-1 rounded-md px-3 py-1.5 transition ${
              modus === 'nachweis' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500'
            }`}
            onClick={() => setModus('nachweis')}
          >
            Nachweis
          </button>
          <button
            className={`flex-1 rounded-md px-3 py-1.5 transition ${
              modus === 'auslegung' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500'
            }`}
            onClick={() => setModus('auslegung')}
          >
            Auslegung
          </button>
        </div>

        <NumberInput label="Belastung" symbol="F" unit="N" value={F} onChange={setF} min={100} max={500000} step={100} />

        {modus === 'nachweis' && (
          <NumberInput label="Bolzendurchmesser" symbol="d" unit="mm" value={d} onChange={setD} min={3} max={100} step={1} />
        )}

        <NumberInput label="Stangendicke" symbol="t_S" unit="mm" value={tS} onChange={setTS} min={2} max={120} step={1} />
        <NumberInput label="Gabeldicke (je Lasche)" symbol="t_G" unit="mm" value={tG} onChange={setTG} min={2} max={120} step={1} />
        <NumberInput label="Spalt zw. Blechen" symbol="a" unit="mm" value={spalt} onChange={setSpalt} min={0} max={50} step={0.5} />

        <SelectInput<Einbaufall>
          label="Einbaufall"
          value={einbaufall}
          onChange={setEinbaufall}
          options={[1, 2, 3].map((i) => ({
            value: i as Einbaufall,
            label: `${i} – ${EINBAUFALL_INFO[i as Einbaufall].titel}`,
          }))}
          hint={`Modell: ${EINBAUFALL_INFO[einbaufall].modell}`}
        />

        <SelectInput<Lastfall>
          label="Lastfall"
          value={lastfall}
          onChange={setLastfall}
          options={(['ruhend', 'schwellend', 'wechselnd'] as Lastfall[]).map((l) => ({
            value: l,
            label: LASTFALL_LABEL[l],
          }))}
          hint={`zul.: p=${ergebnis.faktoren.cP}·Rₘ, σ=${ergebnis.faktoren.cSigma}·Rₘ, τ=${ergebnis.faktoren.cTau}·Rₘ`}
        />

        <SelectInput<string>
          label="Werkstoff (Bolzen / Blech)"
          value={materialId}
          onChange={setMaterialId}
          options={MATERIALS.map((m) => ({
            value: m.id,
            label: `${m.kurz}  (Rₘ=${fmt(m.Rm)}, Rₑ=${fmt(m.Re)})`,
          }))}
          hint={material.name}
        />

        {/* Optionen */}
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Optionen
          </div>

          <Toggle label="Buchsen einsetzen" checked={buchseOn} onChange={setBuchseOn} />
          {buchseOn && (
            <div className="space-y-3 border-l-2 border-amber-300 pl-3">
              <NumberInput label="Außendurchmesser" symbol="d_a" unit="mm" value={buchseDa} onChange={setBuchseDa} min={d + 1} max={150} step={1} />
              <SelectInput<BuchseOrt>
                label="Einbauort"
                value={buchseOrt}
                onChange={setBuchseOrt}
                options={[
                  { value: 'beide', label: 'Stange und Gabel' },
                  { value: 'stange', label: 'nur Stange' },
                  { value: 'gabel', label: 'nur Gabel' },
                ]}
              />
              <SelectInput<string>
                label="Buchsenwerkstoff"
                value={buchseMatId}
                onChange={setBuchseMatId}
                options={BUCHSEN_MATERIALS.map((m) => ({
                  value: m.id,
                  label: `${m.kurz}  (Rₘ=${fmt(m.Rm)})`,
                }))}
                hint={buchseMat.name}
              />
            </div>
          )}

          <Toggle label="Kugelgelenk in Stange" checked={kugelOn} onChange={setKugelOn} />
          {kugelOn && (
            <div className="space-y-3 border-l-2 border-slate-400 pl-3">
              <NumberInput label="Lagerbreite" symbol="B" unit="mm" value={kugelB} onChange={setKugelB} min={2} max={120} step={1} />
              <NumberInput label="zul. Lagerpressung" symbol="p_zul" unit="N/mm²" value={kugelPzul} onChange={setKugelPzul} min={10} max={500} step={5} />
              <p className="text-xs text-slate-400">
                Spezifische Lagerbelastung ist herstellerabhängig (Datenblatt).
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* Diagramm + Ergebnisse */}
      <section className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <BolzenDiagram
            F={F}
            d={anzeigeD}
            tS={tS}
            tG={tG}
            spalt={spalt}
            einbaufall={einbaufall}
            buchseStangeDa={
              buchseOn && !kugelOn && (buchseOrt === 'beide' || buchseOrt === 'stange')
                ? buchseDa
                : null
            }
            buchseGabelDa={
              buchseOn && (buchseOrt === 'beide' || buchseOrt === 'gabel') ? buchseDa : null
            }
            kugelB={kugelOn ? kugelB : null}
          />
        </div>

        {modus === 'auslegung' && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm">
            <div>
              <span className="text-slate-500">erforderlich </span>
              <span className="font-semibold text-slate-800">d ≥ {fmt(auslegung.dErf)} mm</span>
            </div>
            <div>
              <span className="text-slate-500">gewählt (genormt) </span>
              <span className="text-lg font-bold text-sky-700">d = {fmt(auslegung.dGewaehlt)} mm</span>
            </div>
            <div>
              <span className="text-slate-500">maßgebend: </span>
              <span className="font-semibold text-slate-800">{auslegung.massgebend}</span>
            </div>
          </div>
        )}

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">Festigkeitsnachweise</h2>
            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                ergebnis.bestanden ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}
            >
              {ergebnis.bestanden
                ? `✓ Verbindung hält · S_min = ${fmt(ergebnis.minSicherheit)}`
                : '✕ Nachweis nicht erfüllt'}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {ergebnis.nachweise.map((n) => (
              <ResultCard key={n.name} n={n} />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
