# Konstruktionselemente

Web-App zur Berechnung maschinenbaulicher Konstruktionselemente. Den Anfang
macht die **Bolzenverbindung** (Stange in Gabel, durch einen Bolzen verbunden)
– berechnet nach _Roloff/Matek Maschinenelemente_.

> ⚠️ Alle Ergebnisse sind Richtwerte und müssen vor der Verwendung gegen die
> Originalliteratur und die geltenden Normen geprüft werden. Keine Gewähr für
> Richtigkeit.

## Funktionsumfang (Modul Bolzenverbindung)

- **Nachweis** einer gegebenen Verbindung und **Auslegung** des erforderlichen,
  genormten Bolzendurchmessers aus der Belastung.
- Festigkeitsnachweise:
  - **Flächenpressung (Lochleibung)** in Stange und Gabel
  - **Abscherung** des Bolzens (zweischnittig)
  - **Biegung** des Bolzens für die drei **Einbaufälle**
- Werkstoff-Datenbank (S235JR, E295, E335, C45, 42CrMo4 …) und
  lastfallabhängige zulässige Spannungen (ruhend / schwellend / wechselnd).
- Maßstäbliche SVG-Schemazeichnung und Ergebnis-Karten mit Ampel, Sicherheit
  und ausklappbarem Rechenweg.

## Berechnungsgrundlagen

Mit `F` = Belastung, `d` = Bolzendurchmesser, `t_S` = Stangendicke,
`t_G` = Gabeldicke je Lasche, `A = π·d²/4`, `W = π·d³/32`:

| Nachweis | Formel |
| --- | --- |
| Flächenpressung Stange | `p_S = F / (d · t_S)` |
| Flächenpressung Gabel | `p_G = F / (2 · d · t_G)` |
| Abscherung (zweischnittig) | `τ_a = F / (2 · A)` |
| Biegung | `σ_b = M_b / W` |

**Biegemoment je Einbaufall:**

| Einbaufall | Passung | Modell | `M_b` |
| --- | --- | --- | --- |
| 1 | lose in Gabel **und** Stange | frei aufliegender Träger | `F/8 · (t_S + 2·t_G)` |
| 2 | fest in Gabel, lose in Stange | beidseitig eingespannt | `F/8 · t_S` |
| 3 | fest in Stange, lose in Gabel | Kragträger | `F/4 · t_G` |

**Zulässige Spannungen** als Anteil von `R_m` (Referenz: schwellend, mittlere
Stöße → `0,25 / 0,20 / 0,15`). Werte für ruhend/wechselnd sind Richtwerte.

## Entwicklung

```bash
npm install      # Abhängigkeiten
npm run dev      # Dev-Server (http://localhost:5173)
npm test         # Berechnungs-Tests (Vitest)
npm run build    # Produktions-Build nach dist/
```

## Deployment

Push auf `main` baut und veröffentlicht die App automatisch über **GitHub
Pages** (Workflow `.github/workflows/deploy.yml`). Einmalig in den
Repo-Einstellungen unter **Settings → Pages → Source** „GitHub Actions"
wählen.

Anschließend ist die App erreichbar unter:
`https://<user>.github.io/konstruktionselemente/`

## Architektur

```
src/
  calc/             # reine Berechnungslogik (UI-unabhängig, getestet)
    types.ts
    materials.ts
    bolzen/         # Bolzenverbindung
  components/       # wiederverwendbare UI-Bausteine
  modules/          # je Konstruktionselement eine Seite
  App.tsx           # Layout + Modul-Navigation (erweiterbar)
```

Weitere Module (Schrauben-, Schweißverbindung, Welle-Nabe …) lassen sich als
neues `calc/<element>` + `modules/<Element>Page.tsx` ergänzen und in der
`MODULE`-Liste in `App.tsx` registrieren.
