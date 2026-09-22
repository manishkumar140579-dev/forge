# Forge — Training & Nutrition Tracker

A fast, offline-first workout **and nutrition** tracker. Plain HTML/CSS/JS — **no
build step, no framework, no dependencies** (one small vendored QR lib). Installable
as an app (PWA) on phone and desktop.

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

**Today dashboard & nutrition** (Ironlog spec)
- **Today** — calorie ring (in / burned / remaining, net), macro bars, water tracker,
  training summary, 🔥 streak, rule-based insight lines.
- **Any-day logging** — move between dates (Today / Yesterday / date) for food, water,
  training and body weight.
- **Fuel** — meals (Breakfast / Lunch / Dinner / Snacks / Pre- / Post-Workout), day &
  per-meal totals with macro breakdown.
- **Food search** against **Open Food Facts** (free, no key) + instant search of your
  saved foods; **barcode scan** (camera where supported) + manual barcode number;
  **portion scaling** by grams; **manual/custom foods** saved to a reusable library.
- **Goals** — editable calories / protein / carbs / fat / water.
- **Smart logging** (Iron's signature) — a new exercise auto-fills from your last
  session's sets, so you rarely change the values.
- **85 exercises** across 6 muscle groups + cardio.

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

## Iron issues & PRs — all addressed

Every actionable issue from `karimknaebel/Iron` (#8, #9, #10, #11, #13, #14, #16,
#17, #18, #19, #20) and the one open PR (#6 warm-up tag) is handled — see the table
above and the **set types** feature. #12 ("Thanks!") isn't actionable.

## Not included (impossible in a pure web app — need native iOS)

These are from Iron's native side and cannot run in a browser PWA:

- **Apple Watch app, Siri Shortcuts, home-screen widget, iCloud sync, HealthKit** —
  all require a native iOS build. Wrap Forge with [Capacitor](https://capacitorjs.com)
  to ship it natively and add these; all data is plain JSON and `calc.js` exposes the math.
- **Cloud sync / multi-device accounts** — needs a hosted backend. Data is per-device
  `localStorage` today; swap `store.js`'s `load()`/`save()` for a backend to add it.
