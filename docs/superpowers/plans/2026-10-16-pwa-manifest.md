# PWA Manifest Extraction and Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken inline data-URI PWA manifest with a valid `manifest.webmanifest` file and real icon files, so the app installs and loads without console errors.

**Architecture:** New static assets at repo root (`manifest.webmanifest`, `assets/icon.svg`, three PNG icons rasterized from the SVG) plus three `<link>` tags swapped into the `index.html` head. No JS changes. GitHub Pages workflow already uploads the whole repo, so no workflow changes.

**Tech Stack:** Plain HTML/CSS/JS single-file site; headless Chrome (puppeteer-core, installed at `/tmp/opencode/uitest`) for icon rasterization and verification.

**Spec:** `docs/superpowers/specs/2026-10-16-pwa-manifest-design.md`

## Global Constraints

- Keep existing identity values verbatim: name `DevFest Chennai 2026`, short_name `DevFest 26`, `#11111b` background/theme color.
- Icon design must match the current inline SVG: rounded rect fill `#1e1e2e`, stroke `#b4befe` (`stroke-width 4`), "DF" monospace fill `#cdd6f4`, viewBox `0 0 100 100`.
- Do not add npm dependencies to the repo; puppeteer-core lives only in `/tmp/opencode/uitest`.
- Do not touch the dynamic `theme-color` meta or any JS.
- Page is opened via `file://` in headless Chrome; manifest/icon fetches must also work over `file://` and later GitHub Pages (relative paths only, no absolute `/` paths in `manifest.webmanifest` or `<link>` hrefs).

---

### Task 1: Icon assets (SVG + rasterized PNGs)

**Files:**
- Create: `assets/icon.svg`
- Create: `assets/icon-192.png`, `assets/icon-512.png`, `assets/apple-touch-icon.png` (generated, committed)

**Interfaces:**
- Produces: `assets/icon.svg` and PNG paths referenced by Task 2's `icons` array and Task 3's `<link>` tags.

- [ ] **Step 1: Create the SVG**

Write `assets/icon.svg` with exactly this content:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="18" fill="#1e1e2e" stroke="#b4befe" stroke-width="4"/>
  <text x="50" y="64" font-family="monospace" font-size="42" font-weight="600" fill="#cdd6f4" text-anchor="middle">DF</text>
</svg>
```

- [ ] **Step 2: Rasterize the PNGs with headless Chrome**

Create `/tmp/opencode/uitest/raster.js` (puppeteer-core and Chrome are already installed there) and run it once:

```js
const puppeteer = require("puppeteer-core");
const path = require("path");

const SRC = "file:///home/esai/Desktop/devfest/hall/assets/icon.svg";
const OUT_DIR = "/home/esai/Desktop/devfest/hall/assets";

async function run() {
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/google-chrome",
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  for (const size of [512, 192, 180]) {
    const page = await browser.newPage();
    await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
    await page.goto(SRC);
    await page.screenshot({
      path: path.join(OUT_DIR, size === 180 ? "apple-touch-icon.png" : `icon-${size}.png`),
      clip: { x: 0, y: 0, width: size, height: size },
      omitBackground: false,
    });
    await page.close();
  }
  await browser.close();
  console.log("done");
}
run();
```

Note: the SVG has no width/height attributes, only a viewBox, so `page.goto` + full-viewport screenshot renders it scaled to the viewport. `omitBackground: false` keeps the rounded-corner area transparent-free (corners show as transparent since Chrome screenshots PNGs with alpha where the page background shows; the icon's own rect has opaque fill and the corner cut-outs come from rounded shape rendering — corners end up transparent, which is correct for `purpose: "any"` icons).

Run: `cd /tmp/opencode/uitest && node raster.js`
Expected output: `done`

- [ ] **Step 3: Verify the PNGs**

Run: `cd /home/esai/Desktop/devfest/hall/assets && file icon-192.png icon-512.png apple-touch-icon.png`
Expected: each reports `PNG image data, 192 x 192` / `512 x 512` / `180 x 180`, 8-bit/color RGBA (or RGB).

Also open `apple-touch-icon.png` in the read tool and confirm the "DF" badge renders correctly (not stretched, text centered).

- [ ] **Step 4: Commit**

```bash
cd /home/esai/Desktop/devfest/hall
git add assets/
git commit -m "feat: add PWA icon assets (SVG plus 192/512/180 PNGs)"
```

---

### Task 2: manifest.webmanifest

**Files:**
- Create: `manifest.webmanifest`

**Interfaces:**
- Consumes: icon paths from Task 1 (`assets/icon.svg`, `assets/icon-192.png`, `assets/icon-512.png`).
- Produces: manifest file referenced by Task 3's `<link rel="manifest">`.

- [ ] **Step 1: Create the manifest**

Write `manifest.webmanifest` with exactly this content (all icon paths relative — required for `file://` and GitHub Pages):

