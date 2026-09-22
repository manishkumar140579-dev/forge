# Forge — Workout Tracker

A fast, offline-first weightlifting tracker. Plain HTML/CSS/JS — **no build step,
no framework, no dependencies.** Installable as an app (PWA) on phone and desktop.

Built as a **clean-room** app: inspired by the concepts in the GPL project "Iron"
(exercises, sets, routines, history), but written from scratch. No GPL code was
copied, so this project carries no GPL obligations. License it however you like.

## Run it

**Quickest:** double-click `index.html`. The app works offline from local files.
(Install-to-homescreen and the service worker only activate over http/https.)

**Full PWA (recommended for phone testing):** serve the folder, then open the URL.
```
cd Forge
python -m http.server 8000
# open http://localhost:8000  (on your phone: http://<your-computer-ip>:8000)
```

**Run the logic tests:**
```
node calc.test.js
```

## Deploy to GitHub Pages (free, already wired)

The repo ships a Pages workflow (`.github/workflows/pages.yml`) — no build config
needed. From the `Forge` folder:

```
# 1. create a repo on github.com (e.g. "forge"), then:
git remote add origin https://github.com/<you>/forge.git
git push -u origin main
# 2. on GitHub: Settings → Pages → Source: "GitHub Actions"
```

The workflow deploys on every push to `main`. Your app goes live at
`https://<you>.github.io/forge/`. Once it's HTTPS, phones can "Add to Home Screen"
and it runs full-screen and offline.

Other hosts: it's plain static files — drag-and-drop the folder onto
Netlify / Vercel / Cloudflare Pages.

## Files

| File | What it does |
|---|---|
| `index.html` | App shell + loads scripts |
| `app.css` | All styling (dark/light, glassy, safe-area aware) |
| `calc.js` | Pure workout math (1RM, volume, PRs, plates) — unit-tested |
| `calc.test.js` | `node` self-check for `calc.js` |
| `store.js` | Data layer — all reads/writes (localStorage) |
| `app.js` | UI, routing, active-workout logger, rest timer |
| `qrcode.js` | Vendored QR generator (MIT) for routine sharing |
| `sw.js` | Service worker (offline cache) |
| `manifest.webmanifest` / `icon.svg` / `icon-*.png` | PWA install config + icons |
| `.github/workflows/pages.yml` | One-click GitHub Pages deploy |

## Iron issues designed out from day one

| Iron issue | How Forge avoids it |
|---|---|
| #20 Number pad cut off by bottom bar | Native numeric inputs + `env(safe-area-inset-bottom)` padding + `scroll-margin` keeps the focused field above the bar |
| #9 Weight dial too slow | No dial — type directly, plus quick ± buttons |
| #11 "Finishing does not finish" | One finish code path: stamps end time, drops empty sets, moves to history, clears active — no ambiguous state |
| #10 Adding an exercise broken | Simple searchable picker; add-to-workout is one tap |
| #18 Cable has no normal option | Exercise "category" is a free text field — any equipment, incl. cable |
| #14 More fields for custom exercises | Name, muscle, category, notes, **kind**, default rest, increment |
| #19 Clone an exercise | Built-in clone button (⧉) |
| #17 Request for new workout plan | One-tap **starter plans** (PPL, Upper/Lower, Full Body 5×5) |
| #16 Implement Liquid Glass | Glassy blurred cards + nav, layered highlights |
| #13 Workout vs routine confusion | Explained directly on the Routines screen |
| #8 Scan QR | Routine **share/import via QR** (camera scan where supported) + copyable code |

## Features

**Logging**
- Start empty or from a routine; fast typing + quick ± buttons; one reliable finish.
- **Set types** — normal / warmup / drop / failure (tap the set number to cycle);
  warmups are excluded from volume & PRs.
- **RPE** per set, and a **note** per exercise.
- **Exercise kinds** — weight × reps, bodyweight (reps, optional +weight),
  time (seconds, e.g. plank), distance (km, e.g. running).
- **Reorder** exercises mid-workout; **rest timer** auto-starts (per-exercise or
  global default) with vibrate + notification.
- **Live 1RM** estimate while you lift; **plate calculator** (what to load per side).

**Organise & review**
- **Exercises** — 30 seeded + create / edit / **clone** / delete; live search;
  free-text equipment category; per-exercise default rest & increment.
- **Routines** — templates + one-tap **starter plans** + **share via code or QR**
  (scan with the camera where supported).
- **History** — full log; **edit** any past workout (reopens it).
- **Stats** — SVG charts for volume & per-exercise 1RM; **personal records** with a
  🏆 alert on finish; **per-exercise history** screen.
- **Body weight** tracking with trend chart.

**Data & app**
- **kg ⇄ lb** with automatic conversion of existing weights.
- **Dark / light** theme.
- Backup **export/import JSON**, **export CSV**.
- **PWA** — installable (PNG + SVG icons), offline, one device.

## Not included (need infrastructure Forge can't provide alone)

- **Cloud sync / multi-device accounts** — needs a hosted backend. Data is
  per-device `localStorage` today. To add: swap `store.js`'s `load()`/`save()` for a
  backend/IndexedDB — nothing else touches storage.
- **Apple Health / HealthKit & wearables** — not reachable from a pure web app.
  Wrap Forge with [Capacitor](https://capacitorjs.com) to ship it as a native iOS/Android
  app with Health access; all data is plain JSON and `calc.js` exposes the math.
