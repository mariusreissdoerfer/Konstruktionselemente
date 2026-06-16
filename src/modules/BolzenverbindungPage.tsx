import { useEffect, useMemo } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { NumberInput } from '../components/NumberInput'
import { SelectInput } from '../components/SelectInput'
import { ResultCard } from '../components/ResultCard'
import { BolzenDiagram, type DimKey } from '../components/BolzenDiagram'
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
  mindestMasse,
  type BuchseConfig,
  type BuchseOrt,
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

function AusMass({ label, wert, stark }: { label: string; wert: number; stark?: boolean }) {
  return (
    <div className="rounded-lg bg-white/70 px-2 py-1.5 ring-1 ring-sky-100">
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`tabular-nums ${stark ? 'text-lg font-bold text-sky-700' : 'text-sm font-semibold text-slate-800'}`}>
        {fmt(wert)} mm
      </div>
    </div>
  )
}

function MindMass({ label, wert, ist }: { label: string; wert: number; ist: number }) {
  const ok = ist >= wert
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`text-sm font-semibold tabular-nums ${ok ? 'text-emerald-600' : 'text-rose-600'}`}>
        ≥ {fmt(wert)} mm
      </div>
      <div className="text-[10px] text-slate-400">aktuell {fmt(ist)}</div>
    </div>
  )
}