```json
{
  "name": "DevFest Chennai 2026",
  "short_name": "DevFest 26",
  "id": "./",
  "start_url": ".",
  "display": "standalone",
  "background_color": "#11111b",
  "theme_color": "#11111b",
  "icons": [
    { "src": "assets/icon.svg", "sizes": "any", "type": "image/svg+xml" },
    { "src": "assets/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "assets/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 2: Verify it parses**

Run: `node -e "JSON.parse(require('fs').readFileSync('/home/esai/Desktop/devfest/hall/manifest.webmanifest','utf8')); console.log('valid')"`
Expected output: `valid`

- [ ] **Step 3: Commit**

```bash
cd /home/esai/Desktop/devfest/hall
git add manifest.webmanifest
git commit -m "feat: add web app manifest file"
```

---

### Task 3: Wire manifest + favicon links into index.html and verify end-to-end

**Files:**
- Modify: `index.html:18-22` (the manifest link block)

**Interfaces:**
- Consumes: `manifest.webmanifest` (Task 2), `assets/icon.svg` and `assets/apple-touch-icon.png` (Task 1).

- [ ] **Step 1: Replace the broken manifest link**

In `index.html`, replace lines 18–22:

```html
        <!-- Standalone PWA Web App Manifest -->
        <link
            rel="manifest"
            href='data:application/manifest+json,{"name":"DevFest Chennai 2026","short_name":"DevFest 26","start_url":".","display":"standalone","background_color":"#11111b","theme_color":"#11111b","icons":[{"src":"data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2218%22 fill=%22%231e1e2e%22 stroke=%22%23b4befe%22 stroke-width=%224%22/><text x=%2250%22 y=%2264%22 font-family=%22monospace%22 font-size=%2242%22 font-weight=%22600%22 fill=%22%23cdd6f4%22 text-anchor=%22middle%22>DF</text></svg>","sizes":"192x192","type":"image/svg+xml"}]}'
        />
```

with:

```html
        <!-- PWA Manifest & Icons -->
        <link rel="manifest" href="manifest.webmanifest" />
        <link rel="icon" type="image/svg+xml" href="assets/icon.svg" />
        <link rel="apple-touch-icon" href="assets/apple-touch-icon.png" />
```

- [ ] **Step 2: End-to-end verification in headless Chrome**

Create `/tmp/opencode/uitest/pwa-check.js` and run it:

```js
const puppeteer = require("puppeteer-core");

const FILE = "file:///home/esai/Desktop/devfest/hall/index.html";

async function run() {
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/google-chrome",
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("requestfailed", (r) =>
    errors.push(`reqfail: ${r.url()} ${r.failure() && r.failure().errorText}`)
  );
  await page.goto(FILE, { waitUntil: "networkidle0" });

  const checks = await (async () => {
    const manifestUrl = await page.evaluate(() =>
      document.querySelector('link[rel="manifest"]').href
    );
    const resp = await page.evaluate(async (u) => {
      const r = await fetch(u);
      const text = await r.text();
      return { status: r.status, ok: !!JSON.parse(text) };
    }, manifestUrl);
    const iconsOk = await page.evaluate(async () => {
      const iconUrls = ["assets/icon.svg", "assets/icon-192.png", "assets/icon-512.png", "assets/apple-touch-icon.png"];
      const results = [];
      for (const rel of iconUrls) {
        const abs = new URL(rel, location.href).href;
        const r = await fetch(abs);
        results.push(`${rel}=${r.status}`);
      }
      return results;
    });
    return { manifestUrl, resp, iconsOk };
  })();

  console.log("manifest:", checks.manifestUrl, JSON.stringify(checks.resp));
  console.log("icons:", checks.iconsOk.join(" "));
  console.log("errors:", errors.length ? errors.join(" | ") : "clean");
  await browser.close();
}
run();
```

Run: `cd /tmp/opencode/uitest && node pwa-check.js`
Expected: `manifest: ... {"status": 200, "ok": true}` ; `icons: assets/icon.svg=200 assets/icon-192.png=200 assets/icon-512.png=200 assets/apple-touch-icon.png=200` ; `errors: clean` (the previous `Manifest: ... Syntax error` console error must be gone).

Note: `file://` fetches of the manifest and icons may be blocked by CORS for `fetch()` from `file://` origin. If `resp.status` or icon fetches report failures but the page loaded with `errors: clean`, re-run the check against a local server instead — `python3 -m http.server 8899 --directory /home/esai/Desktop/devfest/hall` in background, change `FILE` to `http://localhost:8899/index.html`, and use those results. The acceptance condition is `errors: clean` plus manifest fetch 200/parse-ok on http; over plain page load on `file://` no console errors.

- [ ] **Step 3: Visual check of favicon and full page**

Take a desktop screenshot via the existing check script pattern (~1024x800 viewport, light or dark) and confirm:
- No layout change vs. before (only the tab/favicon area differs).
- Manifest error absent from console output.

Run: reuse `cd /tmp/opencode/uitest && node check.js` (from the earlier mobile check) and confirm the `Manifest: Line: 1, column: 117, Syntax error` lines are gone from its ERRORS list.

- [ ] **Step 4: Commit**

```bash
cd /home/esai/Desktop/devfest/hall
git add index.html
git commit -m "fix: replace broken inline data-URI manifest with manifest.webmanifest and real icon links"
```

---

## Out of Scope (per spec)

- Service worker, maskable icons, orientation/category metadata.
- Any change to the mobile search behavior or other page JS/CSS.
