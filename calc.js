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

  const Calc = {
    epley1RM, setVolume, best1RM, workoutVolume, completedSets, round,
    personalRecords, exerciseSeries, volumeSeries, newPRs, platesPerSide,
    foodMacros, dayMacros, caloriesBurned,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = Calc;
  root.Calc = Calc;
})(typeof globalThis !== "undefined" ? globalThis : this);
