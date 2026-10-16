# PWA Manifest Extraction and Fix — Design

Date: 2026-10-16

## Problem

The page declares its web app manifest as an inline `data:application/manifest+json` URI (index.html line 21). The icon entry nests a second data URI containing a raw SVG. That inner SVG has unencoded spaces, `<`, and `>` characters, which break the outer URL parse. Chrome logs `Manifest: Line: 1, column: 117, Syntax error.` on every page load, so no install/metadata is read by the browser.

The page also has no favicon or apple-touch-icon.

## Goal

Serve a valid manifest from its own file with real icon files, so the app installs correctly and loads without console errors.

## Design

### New files

- `manifest.webmanifest` (repo root):
  - `name`: "DevFest Chennai 2026"
  - `short_name`: "DevFest 26"
  - `start_url`: "."
  - `id`: "./"
  - `display`: "standalone"
  - `background_color` and `theme_color`: "#11111b" (unchanged)
  - `icons`:
    - `assets/icon.svg`, `sizes: "any"`, `type: image/svg+xml`
    - `assets/icon-192.png`, `sizes: "192x192"`, `type: image/png`
    - `assets/icon-512.png`, `sizes: "512x512"`, `type: image/png`
- `assets/icon.svg`: same design as the current inline SVG — rounded rect fill `#1e1e2e`, stroke `#b4befe`, "DF" in monospace fill `#cdd6f4`, 100x100 viewBox.
- `assets/icon-192.png`, `assets/icon-512.png`, `assets/apple-touch-icon.png` (180px): rasterized from the SVG with headless Chrome via the existing puppeteer setup in `/tmp/opencode/uitest`. No new dependencies.

### index.html changes

Replace the broken manifest link (lines 18–22) with:

- `<link rel="manifest" href="manifest.webmanifest">`
- `<link rel="icon" type="image/svg+xml" href="assets/icon.svg">`
- `<link rel="apple-touch-icon" href="assets/apple-touch-icon.png">`

The dynamic per-theme `theme-color` meta stays untouched.

### Deployment

The GitHub Pages workflow uploads the entire repository, so the new files deploy without workflow changes.

## Out of scope

- Service worker (not required for current install criteria; can be added later)
- Maskable icon variants
- Orientation or category metadata

## Verification

Headless Chrome (puppeteer, mobile emulation already configured):

1. Load the page — no manifest or request errors in console.
2. Fetch `manifest.webmanifest` and `JSON.parse` it successfully.
3. All icon URLs return 200; screenshot confirms the icons render.
4. Desktop visual check unchanged (favicon appears in tab).