export function BolzenverbindungPage() {
  // Eingaben werden im Browser (localStorage) gespeichert und beim erneuten
  // Laden wiederhergestellt.
  const [modus, setModus] = useLocalStorage<Modus>('ke.bolzen.modus', 'nachweis')
  const [F, setF] = useLocalStorage('ke.bolzen.F', 20000)
  const [d, setD] = useLocalStorage('ke.bolzen.d', 20)
  const [tS, setTS] = useLocalStorage('ke.bolzen.tS', 20)
  const [tG, setTG] = useLocalStorage('ke.bolzen.tG', 12)
  const [bS, setBS] = useLocalStorage('ke.bolzen.bS', 40)
  const [bG, setBG] = useLocalStorage('ke.bolzen.bG', 40)
  const [cS, setCS] = useLocalStorage('ke.bolzen.cS', 25)
  const [cG, setCG] = useLocalStorage('ke.bolzen.cG', 25)
  const [spalt, setSpalt] = useLocalStorage('ke.bolzen.spalt', 0)
  const [einbaufall, setEinbaufall] = useLocalStorage<Einbaufall>('ke.bolzen.einbaufall', 1)
  const [lastfall, setLastfall] = useLocalStorage<Lastfall>('ke.bolzen.lastfall', 'schwellend')
  const [materialId, setMaterialId] = useLocalStorage('ke.bolzen.material', 'S235JR')

  // Optionen – Buchsen
  const [buchseOn, setBuchseOn] = useLocalStorage('ke.bolzen.buchseOn', false)
  const [buchseDaS, setBuchseDaS] = useLocalStorage('ke.bolzen.buchseDaS', 30)
  const [buchseDaG, setBuchseDaG] = useLocalStorage('ke.bolzen.buchseDaG', 28)
  const [buchseLenGleichT, setBuchseLenGleichT] = useLocalStorage('ke.bolzen.buchseLenGleichT', true)
  const [buchseLenS, setBuchseLenS] = useLocalStorage('ke.bolzen.buchseLenS', 20)
  const [buchseLenG, setBuchseLenG] = useLocalStorage('ke.bolzen.buchseLenG', 12)
  const [buchseMatId, setBuchseMatId] = useLocalStorage('ke.bolzen.buchseMat', 'CuSn8')
  const [buchseOrt, setBuchseOrt] = useLocalStorage<BuchseOrt>('ke.bolzen.buchseOrt', 'beide')

  // Das Auge muss den Bolzen umschließen: b ≥ d (+ Mindeststeg). Wächst d,
  // wandert die Augenkante mit nach außen (Lage), b kann nicht unter d fallen.
  const bMin = d + 2
  const cMin = Math.ceil(d / 2) + 1
  useEffect(() => {
    if (bS < bMin) setBS(bMin)
    if (bG < bMin) setBG(bMin)
    if (cS < cMin) setCS(cMin)
    if (cG < cMin) setCG(cMin)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d])

  const material = MATERIAL_BY_ID.get(materialId) ?? MATERIALS[0]
  const buchseMat = MATERIAL_BY_ID.get(buchseMatId) ?? BUCHSEN_MATERIALS[0]

  // Buchsenlänge wahlweise an Blechdicke gekoppelt
  const lenS = buchseLenGleichT ? tS : buchseLenS
  const lenG = buchseLenGleichT ? tG : buchseLenG

  const buchse: BuchseConfig | null = buchseOn
    ? {
        daStange: buchseDaS,
        daGabel: buchseDaG,
        laengeStange: lenS,
        laengeGabel: lenG,
        material: buchseMat,
        ort: buchseOrt,
      }
    : null

  const gemeinsam = {
    F,
    tS,
    tG,
    bS,
    bG,
    cS,
    cG,
    spalt,
    einbaufall,
    lastfall,
    material,
    buchse,
  }

  const nachweis = useMemo(
    () => berechneBolzen({ ...gemeinsam, d }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [F, d, tS, tG, bS, bG, cS, cG, spalt, einbaufall, lastfall, material, buchse],
  )

  const auslegung = useMemo(
    () => legeBolzenAus(gemeinsam),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [F, tS, tG, bS, bG, cS, cG, spalt, einbaufall, lastfall, material, buchse],
  )

  const ergebnis = modus === 'nachweis' ? nachweis : auslegung.kontrolle
  const aus = modus === 'auslegung'
  const anzeigeD = aus ? auslegung.d : d
  const anzeigeTS = aus ? auslegung.tS : tS
  const anzeigeTG = aus ? auslegung.tG : tG
  const anzeigeBS = aus ? auslegung.bS : bS
  const anzeigeBG = aus ? auslegung.bG : bG
  const anzeigeCS = aus ? auslegung.cS : cS
  const anzeigeCG = aus ? auslegung.cG : cG
  const mindest = mindestMasse({ ...gemeinsam, d: anzeigeD })

  // Versagensmarkierungen aus den Nachweisen ableiten
  const fail = (pred: (n: string) => boolean) =>
    ergebnis.nachweise.some((n) => pred(n.name) && !n.erfuellt)
  const versagen = {
    lochStange: fail((n) => n.includes('Lochleibung Stange') || n.includes('Stange innen') || n.includes('Stange außen')),
    lochGabel: fail((n) => n.includes('Lochleibung Gabel') || n.includes('Gabel innen') || n.includes('Gabel außen')),
    zugStange: fail((n) => n === 'Zug Stange'),
    zugGabel: fail((n) => n === 'Zug Gabel'),
    ausreissStange: fail((n) => n === 'Ausreißen Stange'),
    ausreissGabel: fail((n) => n === 'Ausreißen Gabel'),
    abscherung: fail((n) => n.startsWith('Abscherung')),
    biegung: fail((n) => n === 'Biegung'),
  }

  // Maße per Klick in der Zeichnung ändern (nur im Nachweis-Modus)
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
  const handleEditDim = (key: DimKey, value: number) => {
    switch (key) {
      case 'd': setD(clamp(Math.round(value), 3, 800)); break
      case 'tS': setTS(clamp(value, 2, 600)); break
      case 'tG': setTG(clamp(value, 2, 600)); break
      case 'bS': setBS(clamp(value, bMin, 1500)); break
      case 'bG': setBG(clamp(value, bMin, 1500)); break
      case 'cS': setCS(clamp(value, cMin, 1000)); break
      case 'cG': setCG(clamp(value, cMin, 1000)); break
      case 'spalt': setSpalt(clamp(value, 0, 200)); break
      case 'daStange': setBuchseDaS(clamp(value, d + 1, 1500)); break
      case 'daGabel': setBuchseDaG(clamp(value, d + 1, 1500)); break
      case 'lenStange': setBuchseLenS(clamp(value, 1, 600)); break
      case 'lenGabel': setBuchseLenG(clamp(value, 1, 600)); break
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)_380px] xl:items-start">
      {/* Eingaben – eigene Scrollspalte */}
      <aside className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto">
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

        <NumberInput label="Belastung" symbol="F" unit="N" value={F} onChange={setF} min={100} max={10000000} step={1000} />

        {modus === 'nachweis' && (
          <NumberInput label="Bolzendurchmesser" symbol="d" unit="mm" value={d} onChange={setD} min={3} max={800} step={1} />
        )}

        {modus === 'nachweis' && (
          <>
            <NumberInput label="Stangendicke" symbol="t_S" unit="mm" value={tS} onChange={setTS} min={2} max={600} step={1} />
            <NumberInput label="Gabeldicke (je Lasche)" symbol="t_G" unit="mm" value={tG} onChange={setTG} min={2} max={600} step={1} />
            <NumberInput label="Stangenbreite Steg (⊥ Kraft)" symbol="b_S" unit="mm" value={bS} onChange={setBS} min={d + 2} max={1500} step={1} />
            <NumberInput label="Gabelbreite Steg (je Lasche)" symbol="b_G" unit="mm" value={bG} onChange={setBG} min={d + 2} max={1500} step={1} />
            <NumberInput label="Randabstand Stange (∥ Kraft)" symbol="c_S" unit="mm" value={cS} onChange={setCS} min={cMin} max={1000} step={1} />
            <NumberInput label="Randabstand Gabel (je Lasche)" symbol="c_G" unit="mm" value={cG} onChange={setCG} min={cMin} max={1000} step={1} />
          </>
        )}
        <NumberInput label="Spalt zw. Blechen" symbol="a" unit="mm" value={spalt} onChange={setSpalt} min={0} max={200} step={1} />

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
              {buchseOrt !== 'gabel' && (
                <NumberInput label="Außen-⌀ Stange" symbol="d_a,S" unit="mm" value={buchseDaS} onChange={setBuchseDaS} min={d + 1} max={1500} step={1} />
              )}
              {buchseOrt !== 'stange' && (
                <NumberInput label="Außen-⌀ Gabel" symbol="d_a,G" unit="mm" value={buchseDaG} onChange={setBuchseDaG} min={d + 1} max={1500} step={1} />
              )}
              <Toggle label="Buchsenlänge = Blechdicke" checked={buchseLenGleichT} onChange={setBuchseLenGleichT} />
              {!buchseLenGleichT && (
                <>
                  {buchseOrt !== 'gabel' && (
                    <NumberInput label="Buchsenlänge Stange" symbol="L_B,S" unit="mm" value={buchseLenS} onChange={setBuchseLenS} min={1} max={600} step={1} />
                  )}
                  {buchseOrt !== 'stange' && (
                    <NumberInput label="Buchsenlänge Gabel" symbol="L_B,G" unit="mm" value={buchseLenG} onChange={setBuchseLenG} min={1} max={600} step={1} />
                  )}
                </>
              )}
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
        </div>

        <button
          type="button"
          onClick={() => {
            Object.keys(localStorage)
              .filter((k) => k.startsWith('ke.bolzen.'))
              .forEach((k) => localStorage.removeItem(k))
            location.reload()
          }}
          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
        >
          Eingaben zurücksetzen
        </button>
      </aside>

      {/* Visualisierung – mittig und fest (sticky) */}
      <div className="xl:sticky xl:top-6 xl:self-start">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <BolzenDiagram
            d={anzeigeD}
            tS={anzeigeTS}
            tG={anzeigeTG}
            bS={anzeigeBS}
            bG={anzeigeBG}
            cS={anzeigeCS}
            cG={anzeigeCG}
            spalt={spalt}
            einbaufall={einbaufall}
            buchseStangeDa={buchseOn && buchseOrt !== 'gabel' ? buchseDaS : null}
            buchseGabelDa={buchseOn && buchseOrt !== 'stange' ? buchseDaG : null}
            buchseLenStange={buchseOn && buchseOrt !== 'gabel' ? lenS : null}
            buchseLenGabel={buchseOn && buchseOrt !== 'stange' ? lenG : null}
            onEditDim={aus ? undefined : handleEditDim}
            versagen={versagen}
          />
        </div>
      </div>

      {/* Ergebnisse – rechts, eigene Scrollspalte */}
      <section className="space-y-6 xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto xl:pr-1">
        {aus && (
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-slate-800">
                Ausgelegte Geometrie (erfüllt alle Nachweise)
              </h3>
              <span className="text-xs text-slate-500">
                d maßgebend: {auslegung.massgebend} · d ≥ {fmt(auslegung.dErf)} mm
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 xl:grid-cols-2">
              <AusMass label="Bolzen ⌀d" wert={auslegung.d} stark />
              <AusMass label="Dicke t_S" wert={auslegung.tS} />
              <AusMass label="Dicke t_G" wert={auslegung.tG} />
              <AusMass label="Steg b_S" wert={auslegung.bS} />
              <AusMass label="Steg b_G" wert={auslegung.bG} />
              <AusMass label="Rand c_S" wert={auslegung.cS} />
              <AusMass label="Rand c_G" wert={auslegung.cG} />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              R/M-Richtwert Augenstab: Stegbreite (b−d)/2 ≈ 0,75·d → b ≈ {fmt(Math.round(2.5 * auslegung.d))} mm,
              Kopfhöhe c ≈ 1,1·d → c ≈ {fmt(Math.round(1.1 * auslegung.d))} mm. Maßgebend bleibt der größere
              Wert aus Festigkeit und Richtwert.
            </p>
          </div>
        )}

        {!aus && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold text-slate-800">
              Erforderliche Mindestmaße (aus Lochleibung &amp; Zug)
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 xl:grid-cols-2">
              <MindMass label="Dicke t_S" wert={mindest.tSmin} ist={tS} />
              <MindMass label="Dicke t_G" wert={mindest.tGmin} ist={tG} />
              <MindMass label="Steg b_S" wert={mindest.bSmin} ist={bS} />
              <MindMass label="Steg b_G" wert={mindest.bGmin} ist={bG} />
              <MindMass label="Rand c_S" wert={mindest.cSmin} ist={cS} />
              <MindMass label="Rand c_G" wert={mindest.cGmin} ist={cG} />
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Dicke aus Lochleibung, Steg b aus Zug, Randabstand c aus Ausreißen
              (für ⌀{fmt(anzeigeD)} mm, mit aktueller Dicke). Werte ≥ Mindestmaß.
            </p>
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
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {ergebnis.nachweise.map((n) => (
              <ResultCard key={n.name} n={n} />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
