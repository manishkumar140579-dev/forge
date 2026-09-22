// app.js — UI, routing, and the active-workout logger.
// Uses globals `Store` (store.js) and `Calc` (calc.js). No build step.
(function () {
  const appEl = document.getElementById("app");
  const modal = document.getElementById("modal");

  // ---------- tiny helpers ----------
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const unit = () => Store.settings().unit;
  const fmtDate = (ts) => new Date(ts).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const fmtTime = (ts) => new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const num = (v) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };

  const routes = ["home", "exercises", "history", "routines", "stats", "settings", "workout"];
  const route = () => {
    const r = (location.hash.replace(/^#\/?/, "") || "home").split("/")[0];
    return routes.includes(r) ? r : "home";
  };
  const go = (r) => { location.hash = "#/" + r; };

  // ---------- shell + nav ----------
  const NAV = [
    ["home", "🏠", "Home"],
    ["exercises", "🏋️", "Exercises"],
    ["history", "📖", "History"],
    ["routines", "📋", "Routines"],
    ["stats", "📈", "Stats"],
    ["settings", "⚙️", "Settings"],
  ];
  function navHTML(cur) {
    return `<nav>${NAV.map(([r, i, l]) =>
      `<a href="#/${r}" class="${cur === r ? "active" : ""}"><span class="ico">${i}</span>${l}</a>`
    ).join("")}</nav>`;
  }

  // ---------- render dispatch ----------
  function render() {
    const r = route();
    let html;
    if (r === "home") html = viewHome();
    else if (r === "exercises") html = viewExercises();
    else if (r === "history") html = viewHistory();
    else if (r === "routines") html = viewRoutines();
    else if (r === "stats") html = viewStats();
    else if (r === "settings") html = viewSettings();
    else if (r === "workout") html = viewWorkout();
    appEl.innerHTML = html;
    document.querySelectorAll("nav").forEach(n => n.remove());
    document.body.insertAdjacentHTML("beforeend", navHTML(r === "workout" ? "home" : r));
    wireInputs();
    renderRest();
  }

  // ---------- HOME ----------
  function viewHome() {
    const a = Store.active();
    const ws = Store.workouts();
    const totalVol = ws.reduce((s, w) => s + Calc.workoutVolume(w.entries), 0);
    let h = `<h1>Forge</h1><p class="muted">Log a workout. Fast.</p><div class="spacer"></div>`;

    if (a) {
      const sets = Calc.completedSets(a.entries);
      h += `<div class="card">
        <div class="row between"><h2>Workout in progress</h2><span class="tag">${a.entries.length} exercises</span></div>
        <p class="muted">${sets} sets done · started ${fmtTime(a.start)}</p>
        <button class="btn-accent btn-full" data-action="resume">Resume workout →</button>
      </div>`;
    } else {
      h += `<button class="btn-accent btn-full" data-action="start-empty">＋ Start empty workout</button>`;
      const rs = Store.routines();
      if (rs.length) {
        h += `<div class="spacer"></div><h2>Start from a routine</h2>`;
        h += rs.map(rt => `<div class="card row between">
          <div><strong>${esc(rt.name)}</strong><br><span class="muted">${rt.exerciseIds.length} exercises</span></div>
          <button class="btn-blue" data-action="start-routine" data-id="${rt.id}">Start</button>
        </div>`).join("");
      }
    }

    h += `<div class="spacer"></div><div class="card row between">
      <div><span class="muted">Workouts</span><br><strong style="font-size:22px">${ws.length}</strong></div>
      <div><span class="muted">Total volume</span><br><strong style="font-size:22px">${Math.round(totalVol).toLocaleString()} ${unit()}</strong></div>
    </div>`;
    return h;
  }

  // ---------- EXERCISES ----------
  let exFilter = "All";
  let exQ = "";
  function exerciseListHTML() {
    const q = exQ.trim().toLowerCase();
    let shown = Store.exercises();
    if (exFilter !== "All") shown = shown.filter(x => x.muscle === exFilter);
    if (q) shown = shown.filter(x =>
      x.name.toLowerCase().includes(q) || (x.category || "").toLowerCase().includes(q));
    if (!shown.length) return `<div class="empty">No exercises match.</div>`;
    return shown.map(x => `<div class="list-item">
      <div><strong>${esc(x.name)}</strong><br>
        <span class="muted">${esc(x.muscle)}${x.category ? " · " + esc(x.category) : ""}</span>
        ${x.custom ? ' <span class="tag">custom</span>' : ""}</div>
      <div class="row">
        <button class="btn-sm btn-ghost" data-action="ex-history" data-id="${x.id}" title="History" aria-label="history">📈</button>
        <button class="btn-sm btn-ghost" data-action="clone-exercise" data-id="${x.id}" title="Clone" aria-label="clone">⧉</button>
        <button class="btn-sm btn-ghost" data-action="edit-exercise" data-id="${x.id}">Edit</button>
      </div>
    </div>`).join("");
  }
  function viewExercises() {
    const groups = ["All", ...Store.MUSCLES];
    let h = `<div class="row between"><h1>Exercises</h1>
      <button class="btn-blue btn-sm" data-action="new-exercise">＋ New</button></div>`;
    h += `<input id="ex-q" placeholder="Search exercises…" value="${esc(exQ)}">`;
    h += `<div class="row wrap" style="margin:10px 0 12px">${groups.map(g =>
      `<button class="btn-sm pill ${g === exFilter ? "btn-accent" : "btn-ghost"}" data-action="filter" data-g="${g}">${g}</button>`
    ).join("")}</div>`;
    h += `<div id="ex-list">${exerciseListHTML()}</div>`;
    return h;
  }

  // ---------- ROUTINES ----------
  function viewRoutines() {
    const rs = Store.routines();
    let h = `<div class="row between"><h1>Routines</h1>
      <div class="row"><button class="btn-sm btn-ghost" data-action="import-routine">Import</button>
        <button class="btn-blue btn-sm" data-action="new-routine">＋ New</button></div></div>`;
    // Issue #13: spell out the difference right in the UI.
    h += `<div class="card muted" style="font-size:14px">
      A <strong>routine</strong> is a reusable template — a saved list of exercises (e.g. "Push Day").
      A <strong>workout</strong> is one actual session you log, on one day. Start a workout from a routine to pre-load its exercises.
    </div>`;

    // Iron #17: one-tap starter plans.
    h += `<h2>Starter plans</h2><div class="row wrap" style="margin-bottom:14px">${
      Store.STARTER_PLANS.map(p =>
        `<button class="btn-sm btn-ghost pill" data-action="add-plan" data-name="${esc(p.name)}">＋ ${esc(p.name)}</button>`
      ).join("")}</div>`;

    h += `<h2>Your routines</h2>`;
    if (!rs.length) h += `<div class="empty">None yet — add a starter plan above or create your own.</div>`;
    h += rs.map(rt => {
      const names = rt.exerciseIds.map(id => (Store.exercise(id) || {}).name).filter(Boolean);
      return `<div class="card">
        <div class="row between"><strong>${esc(rt.name)}</strong>
          <div class="row">
            <button class="btn-sm btn-ghost" data-action="share-routine" data-id="${rt.id}">Share</button>
            <button class="btn-sm btn-danger btn-ghost" data-action="del-routine" data-id="${rt.id}">✕</button>
          </div></div>
        <p class="muted">${names.map(esc).join(" · ") || "no exercises"}</p>
        <button class="btn-blue btn-full" data-action="start-routine" data-id="${rt.id}">Start workout</button>
      </div>`;
    }).join("");
    return h;
  }

  // ---------- HISTORY ----------
  function viewHistory() {
    const ws = Store.workouts();
    let h = `<h1>History</h1>`;
    if (!ws.length) return h + `<div class="empty">No finished workouts yet.</div>`;
    h += ws.map(w => {
      const vol = Math.round(Calc.workoutVolume(w.entries));
      const mins = w.end && w.start ? Math.round((w.end - w.start) / 60000) : 0;
      const lines = w.entries.map(e => {
        const ex = Store.exercise(e.exerciseId);
        return `<div class="muted" style="font-size:14px">${esc(ex ? ex.name : "?")}: ${
          e.sets.map(s => fmtSet(s, e.kind || "weight")).join(", ")}</div>`;
      }).join("");
      return `<div class="card">
        <div class="row between"><strong>${esc(w.name)}</strong>
          <div class="row">
            <button class="btn-sm btn-ghost" data-action="edit-workout" data-id="${w.id}">Edit</button>
            <button class="btn-sm btn-danger btn-ghost" data-action="del-workout" data-id="${w.id}" aria-label="delete workout">✕</button>
          </div></div>
        <p class="muted" style="margin:2px 0 8px">${fmtDate(w.end)} · ${mins} min · ${vol} ${unit()} · ${Calc.completedSets(w.entries)} sets</p>
        ${lines}
      </div>`;
    }).join("");
    return h;
  }

  // ---------- SETTINGS ----------
  function viewSettings() {
    const s = Store.settings();
    return `<h1>Settings</h1>
      <div class="card">
        <label>Weight unit</label>
        <select id="set-unit">
          <option value="kg" ${s.unit === "kg" ? "selected" : ""}>Kilograms (kg)</option>
          <option value="lb" ${s.unit === "lb" ? "selected" : ""}>Pounds (lb)</option>
        </select>
        <label>Theme</label>
        <select id="set-theme">
          <option value="dark" ${s.theme === "dark" ? "selected" : ""}>Dark</option>
          <option value="light" ${s.theme === "light" ? "selected" : ""}>Light</option>
        </select>
        <label>Default rest timer (seconds)</label>
        <input type="number" inputmode="numeric" data-setting="restDefault" value="${s.restDefault}">
        <label>Quick +/- weight increment</label>
        <input type="number" inputmode="decimal" data-setting="increment" value="${s.increment}">
      </div>
      <div class="card">
        <h2>Backup</h2>
        <div class="row wrap">
          <button data-action="export">Export JSON</button>
          <button data-action="export-csv">Export CSV</button>
          <button data-action="import">Import JSON</button>
          <button class="btn-danger" data-action="reset">Reset all</button>
        </div>
      </div>
      <p class="fab-note">Forge · your data stays on this device (offline-first PWA).</p>`;
  }

  // ---------- STATS ----------
  // Minimal inline SVG line chart — no chart library.
  function lineChart(values) {
    const w = 320, h = 90, pad = 8;
    if (values.length < 2) return `<p class="muted" style="margin:6px 0">Not enough data yet — log a couple more.</p>`;
    const min = Math.min(...values), max = Math.max(...values), range = (max - min) || 1;
    const n = values.length;
    const X = i => pad + (i / (n - 1)) * (w - 2 * pad);
    const Y = v => pad + (1 - (v - min) / range) * (h - 2 * pad);
    const pts = values.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
    return `<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke"/>
    </svg><div class="row between muted" style="font-size:12px"><span>${min}</span><span>${max}</span></div>`;
  }

  let statEx = null;
  function viewStats() {
    const u = unit();
    const ws = Store.workouts();
    const bw = Store.bodyweights();
    const histIds = new Set();
    ws.forEach(w => w.entries.forEach(e => histIds.add(e.exerciseId)));
    const histExercises = Store.exercises().filter(x => histIds.has(x.id));
    if (statEx == null || !histIds.has(statEx)) statEx = histExercises.length ? histExercises[0].id : null;

    let h = `<h1>Stats</h1>`;

    const latestBw = bw.length ? bw[bw.length - 1].value : null;
    h += `<div class="card">
      <div class="row between"><h2>Body weight</h2><strong>${latestBw != null ? latestBw + " " + u : "—"}</strong></div>
      ${lineChart(bw.map(b => b.value))}
      <div class="row" style="margin-top:8px">
        <input id="bw-input" inputmode="decimal" placeholder="Today's weight (${u})">
        <button class="btn-blue" data-action="add-bw">Log</button>
      </div>
    </div>`;

    const vol = Calc.volumeSeries(ws).map(v => v.volume);
    h += `<div class="card">
      <div class="row between"><h2>Volume per workout</h2><span class="muted">${ws.length} logged</span></div>
      ${lineChart(vol)}
    </div>`;

    h += `<div class="card"><h2>Exercise progress</h2>`;
    if (!histExercises.length) {
      h += `<p class="muted">Log a workout to see progress here.</p>`;
    } else {
      h += `<select id="stat-ex">${histExercises.map(x =>
        `<option value="${x.id}" ${x.id === statEx ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select>`;
      const series = Calc.exerciseSeries(ws, statEx);
      const pr = Calc.personalRecords(ws, statEx);
      h += `<div class="spacer"></div>
        <div class="muted" style="font-size:13px">Estimated 1RM over time</div>
        ${lineChart(series.map(s => s.oneRM))}
        <div class="row wrap" style="margin-top:10px;gap:10px">
          <div class="stat-box"><span class="muted">Best 1RM</span><br><strong>${Math.round(pr.best1RM)} ${u}</strong></div>
          <div class="stat-box"><span class="muted">Heaviest</span><br><strong>${pr.maxWeight} ${u}</strong></div>
          <div class="stat-box"><span class="muted">Best set</span><br><strong>${Math.round(pr.maxVolumeSet)} ${u}</strong></div>
        </div>`;
    }
    h += `</div>`;
    return h;
  }

  // ---------- ACTIVE WORKOUT ----------
  function viewWorkout() {
    const a = Store.active();
    if (!a) { go("home"); return "<p>No active workout.</p>"; }
    const u = unit();
    let h = `<div class="row between">
      <h1 style="margin:0">${esc(a.name)}</h1>
      <div class="row">
        <button class="btn-sm btn-ghost" data-action="plates" title="Plate calculator">⚖︎</button>
        <button class="btn-sm btn-ghost" data-action="rename-workout">✎</button>
      </div>
    </div><p class="muted">Started ${fmtTime(a.start)} · ${Calc.completedSets(a.entries)} sets done</p><div class="spacer"></div>`;

    a.entries.forEach((entry, i) => {
      const ex = Store.exercise(entry.exerciseId) || { name: "?", muscle: "", kind: "weight" };
      const kind = entry.kind || "weight";
      const last = Store.lastPerformance(entry.exerciseId);
      const lastTxt = last ? "Last: " + last.sets.map(s => fmtSet(s, kind)).join(", ") : "First time — no history yet";
      const doneSets = entry.sets.filter(s => s.done);
      const est = (kind === "weight" && doneSets.length) ? Math.round(Calc.best1RM(doneSets)) : 0;
      h += `<div class="card">
        <div class="row between">
          <div><strong>${esc(ex.name)}</strong> <span class="muted">${esc(ex.muscle)}</span></div>
          <div class="row">
            ${est ? `<span class="tag">≈${est} ${unit()} 1RM</span>` : ""}
            <button class="btn-sm btn-ghost" data-action="move-entry" data-e="${i}" data-dir="-1" aria-label="move up">▲</button>
            <button class="btn-sm btn-ghost" data-action="move-entry" data-e="${i}" data-dir="1" aria-label="move down">▼</button>
            <button class="btn-sm btn-danger btn-ghost" data-action="del-entry" data-e="${i}" aria-label="remove exercise">✕</button>
          </div>
        </div>
        <p class="muted" style="font-size:13px;margin:2px 0 8px">${esc(lastTxt)}</p>
        ${entry.sets.map((set, j) => setRow(i, j, set, kind)).join("")}
        <div class="row" style="margin-top:8px">
          <button class="btn-sm btn-ghost grow" data-action="add-set" data-e="${i}">＋ Add set</button>
          <button class="btn-sm btn-ghost" data-action="entry-note" data-e="${i}" aria-label="add note">📝</button>
        </div>
        ${entry.note ? `<p class="muted" style="font-size:13px;margin-top:8px">📝 ${esc(entry.note)}</p>` : ""}
      </div>`;
    });

    h += `<button class="btn-blue btn-full" data-action="add-exercise">＋ Add exercise</button>
      <div class="spacer"></div>
      <button class="btn-accent btn-full" data-action="finish">✓ Finish workout</button>
      <div class="spacer"></div>
      <button class="btn-full btn-ghost btn-danger" data-action="discard">Discard</button>`;
    return h;
  }

  // Human-readable one set, per exercise kind.
  function fmtSet(s, kind) {
    if (kind === "time") return `${s.seconds || 0}s`;
    if (kind === "distance") return `${s.distance || 0}km`;
    if (kind === "bodyweight") return `${s.reps || 0}${s.weight ? `+${s.weight}` : ""}`;
    return `${s.weight || 0}×${s.reps || 0}`;
  }
  function numInput(i, j, f, val, ph) {
    return `<input inputmode="${f === "reps" ? "numeric" : "decimal"}" data-e="${i}" data-s="${j}" data-f="${f}" value="${val || ""}" placeholder="${ph}" aria-label="${ph}">`;
  }
  function stepBtns(i, j, f) {
    const minus = f === "reps" ? "r-" : "w-", plus = f === "reps" ? "r+" : "w+";
    return `<div class="step-btns">
      <button class="btn-ghost" data-action="${minus}" data-e="${i}" data-s="${j}" aria-label="decrease">−</button>
      <button class="btn-ghost" data-action="${plus}" data-e="${i}" data-s="${j}" aria-label="increase">＋</button>
    </div>`;
  }
  function setRow(i, j, set, kind) {
    // Direct typing (fast, fixes #9) + quick ± buttons. inputmode brings up the
    // number keyboard; scroll-margin keeps it visible above the bar (fixes #20).
    const badge = { normal: j + 1, warmup: "W", drop: "D", failure: "F" }[set.type] || j + 1;
    const typeCls = set.type && set.type !== "normal" ? "type-" + set.type : "";
    let fields;
    if (kind === "time") {
      fields = `<div class="grow">${numInput(i, j, "seconds", set.seconds, "seconds")}</div>`;
    } else if (kind === "distance") {
      fields = `<div class="grow">${numInput(i, j, "distance", set.distance, "km")}</div>
                <div class="grow">${numInput(i, j, "seconds", set.seconds, "seconds")}</div>`;
    } else {
      const wLabel = kind === "bodyweight" ? "+" + unit() : unit();
      fields = `<div class="grow">${numInput(i, j, "weight", set.weight, wLabel)}${stepBtns(i, j, "weight")}</div>
                <div class="grow">${numInput(i, j, "reps", set.reps, "reps")}${stepBtns(i, j, "reps")}</div>`;
    }
    return `<div class="set-row ${set.done ? "done-row" : ""}">
      <button class="set-num ${typeCls}" data-action="cycle-type" data-e="${i}" data-s="${j}" aria-label="set type">${badge}</button>
      ${fields}
      <input class="rpe" inputmode="decimal" data-e="${i}" data-s="${j}" data-f="rpe" value="${set.rpe || ""}" placeholder="RPE" aria-label="RPE">
      <button class="btn-sm ${set.done ? "set-done" : ""}" data-action="done" data-e="${i}" data-s="${j}" aria-label="mark set done">✓</button>
      <button class="btn-sm btn-ghost btn-danger" data-action="del-set" data-e="${i}" data-s="${j}" aria-label="delete set">✕</button>
    </div>`;
  }

  // ---------- input wiring (no re-render during typing → keeps focus) ----------
  function wireInputs() {
    appEl.querySelectorAll("input[data-f]").forEach(inp => {
      inp.addEventListener("input", () => {
        const i = +inp.dataset.e, j = +inp.dataset.s, f = inp.dataset.f;
        Store.updateSet(i, j, { [f]: num(inp.value) });
      });
    });
    appEl.querySelectorAll("[data-setting]").forEach(el => {
      el.addEventListener("change", () => {
        const k = el.dataset.setting;
        Store.setSetting(k, k === "unit" ? el.value : num(el.value));
      });
    });
    // live exercise search — update only the list, keep the input focused
    const exq = appEl.querySelector("#ex-q");
    if (exq) exq.addEventListener("input", () => {
      exQ = exq.value;
      const l = appEl.querySelector("#ex-list");
      if (l) l.innerHTML = exerciseListHTML();
    });
    const statSel = appEl.querySelector("#stat-ex");
    if (statSel) statSel.addEventListener("change", () => { statEx = statSel.value; render(); });
    const unitSel = appEl.querySelector("#set-unit");
    if (unitSel) unitSel.addEventListener("change", () => {
      const to = unitSel.value;
      if (to === Store.settings().unit) return;
      if (confirm(`Convert your existing weights to ${to}?`)) Store.convertUnits(to);
      else Store.setSetting("unit", to);
      render();
    });
    const themeSel = appEl.querySelector("#set-theme");
    if (themeSel) themeSel.addEventListener("change", () => {
      Store.setSetting("theme", themeSel.value); applyTheme(); render();
    });
  }

  function applyTheme() {
    document.documentElement.dataset.theme = Store.settings().theme || "dark";
  }

  // ---------- click actions (delegated on whole document) ----------
  document.body.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-action]");
    if (!btn) return;
    const a = btn.dataset;
    const active = Store.active();

    switch (a.action) {
      case "start-empty": Store.startWorkout(null); return go("workout");
      case "start-routine": Store.startWorkout(a.id); return go("workout");
      case "resume": return go("workout");

      case "filter": exFilter = a.g; return render();
      case "new-exercise": return exerciseForm();
      case "edit-exercise": return exerciseForm(a.id);
      case "clone-exercise": Store.cloneExercise(a.id); return render();
      case "ex-history": return exerciseHistoryModal(a.id);
      case "new-routine": return routineForm();
      case "del-routine": if (confirm("Delete this routine?")) { Store.deleteRoutine(a.id); render(); } return;
      case "del-workout": if (confirm("Delete this workout?")) { Store.deleteWorkout(a.id); render(); } return;
      case "edit-workout":
        if (Store.active()) { alert("Finish or discard your current workout first."); return; }
        Store.reopenWorkout(a.id); return go("workout");
      case "add-plan": Store.addStarterPlan(a.name); return render();
      case "share-routine": return shareRoutine(a.id);
      case "import-routine": return importRoutine();
      case "add-bw": { const bwi = appEl.querySelector("#bw-input"); if (bwi) { Store.addBodyweight(bwi.value); render(); } return; }
      case "plates": return platesModal();

      case "add-exercise": return exercisePicker();
      case "add-set": Store.addSet(+a.e); return render();
      case "del-set": Store.removeSet(+a.e, +a.s); return render();
      case "del-entry": Store.removeEntry(+a.e); return render();
      case "move-entry": Store.moveEntry(+a.e, +a.dir); return render();
      case "entry-note": {
        const note = prompt("Note for this exercise:", active.entries[+a.e].note || "");
        if (note !== null) { Store.setEntryNote(+a.e, note); render(); }
        return;
      }
      case "cycle-type": {
        const order = ["normal", "warmup", "drop", "failure"];
        const cur = active.entries[+a.e].sets[+a.s].type || "normal";
        Store.updateSet(+a.e, +a.s, { type: order[(order.indexOf(cur) + 1) % order.length] });
        return render();
      }
      case "done": {
        const set = active.entries[+a.e].sets[+a.s];
        const wasDone = set.done;
        Store.updateSet(+a.e, +a.s, { done: !wasDone });
        if (!wasDone) {
          const ex = Store.exercise(active.entries[+a.e].exerciseId);
          startRest((ex && ex.defaultRest) || Store.settings().restDefault);
        }
        return render();
      }
      case "w+": adjust(+a.e, +a.s, "weight", stepFor(+a.e)); return render();
      case "w-": adjust(+a.e, +a.s, "weight", -stepFor(+a.e)); return render();
      case "r+": adjust(+a.e, +a.s, "reps", 1); return render();
      case "r-": adjust(+a.e, +a.s, "reps", -1); return render();

      case "rename-workout": {
        const name = prompt("Workout name:", active.name);
        if (name) { Store.renameActive(name); render(); }
        return;
      }
      case "finish": {
        if (!Calc.completedSets(active.entries)) { alert("Mark at least one set as done (✓) first."); return; }
        const name = prompt("Name this workout:", active.name) || active.name;
        Store.finishWorkout(name); stopRest();
        const prs = Calc.newPRs(Store.workouts());
        if (prs.length) {
          const lines = prs.map(p => `${(Store.exercise(p.exerciseId) || {}).name}: ${p.oneRM} ${unit()}`).join("\n");
          setTimeout(() => alert("🏆 New personal record!\n" + lines), 120);
        }
        return go("history");
      }
      case "discard": if (confirm("Discard this workout? Nothing will be saved.")) { Store.discardWorkout(); stopRest(); go("home"); } return;

      case "rest-stop": return stopRest();

      case "export": return exportData();
      case "export-csv": return exportCSVFile();
      case "import": return importData();
      case "reset": if (confirm("Erase ALL data and start fresh?")) { Store.reset(); render(); } return;

      case "modal-close": return modal.close();
    }
  });

  function adjust(i, j, field, delta) {
    const set = Store.active().entries[i].sets[j];
    const v = Math.max(0, Calc.round((set[field] || 0) + delta, field === "reps" ? 1 : 0.5));
    Store.updateSet(i, j, { [field]: v });
  }
  function stepFor(i) {
    const ex = Store.exercise(Store.active().entries[i].exerciseId);
    return (ex && ex.increment) || Store.settings().increment || 2.5;
  }

  // ---------- modals ----------
  function openModal(html) { modal.innerHTML = html; modal.showModal(); }

  function exerciseForm(id) {
    const x = id ? Store.exercise(id) : null;
    const opts = Store.MUSCLES.map(m => `<option ${x && x.muscle === m ? "selected" : ""}>${m}</option>`).join("");
    const kinds = { weight: "Weight × reps", bodyweight: "Bodyweight (reps)", time: "Time (seconds)", distance: "Distance" };
    const curKind = x ? x.kind : "weight";
    const kindOpts = Object.keys(kinds).map(k =>
      `<option value="${k}" ${k === curKind ? "selected" : ""}>${kinds[k]}</option>`).join("");
    openModal(`<form method="dialog" class="card" style="min-width:280px;max-height:82vh;overflow:auto">
      <h2>${x ? "Edit" : "New"} exercise</h2>
      <label>Name</label><input id="ex-name" value="${x ? esc(x.name) : ""}" required>
      <label>Muscle group</label><select id="ex-muscle">${opts}</select>
      <label>Measured as</label><select id="ex-kind">${kindOpts}</select>
      <label>Category (e.g. Barbell, Cable, Machine…)</label>
      <input id="ex-cat" value="${x ? esc(x.category) : ""}" placeholder="anything you like">
      <div class="row">
        <div class="grow"><label>Default rest (s)</label>
          <input id="ex-rest" inputmode="numeric" value="${x && x.defaultRest ? x.defaultRest : ""}" placeholder="optional"></div>
        <div class="grow"><label>Increment</label>
          <input id="ex-inc" inputmode="decimal" value="${x && x.increment ? x.increment : ""}" placeholder="optional"></div>
      </div>
      <label>Notes</label><textarea id="ex-notes" rows="2">${x ? esc(x.notes) : ""}</textarea>
      <div class="spacer"></div>
      <div class="row">
        ${id ? '<button type="button" class="btn-danger" id="ex-del">Delete</button>' : ""}
        <span class="grow"></span>
        <button type="button" data-action="modal-close">Cancel</button>
        <button type="button" class="btn-accent" id="ex-save">Save</button>
      </div>
    </form>`);
    modal.querySelector("#ex-save").onclick = () => {
      const name = modal.querySelector("#ex-name").value.trim();
      if (!name) return;
      const rest = modal.querySelector("#ex-rest").value;
      const inc = modal.querySelector("#ex-inc").value;
      const data = {
        name,
        muscle: modal.querySelector("#ex-muscle").value,
        kind: modal.querySelector("#ex-kind").value,
        category: modal.querySelector("#ex-cat").value,
        notes: modal.querySelector("#ex-notes").value,
      };
      if (rest) data.defaultRest = +rest;
      if (inc) data.increment = +inc;
      if (id) Store.updateExercise(id, data); else Store.addExercise(data);
      modal.close(); render();
    };
    if (id) modal.querySelector("#ex-del").onclick = () => {
      if (confirm("Delete this exercise?")) { Store.deleteExercise(id); modal.close(); render(); }
    };
  }

  function routineForm() {
    const list = Store.exercises();
    openModal(`<form method="dialog" class="card" style="min-width:300px;max-height:80vh;overflow:auto">
      <h2>New routine</h2>
      <label>Name</label><input id="rt-name" placeholder="Push Day" required>
      <label>Pick exercises</label>
      <div id="rt-list">${list.map(x =>
        `<label class="row" style="margin:6px 0"><input type="checkbox" style="width:auto" value="${x.id}">
          <span>${esc(x.name)} <span class="muted">${esc(x.muscle)}</span></span></label>`
      ).join("")}</div>
      <div class="spacer"></div>
      <div class="row"><span class="grow"></span>
        <button type="button" data-action="modal-close">Cancel</button>
        <button type="button" class="btn-accent" id="rt-save">Save</button></div>
    </form>`);
    modal.querySelector("#rt-save").onclick = () => {
      const name = modal.querySelector("#rt-name").value.trim();
      if (!name) return;
      const ids = [...modal.querySelectorAll("#rt-list input:checked")].map(c => c.value);
      Store.addRoutine({ name, exerciseIds: ids });
      modal.close(); render();
    };
  }

  function exercisePicker() {
    const listHTML = (q) => {
      const list = Store.exercises().filter(x =>
        !q || x.name.toLowerCase().includes(q.toLowerCase()) || x.muscle.toLowerCase().includes(q.toLowerCase()));
      return list.map(x => `<button type="button" class="list-item btn-ghost btn-full" data-pick="${x.id}"
        style="text-align:left;border-radius:0">
        <span><strong>${esc(x.name)}</strong><br><span class="muted">${esc(x.muscle)}${x.category ? " · " + esc(x.category) : ""}</span></span>
      </button>`).join("") || `<div class="empty">No match.</div>`;
    };
    openModal(`<div class="card" style="min-width:300px;max-height:80vh;overflow:auto">
      <div class="row between"><h2>Add exercise</h2><button data-action="modal-close" class="btn-sm">Done</button></div>
      <input id="pick-q" placeholder="Search…" autofocus>
      <div class="spacer"></div>
      <div id="pick-list">${listHTML("")}</div>
    </div>`);
    const q = modal.querySelector("#pick-q");
    const listEl = modal.querySelector("#pick-list");
    q.addEventListener("input", () => { listEl.innerHTML = listHTML(q.value); });
    // listEl is fresh each open, so this delegated handler doesn't leak across opens.
    listEl.addEventListener("click", (e) => {
      const b = e.target.closest("[data-pick]");
      if (!b) return;
      Store.addEntry(b.dataset.pick);
      modal.close(); render();
    });
  }

  // Build a QR image data-URL for text, or "" if the QR lib/size fails.
  function qrDataURL(text) {
    if (typeof window.qrcode !== "function") return "";
    try { const qr = window.qrcode(0, "M"); qr.addData(text); qr.make(); return qr.createDataURL(4, 8); }
    catch (_) { return ""; }
  }

  function shareRoutine(id) {
    const code = Store.routineToCode(id);
    const img = qrDataURL(code);
    openModal(`<div class="card" style="min-width:300px">
      <h2>Share routine</h2>
      ${img ? `<div style="text-align:center;background:#fff;padding:12px;border-radius:12px;margin-bottom:10px">
        <img src="${img}" alt="routine QR code" style="width:200px;height:200px;image-rendering:pixelated"></div>
        <p class="muted" style="font-size:13px">Scan it from Forge on another device (Routines → Import → Scan), or copy the code:</p>`
        : `<p class="muted" style="font-size:14px">Copy this code, then on another device: Routines → Import → paste.</p>`}
      <textarea id="share-code" rows="3" readonly>${esc(code)}</textarea>
      <div class="spacer"></div>
      <div class="row"><button class="btn-accent" id="copy-code">Copy code</button>
        <span class="grow"></span><button data-action="modal-close">Close</button></div>
    </div>`);
    modal.querySelector("#copy-code").onclick = () => {
      const ta = modal.querySelector("#share-code");
      ta.select();
      if (navigator.clipboard) navigator.clipboard.writeText(ta.value).catch(() => {});
      else try { document.execCommand("copy"); } catch (_) {}
      modal.querySelector("#copy-code").textContent = "Copied ✓";
    };
  }

  function importRoutine() {
    const canScan = "BarcodeDetector" in window;
    openModal(`<div class="card" style="min-width:300px">
      <h2>Import routine</h2>
      <p class="muted" style="font-size:14px">Paste a routine code${canScan ? " or scan a QR" : ""} (starts with <code>FORGE1:</code>).</p>
      ${canScan ? `<button class="btn-blue btn-full" id="imp-scan">📷 Scan QR</button>
        <video id="imp-video" playsinline style="display:none;width:100%;border-radius:12px;margin-top:8px"></video>
        <div class="spacer"></div>` : ""}
      <textarea id="imp-code" rows="3" placeholder="FORGE1:…"></textarea>
      <div class="spacer"></div>
      <div class="row"><span class="grow"></span>
        <button data-action="modal-close" id="imp-cancel">Cancel</button>
        <button class="btn-accent" id="imp-go">Import</button></div>
    </div>`);
    let stopScan = null;
    modal.querySelector("#imp-go").onclick = () => {
      try { Store.routineFromCode(modal.querySelector("#imp-code").value); if (stopScan) stopScan(); modal.close(); render(); }
      catch (e) { alert("Import failed: " + e.message); }
    };
    modal.querySelector("#imp-cancel").onclick = () => { if (stopScan) stopScan(); };
    if (canScan) modal.querySelector("#imp-scan").onclick = async () => {
      const video = modal.querySelector("#imp-video");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.style.display = "block"; video.srcObject = stream; await video.play();
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        let running = true;
        stopScan = () => { running = false; stream.getTracks().forEach(t => t.stop()); };
        const scan = async () => {
          if (!running) return;
          try {
            const codes = await detector.detect(video);
            if (codes.length) { modal.querySelector("#imp-code").value = codes[0].rawValue; stopScan(); video.style.display = "none"; return; }
          } catch (_) {}
          requestAnimationFrame(scan);
        };
        scan();
      } catch (e) { alert("Camera unavailable: " + e.message); }
    };
  }

  function exerciseHistoryModal(id) {
    const ex = Store.exercise(id);
    if (!ex) return;
    const kind = ex.kind || "weight";
    const sessions = Store.workouts().filter(w => w.entries.some(e => e.exerciseId === id));
    const pr = Calc.personalRecords(Store.workouts(), id);
    let body = "";
    if (kind === "weight") {
      body += `<div class="row wrap" style="gap:10px;margin-bottom:12px">
        <div class="stat-box"><span class="muted">Best 1RM</span><br><strong>${Math.round(pr.best1RM)} ${unit()}</strong></div>
        <div class="stat-box"><span class="muted">Heaviest</span><br><strong>${pr.maxWeight} ${unit()}</strong></div>
      </div>`;
    }
    body += sessions.length
      ? sessions.map(w => {
        const e = w.entries.find(x => x.exerciseId === id);
        return `<div class="list-item"><div><strong>${fmtDate(w.end)}</strong><br>
          <span class="muted">${e.sets.map(s => fmtSet(s, kind)).join(", ")}</span></div></div>`;
      }).join("")
      : `<p class="muted">No history yet.</p>`;
    openModal(`<div class="card" style="min-width:300px;max-height:80vh;overflow:auto">
      <div class="row between"><h2>${esc(ex.name)}</h2><button data-action="modal-close" class="btn-sm">Close</button></div>
      <p class="muted" style="font-size:13px;margin-top:0">${esc(ex.muscle)} · ${esc(ex.category || kind)}</p>
      ${body}</div>`);
  }

  function platesModal() {
    const u = unit();
    const bar = u === "kg" ? 20 : 45;
    const plateSet = u === "kg" ? [25, 20, 15, 10, 5, 2.5, 1.25] : [45, 35, 25, 10, 5, 2.5];
    const compute = (target) => {
      const t = num(target);
      if (!t) return `<p class="muted">Enter a weight.</p>`;
      const per = Calc.platesPerSide(t, bar, plateSet);
      if (!per.length) return `<p class="muted">Just the ${bar} ${u} bar (target ≤ bar).</p>`;
      const loaded = bar + per.reduce((s, p) => s + p, 0) * 2;
      const short = loaded < t ? ` <span class="muted">(reaches ${loaded} ${u} with these plates)</span>` : "";
      return `<p>Each side: <strong>${per.join(" + ")} ${u}</strong>${short}</p>`;
    };
    openModal(`<div class="card" style="min-width:280px">
      <h2>Plate calculator</h2>
      <label>Target total (${u}) · Olympic bar = ${bar} ${u}</label>
      <input id="plate-target" inputmode="decimal" placeholder="e.g. 100">
      <div id="plate-out" style="margin-top:10px">${compute("")}</div>
      <div class="spacer"></div>
      <div class="row"><span class="grow"></span><button data-action="modal-close">Close</button></div>
    </div>`);
    const inp = modal.querySelector("#plate-target");
    const out = modal.querySelector("#plate-out");
    inp.addEventListener("input", () => { out.innerHTML = compute(inp.value); });
    inp.focus();
  }

  // ---------- backup ----------
  function downloadFile(text, name, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  }
  function exportData() { downloadFile(Store.exportJSON(), "forge-backup.json", "application/json"); }
  function exportCSVFile() { downloadFile(Store.exportCSV(), "forge-workouts.csv", "text/csv"); }
  function importData() {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = "application/json";
    inp.onchange = () => {
      const file = inp.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try { Store.importJSON(reader.result); render(); alert("Imported."); }
        catch (e) { alert("Import failed: " + e.message); }
      };
      reader.readAsText(file);
    };
    inp.click();
  }

  // ---------- rest timer (survives re-renders via its own element) ----------
  let rest = { id: null, remaining: 0 };
  function startRest(sec) {
    stopRest();
    rest.remaining = sec | 0;
    if (rest.remaining <= 0) return;
    rest.id = setInterval(() => {
      rest.remaining--;
      if (rest.remaining <= 0) { stopRest(); if (navigator.vibrate) navigator.vibrate(400); notify("Rest done", "Time for your next set 💪"); }
      renderRest();
    }, 1000);
    renderRest();
  }
  function stopRest() { if (rest.id) clearInterval(rest.id); rest.id = null; rest.remaining = 0; renderRest(); }
  function renderRest() {
    let el = document.getElementById("rest");
    if (!rest.id) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement("div"); el.id = "rest"; el.className = "rest-banner"; document.body.appendChild(el); }
    const m = Math.floor(rest.remaining / 60), s = rest.remaining % 60;
    el.innerHTML = `⏱ ${m}:${String(s).padStart(2, "0")} <button class="btn-sm" data-action="rest-stop">Skip</button>`;
  }
  function notify(title, body) {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") new Notification(title, { body });
  }

  // ---------- boot ----------
  applyTheme();
  window.addEventListener("hashchange", render);
  if (!location.hash) location.hash = "#/home";
  render();

  // ask once for rest-timer notifications (non-blocking)
  if ("Notification" in window && Notification.permission === "default") {
    setTimeout(() => Notification.requestPermission().catch(() => {}), 3000);
  }

  // PWA offline support
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
})();
