// calc.js — pure workout math. No DOM, no storage, so it's testable in node.
// Works in browser (global `Calc`) and node (`require`).
(function (root) {
  // Epley one-rep-max estimate. A single rep IS your 1RM, so return it as-is.
  function epley1RM(weight, reps) {
    if (!weight || reps < 1) return 0;
    if (reps === 1) return weight;
    return weight * (1 + reps / 30);
  }

  function setVolume(weight, reps) {
    return (weight || 0) * (reps || 0);
  }

  // Best estimated 1RM across a list of {weight, reps} sets. Warmups don't count.
  function best1RM(sets) {
    return sets.reduce((max, s) => (s.type === "warmup" ? max : Math.max(max, epley1RM(s.weight, s.reps))), 0);
  }

  // Total load volume of a workout: weight×reps of completed working sets.
  // Only "weight" exercises contribute; warmups are excluded.
  function workoutVolume(entries) {
    return entries.reduce((total, entry) => {
      if (entry.kind && entry.kind !== "weight") return total;
      return total + entry.sets.reduce((s, set) =>
        s + (set.done && set.type !== "warmup" ? setVolume(set.weight, set.reps) : 0), 0);
    }, 0);
  }

  // Count of completed sets in a workout.
  function completedSets(entries) {
    return entries.reduce((n, e) => n + e.sets.filter(s => s.done).length, 0);
  }

  function round(n, step) {
    step = step || 0.01;
    return Math.round(n / step) * step;
  }

  // Best lifetime records for one exercise across all workouts.
  function personalRecords(workouts, exerciseId) {
    let best1rm = 0, maxWeight = 0, maxVolumeSet = 0;
    for (const w of workouts) {
      const e = w.entries.find(x => x.exerciseId === exerciseId);
      if (!e) continue;
      for (const s of e.sets) {
        if (s.type === "warmup") continue;
        best1rm = Math.max(best1rm, epley1RM(s.weight, s.reps));
        maxWeight = Math.max(maxWeight, s.weight || 0);
        maxVolumeSet = Math.max(maxVolumeSet, setVolume(s.weight, s.reps));
      }
    }
    return { best1RM: best1rm, maxWeight, maxVolumeSet };
  }

  // Chronological progression of an exercise (oldest → newest) for charting.
  function exerciseSeries(workouts, exerciseId) {
    return workouts
      .filter(w => w.entries.some(e => e.exerciseId === exerciseId))
      .slice().sort((a, b) => a.end - b.end)
      .map(w => {
        const e = w.entries.find(x => x.exerciseId === exerciseId);
        return {
          date: w.end,
          oneRM: Math.round(best1RM(e.sets)),
          topWeight: Math.max(0, ...e.sets.map(s => s.weight || 0)),
        };
      });
  }

  function volumeSeries(workouts) {
    return workouts.slice().sort((a, b) => a.end - b.end)
      .map(w => ({ date: w.end, volume: Math.round(workoutVolume(w.entries)) }));
  }

  // Which exercises in the newest workout beat their previous lifetime 1RM.
  function newPRs(workouts) {
    if (!workouts.length) return [];
    const latest = workouts[0], prev = workouts.slice(1), prs = [];
    for (const e of latest.entries) {
      const cur = best1RM(e.sets);
      const rec = personalRecords(prev, e.exerciseId).best1RM;
      if (cur > rec + 0.001) prs.push({ exerciseId: e.exerciseId, oneRM: Math.round(cur) });
    }
    return prs;
  }

  // Plates to load on ONE side of the bar for a target total weight.
  function platesPerSide(target, bar, plates) {
    let perSide = (target - bar) / 2;
    if (perSide <= 0) return [];
    const out = [];
    for (const p of plates.slice().sort((a, b) => b - a)) {
      while (perSide >= p - 1e-9) { out.push(p); perSide = Math.round((perSide - p) * 100) / 100; }
    }
    return out;
  }

  // Macros of one logged food entry (per-100 nutriments scaled by grams).
  function foodMacros(entry) {
    const g = (entry.grams || 0) / 100;
    const p = entry.per100 || {};
    return { kcal: (p.kcal || 0) * g, p: (p.p || 0) * g, c: (p.c || 0) * g, f: (p.f || 0) * g };
  }
  // Sum a day's food entries into total macros.
  function dayMacros(entries) {
    return entries.reduce((t, e) => {
      const m = foodMacros(e);
      t.kcal += m.kcal; t.p += m.p; t.c += m.c; t.f += m.f;
      return t;
    }, { kcal: 0, p: 0, c: 0, f: 0 });
  }
  // Rough calories burned from training volume (Σ weight×reps).
  // ponytail: crude heuristic (~0.03 kcal per kg moved), not physiology — a tunable knob.
  function caloriesBurned(volume) {
    return Math.round(volume * 0.03);
  }

  // Mifflin–St Jeor BMR × activity multiplier. weightKg, heightCm, age years.
  function tdee({ sex, age, weightKg, heightCm, activity }) {
    if (!age || !weightKg || !heightCm) return 0;
    const s = sex === "female" ? -161 : 5;
    const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + s;
    const mult = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, athlete: 1.9 }[activity] || 1.375;
    return Math.round(bmr * mult);
  }
  // Split a calorie target into macros: protein by g/kg, fat by % of calories, rest carbs.
  function macrosFromCalories(cal, weightKg, opts) {
    opts = opts || {};
    const protein = Math.round(weightKg * (opts.proteinPerKg || 2));
    const fat = Math.round((cal * (opts.fatPct || 0.25)) / 9);
    const carbs = Math.max(0, Math.round((cal - protein * 4 - fat * 9) / 4));
    return { calories: Math.round(cal), protein, carbs, fat };
  }
  // Warm-up ramp up to a working weight. Returns [{weight, reps}] (excludes the work set).
  function warmupSets(working, bar) {
    bar = bar || 20;
    if (!working || working <= bar) return [];
    const steps = [[0, 10], [0.4, 8], [0.6, 5], [0.8, 3]];
    const seen = new Set(), out = [];
    for (const [p, reps] of steps) {
      let w = p === 0 ? bar : round(working * p, 2.5);
      if (w < bar) w = bar;
      if (w >= working) break;
      if (seen.has(w)) continue;
      seen.add(w);
      out.push({ weight: w, reps });
    }
    return out;
  }

  // Completed working sets per muscle group since a timestamp (for a weekly heatmap).
  function muscleSets(workouts, exerciseById, sinceTs) {
    const out = {};
    for (const w of workouts) {
      const t = w.end || w.start || 0;
      if (sinceTs && t < sinceTs) continue;
      for (const e of w.entries) {
        const ex = exerciseById(e.exerciseId);
        const muscle = (ex && ex.muscle) || "Other";
        const n = e.sets.filter(s => s.done && s.type !== "warmup").length;
        if (n) out[muscle] = (out[muscle] || 0) + n;
      }
    }
    return out;
  }

  // Progressive overload: if every working set last time hit >= targetReps, suggest +increment.
  function overloadSuggestion(sets, increment, targetReps) {
    const work = sets.filter(s => s.type !== "warmup" && (s.weight || 0) > 0);
    if (!work.length) return null;
    const minReps = Math.min(...work.map(s => s.reps || 0));
    const topW = Math.max(...work.map(s => s.weight || 0));
    return minReps >= (targetReps || 8) ? round(topW + (increment || 2.5), 0.5) : null;
  }

  // Micronutrient totals (fiber/sugar/sodium) for a day's food entries.
  function dayMicros(entries) {
    return entries.reduce((t, e) => {
      const g = (e.grams || 0) / 100, p = e.per100 || {};
      t.fiber += (p.fiber || 0) * g; t.sugar += (p.sugar || 0) * g; t.sodium += (p.sodium || 0) * g;
      return t;
    }, { fiber: 0, sugar: 0, sodium: 0 });
  }

  // Tolerant CSV row splitter (handles quoted fields with commas/newlines).
  function csvRows(text) {
    const rows = []; let row = [], cur = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === ",") { row.push(cur); cur = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cur); rows.push(row); row = []; cur = ""; }
      else cur += c;
    }
    if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(r => r.length && r.some(x => x !== ""));
  }

  // Parse a Strong/Hevy-style workout CSV into neutral {date,name,entries:[{name,sets:[{weight,reps}]}]}.
  function parseWorkoutCSV(text) {
    const rows = csvRows(text);
    if (rows.length < 2) return [];
    const header = rows[0].map(h => h.trim().toLowerCase());
    const col = (...names) => { for (const n of names) { const i = header.indexOf(n); if (i >= 0) return i; } return -1; };
    const ci = { date: col("date"), wname: col("workout name", "workout", "title"), ex: col("exercise name", "exercise"), w: col("weight", "weight (kg)", "weight (lbs)", "weight_kg"), r: col("reps", "rep count") };
    if (ci.ex < 0 || ci.r < 0) return [];
    const byKey = new Map();
    for (let i = 1; i < rows.length; i++) {
      const rec = rows[i];
      const exName = (rec[ci.ex] || "").trim();
      if (!exName) continue;
      const date = ci.date >= 0 ? (rec[ci.date] || "").slice(0, 10) : "";
      const wname = (ci.wname >= 0 ? rec[ci.wname] : "") || "Imported workout";
      const key = date + "|" + wname;
      if (!byKey.has(key)) byKey.set(key, { date, name: wname, entries: new Map() });
      const wk = byKey.get(key);
      if (!wk.entries.has(exName)) wk.entries.set(exName, []);
      wk.entries.get(exName).push({ weight: parseFloat(rec[ci.w]) || 0, reps: parseInt(rec[ci.r]) || 0 });
    }
    return [...byKey.values()].map(wk => ({
      date: wk.date, name: wk.name,
      entries: [...wk.entries.entries()].map(([name, sets]) => ({ name, sets })),
    }));
  }

  const Calc = {
    epley1RM, setVolume, best1RM, workoutVolume, completedSets, round,
    personalRecords, exerciseSeries, volumeSeries, newPRs, platesPerSide,
    foodMacros, dayMacros, caloriesBurned, tdee, macrosFromCalories, warmupSets,
    muscleSets, overloadSuggestion, dayMicros, parseWorkoutCSV,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = Calc;
  root.Calc = Calc;
})(typeof globalThis !== "undefined" ? globalThis : this);
