# Setup-Sparziel

Statische, installierbare Web-App ohne Abhängigkeiten oder Backend.

## Dateien

- `index.html` – Oberfläche
- `styles.css` – minimalistisches Design
- `app.js` – Sparlogik und lokale Speicherung
- `manifest.webmanifest` – Installation als App
- `sw.js` – Offline-Nutzung
- `icon.svg` und `icon-*.png` – App-Symbole für Browser, Android und iPhone

Die App speichert Sparbetrag und geänderte Preise ausschließlich im `localStorage` des jeweiligen Geräts.
