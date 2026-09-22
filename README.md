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

## Deploy (free)

It's static files — drop the `Forge` folder on any static host:
- **GitHub Pages:** push to a repo, enable Pages → done.
- **Netlify / Vercel / Cloudflare Pages:** drag-and-drop the folder.

Once served over HTTPS, phones can "Add to Home Screen" and it runs full-screen, offline.

## Files

| File | What it does |
|---|---|
| `index.html` | App shell + loads scripts |
| `app.css` | All styling (dark, glassy, safe-area aware) |
| `calc.js` | Pure workout math (1RM, volume) — unit-tested |
| `calc.test.js` | `node` self-check for `calc.js` |
| `store.js` | Data layer — all reads/writes (localStorage) |
| `app.js` | UI, routing, active-workout logger, rest timer |
| `sw.js` | Service worker (offline cache) |
| `manifest.webmanifest` / `icon.svg` | PWA install config + icon |

## Iron issues designed out from day one

| Iron issue | How Forge avoids it |
|---|---|
| #20 Number pad cut off by bottom bar | Native numeric inputs + `env(safe-area-inset-bottom)` padding + `scroll-margin` keeps the focused field above the bar |
| #9 Weight dial too slow | No dial — type directly, plus quick ± buttons |
| #11 "Finishing does not finish" | One finish code path: stamps end time, drops empty sets, moves to history, clears active — no ambiguous state |
| #10 Adding an exercise broken | Simple searchable picker; add-to-workout is one tap |
| #18 Cable has no normal option | Exercise "category" is a free text field — any equipment, incl. cable |
| #14 More fields for custom exercises | Name, muscle, category, notes — all editable; easy to add more |
| #19 Clone an exercise | Built-in clone button (⧉) |
| #13 Workout vs routine confusion | Explained directly on the Routines screen |

## Features

- **Log workouts** — start empty or from a routine; fast typing + quick ± buttons;
  auto rest timer; one reliable finish.
- **Exercises** — 28 seeded + create / edit / **clone** / delete; live search; any
  equipment category incl. cable.
- **Routines** — reusable templates + one-tap **starter plans** (Push/Pull/Legs,
  Upper/Lower, Full Body 5×5) + **share/import** via a code.
- **Stats** — inline SVG charts: **volume per workout** and per-exercise
  **estimated 1RM over time**; **personal records** per exercise; 🏆 PR alert on finish.
- **Body weight** tracking with trend chart.
- **Plate calculator** — what to load on each side of the bar.
- **Backup** — export / import all data as JSON.
- **PWA** — installable, offline, one device.

## Extending it (the "new-gen" hooks)

- **Bigger data / cloud sync:** swap `store.js`'s `load()`/`save()` for IndexedDB or
  a backend — nothing else touches storage. (Currently `localStorage`, ~5MB, per-device.)
- **Camera QR scan (Iron #8):** routine sharing already produces a portable code and
  imports by paste; wrap that code in a QR image + `getUserMedia` scanner to go fully
  visual.
- **Apple Health / wearables, AI suggestions:** all data is plain JSON in one place,
  `calc.js` already exposes 1RM/volume/PR math — ready to feed anything.
