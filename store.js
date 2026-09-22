// store.js — the single data layer. Everything reads/writes through here.
// Backed by localStorage today.
// ponytail: localStorage is a 5MB synchronous store. If history grows huge,
// swap this one file's load()/save() for IndexedDB — nothing else changes.
(function (root) {
  const KEY = "forge.v1";

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // Muscle groups drive grouping + filtering.
  const MUSCLES = ["Chest", "Back", "Shoulders", "Legs", "Arms", "Core", "Other"];

  // Category is a free-form field (barbell/dumbbell/machine/cable/bodyweight/...).
  // Keeping it a plain string is what fixes issue #18: any equipment works,
  // including "cable", with no hardcoded option list to run out of.
  // kind: how a set is measured — "weight" (kg×reps), "bodyweight" (reps, optional
  // added weight), "time" (seconds), "distance" (km + optional seconds).
  function seedExercises() {
    const e = (name, muscle, category, kind) => ({
      id: uid(), name, muscle, category, kind: kind || "weight", custom: false, notes: "",
    });
    return [
      // Chest
      e("Bench Press", "Chest", "Barbell"),
      e("Incline Bench Press", "Chest", "Barbell"),
      e("Decline Bench Press", "Chest", "Barbell"),
      e("Dumbbell Press", "Chest", "Dumbbell"),
      e("Incline Dumbbell Press", "Chest", "Dumbbell"),
      e("Dumbbell Fly", "Chest", "Dumbbell"),
      e("Cable Fly", "Chest", "Cable"),
      e("Pec Deck", "Chest", "Machine"),
      e("Chest Press Machine", "Chest", "Machine"),
      e("Push Up", "Chest", "Bodyweight", "bodyweight"),
      e("Dips", "Chest", "Bodyweight", "bodyweight"),
      // Back
      e("Deadlift", "Back", "Barbell"),
      e("Barbell Row", "Back", "Barbell"),
      e("Pendlay Row", "Back", "Barbell"),
      e("T-Bar Row", "Back", "Machine"),
      e("Lat Pulldown", "Back", "Cable"),
      e("Seated Cable Row", "Back", "Cable"),
      e("Straight-Arm Pulldown", "Back", "Cable"),
      e("Pull Up", "Back", "Bodyweight", "bodyweight"),
      e("Chin Up", "Back", "Bodyweight", "bodyweight"),
      e("Dumbbell Row", "Back", "Dumbbell"),
      e("Rack Pull", "Back", "Barbell"),
      e("Hyperextension", "Back", "Bodyweight", "bodyweight"),
      // Shoulders
      e("Overhead Press", "Shoulders", "Barbell"),
      e("Seated Dumbbell Press", "Shoulders", "Dumbbell"),
      e("Arnold Press", "Shoulders", "Dumbbell"),
      e("Lateral Raise", "Shoulders", "Dumbbell"),
      e("Cable Lateral Raise", "Shoulders", "Cable"),
      e("Front Raise", "Shoulders", "Dumbbell"),
      e("Rear Delt Fly", "Shoulders", "Dumbbell"),
      e("Face Pull", "Shoulders", "Cable"),
      e("Upright Row", "Shoulders", "Barbell"),
      e("Barbell Shrug", "Shoulders", "Barbell"),
      e("Machine Shoulder Press", "Shoulders", "Machine"),
      // Legs
      e("Squat", "Legs", "Barbell"),
      e("Front Squat", "Legs", "Barbell"),
      e("Hack Squat", "Legs", "Machine"),
      e("Leg Press", "Legs", "Machine"),
      e("Romanian Deadlift", "Legs", "Barbell"),
      e("Stiff-Leg Deadlift", "Legs", "Barbell"),
      e("Bulgarian Split Squat", "Legs", "Dumbbell"),
      e("Lunge", "Legs", "Dumbbell"),
      e("Goblet Squat", "Legs", "Dumbbell"),
      e("Leg Curl", "Legs", "Machine"),
      e("Leg Extension", "Legs", "Machine"),
      e("Calf Raise", "Legs", "Machine"),
      e("Seated Calf Raise", "Legs", "Machine"),
      e("Hip Thrust", "Legs", "Barbell"),
      e("Glute Bridge", "Legs", "Bodyweight", "bodyweight"),
      // Arms
      e("Barbell Curl", "Arms", "Barbell"),
      e("EZ-Bar Curl", "Arms", "Barbell"),
      e("Dumbbell Curl", "Arms", "Dumbbell"),
      e("Hammer Curl", "Arms", "Dumbbell"),
      e("Preacher Curl", "Arms", "Machine"),
      e("Concentration Curl", "Arms", "Dumbbell"),
      e("Cable Curl", "Arms", "Cable"),
      e("Triceps Pushdown", "Arms", "Cable"),
      e("Triceps Extension", "Arms", "Cable"),
      e("Overhead Triceps Extension", "Arms", "Dumbbell"),
      e("Skullcrusher", "Arms", "Barbell"),
      e("Close-Grip Bench Press", "Arms", "Barbell"),
      e("Bench Dip", "Arms", "Bodyweight", "bodyweight"),
      e("Wrist Curl", "Arms", "Dumbbell"),
      // Core
      e("Plank", "Core", "Bodyweight", "time"),
      e("Side Plank", "Core", "Bodyweight", "time"),
      e("Hanging Leg Raise", "Core", "Bodyweight", "bodyweight"),
      e("Cable Crunch", "Core", "Cable"),
      e("Crunch", "Core", "Bodyweight", "bodyweight"),
      e("Sit Up", "Core", "Bodyweight", "bodyweight"),
      e("Russian Twist", "Core", "Bodyweight", "bodyweight"),
      e("Ab Wheel", "Core", "Bodyweight", "bodyweight"),
      e("Mountain Climber", "Core", "Bodyweight", "bodyweight"),
      e("Dead Bug", "Core", "Bodyweight", "bodyweight"),
      // Cardio / Other
      e("Running", "Other", "Cardio", "distance"),
      e("Cycling", "Other", "Cardio", "distance"),
      e("Rowing", "Other", "Cardio", "distance"),
      e("Walking", "Other", "Cardio", "distance"),
      e("Swimming", "Other", "Cardio", "distance"),
      e("Jump Rope", "Other", "Cardio", "time"),
      e("Elliptical", "Other", "Cardio", "time"),
      e("Stair Climber", "Other", "Cardio", "time"),
    ];
  }

  const DEFAULT_GOALS = { calories: 2200, protein: 150, carbs: 220, fat: 70, water: 8 };

  function fresh() {
    return {
      settings: { unit: "kg", restDefault: 90, increment: 2.5, theme: "dark" },
      goals: { ...DEFAULT_GOALS },
      exercises: seedExercises(),
      routines: [],
      workouts: [],     // finished workouts, newest first (each has .date "YYYY-MM-DD")
      bodyweights: [],  // [{date, value}] oldest → newest
      foodLog: [],      // [{id, date, meal, name, grams, per100:{kcal,p,c,f}}]
      foodLibrary: [],  // reusable saved foods [{id, name, per100, serving}]
      water: {},        // { "YYYY-MM-DD": glasses }
      active: null,     // the in-progress workout, or null
    };
  }

  // Local date key "YYYY-MM-DD" (device timezone).
  function dayKey(ts) {
    const d = ts == null ? new Date() : new Date(ts);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  // Backfill fields added in later versions so old saves keep working.
  function normalize(s) {
    s.settings = Object.assign({ unit: "kg", restDefault: 90, increment: 2.5, theme: "dark" }, s.settings || {});
    s.goals = Object.assign({ ...DEFAULT_GOALS }, s.goals || {});
    s.exercises = s.exercises || seedExercises();
    s.routines = s.routines || [];
    s.workouts = s.workouts || [];
    s.bodyweights = s.bodyweights || [];
    s.foodLog = s.foodLog || [];
    s.foodLibrary = s.foodLibrary || [];
    s.water = s.water || {};
    if (!("active" in s)) s.active = null;
    s.exercises.forEach(x => { if (!x.kind) x.kind = "weight"; });
    s.workouts.forEach(w => { if (!w.date) w.date = dayKey(w.end || w.start); });
    const fixEntry = (e) => {
      if (!("note" in e)) e.note = "";
      if (!e.kind) { const ex = s.exercises.find(y => y.id === e.exerciseId); e.kind = ex ? ex.kind : "weight"; }
      e.sets.forEach(st => { if (!st.type) st.type = "normal"; });
    };
    s.workouts.forEach(w => w.entries.forEach(fixEntry));
    if (s.active) s.active.entries.forEach(fixEntry);
    return s;
  }

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return normalize(JSON.parse(raw));
    } catch (_) {}
    const s = fresh();
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) {}
    return s;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {}
  }

  // ---- reads ----
  const get = () => state;
  const settings = () => state.settings;
  const exercises = () => state.exercises;
  const exercise = (id) => state.exercises.find(x => x.id === id);
  const routines = () => state.routines;
  const workouts = () => state.workouts;
  const active = () => state.active;

  // ---- settings ----
  function setSetting(k, v) { state.settings[k] = v; save(); }

  // ---- exercises ----
  function addExercise({ name, muscle, category, notes, kind, defaultRest, increment }) {
    const x = {
      id: uid(), name: name.trim(), muscle, category: (category || "").trim(),
      notes: notes || "", kind: kind || "weight", custom: true,
    };
    if (defaultRest) x.defaultRest = +defaultRest;
    if (increment) x.increment = +increment;
    state.exercises.push(x);
    save();
    return x;
  }
  function updateExercise(id, patch) {
    const x = exercise(id);
    if (x) { Object.assign(x, patch); save(); }
    return x;
  }
  function deleteExercise(id) {
    state.exercises = state.exercises.filter(x => x.id !== id);
    save();
  }
  // Issue #19: clone an existing exercise as a starting point.
  function cloneExercise(id) {
    const src = exercise(id);
    if (!src) return null;
    const copy = { ...src, id: uid(), name: src.name + " (copy)", custom: true };
    state.exercises.push(copy);
    save();
    return copy;
  }

  // ---- routines (reusable templates: a named list of exercises) ----
  function addRoutine({ name, exerciseIds }) {
    const r = { id: uid(), name: name.trim(), exerciseIds: exerciseIds || [] };
    state.routines.push(r);
    save();
    return r;
  }
  function deleteRoutine(id) {
    state.routines = state.routines.filter(r => r.id !== id);
    save();
  }

  // ---- active workout ----
  function startWorkout(routineId, date) {
    const entries = [];
    if (routineId) {
      const r = state.routines.find(x => x.id === routineId);
      if (r) r.exerciseIds.forEach(eid => entries.push(newEntry(eid)));
    }
    state.active = { id: uid(), name: "Workout", date: date || dayKey(), start: Date.now(), end: null, entries };
    save();
    return state.active;
  }
  // Smart logging: a new exercise mirrors your last session for it (values
  // pre-filled but not marked done), so you rarely change them. — Iron's signature.
  function newEntry(exerciseId) {
    const ex = exercise(exerciseId) || {};
    const kind = ex.kind || "weight";
    const last = lastPerformance(exerciseId);
    let sets;
    if (last && last.sets.length) {
      sets = last.sets.map(s => {
        const ns = newSet(kind);
        ["weight", "reps", "seconds", "distance"].forEach(f => { if (f in ns && f in s) ns[f] = s[f]; });
        return ns;
      });
    } else {
      sets = [newSet(kind)];
    }
    return { exerciseId, kind, note: "", sets };
  }
  function newSet(kind) {
    const s = { done: false, type: "normal", rpe: "" };
    if (kind === "time") s.seconds = 0;
    else if (kind === "distance") { s.distance = 0; s.seconds = 0; }
    else { s.weight = 0; s.reps = 0; }   // "weight" and "bodyweight" both use weight+reps
    return s;
  }
  function addEntry(exerciseId) {
    if (!state.active) return;
    state.active.entries.push(newEntry(exerciseId));
    save();
  }
  function removeEntry(idx) {
    if (!state.active) return;
    state.active.entries.splice(idx, 1);
    save();
  }
  function moveEntry(idx, dir) {
    if (!state.active) return;
    const e = state.active.entries, j = idx + dir;
    if (j < 0 || j >= e.length) return;
    [e[idx], e[j]] = [e[j], e[idx]];
    save();
  }
  function setEntryNote(idx, note) {
    if (!state.active) return;
    state.active.entries[idx].note = note;
    save();
  }
  function addSet(entryIdx) {
    if (!state.active) return;
    const entry = state.active.entries[entryIdx];
    const last = entry.sets[entry.sets.length - 1];
    const s = newSet(entry.kind);
    if (last) ["weight", "reps", "seconds", "distance"].forEach(f => { if (f in s && f in last) s[f] = last[f]; });
    entry.sets.push(s);
    save();
  }
  function updateSet(entryIdx, setIdx, patch) {
    if (!state.active) return;
    Object.assign(state.active.entries[entryIdx].sets[setIdx], patch);
    save();
  }
  function removeSet(entryIdx, setIdx) {
    if (!state.active) return;
    state.active.entries[entryIdx].sets.splice(setIdx, 1);
    save();
  }

  // Issue #11: ONE finish path. Drop empty sets, stamp end time, move to history,
  // clear active. No ambiguity about whether a workout "finished".
  function finishWorkout(name) {
    if (!state.active) return null;
    const w = state.active;
    w.name = (name || w.name || "Workout").trim();
    w.end = Date.now();
    w.entries.forEach(e => { e.sets = e.sets.filter(s => s.done); });
    w.entries = w.entries.filter(e => e.sets.length > 0);
    state.workouts.unshift(w);
    state.active = null;
    save();
    return w;
  }
  function discardWorkout() {
    state.active = null;
    save();
  }
  function renameActive(name) {
    if (state.active && name) { state.active.name = name.trim(); save(); }
  }
  function deleteWorkout(id) {
    state.workouts = state.workouts.filter(w => w.id !== id);
    save();
  }
  // Reopen a finished workout for editing (only when nothing else is active).
  function reopenWorkout(id) {
    if (state.active) return null;
    const idx = state.workouts.findIndex(w => w.id === id);
    if (idx < 0) return null;
    const w = state.workouts.splice(idx, 1)[0];
    w.end = null;
    state.active = w;
    save();
    return w;
  }

  // Previous performance for an exercise (for the "last time" hint while logging).
  function lastPerformance(exerciseId) {
    for (const w of state.workouts) {
      const entry = w.entries.find(e => e.exerciseId === exerciseId);
      if (entry) return { date: w.end, sets: entry.sets };
    }
    return null;
  }

  // ---- body weight ----
  function bodyweights() { return state.bodyweights; }
  function addBodyweight(value) {
    const v = parseFloat(value);
    if (!isFinite(v) || v <= 0) return;
    state.bodyweights.push({ date: Date.now(), value: v });
    state.bodyweights.sort((a, b) => a.date - b.date);
    save();
  }
  function deleteBodyweight(date) {
    state.bodyweights = state.bodyweights.filter(b => b.date !== date);
    save();
  }

  // ---- starter plans (Iron #17): one-tap pre-built routines ----
  const STARTER_PLANS = [
    { name: "Push Day", ex: ["Bench Press", "Overhead Press", "Incline Bench Press", "Triceps Pushdown", "Lateral Raise"] },
    { name: "Pull Day", ex: ["Deadlift", "Barbell Row", "Lat Pulldown", "Barbell Curl", "Face Pull"] },
    { name: "Leg Day", ex: ["Squat", "Romanian Deadlift", "Leg Press", "Leg Curl", "Calf Raise"] },
    { name: "Upper Body", ex: ["Bench Press", "Barbell Row", "Overhead Press", "Lat Pulldown", "Barbell Curl", "Triceps Pushdown"] },
    { name: "Lower Body", ex: ["Squat", "Romanian Deadlift", "Leg Extension", "Leg Curl", "Calf Raise"] },
    { name: "Full Body 5×5", ex: ["Squat", "Bench Press", "Barbell Row"] },
  ];
  function addStarterPlan(name) {
    const plan = STARTER_PLANS.find(p => p.name === name);
    if (!plan) return null;
    const ids = plan.ex.map(exName => {
      let ex = state.exercises.find(x => x.name.toLowerCase() === exName.toLowerCase());
      if (!ex) ex = addExercise({ name: exName, muscle: "Other", category: "" });
      return ex.id;
    });
    return addRoutine({ name: plan.name, exerciseIds: ids });
  }

  // ---- routine sharing (Iron #8 intent): a portable text code ----
  function routineToCode(id) {
    const r = state.routines.find(x => x.id === id);
    if (!r) return "";
    const payload = {
      n: r.name,
      e: r.exerciseIds.map(eid => {
        const x = exercise(eid);
        return x ? { n: x.name, m: x.muscle, c: x.category } : null;
      }).filter(Boolean),
    };
    return "FORGE1:" + btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  }
  function routineFromCode(code) {
    code = (code || "").trim();
    if (!code.startsWith("FORGE1:")) throw new Error("Not a Forge routine code");
    const payload = JSON.parse(decodeURIComponent(escape(atob(code.slice(7)))));
    const ids = (payload.e || []).map(item => {
      let ex = state.exercises.find(x => x.name.toLowerCase() === item.n.toLowerCase());
      if (!ex) ex = addExercise({ name: item.n, muscle: item.m || "Other", category: item.c || "" });
      return ex.id;
    });
    return addRoutine({ name: payload.n || "Imported routine", exerciseIds: ids });
  }

  // Convert every stored weight when switching kg <-> lb.
  function convertUnits(to) {
    const from = state.settings.unit;
    if (from === to) return;
    const f = to === "lb" ? 2.20462 : 1 / 2.20462;
    const conv = v => v ? Math.round(v * f * 100) / 100 : v;
    const applySets = w => w.entries.forEach(e => {
      if ((e.kind || "weight") === "time" || (e.kind || "weight") === "distance") return;
      e.sets.forEach(s => { if (s.weight) s.weight = conv(s.weight); });
    });
    state.workouts.forEach(applySets);
    if (state.active) applySets(state.active);
    state.bodyweights.forEach(b => { b.value = conv(b.value); });
    state.settings.unit = to;
    save();
  }

  function exportCSV() {
    const rows = [["date", "workout", "exercise", "kind", "set", "weight", "reps", "seconds", "distance", "rpe", "type", "done"]];
    for (const w of state.workouts) {
      for (const e of w.entries) {
        const ex = exercise(e.exerciseId) || { name: "?" };
        e.sets.forEach((s, i) => rows.push([
          new Date(w.end).toISOString(), w.name, ex.name, e.kind || "weight", i + 1,
          s.weight ?? "", s.reps ?? "", s.seconds ?? "", s.distance ?? "", s.rpe ?? "", s.type || "normal", s.done ? 1 : 0,
        ]));
      }
    }
    return rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  }

  // ---- goals ----
  function goals() { return state.goals; }
  function setGoal(k, v) { state.goals[k] = +v || 0; save(); }

  // ---- food log ----
  function foodByDate(date) { return state.foodLog.filter(f => f.date === date); }
  function addFood({ date, meal, name, grams, per100 }) {
    const p = per100 || {};
    const f = {
      id: uid(), date, meal, name: (name || "Food").trim(), grams: +grams || 0,
      per100: { kcal: +p.kcal || 0, p: +p.p || 0, c: +p.c || 0, f: +p.f || 0 },
    };
    state.foodLog.push(f);
    save();
    return f;
  }
  function removeFood(id) { state.foodLog = state.foodLog.filter(f => f.id !== id); save(); }

  // ---- reusable food library ----
  function foodLibrary() { return state.foodLibrary; }
  function saveFood({ name, per100, serving }) {
    const existing = state.foodLibrary.find(x => x.name.toLowerCase() === (name || "").toLowerCase());
    if (existing) { existing.per100 = per100; if (serving) existing.serving = serving; save(); return existing; }
    const f = { id: uid(), name: (name || "Food").trim(), per100, serving: serving || 100 };
    state.foodLibrary.push(f);
    save();
    return f;
  }
  function deleteLibraryFood(id) { state.foodLibrary = state.foodLibrary.filter(f => f.id !== id); save(); }
  function searchLibrary(q) {
    q = (q || "").toLowerCase();
    if (!q) return state.foodLibrary.slice(0, 20);
    return state.foodLibrary.filter(f => f.name.toLowerCase().includes(q)).slice(0, 20);
  }

  // ---- water ----
  function getWater(date) { return state.water[date] || 0; }
  function setWater(date, n) { state.water[date] = Math.max(0, n | 0); save(); }
  function addWater(date, delta) { setWater(date, getWater(date) + delta); }

  // ---- activity / streak ----
  function workoutsByDate(date) { return state.workouts.filter(w => w.date === date); }
  function dayHasActivity(date) {
    return state.workouts.some(w => w.date === date)
      || state.foodLog.some(f => f.date === date)
      || (state.water[date] > 0)
      || state.bodyweights.some(b => dayKey(b.date) === date);
  }
  function streak() {
    let n = 0;
    const d = new Date();
    while (dayHasActivity(dayKey(d.getTime()))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  function exportJSON() { return JSON.stringify(state, null, 2); }
  function importJSON(text) {
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.exercises)) throw new Error("Not a Forge backup");
    state = parsed;
    save();
  }
  function reset() { state = fresh(); save(); }

  root.Store = {
    MUSCLES, STARTER_PLANS, dayKey, get, settings, setSetting, goals, setGoal,
    exercises, exercise, addExercise, updateExercise, deleteExercise, cloneExercise,
    routines, addRoutine, deleteRoutine, addStarterPlan, routineToCode, routineFromCode,
    active, startWorkout, addEntry, removeEntry, moveEntry, setEntryNote,
    addSet, updateSet, removeSet,
    finishWorkout, discardWorkout, renameActive, workouts, deleteWorkout, reopenWorkout, workoutsByDate,
    bodyweights, addBodyweight, deleteBodyweight, convertUnits,
    foodByDate, addFood, removeFood, foodLibrary, saveFood, deleteLibraryFood, searchLibrary,
    getWater, setWater, addWater, dayHasActivity, streak,
    lastPerformance, exportJSON, exportCSV, importJSON, reset,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
