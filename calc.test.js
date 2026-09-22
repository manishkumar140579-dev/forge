// Run: node calc.test.js   (no framework, just assert)
const assert = require("assert");
const C = require("./calc.js");

// epley: 100kg x 1 = 100
assert.strictEqual(C.epley1RM(100, 1), 100);
// epley: 100kg x 10 = 100 * (1 + 10/30) = 133.33...
assert.ok(Math.abs(C.epley1RM(100, 10) - 133.333) < 0.01);
// guards
assert.strictEqual(C.epley1RM(0, 5), 0);
assert.strictEqual(C.epley1RM(100, 0), 0);

// volume of completed sets only
const entries = [
  { sets: [{ weight: 100, reps: 5, done: true }, { weight: 100, reps: 5, done: false }] },
  { sets: [{ weight: 50, reps: 10, done: true }] },
];
assert.strictEqual(C.workoutVolume(entries), 100 * 5 + 50 * 10); // 1000
assert.strictEqual(C.completedSets(entries), 2);

// warmup sets don't count toward volume or 1RM
const withWarmup = [{ sets: [
  { weight: 40, reps: 10, done: true, type: "warmup" },
  { weight: 100, reps: 5, done: true },
] }];
assert.strictEqual(C.workoutVolume(withWarmup), 500); // warmup 40x10 excluded
assert.strictEqual(C.best1RM(withWarmup[0].sets), C.epley1RM(100, 5)); // warmup ignored

// non-weight exercises (e.g. plank) don't add to load volume
const timed = [{ kind: "time", sets: [{ seconds: 60, done: true }] }];
assert.strictEqual(C.workoutVolume(timed), 0);

// best1RM picks the strongest set
assert.ok(Math.abs(C.best1RM([{ weight: 60, reps: 5 }, { weight: 100, reps: 1 }]) - 100) < 0.01);

// rounding to plate increment
assert.strictEqual(C.round(101.2, 2.5), 100);
assert.strictEqual(C.round(101.3, 2.5), 102.5);

// personal records across history
const hist = [
  { end: 2, entries: [{ exerciseId: "sq", sets: [{ weight: 100, reps: 5 }] }] },
  { end: 1, entries: [{ exerciseId: "sq", sets: [{ weight: 120, reps: 1 }] }] },
];
const pr = C.personalRecords(hist, "sq");
assert.strictEqual(pr.maxWeight, 120);
assert.strictEqual(pr.best1RM, 120);        // 120x1 (=120) beats 100x5 (=116.67)
assert.strictEqual(pr.maxVolumeSet, 500);   // 100x5

// exerciseSeries is chronological (oldest first)
const series = C.exerciseSeries(hist, "sq");
assert.strictEqual(series[0].date, 1);
assert.strictEqual(series[1].date, 2);

// newPRs: newest workout (index 0) beating prior best
const wk = [
  { end: 3, entries: [{ exerciseId: "sq", sets: [{ weight: 140, reps: 1 }] }] }, // newest
  { end: 2, entries: [{ exerciseId: "sq", sets: [{ weight: 100, reps: 5 }] }] },
];
const prs = C.newPRs(wk);
assert.strictEqual(prs.length, 1);
assert.strictEqual(prs[0].exerciseId, "sq");

// plate calculator: 100kg total, 20kg bar => 40 per side, greedy => 25 + 15
assert.deepStrictEqual(C.platesPerSide(100, 20, [25, 20, 15, 10, 5, 2.5]), [25, 15]);
assert.deepStrictEqual(C.platesPerSide(20, 20, [25, 20, 15]), []); // just the bar

// nutrition: 200g of a food at 150kcal/100g, 10P/20C/5F per 100g
const food = [{ grams: 200, per100: { kcal: 150, p: 10, c: 20, f: 5 } }];
const m = C.dayMacros(food);
assert.strictEqual(m.kcal, 300);
assert.strictEqual(m.p, 20);
assert.strictEqual(m.c, 40);
assert.strictEqual(m.f, 10);
assert.strictEqual(C.dayMacros([]).kcal, 0);

// calories burned from volume is a stable multiple
assert.strictEqual(C.caloriesBurned(10000), 300);

console.log("ok — all calc checks passed");
