# DevFest Chennai 2026 Schedule

Hall-by-hall session schedule for DevFest Chennai 2026 (GDG Chennai), 17 October 2026 at IITM Research Park.

Single-page app. One HTML file, no build step, no dependencies.

## Features

- Multi-hall schedule grid with per-session inspector (speaker, level, conflicting slots)
- Keyword filter, saved sessions, adjustable time density, Catppuccin dark/light themes
- Live "now" line during event hours
- Progressive Web App: installable on desktop and mobile
- Works offline after first load

## Run

Serve statically (needed for PWA and offline):

    python3 -m http.server 8899

Opening `index.html` directly works for viewing but service workers require HTTP.

## PWA

- `manifest.webmanifest` with name, short name, standalone display, theme colors
- Icons in `assets/`: `icon.svg` (also the favicon), `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` (opaque, for iOS home screen)
- Install from the browser address bar, or Android "Add to Home screen"

## Offline

- `sw.js` precaches the app shell, `config.json`, `events.json`, and icons on first load
- Same-origin GET requests are served cache-first with a background refresh, so repeated visits always render offline and data stays current on later online visits
- Indexed by visit: anything the browser fetches once is available on the next offline load
- First visit needs network
- Inspect or unregister via DevTools > Application > Service Workers

## Data

Schedule content lives in `events.json` (lanes and sessions) and `config.json` (event date, day start/end). Editing those files is enough to update the board; no code changes needed.

## Deploy

GitHub Pages from `main`. Pushing to `main` triggers `.github/workflows/pages.yml`.
