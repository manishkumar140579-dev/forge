# Forge — project status & pending work

_Last updated: 2026-09-23_

**Live app:** https://manishkumar140579-dev.github.io/forge/
**Repo:** https://github.com/manishkumar140579-dev/forge (public; auto-deploys on push to `main`)

Forge is an offline-first PWA: **training + nutrition + progress**, all on-device, no account.
Clean-room build inspired by the GPL app "Iron" — **no GPL code is used**, so there are no license obligations.

---

## ✅ Done (live)
- **All free features:** workouts (sets/reps/RPE/warm-up/drop/failure, rest timer, plate calc, 1RM, PRs, overload hints), routines + programs + starter plans, **nutrition** (meals, Open Food Facts search, barcode scan, portions, manual foods, fiber/sugar/sodium), **Today dashboard** (calories/macros/water/streak/tips), any-day logging, **Progress** (bodyweight, volume, per-exercise 1RM, PRs, activity heatmap, body measurements, 1RM calc), TDEE goal calc, recent foods + copy-yesterday, interval timer, CSV import/export + JSON backup, undo-delete, favourite exercises, light/dark + 6 accent colours, kg⇄lb conversion.
- **App icon:** flame + barbell, light/dark adaptive (`icon.svg` + PNGs).
- **UI rebuilt 1:1 to the design mockups:** Welcome · Today · Train · Workout · Fuel · AddFood · Portion · More · Progress · Settings + shared shell (SVG tab bar, Archivo/IBM Plex fonts, solid cards, tokens). Bottom-sheet modals.
- **Progress screen:** value+delta chart cards (gridlines + endpoint dot), exercise-progress stat tiles, ranked PR list, activity heatmap w/ active-day count, measurement tiles + log modal, inline 1RM calculator.
- **Add-food sheet:** Recent / My foods / Online segmented tabs, search box + barcode button, food rows, manual-entry.

## ⏳ Pending — needs money / infrastructure (not built)
- **Cloud sync / multi-device accounts** — needs a hosted backend (free tier: Supabase or Firebase).
- **Apple Watch · Siri · home-screen widget · iCloud · HealthKit** — need a native wrapper (Capacitor, ~$99/yr Apple Developer).
- **AI features** (natural-language / photo food logging, AI program generator) — need an API key (e.g. Claude API).

## ❓ Open decision
- **Repo privacy.** Public now (free + live). To make the repo private *and* keep it live for free, host on **Cloudflare Pages / Netlify** (GitHub Pages on a private repo needs a paid plan). Note: a web app's client code is always viewable from the live site regardless of repo visibility.

---

## How to work on it
- **Run locally:** `cd Forge && python -m http.server 8000` → open http://localhost:8000
- **Tests:** `node calc.test.js` · **Syntax:** `node --check calc.js store.js app.js sw.js`
- **After any change to app files, bump `CACHE` in `sw.js`** (e.g. `forge-v14` → `v15`) so clients update.
- **Deploy:** `git add -A && git commit -m "..." && git push` → GitHub Actions builds Pages (~1 min). `gh` CLI: `"C:\Program Files\GitHub CLI\gh.exe"`.
- **Files:** `index.html`, `app.css`, `calc.js` (pure math + tests), `store.js` (localStorage data), `app.js` (UI/router), `qrcode.js` (vendored), `sw.js` (service worker), `design/` (mockups + tokens).

## Files & structure
| File | Role |
|---|---|
| `app.js` | All UI, routing, active-workout logger, modals |
| `store.js` | Data layer (localStorage) + migration `normalize()` |
| `calc.js` / `calc.test.js` | Pure math (1RM, macros, TDEE, CSV parse…) + node tests |
| `app.css` | Design-system styles + component classes |
| `sw.js` | Offline service worker (network-first navigations) |
| `design/` | Design package: `TOKENS.md`, `BRIEF.md`, `screens/*.dc.html`, PDF |
