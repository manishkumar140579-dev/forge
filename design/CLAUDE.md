# Forge — instructions for Claude

Build **Forge**, a workout + nutrition tracker, as a real mobile app for **Android and iOS**.

## Read first
1. `BRIEF.md` — features, screens and data model (the source of truth for *what* to build).
2. `design/TOKENS.md` — colours, fonts, spacing, touch sizes.
3. `design/screens/*.dc.html` — the approved UI, one file per screen (HTML mockups, 390 px wide). Match their layout, copy and hierarchy. They are design references, not code to ship.

| Screen file | Screen |
|---|---|
| `Welcome.dc.html` | First launch |
| `Main.dc.html` | Today tab |
| `Train.dc.html` | Train tab |
| `Workout.dc.html` | Active workout logger + rest timer |
| `Fuel.dc.html` | Fuel tab |
| `AddFood.dc.html` | Add-food bottom sheet |
| `Portion.dc.html` | Portion bottom sheet |
| `Progress.dc.html` | Progress tab |
| `More.dc.html` | More tab |
| `Settings.dc.html` | Settings |

Note: in the mockups, `{{accent}}` means the current accent colour, and the `<script>` blocks show the intended interactions (steppers, rest timer, set completion, live macro maths).

## Tech choices (change only if the user says so)
- **Expo (React Native) + TypeScript**, Expo Router with a bottom tab layout.
- Local storage: **expo-sqlite** (or WatermelonDB/MMKV if simpler). No backend, no login.
- Charts: `react-native-svg` (hand-drawn lines/ring) or `victory-native`.
- Barcode: `expo-camera`. Haptics + sound for rest timer: `expo-haptics`, `expo-av`.
- Fonts: `@expo-google-fonts/archivo` and `@expo-google-fonts/ibm-plex-sans`.
- Food search online: Open Food Facts public API (optional, cache results locally).

## Build order
1. Project setup, theme tokens, tab bar, fonts.
2. Data layer (schema from BRIEF.md) with seed exercises and starter plans.
3. Train → Workout logger (with rest timer) → History.
4. Fuel → Add food → Portion.
5. Today dashboard (reads real data).
6. Progress charts, PRs, heatmap, 1RM calculator.
7. More: Exercises, Routines, Settings (units, theme, accent, goals/TDEE, backup export/import).
8. Empty states everywhere, light theme, accessibility labels, test on Android and iOS.

## Rules
- Keep it simple to use: big buttons, one primary action per screen, plain words.
- Touch targets ≥ 46 px; use numeric keyboards for numbers.
- Everything works offline.
- Ask the user before adding any paid service, account system or analytics.
