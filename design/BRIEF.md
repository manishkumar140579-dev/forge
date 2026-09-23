# Forge — Product & UI Brief

Forge is one mobile app for **training, nutrition and progress**: log workouts, track food, and watch trends — offline, on one device, with no account.

- **Category:** workout tracker (like Strong / Hevy) + food tracker (like MyFitnessPal), combined.
- **Audience:** lifters who also watch calories and macros.
- **Tone:** focused, energetic, "iron & chalk" — fast to use one-handed, no clutter, no login.

## Platform & constraints

- Android **and** iOS, portrait phone first (~390×844). Respect safe areas (notch, home indicator, Android gesture bar).
- **Offline-first:** no accounts; all data stays on the device.
- **Themes:** dark (default) + light; user-selectable **accent** (6 colours).
- **One-handed:** tap targets ≥ 46 px, numeric keypads for numbers, big primary buttons, no tiny controls.
- Motion subtle; respect the OS "reduce motion" setting.

## Navigation — bottom tab bar (5 tabs)

| Tab | Purpose |
|---|---|
| Today | Daily dashboard: calories, macros, water, training, streak, tips |
| Train | Start and log a workout; routines & starter plans |
| Fuel | Log food by meal |
| Progress | Charts, PRs, measurements, activity heatmap, 1RM calculator |
| More | Exercises, Routines, History, Settings |

The active tab shows its icon inside a filled accent-colour pill.

## Screens

### Welcome (first launch only)
Short intro, three feature lines, unit choice (kg / lb), "Get started".

### Today
Date switcher (‹ ›). Cards, top to bottom:
1. **Calorie ring** — big number eaten, goal; eaten · burned · remaining (green) or over (red); net kcal.
2. **Macros** — three progress bars (Protein / Carbs / Fat) as `value / goal g`.
3. **Water** — `x / goal` glasses, a row of glass icons, − and + buttons.
4. **Training** — sessions today · volume, and a **Start workout** button.
5. **Stat row** — streak (days) · protein left.
6. **Tips** — 2–4 short rule-based lines (e.g. "43 g protein to go").

### Train (hub)
Big **Start empty workout**; starter-plan chips (Push/Pull/Legs, Upper, Lower, Full Body 5×5); **My routines** list (each with Start); links to Exercises and History.

### Workout logger (active session)
- Header: auto name ("Morning Workout", tap to rename), elapsed time, sets done, plate calculator, **Finish**.
- Exercise card: name + muscle · equipment, ≈1RM tag, "⋯" menu (move up/down, remove), "Last time: 100 × 5, …" hint.
- **The next set is expanded**: big − / + steppers for weight and reps, RPE buttons (7–10), **Complete set**. Finished sets collapse to one line with a green tick (tap to undo). Upcoming sets are dimmed.
- Set type badge cycles: number → W (warm-up) → D (drop) → F (failure), colour-coded.
- Row adapts by exercise type: bodyweight = reps + "+kg"; time = seconds; distance = km + seconds.
- Card footer: + Add set · + Warm-up · Note.
- Bottom: + Add exercise (searchable picker), Save as routine, Discard workout.
- **Rest timer banner** floats above the tab bar after each completed set: −15s · countdown + progress bar · +15s · Skip. Beep + vibrate at zero.

### Fuel
Same date switcher. Day totals (kcal · P · C · F) + "Copy yesterday's meals".
Meal cards: Breakfast, Lunch, Dinner, Snacks, Pre-Workout, Post-Workout. Each: + button, entries (`name · grams · P/C/F`, kcal, ✕ remove), meal subtotal, friendly empty state.

### Add food (bottom sheet)
Search box + barcode scan; tabs **Recent / My foods / Online** (online = Open Food Facts); results list; "+ Enter food manually".

### Choose portion (bottom sheet)
Food name + per-100 g values; grams input with − / + and quick chips (50/100/150/200 g); live calories and macros; "Add N g to Lunch".

### Progress
Cards: Body weight (log + trend line) · Volume per workout (line) · Exercise progress (pick exercise → est. 1RM line + stats) · Personal records (ranked by est. 1RM) · Activity heatmap (15 weeks) · Body measurements (latest + change) · 1RM & % calculator (live).

### More
Menu rows: Exercises, Routines, History, Settings; privacy note ("Your data stays on this phone").
- **Exercises:** search + muscle-filter chips; rows (name, muscle · equipment, "custom" tag). New/Edit: name, muscle, measured-as (weight / bodyweight / time / distance), equipment, default rest, increment, notes.
- **Routines:** explainer, starter plans, your routines (Share via QR / Start / delete), Import (paste code or scan QR).
- **History:** finished workouts (name · date · duration · volume · sets, per-exercise summary; Edit reopens, delete).

### Settings
Unit (kg/lb, converts existing data) · Theme (dark/light) · Accent swatches (Ember, Blue, Green, Purple, Pink, Gold) · Default rest time · Weight step · Daily goals (kcal, P, C, F, water) + "Work out my goals for me" (TDEE calculator) · Backup: Export JSON, Export CSV, Import, Reset (with confirmation).

## Data model (all stored on device)

- `workout` — date, name, duration → exercises → sets `{ weight, reps, rpe, type: N|W|D|F, done }`
- `exercise` — name, kind (weight / bodyweight / time / distance), muscle, equipment, defaultRest, increment, notes, custom flag
- `routine` — name, ordered exercises with target sets
- `foodLog` — date, meal, foodId, grams (macros computed from per-100 g values)
- `foodLibrary` — name, per-100 g kcal/protein/carbs/fat, barcode, source
- `bodyweights`, `measurements`, `water` (per day), `goals`, `settings` (unit / theme / accent / rest / increment)

Estimated 1RM uses Epley: `weight × (1 + reps / 30)`.

Every list needs an **empty state** (no workouts, no food logged, no history, no measurements yet).
