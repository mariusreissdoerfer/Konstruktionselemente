import { useState } from 'react'
import { BolzenverbindungPage } from './modules/BolzenverbindungPage'

// Registry der Berechnungsmodule – hier lassen sich künftige
// Konstruktionselemente (Schrauben, Schweißnähte, Welle-Nabe …) ergänzen.
const MODULE = [
  {
    id: 'bolzen',
    name: 'Bolzenverbindung',
    verfuegbar: true,
    element: <BolzenverbindungPage />,
  },
  { id: 'schraube', name: 'Schraubenverbindung', verfuegbar: false },
  { id: 'schweiss', name: 'Schweißverbindung', verfuegbar: false },
  { id: 'passfeder', name: 'Passfeder / Welle-Nabe', verfuegbar: false },
] as const

export default function App() {
  const [aktiv, setAktiv] = useState('bolzen')
  const modul = MODULE.find((m) => m.id === aktiv) ?? MODULE[0]

  return (
    <div className="min-h-full bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Konstruktionselemente
            </h1>
            <p className="text-sm text-slate-500">
              Berechnung maschinenbaulicher Verbindungen nach Roloff/Matek
            </p>
          </div>
          <nav className="flex flex-wrap gap-1.5">
            {MODULE.map((m) => (
              <button
                key={m.id}
                disabled={!m.verfuegbar}
                onClick={() => m.verfuegbar && setAktiv(m.id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  m.id === aktiv
                    ? 'bg-sky-600 text-white shadow-sm'
                    : m.verfuegbar
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'cursor-not-allowed bg-slate-50 text-slate-300'
                }`}
                title={m.verfuegbar ? undefined : 'in Vorbereitung'}
              >
                {m.name}
                {!m.verfuegbar && <span className="ml-1 text-[10px]">bald</span>}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {'element' in modul ? modul.element : null}
      </main>

      <footer className="mx-auto max-w-7xl px-6 pb-10 pt-2 text-xs text-slate-400">
        <p>
          Berechnung nach Roloff/Matek Maschinenelemente. Alle Ergebnisse sind
          Richtwerte und vor der Verwendung gegen die Originalliteratur und die
          geltenden Normen zu prüfen. Keine Gewähr für Richtigkeit.
        </p>
      </footer>
    </div>
  )
}
