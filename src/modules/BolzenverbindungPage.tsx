import { useMemo, useState } from 'react'
import { NumberInput } from '../components/NumberInput'
import { SelectInput } from '../components/SelectInput'
import { ResultCard } from '../components/ResultCard'
import { BolzenDiagram } from '../components/BolzenDiagram'
import { MATERIALS, MATERIAL_BY_ID } from '../calc/materials'
import {
  EINBAUFALL_INFO,
  LASTFALL_LABEL,
  berechneBolzen,
  legeBolzenAus,
} from '../calc/bolzen/bolzen'
import type { Einbaufall, Lastfall } from '../calc/types'

type Modus = 'nachweis' | 'auslegung'

export function BolzenverbindungPage() {
  const [modus, setModus] = useState<Modus>('nachweis')
  const [F, setF] = useState(20000)
  const [d, setD] = useState(20)
  const [tS, setTS] = useState(20)
  const [tG, setTG] = useState(12)
  const [einbaufall, setEinbaufall] = useState<Einbaufall>(1)
  const [lastfall, setLastfall] = useState<Lastfall>('schwellend')
  const [materialId, setMaterialId] = useState('S235JR')

  const material = MATERIAL_BY_ID.get(materialId) ?? MATERIALS[0]

  const nachweis = useMemo(
    () => berechneBolzen({ F, d, tS, tG, einbaufall, lastfall, material }),
    [F, d, tS, tG, einbaufall, lastfall, material],
  )

  const auslegung = useMemo(
    () => legeBolzenAus({ F, tS, tG, einbaufall, lastfall, material }),
    [F, tS, tG, einbaufall, lastfall, material],
  )

  const ergebnis = modus === 'nachweis' ? nachweis : auslegung.kontrolle
  const anzeigeD = modus === 'nachweis' ? d : auslegung.dGewaehlt

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      {/* Eingaben */}
      <aside className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex rounded-lg bg-slate-100 p-1 text-sm font-medium">
          <button
            className={`flex-1 rounded-md px-3 py-1.5 transition ${
              modus === 'nachweis'
                ? 'bg-white text-sky-700 shadow-sm'
                : 'text-slate-500'
            }`}
            onClick={() => setModus('nachweis')}
          >
            Nachweis
          </button>
          <button
            className={`flex-1 rounded-md px-3 py-1.5 transition ${
              modus === 'auslegung'
                ? 'bg-white text-sky-700 shadow-sm'
                : 'text-slate-500'
            }`}
            onClick={() => setModus('auslegung')}
          >
            Auslegung
          </button>
        </div>

        <NumberInput
          label="Belastung"
          symbol="F"
          unit="N"
          value={F}
          onChange={setF}
          min={100}
          max={200000}
          step={100}
        />

        {modus === 'nachweis' && (
          <NumberInput
            label="Bolzendurchmesser"
            symbol="d"
            unit="mm"
            value={d}
            onChange={setD}
            min={3}
            max={100}
            step={1}
          />
        )}

        <NumberInput
          label="Stangendicke"
          symbol="t_S"
          unit="mm"
          value={tS}
          onChange={setTS}
          min={2}
          max={120}
          step={1}
        />
        <NumberInput
          label="Gabeldicke (je Lasche)"
          symbol="t_G"
          unit="mm"
          value={tG}
          onChange={setTG}
          min={2}
          max={120}
          step={1}
        />

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
          options={(['ruhend', 'schwellend', 'wechselnd'] as Lastfall[]).map(
            (l) => ({ value: l, label: LASTFALL_LABEL[l] }),
          )}
          hint={`zul.: p=${ergebnis.faktoren.cP}·Rₘ, σ=${ergebnis.faktoren.cSigma}·Rₘ, τ=${ergebnis.faktoren.cTau}·Rₘ`}
        />

        <SelectInput<string>
          label="Werkstoff"
          value={materialId}
          onChange={setMaterialId}
          options={MATERIALS.map((m) => ({
            value: m.id,
            label: `${m.kurz}  (Rₘ=${m.Rm}, Rₑ=${m.Re})`,
          }))}
          hint={material.name}
        />
      </aside>

      {/* Diagramm + Ergebnisse */}
      <section className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <BolzenDiagram
            d={anzeigeD}
            tS={tS}
            tG={tG}
            einbaufall={einbaufall}
          />
        </div>

        {modus === 'auslegung' && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm">
            <div>
              <span className="text-slate-500">erforderlich </span>
              <span className="font-semibold text-slate-800">
                d ≥ {auslegung.dErf} mm
              </span>
            </div>
            <div>
              <span className="text-slate-500">gewählt (genormt) </span>
              <span className="text-lg font-bold text-sky-700">
                d = {auslegung.dGewaehlt} mm
              </span>
            </div>
            <div>
              <span className="text-slate-500">maßgebend: </span>
              <span className="font-semibold text-slate-800">
                {auslegung.massgebend}
              </span>
            </div>
          </div>
        )}

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">
              Festigkeitsnachweise
            </h2>
            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                ergebnis.bestanden
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-rose-100 text-rose-700'
              }`}
            >
              {ergebnis.bestanden
                ? `✓ Verbindung hält · S_min = ${ergebnis.minSicherheit}`
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
