import type { Material } from './types'

// Auswahl gebräuchlicher Bolzen-/Bauteilwerkstoffe mit Streckgrenze R_e und
// Zugfestigkeit R_m (Richtwerte für kleine Querschnitte, in N/mm²).
// Quelle: Roloff/Matek Maschinenelemente, Tabellenbuch (Werkstoffkennwerte).
export const MATERIALS: Material[] = [
  { id: 'S235JR', kurz: 'S235JR', name: 'St 37 – Allgemeiner Baustahl', Re: 235, Rm: 360 },
  { id: 'E295', kurz: 'E295', name: 'St 50 – Unlegierter Baustahl', Re: 295, Rm: 490 },
  { id: 'E335', kurz: 'E335', name: 'St 60 – Unlegierter Baustahl', Re: 335, Rm: 590 },
  { id: 'C45', kurz: 'C45 (1.0503)', name: 'Vergütungsstahl, normalgeglüht', Re: 340, Rm: 620 },
  { id: 'C45V', kurz: 'C45+QT', name: 'Vergütungsstahl, vergütet', Re: 490, Rm: 700 },
  { id: '42CrMo4', kurz: '42CrMo4+QT', name: 'Vergütungsstahl, vergütet', Re: 750, Rm: 1000 },
  { id: '16MnCr5', kurz: '16MnCr5', name: 'Einsatzstahl', Re: 440, Rm: 640 },
]

export const MATERIAL_BY_ID = new Map(MATERIALS.map((m) => [m.id, m]))
