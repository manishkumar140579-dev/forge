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

  const routes = ["today", "train", "fuel", "more", "exercises", "history", "routines", "stats", "settings", "workout"];
  const route = () => {
    const r = (location.hash.replace(/^#\/?/, "") || "today").split("/")[0];
    return routes.includes(r) ? r : "today";
  };
  const go = (r) => { location.hash = "#/" + r; };
  let curDate = Store.dayKey();

  // ---------- shell + nav ----------
  // Feather-style line icons from the design mockups
  const ICON = {
    today: '<circle cx="12" cy="12" r="8"></circle><path d="M12 8v4l2.5 2.5"></path>',
    train: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11"></path>',
    fuel: '<path d="M7 3v7a2 2 0 0 0 4 0V3M9 12v9M16 21V3c2.2 0 3.5 2.5 3.5 6s-1.3 4-3.5 4"></path>',
    progress: '<path d="M4 20h16M5 16l4-5 3.5 3L19 6"></path>',
    more: '<rect x="4" y="4" width="6" height="6" rx="1.5"></rect><rect x="14" y="4" width="6" height="6" rx="1.5"></rect><rect x="4" y="14" width="6" height="6" rx="1.5"></rect><rect x="14" y="14" width="6" height="6" rx="1.5"></rect>',
    chevL: '<path d="M15 18l-6-6 6-6"></path>',
    chevR: '<path d="M9 18l6-6-6-6"></path>',
    plus: '<path d="M12 5v14M5 12h14"></path>',
    minus: '<path d="M5 12h14"></path>',
    close: '<path d="M6 6l12 12M18 6L6 18"></path>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"></rect><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path>',
    shield: '<path d="M12 3l8 3v6c0 4.5-3.5 8-8 9-4.5-1-8-4.5-8-9V6l8-3z"></path>',
    list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"></path>',
    clock: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"></path><path d="M3 3v5h5M12 7v5l3 2"></path>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"></path><circle cx="16" cy="7" r="2"></circle><circle cx="10" cy="17" r="2"></circle>',
    pencil: '<path d="M4 20h4L19 9l-4-4L4 16v4z"></path>',
    target: '<circle cx="12" cy="12" r="8.5"></circle><circle cx="12" cy="12" r="2.5"></circle>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"></path>',
    chevD: '<path d="M6 9l6 6 6-6"></path>',
  };
  const DOTS_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"></circle><circle cx="12" cy="12" r="1.8"></circle><circle cx="19" cy="12" r="1.8"></circle></svg>';
  function svgIcon(name, size = 20, sw = 2) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name] || ""}</svg>`;
  }

  const NAV = [
    ["today", "today", "Today"],
    ["train", "train", "Train"],
    ["fuel", "fuel", "Fuel"],
    ["stats", "progress", "Progress"],
    ["more", "more", "More"],
  ];
  function navActive(r) {
    if (r === "workout") return "train";
    if (["exercises", "routines", "history", "settings"].includes(r)) return "more";
    return r;
  }
  function navHTML(cur) {
    return `<nav class="tabbar" aria-label="Main">${NAV.map(([r, ic, l]) =>
      `<a href="#/${r}" class="${cur === r ? "active" : ""}"><span class="ico">${svgIcon(ic)}</span>${l}</a>`
    ).join("")}</nav>`;
  }

  // screen header: big Archivo title + optional subtitle
  function screenHeader(title, subtitle) {
    return `<header class="scr-head"><div class="scr-head-t"><h1>${esc(title)}</h1>${subtitle ? `<p class="subtitle">${esc(subtitle)}</p>` : ""}</div></header>`;
  }
  // date header (Today / Fuel): date line + title, day-nav buttons on the right
  function dateHeader(title) {
    const d = new Date(curDate + "T00:00:00");
    const rel = dateLabel(curDate);
    const short = d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
    const line = (rel === "Today" || rel === "Yesterday") ? `${rel} · ${short}` : short;
    return `<header class="scr-head between">
      <div class="scr-head-t"><p class="eyebrow-date">${esc(line)}</p><h1>${esc(title)}</h1></div>
      <div class="row" style="gap:6px">
        <button class="daybtn" data-action="date-prev" aria-label="Previous day">${svgIcon("chevL")}</button>
        <button class="daybtn" data-action="date-next" aria-label="Next day"${curDate >= Store.dayKey() ? " disabled" : ""}>${svgIcon("chevR")}</button>
      </div></header>`;
  }

  // ---------- render dispatch ----------
  function render() {
    const r = route();
    let html;
    if (r === "today") html = viewToday();
    else if (r === "train") html = Store.active() ? viewWorkout() : viewTrain();
    else if (r === "fuel") html = viewFuel();
    else if (r === "more") html = viewMore();
    else if (r === "exercises") html = viewExercises();
    else if (r === "history") html = viewHistory();
    else if (r === "routines") html = viewRoutines();
    else if (r === "stats") html = viewStats();
    else if (r === "settings") html = viewSettings();
    else if (r === "workout") html = viewWorkout();
    appEl.innerHTML = html;
    document.querySelectorAll("body > nav").forEach(n => n.remove()); // only the bottom bar, not in-content navs
    document.body.insertAdjacentHTML("beforeend", navHTML(navActive(r)));
    wireInputs();
    renderRest();
  }

  // ---------- date navigation (any-day logging) ----------
  const MEALS = ["Breakfast", "Lunch", "Dinner", "Snacks", "Pre-Workout", "Post-Workout"];
  function dateLabel(key) {
    const t = Store.dayKey();
    const yd = new Date(); yd.setDate(yd.getDate() - 1);
    if (key === t) return "Today";
    if (key === Store.dayKey(yd.getTime())) return "Yesterday";
    return new Date(key + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  }
  function dateStrip() {
    const atToday = curDate >= Store.dayKey();
    return `<div class="row between date-strip">
      <button class="btn-sm btn-ghost" data-action="date-prev" aria-label="previous day">‹</button>
      <button class="btn-sm btn-ghost" data-action="date-today"><strong>${dateLabel(curDate)}</strong></button>
      <button class="btn-sm btn-ghost" data-action="date-next" aria-label="next day" ${atToday ? "disabled" : ""}>›</button>
    </div>`;
  }

  // ---------- small chart bits ----------
  function ring(pct, big, sub, size) {
    size = size || 140;
    const cx = size / 2, r = cx - 10, sw = size >= 148 ? 14 : 12;
    const c = 2 * Math.PI * r, off = c * (1 - Math.min(1, Math.max(0, pct)));
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="display:block">
      <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="var(--border)" stroke-width="${sw}"/>
      <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="var(--accent)" stroke-width="${sw}" stroke-linecap="round"
        stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 ${cx} ${cx})"/>
      <text x="${cx}" y="${cx - 1}" text-anchor="middle" font-family="Archivo, sans-serif" font-size="${size >= 148 ? 30 : 28}" fill="var(--text)" font-weight="800">${big}</text>
      <text x="${cx}" y="${cx + 19}" text-anchor="middle" font-size="11" fill="var(--muted)">${sub}</text>
    </svg>`;
  }
  function macroBar(name, val, goal, color) {
    const pct = goal ? Math.min(100, (val / goal) * 100) : 0;
    return `<div style="margin:8px 0">
      <div class="row between" style="font-size:13px"><span>${name}</span><span class="muted">${Math.round(val)} / ${goal} g</span></div>
      <div class="bar"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
    </div>`;
  }

  // ---------- TODAY (dashboard) ----------
  function viewToday() {
    const g = Store.goals(), u = unit();
    const food = Store.foodByDate(curDate);
    const macros = Calc.dayMacros(food);
    const kcal = Math.round(macros.kcal);
    const remaining = Math.round(g.calories - kcal);
    const wos = Store.workoutsByDate(curDate);
    const vol = wos.reduce((s, w) => s + Calc.workoutVolume(w.entries), 0);
    const burned = Calc.caloriesBurned(vol);
    const water = Store.getWater(curDate);

    const nf = (n) => Math.round(n).toLocaleString();
    let h = dateHeader("Today");
    h += `<section class="card">
      <div class="card-hd"><h2>Calories</h2><span class="cap">Goal ${nf(g.calories)}</span></div>
      <div class="cal-row">
        <div class="ring-wrap">${ring(g.calories ? kcal / g.calories : 0, nf(kcal), "kcal eaten", 148)}</div>
        <dl class="stat-dl">
          <div><dt>Eaten</dt><dd>${nf(kcal)}</dd></div>
          <div><dt>Burned</dt><dd>${nf(burned)}</dd></div>
          <div><dt>Remaining</dt><dd class="${remaining < 0 ? "over" : "good-txt"}">${remaining >= 0 ? nf(remaining) : "−" + nf(-remaining)}</dd></div>
          <div class="dl-net"><dt>Net today</dt><dd>${nf(kcal - burned)} kcal</dd></div>
        </dl>
      </div>
    </section>`;
    h += `<section class="card"><h2>Macros</h2>
      ${macroBar("Protein", macros.p, g.protein, "var(--macro-p)")}
      ${macroBar("Carbs", macros.c, g.carbs, "var(--macro-c)")}
      ${macroBar("Fat", macros.f, g.fat, "var(--macro-f)")}</section>`;
    h += `<section class="card">
      <div class="card-hd"><h2>Water</h2><span class="cap">${water} of ${g.water} glasses</span></div>
      <div class="water-row">
        <button class="daybtn" data-action="water-minus" aria-label="less water">${svgIcon("chevL")}</button>
        <div class="water-track">${Array.from({ length: g.water }, (_, i) => `<span class="drop ${i < water ? "full" : ""}"></span>`).join("")}</div>
        <button class="daybtn" data-action="water-plus" aria-label="more water">${svgIcon("plus")}</button>
      </div></section>`;
    h += `<section class="card">
      <div class="card-hd"><h2>Training</h2><button class="btn-accent btn-sm" data-action="start-empty">Start workout</button></div>
      <p class="cap" style="font-size:14px">${wos.length} session${wos.length !== 1 ? "s" : ""} today · ${nf(vol)} ${u} volume</p></section>`;
    h += `<div class="stat2">
      <div class="card stat-cell"><span class="cap">Streak</span><strong>${Store.streak()}<span class="unit"> days</span></strong></div>
      <div class="card stat-cell"><span class="cap">Protein left</span><strong>${Math.max(0, Math.round(g.protein - macros.p))}<span class="unit"> g</span></strong></div>
    </div>`;
    const ins = insights(g, macros, kcal, water, wos);
    if (ins.length) h += `<section class="card"><h2>Tips</h2>${ins.map(i => `<p class="tip">${esc(i)}</p>`).join("")}</section>`;
    return h;
  }
  function daysSinceLastWorkout() {
    const ws = Store.workouts();
    if (!ws.length) return null;
    const last = ws.map(w => w.date).sort().pop();
    return Math.round((new Date(Store.dayKey() + "T00:00:00") - new Date(last + "T00:00:00")) / 86400000);
  }
  function insights(g, macros, kcal, water, wos) {
    const out = [];
    const pRem = Math.round(g.protein - macros.p);
    if (pRem > 0 && kcal > 0) out.push(`${pRem} g protein to hit your goal.`);
    if (kcal > g.calories) out.push(`${kcal - g.calories} kcal over your goal.`);
    if (water < g.water) out.push(`${g.water - water} more glass${g.water - water !== 1 ? "es" : ""} of water.`);
    if (!wos.length && curDate === Store.dayKey()) out.push("No workout logged yet today.");
    const dsl = daysSinceLastWorkout();
    if (dsl != null && dsl >= 2) out.push(`It's been ${dsl} days since your last workout.`);
    if (Store.streak() >= 3) out.push(`${Store.streak()}-day streak — keep it going!`);
    return out;
  }
  function topPRs() {
    const ws = Store.workouts();
    return Store.exercises()
      .filter(x => (x.kind || "weight") === "weight")
      .map(x => ({ name: x.name, oneRM: Math.round(Calc.personalRecords(ws, x.id).best1RM) }))
      .filter(r => r.oneRM > 0)
      .sort((a, b) => b.oneRM - a.oneRM)
      .slice(0, 10);
  }

  // ---------- TRAIN (hub) ----------
  function viewTrain() {
    const rs = Store.routines();
    let h = screenHeader("Train", "Pick a plan, or just start and add exercises as you go.");
    h += `<button class="cta" data-action="start-empty">
      <span class="cta-ico">${svgIcon("plus", 24, 2.4)}</span>
      <span class="cta-t"><span class="cta-title">Start empty workout</span><span class="cta-sub">Add exercises as you go</span></span></button>`;
    h += `<section class="stack">
      <div><h2>Starter plans</h2><p class="subtitle">Ready-made workouts. Tap one to begin.</p></div>
      <div class="chips">${Store.STARTER_PLANS.map(p => `<button class="chip" data-action="add-plan" data-name="${esc(p.name)}">${esc(p.name)}</button>`).join("")}</div>
    </section>`;
    h += `<section class="stack">
      <div class="sec-hd between"><h2>My routines</h2><button class="link-btn" data-action="new-routine">+ New routine</button></div>`;
    h += rs.length
      ? rs.map((rt, i) => `<div class="rt-card">
          <div class="rt-info"><h3>${esc(rt.name)}</h3><p class="cap">${rt.exerciseIds.length} exercises</p></div>
          <button class="rt-start${i === 0 ? " accent" : ""}" data-action="start-routine" data-id="${rt.id}">Start</button></div>`).join("")
      : `<div class="rt-card"><div class="rt-info"><p class="cap">No routines yet — save one from a workout, or tap a starter plan.</p></div></div>`;
    h += `</section>`;
    h += `<div class="grid2">
      <a class="tile" href="#/exercises"><span class="tile-t">Exercises</span><span class="cap">Browse or add your own</span></a>
      <a class="tile" href="#/history"><span class="tile-t">History</span><span class="cap">Your past workouts</span></a>
    </div>`;
    return h;
  }

  // ---------- FUEL (nutrition) ----------
  function viewFuel() {
    const food = Store.foodByDate(curDate);
    const totals = Calc.dayMacros(food);
    const nf = (n) => Math.round(n).toLocaleString();
    let h = dateHeader("Fuel");
    h += `<section class="card">
      <dl class="totals">
        <div><dt>Calories</dt><dd>${nf(totals.kcal)}</dd></div>
        <div><dt>Protein</dt><dd style="color:var(--macro-p)">${nf(totals.p)} g</dd></div>
        <div><dt>Carbs</dt><dd style="color:var(--macro-c)">${nf(totals.c)} g</dd></div>
        <div><dt>Fat</dt><dd style="color:var(--macro-f)">${nf(totals.f)} g</dd></div>
      </dl>
      <button class="wide-btn" data-action="copy-yesterday">${svgIcon("copy", 18)} Copy yesterday's meals</button>
    </section>`;
    MEALS.forEach(meal => {
      const items = food.filter(f => f.meal === meal);
      const sub = Calc.dayMacros(items);
      h += `<section class="card meal">
        <div class="meal-hd">
          <h2 class="meal-title">${meal}</h2>
          <span class="cap">${nf(sub.kcal)} kcal</span>
          <button class="add-btn${items.length ? " accent" : ""}" data-action="add-food" data-meal="${meal}" aria-label="Add food to ${meal}">${svgIcon("plus", 20, 2.4)}</button>
        </div>`;
      h += items.length
        ? items.map(f => {
            const m = Calc.foodMacros(f);
            return `<div class="food-row">
              <div class="food-info"><span class="food-name">${esc(f.name)}</span><span class="cap">${f.grams} g · P ${Math.round(m.p)} · C ${Math.round(m.c)} · F ${Math.round(m.f)}</span></div>
              <span class="food-kcal">${Math.round(m.kcal)}</span>
              <button class="x-btn" data-action="del-food" data-id="${f.id}" aria-label="Remove ${esc(f.name)}">${svgIcon("close", 18)}</button></div>`;
          }).join("")
        : `<div class="empty-dashed"><span class="food-name">Nothing logged for ${meal.toLowerCase()} yet</span><span class="cap">Tap + to search, scan or add your own food.</span></div>`;
      h += `</section>`;
    });
    return h;
  }

  // ---------- MORE (menu) ----------
  function viewMore() {
    const row = (href, ic, title, sub) => `<a class="menu-row" href="${href}">
      <span class="mrow-ico">${svgIcon(ic)}</span>
      <span class="mrow-t"><span class="mrow-title">${title}</span><span class="cap">${sub}</span></span>
      <span class="chev">${svgIcon("chevR", 18)}</span></a>`;
    let h = screenHeader("More");
    h += `<nav class="menu" aria-label="More sections">
      ${row("#/exercises", "train", "Exercises", "Browse the library or add your own")}
      ${row("#/routines", "list", "Routines", "Saved workouts you can repeat or share")}
      ${row("#/history", "clock", "History", "Every workout you've finished")}
      ${row("#/settings", "sliders", "Settings", "Units, colours, goals and backup")}
    </nav>`;
    h += `<section class="card privacy">
      <span class="mrow-ico shield">${svgIcon("shield")}</span>
      <div><h2 class="priv-t">Your data stays on this phone</h2><p class="cap">No account, no sign-in. Make a backup any time from Settings.</p></div>
    </section>`;
    h += `<p class="version">Forge · offline-first</p>`;
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
    shown = shown.slice().sort((a, b) => (b.fav ? 1 : 0) - (a.fav ? 1 : 0)); // favourites first
    return shown.map(x => `<div class="list-item">
      <div><strong>${esc(x.name)}</strong><br>
        <span class="muted">${esc(x.muscle)}${x.category ? " · " + esc(x.category) : ""}</span>
        ${x.custom ? ' <span class="tag">custom</span>' : ""}</div>
      <div class="row">
        <button class="btn-sm btn-ghost" data-action="fav-exercise" data-id="${x.id}" aria-label="favourite" style="${x.fav ? "color:var(--warn)" : ""}">${x.fav ? "★" : "☆"}</button>
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

    // Programs (ordered routines = training days)
    const progs = Store.programs();
    h += `<div class="row between" style="margin-top:8px"><h2>Programs</h2>
      <button class="btn-sm btn-ghost" data-action="new-program">＋ New</button></div>`;
    h += `<div class="card muted" style="font-size:13px">A <strong>program</strong> is an ordered set of routines (training days). "Start next day" runs the next one and cycles automatically.</div>`;
    h += progs.map(p => {
      const nextId = Store.programNextRoutineId(p.id);
      const next = nextId ? ((Store.routines().find(r => r.id === nextId) || {}).name || "—") : "—";
      return `<div class="card"><div class="row between"><strong>${esc(p.name)}</strong>
        <button class="btn-sm btn-danger btn-ghost" data-action="del-program" data-id="${p.id}" aria-label="delete program">✕</button></div>
        <p class="muted">${p.dayRoutineIds.length} days · next: ${esc(next)}</p>
        <button class="btn-blue btn-full" data-action="start-program" data-id="${p.id}">Start next day</button></div>`;
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
    const s = Store.settings(), g = Store.goals();
    const seg = (action, cur, opts) => `<div class="seg">${opts.map(([v, l]) =>
      `<button class="${cur === v ? "on" : ""}" data-action="${action}" data-v="${v}">${l}</button>`).join("")}</div>`;
    const goalRow = (key, label, ul) => `<label class="goal-row"><span class="goal-name">${label}</span>
      <input type="number" inputmode="numeric" data-goal="${key}" value="${g[key]}"><span class="goal-unit">${ul}</span></label>`;
    let h = `<a class="back" href="#/more">${svgIcon("chevL")}More</a><h1>Settings</h1>`;
    h += `<section class="card">
      <h2>Weight unit</h2>${seg("set-unit-seg", s.unit, [["kg", "Kilograms (kg)"], ["lb", "Pounds (lb)"]])}
      <p class="cap">Switching converts everything you've already logged.</p></section>`;
    h += `<section class="card">
      <h2>Appearance</h2>${seg("set-theme-seg", s.theme, [["dark", "Dark"], ["light", "Light"]])}
      <div style="margin-top:4px"><span class="goal-name">Accent colour</span>
        <div class="swatches">${ACCENTS.map(c =>
          `<button class="swatch2${s.accent === c ? " on" : ""}" data-action="set-accent" data-c="${c}" style="background:${c}" aria-label="accent"></button>`).join("")}</div></div></section>`;
    h += `<section class="card">
      <h2>Training</h2>
      <div class="set-row2"><span class="sr-t"><span class="goal-name">Rest between sets</span><span class="cap">Timer starts after each set</span></span>
        <button class="daybtn" data-action="rest-dec" aria-label="Shorter rest">${svgIcon("minus")}</button>
        <span class="sr-val">${Math.floor(s.restDefault / 60)}:${String(s.restDefault % 60).padStart(2, "0")}</span>
        <button class="daybtn" data-action="rest-inc" aria-label="Longer rest">${svgIcon("plus")}</button></div>
      <div class="set-row2 bt"><span class="sr-t"><span class="goal-name">Weight step</span><span class="cap">How much + and − change</span></span>
        <button class="daybtn" data-action="inc-dec" aria-label="Smaller step">${svgIcon("minus")}</button>
        <span class="sr-val">${s.increment} ${s.unit}</span>
        <button class="daybtn" data-action="inc-inc" aria-label="Bigger step">${svgIcon("plus")}</button></div></section>`;
    h += `<section class="card">
      <h2>Daily goals</h2>
      ${goalRow("calories", "Calories", "kcal")}${goalRow("protein", "Protein", "g")}${goalRow("carbs", "Carbs", "g")}${goalRow("fat", "Fat", "g")}${goalRow("water", "Water", "glasses")}
      <button class="btn-accent goals-cta" data-action="tdee">Work out my goals for me</button>
      <p class="cap" style="text-align:center;margin-top:4px">Uses your age, height, weight and activity (TDEE).</p></section>`;
    h += `<section class="card">
      <h2>Backup</h2>
      <div class="grid2b"><button data-action="export">Export JSON</button><button data-action="export-csv">Export CSV</button></div>
      <button class="wide-btn" data-action="import" style="margin-top:8px">Import a backup</button>
      <button class="wide-btn" data-action="import-csv" style="margin-top:8px">Import workouts (CSV)</button>
      <button class="reset-btn" data-action="reset" style="margin-top:8px">Reset all data</button></section>`;
    return h;
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

  function heatmapHTML() {
    const days = 7 * 15, cells = [], today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = Store.dayKey(d.getTime());
      cells.push(`<span class="hm ${Store.dayHasActivity(key) ? "on" : ""}" title="${key}"></span>`);
    }
    return `<div class="heatmap">${cells.join("")}</div>`;
  }
  function measurementsCard() {
    const parts = Store.MEAS_PARTS;
    let h = `<div class="card"><h2>Body measurements</h2>
      <div class="row">
        <select id="meas-part" class="grow">${parts.map(p => `<option>${p}</option>`).join("")}</select>
        <input id="meas-val" style="max-width:90px" inputmode="decimal" placeholder="cm">
        <button class="btn-blue" data-action="add-measurement">Log</button>
      </div>`;
    const latest = parts.map(p => { const a = Store.measurementsByPart(p); return a.length ? { part: p, v: a[a.length - 1].value, series: a.map(x => x.value) } : null; }).filter(Boolean);
    const charted = latest.slice().sort((a, b) => b.series.length - a.series.length)[0];
    if (charted && charted.series.length >= 2) h += `<div class="spacer"></div><div class="muted" style="font-size:13px">${charted.part} trend</div>${lineChart(charted.series)}`;
    if (latest.length) h += latest.map(l => `<div class="list-item"><span>${l.part}</span><strong>${l.v} cm</strong></div>`).join("");
    return h + `</div>`;
  }
  function muscleCard() {
    const since = Date.now() - 7 * 86400000;
    const m = Calc.muscleSets(Store.workouts(), Store.exercise, since);
    const rows = Object.entries(m).sort((a, b) => b[1] - a[1]);
    if (!rows.length) return "";
    const max = rows[0][1];
    return `<div class="card"><div class="row between"><h2>Muscles this week</h2><span class="muted">working sets</span></div>` +
      rows.map(([mus, n]) => `<div style="margin:8px 0"><div class="row between" style="font-size:13px"><span>${esc(mus)}</span><span class="muted">${n}</span></div>
        <div class="bar"><div class="bar-fill" style="width:${max ? (n / max * 100) : 0}%;background:var(--accent)"></div></div></div>`).join("") + `</div>`;
  }
  function photosCard() {
    const ps = Store.photos();
    return `<div class="card"><div class="row between"><h2>Progress photos</h2>
      <button class="btn-sm btn-blue" data-action="add-photo" aria-label="add photo">＋</button></div>
      ${ps.length
        ? `<div class="photo-grid">${ps.map(p => `<div class="photo"><img src="${p.src}" alt="progress ${new Date(p.date).toLocaleDateString()}">
            <button class="photo-del" data-action="del-photo" data-id="${p.id}" aria-label="delete photo">✕</button></div>`).join("")}</div>`
        : `<p class="muted">No photos yet. Add one to track visual progress.</p>`}
    </div>`;
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

    let h = `<h1>Progress</h1>`;

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

    const prs = topPRs();
    if (prs.length) {
      h += `<div class="card"><h2>Top PRs</h2>` + prs.map((r, i) =>
        `<div class="list-item"><div><strong>${i + 1}. ${esc(r.name)}</strong></div>
          <span class="tag">${r.oneRM} ${u} 1RM</span></div>`).join("") + `</div>`;
    }
    h += muscleCard();
    h += `<div class="card"><div class="row between"><h2>Activity</h2><span class="muted">last 15 weeks</span></div>${heatmapHTML()}</div>`;
    h += measurementsCard();
    h += photosCard();
    h += `<div class="row"><button class="btn-ghost grow" data-action="report" data-days="7">📄 Report</button>
      <button class="btn-ghost grow" data-action="interval-timer">⏱ Interval timer</button>
      <button class="btn-ghost grow" data-action="one-rm-tool">🧮 1RM</button></div>`;
    return h;
  }

  // ---------- ACTIVE WORKOUT ----------
  let openEntry = 0;
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const setTypeName = (t) => ({ warmup: "warm-up", drop: "drop set", failure: "to failure", normal: "working set" }[t] || "working set");
  function stpCol(label, i, j, which, val) {
    const dec = { w: "w-", r: "r-", sec: "sec-", dist: "dist-" }[which];
    const inc = { w: "w+", r: "r+", sec: "sec+", dist: "dist+" }[which];
    return `<div class="stp-col"><span class="stp-label">${label}</span>
      <div class="stp-box">
        <button class="stp-btn" data-action="${dec}" data-e="${i}" data-s="${j}" aria-label="less">${svgIcon("minus", 20, 2.4)}</button>
        <span class="stp-val">${val || 0}</span>
        <button class="stp-btn" data-action="${inc}" data-e="${i}" data-s="${j}" aria-label="more">${svgIcon("plus", 20, 2.4)}</button>
      </div></div>`;
  }
  function stepFields(i, j, set, kind, u) {
    if (kind === "time") return stpCol("Seconds", i, j, "sec", set.seconds);
    if (kind === "distance") return stpCol("Distance · km", i, j, "dist", set.distance) + stpCol("Seconds", i, j, "sec", set.seconds);
    return stpCol((kind === "bodyweight" ? "Added · " : "Weight · ") + u, i, j, "w", set.weight) + stpCol("Reps", i, j, "r", set.reps);
  }
  function rpeRow(i, j, set) {
    return `<div class="rpe-row"><span class="rpe-label">EFFORT<br>(RPE)</span>
      <div class="rpe-btns">${[7, 8, 9, 10].map(v =>
        `<button class="rpe-b${set.rpe === v ? " on" : ""}" data-action="rpe-set" data-e="${i}" data-s="${j}" data-v="${v}">${v}</button>`).join("")}</div></div>`;
  }

  function viewWorkout() {
    const a = Store.active();
    if (!a) { go("train"); return ""; }
    const u = unit();
    if (openEntry >= a.entries.length) openEntry = Math.max(0, a.entries.length - 1);
    const doneCount = Calc.completedSets(a.entries);
    const totalCount = a.entries.reduce((n, e) => n + e.sets.length, 0);
    const elapsed = Math.max(0, Math.floor((Date.now() - a.start) / 1000));
    const fmtT = (t) => Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0");

    let h = `<header class="wk-head">
      <button class="daybtn" data-action="go-train" aria-label="Back to Train">${svgIcon("chevL")}</button>
      <div class="wk-title">
        <button class="wk-name" data-action="rename-workout">${esc(a.name)} ${svgIcon("pencil", 15)}</button>
        <p class="cap">${fmtT(elapsed)} elapsed · ${doneCount} of ${totalCount} sets done</p>
      </div>
      <button class="daybtn" data-action="plates" aria-label="Plate calculator">${svgIcon("target")}</button>
      <button class="wk-finish" data-action="finish">Finish</button>
    </header>`;

    a.entries.forEach((entry, i) => {
      const ex = Store.exercise(entry.exerciseId) || { name: "?", muscle: "", category: "", kind: "weight" };
      const kind = entry.kind || "weight";
      if (i === openEntry) {
        const last = Store.lastPerformance(entry.exerciseId);
        const lastTxt = last ? last.sets.map(s => fmtSet(s, kind)).join(", ") : "First time";
        const doneSets = entry.sets.filter(s => s.done);
        const est = (kind === "weight" && doneSets.length) ? Math.round(Calc.best1RM(doneSets)) : 0;
        const curIdx = entry.sets.findIndex(s => !s.done);
        let normN = 0;
        h += `<section class="card wk-ex">
          <div class="wk-ex-hd">
            <div class="wk-ex-t"><h2 class="wk-ex-name">${esc(ex.name)}</h2>
              <div class="wk-ex-meta">${esc(ex.muscle)}${ex.category ? " · " + esc(ex.category) : ""}${est ? `<span class="orm-pill">≈1RM ${est} ${u}</span>` : ""}</div></div>
            <button class="daybtn" data-action="entry-menu" data-e="${i}" aria-label="Options">${DOTS_SVG}</button>
          </div>
          <p class="last-chip">Last time: <span>${esc(lastTxt)}</span></p>
          ${entry.note ? `<p class="last-chip">📝 <span>${esc(entry.note)}</span></p>` : ""}
          <div class="set-list">`;
        entry.sets.forEach((set, j) => {
          const badge = set.type === "warmup" ? "W" : set.type === "drop" ? "D" : set.type === "failure" ? "F" : String(++normN);
          const badgeCls = set.type && set.type !== "normal" ? "type-" + set.type : "";
          if (j === curIdx) {
            h += `<div class="cur-set">
              <div class="cur-hd"><button class="set-badge ${badgeCls}" data-action="cycle-type" data-e="${i}" data-s="${j}" aria-label="set type">${badge}</button>
                <span class="cur-title">${set.type === "normal" ? "Set " + badge : cap(setTypeName(set.type))} · up next</span></div>
              <div class="stp-grid">${stepFields(i, j, set, kind, u)}</div>
              ${(kind === "weight" || kind === "bodyweight") ? rpeRow(i, j, set) : ""}
              <button class="complete-btn" data-action="complete-set" data-e="${i}" data-s="${j}">${svgIcon("check", 20, 2.6)} Complete set</button>
            </div>`;
          } else {
            h += `<div class="sum-set${set.done ? "" : " pending"}">
              <button class="set-badge ${badgeCls}" data-action="cycle-type" data-e="${i}" data-s="${j}" aria-label="set type">${badge}</button>
              <span class="sum-txt">${fmtSet(set, kind)}</span>
              <span class="cap">${set.rpe ? "RPE " + set.rpe : ""}</span>
              <button class="chk${set.done ? " on" : ""}" data-action="done" data-e="${i}" data-s="${j}" aria-label="toggle done">${svgIcon("check", 20, 2.6)}</button>
            </div>`;
          }
        });
        h += `</div>
          <div class="wk-ex-foot">
            <button data-action="add-set" data-e="${i}">+ Add set</button>
            ${kind === "weight" ? `<button data-action="warmup" data-e="${i}">+ Warm-up</button>` : `<button data-action="entry-note" data-e="${i}">Note</button>`}
            <button data-action="entry-note" data-e="${i}">Note</button>
          </div>
        </section>`;
      } else {
        const dc = entry.sets.filter(s => s.done).length;
        const last = Store.lastPerformance(entry.exerciseId);
        const lastTxt = last ? " · Last: " + fmtSet(last.sets[last.sets.length - 1], kind) : "";
        h += `<button class="card wk-collapsed" data-action="open-entry" data-e="${i}">
          <span class="wk-col-t"><span class="wk-col-name">${esc(ex.name)}</span>
            <span class="cap">${esc(ex.muscle)}${ex.category ? " · " + esc(ex.category) : ""}${lastTxt}</span></span>
          <span class="cap">${dc} / ${entry.sets.length}</span>
          <span class="as-chip">${svgIcon("chevD")}</span>
        </button>`;
      }
    });

    h += `<button class="add-ex-btn" data-action="add-exercise">${svgIcon("plus", 20, 2.4)} Add exercise</button>`;
    h += `<div class="grid2b">
      <button class="ghost-btn" data-action="save-as-routine">Save as routine</button>
      <button class="reset-btn" data-action="discard">Discard workout</button></div>`;
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
    appEl.querySelectorAll("[data-goal]").forEach(el =>
      el.addEventListener("change", () => Store.setGoal(el.dataset.goal, el.value)));
  }

  const ACCENTS = ["#ff6a3d", "#4f9dff", "#3ecf8e", "#b58cff", "#ff6fae", "#f5c542"];
  function applyTheme() {
    const s = Store.settings();
    document.documentElement.dataset.theme = s.theme || "dark";
    document.documentElement.style.setProperty("--accent", s.accent || "#ff6a3d");
  }

  // ---------- click actions (delegated on whole document) ----------
  document.body.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-action]");
    if (!btn) return;
    const a = btn.dataset;
    const active = Store.active();

    switch (a.action) {
      case "start-empty": Store.startWorkout(null, curDate); openEntry = 0; return go("workout");
      case "start-routine": Store.startWorkout(a.id, curDate); openEntry = 0; return go("workout");
      case "resume": return go("workout");

      case "date-prev": return shiftDate(-1);
      case "date-next": return shiftDate(1);
      case "date-today": curDate = Store.dayKey(); return render();
      case "water-plus": Store.addWater(curDate, 1); return render();
      case "water-minus": Store.addWater(curDate, -1); return render();
      case "add-food": return addFoodModal(a.meal);
      case "del-food": {
        const f = Store.get().foodLog.find(x => x.id === a.id);
        Store.removeFood(a.id); render();
        showToast("Food removed", () => Store.restoreFood(f));
        return;
      }
      case "copy-yesterday": {
        const y = new Date(curDate + "T00:00:00"); y.setDate(y.getDate() - 1);
        const n = Store.copyDayFood(Store.dayKey(y.getTime()), curDate);
        if (!n) alert("Nothing was logged the previous day to copy.");
        return render();
      }
      case "set-accent": Store.setSetting("accent", a.c); applyTheme(); return render();
      case "set-unit-seg": {
        const to = a.v;
        if (to === Store.settings().unit) return;
        if (confirm(`Convert your existing weights to ${to}?`)) Store.convertUnits(to); else Store.setSetting("unit", to);
        return render();
      }
      case "set-theme-seg": Store.setSetting("theme", a.v); applyTheme(); return render();
      case "rest-dec": Store.setSetting("restDefault", Math.max(15, Store.settings().restDefault - 15)); return render();
      case "rest-inc": Store.setSetting("restDefault", Math.min(600, Store.settings().restDefault + 15)); return render();
      case "inc-dec": case "inc-inc": {
        const steps = [1, 1.25, 2.5, 5];
        let i = steps.indexOf(Store.settings().increment); if (i < 0) i = 2;
        i = a.action === "inc-inc" ? Math.min(steps.length - 1, i + 1) : Math.max(0, i - 1);
        Store.setSetting("increment", steps[i]);
        return render();
      }
      case "tdee": return tdeeModal();
      case "one-rm-tool": return oneRMToolModal();
      case "add-measurement": {
        const sel = appEl.querySelector("#meas-part"), val = appEl.querySelector("#meas-val");
        if (sel && val && val.value) { Store.addMeasurement({ part: sel.value, value: val.value }); val.value = ""; render(); }
        return;
      }
      case "del-measurement": {
        const m = Store.measurements().find(x => x.id === a.id);
        Store.deleteMeasurement(a.id); render();
        showToast("Measurement removed", () => Store.restoreMeasurement(m));
        return;
      }
      case "fav-exercise": Store.toggleFav(a.id); return render();
      case "add-photo": return pickPhoto();
      case "del-photo": Store.deletePhoto(a.id); return render();
      case "interval-timer": return intervalTimerModal();
      case "report": return reportModal(+a.days || 7);
      case "new-program": return programForm();
      case "del-program": if (confirm("Delete this program?")) { Store.deleteProgram(a.id); render(); } return;
      case "start-program": {
        const rid = Store.programNextRoutineId(a.id);
        if (rid) { Store.startWorkout(rid, curDate); Store.advanceProgram(a.id); openEntry = 0; return go("workout"); }
        return;
      }
      case "import-csv": return importCSV();
      case "warmup": {
        const entry = active.entries[+a.e];
        const work = Math.max(0, ...entry.sets.filter(s => s.type !== "warmup").map(x => x.weight || 0));
        const bar = Store.settings().unit === "kg" ? 20 : 45;
        const ws = Calc.warmupSets(work, bar);
        if (!ws.length) { alert("Enter your working weight first — warm-ups ramp up to it."); return; }
        Store.addWarmups(+a.e, ws);
        return render();
      }

      case "filter": exFilter = a.g; return render();
      case "new-exercise": return exerciseForm();
      case "edit-exercise": return exerciseForm(a.id);
      case "clone-exercise": Store.cloneExercise(a.id); return render();
      case "ex-history": return exerciseHistoryModal(a.id);
      case "new-routine": return routineForm();
      case "del-routine": if (confirm("Delete this routine?")) { Store.deleteRoutine(a.id); render(); } return;
      case "del-workout": {
        const w = Store.workouts().find(x => x.id === a.id);
        Store.deleteWorkout(a.id); render();
        showToast("Workout deleted", () => Store.restoreWorkout(w));
        return;
      }
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
      case "del-entry": modal.close(); Store.removeEntry(+a.e); return render();
      case "move-entry": modal.close(); Store.moveEntry(+a.e, +a.dir); return render();
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
      case "sec+": adjust(+a.e, +a.s, "seconds", 5); return render();
      case "sec-": adjust(+a.e, +a.s, "seconds", -5); return render();
      case "dist+": adjust(+a.e, +a.s, "distance", 0.5); return render();
      case "dist-": adjust(+a.e, +a.s, "distance", -0.5); return render();
      case "go-train": return go("train");
      case "open-entry": openEntry = +a.e; return render();
      case "entry-menu": return entryMenuModal(+a.e);
      case "rpe-set": {
        const set = active.entries[+a.e].sets[+a.s];
        Store.updateSet(+a.e, +a.s, { rpe: set.rpe === +a.v ? "" : +a.v });
        return render();
      }
      case "complete-set": {
        Store.updateSet(+a.e, +a.s, { done: true });
        const ex = Store.exercise(active.entries[+a.e].exerciseId);
        startRest((ex && ex.defaultRest) || Store.settings().restDefault);
        return render();
      }

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
      case "rest-minus": return adjustRest(-15);
      case "rest-plus": return adjustRest(15);
      case "save-as-routine": {
        const name = prompt("Save these exercises as a routine named:", active ? active.name : "My Routine");
        if (name) { Store.saveActiveAsRoutine(name); alert("Routine saved — find it under Train / Routines."); }
        return;
      }

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
  function shiftDate(delta) {
    const d = new Date(curDate + "T00:00:00");
    d.setDate(d.getDate() + delta);
    const key = Store.dayKey(d.getTime());
    if (key > Store.dayKey()) return; // no future dates
    curDate = key; render();
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
      if (Store.active()) openEntry = Store.active().entries.length - 1; // open the one just added
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

  // ---------- nutrition modals + Open Food Facts ----------
  function offToItem(p) {
    const n = p.nutriments || {};
    let kcal = n["energy-kcal_100g"];
    if (kcal == null && n["energy_100g"] != null) kcal = n["energy_100g"] / 4.184; // kJ→kcal
    const name = p.product_name || "Unnamed";
    if (kcal == null && !p.product_name) return null;
    return {
      name, serving: parseFloat(p.serving_size) || 100,
      per100: {
        kcal: Math.round(kcal || 0), p: +(n.proteins_100g || 0), c: +(n.carbohydrates_100g || 0), f: +(n.fat_100g || 0),
        fiber: +(n.fiber_100g || 0), sugar: +(n.sugars_100g || 0),
        sodium: +(n.sodium_100g != null ? n.sodium_100g : (n.salt_100g ? n.salt_100g / 2.5 : 0)),
      },
    };
  }
  async function searchOFF(term) {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(term)}&search_simple=1&action=process&json=1&page_size=15&fields=product_name,nutriments,serving_size`;
    const data = await (await fetch(url)).json();
    return (data.products || []).map(offToItem).filter(Boolean);
  }
  function offByBarcode(code) {
    return fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,nutriments,serving_size`)
      .then(r => r.json()).then(d => (d.status === 1 ? offToItem(d.product) : null));
  }

  function addFoodModal(meal) {
    const canScan = "BarcodeDetector" in window;
    openModal(`<div class="card" style="min-width:300px;max-height:85vh;overflow:auto">
      <div class="row between"><h2>Add to ${esc(meal)}</h2><button data-action="modal-close" class="btn-sm">Close</button></div>
      <div class="row"><input id="food-q" placeholder="Search food…" autofocus>
        ${canScan ? `<button class="btn-sm" id="food-scan" aria-label="scan barcode">📷</button>` : ""}</div>
      <button class="btn-sm btn-ghost btn-full" id="food-manual" style="margin-top:8px">＋ Manual entry</button>
      <div id="food-results" style="margin-top:10px"><p class="muted">Search Open Food Facts, or your saved foods.</p></div>
    </div>`);
    const q = modal.querySelector("#food-q");
    const results = modal.querySelector("#food-results");
    const listHTML = (items, heading) => items.length
      ? `<p class="muted" style="font-size:12px;margin:8px 0 4px">${heading}</p>` + items.map(it =>
          `<button type="button" class="list-item btn-ghost btn-full" data-food="${encodeURIComponent(JSON.stringify(it))}" style="text-align:left;border-radius:0">
            <span><strong>${esc(it.name)}</strong><br><span class="muted">${Math.round(it.per100.kcal)} kcal/100g · P${Math.round(it.per100.p)} C${Math.round(it.per100.c)} F${Math.round(it.per100.f)}</span></span>
          </button>`).join("")
      : "";
    const recents = Store.recentFoods(8);
    results.innerHTML = listHTML(recents, "Recent") || `<p class="muted">Search Open Food Facts, or your saved foods.</p>`;
    let timer;
    const doSearch = async () => {
      const term = q.value.trim();
      const lib = Store.searchLibrary(term).map(f => ({ name: f.name, per100: f.per100, serving: f.serving }));
      if (term.length < 2) {
        results.innerHTML = (listHTML(recents, "Recent") + listHTML(lib, "Your foods")) || `<p class="muted">Type to search…</p>`;
        return;
      }
      results.innerHTML = listHTML(lib, "Your foods") + `<p class="muted">Searching Open Food Facts…</p>`;
      try {
        const off = await searchOFF(term);
        results.innerHTML = (listHTML(lib, "Your foods") + listHTML(off, "Open Food Facts")) || `<p class="muted">No results.</p>`;
      } catch (_) {
        results.innerHTML = listHTML(lib, "Your foods") + `<p class="muted">Couldn't reach Open Food Facts (offline?). Use manual entry.</p>`;
      }
    };
    q.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(doSearch, 350); });
    results.addEventListener("click", (e) => {
      const b = e.target.closest("[data-food]");
      if (b) portionModal(meal, JSON.parse(decodeURIComponent(b.dataset.food)));
    });
    modal.querySelector("#food-manual").onclick = () => manualFoodModal(meal);
    if (canScan) modal.querySelector("#food-scan").onclick = () => barcodeScanModal(meal);
  }

  function portionModal(meal, item) {
    const g0 = item.serving || 100;
    const calc = (g) => { const f = (g || 0) / 100, p = item.per100; return `${Math.round(p.kcal * f)} kcal · P${Math.round(p.p * f)} C${Math.round(p.c * f)} F${Math.round(p.f * f)}`; };
    openModal(`<div class="card" style="min-width:280px">
      <h2>${esc(item.name)}</h2>
      <label>Grams</label><input id="port-g" inputmode="decimal" value="${g0}">
      <p id="port-out" class="muted" style="margin-top:8px">${calc(g0)}</p>
      <div class="spacer"></div>
      <div class="row"><span class="grow"></span><button data-action="modal-close">Cancel</button>
        <button class="btn-accent" id="port-add">Add</button></div>
    </div>`);
    const gi = modal.querySelector("#port-g");
    gi.addEventListener("input", () => { modal.querySelector("#port-out").innerHTML = calc(parseFloat(gi.value)); });
    modal.querySelector("#port-add").onclick = () => {
      Store.addFood({ date: curDate, meal, name: item.name, grams: parseFloat(gi.value) || 0, per100: item.per100 });
      Store.saveFood({ name: item.name, per100: item.per100, serving: item.serving });
      modal.close(); render();
    };
  }

  function manualFoodModal(meal) {
    openModal(`<form method="dialog" class="card" style="min-width:280px">
      <h2>Manual food</h2>
      <label>Name</label><input id="mf-name" required>
      <div class="row"><div class="grow"><label>Calories</label><input id="mf-kcal" inputmode="decimal"></div>
        <div class="grow"><label>Protein (g)</label><input id="mf-p" inputmode="decimal"></div></div>
      <div class="row"><div class="grow"><label>Carbs (g)</label><input id="mf-c" inputmode="decimal"></div>
        <div class="grow"><label>Fat (g)</label><input id="mf-f" inputmode="decimal"></div></div>
      <p class="muted" style="font-size:12px">Values for this portion. Saved to your food library.</p>
      <div class="spacer"></div>
      <div class="row"><span class="grow"></span><button type="button" data-action="modal-close">Cancel</button>
        <button type="button" class="btn-accent" id="mf-add">Add</button></div>
    </form>`);
    modal.querySelector("#mf-add").onclick = () => {
      const name = modal.querySelector("#mf-name").value.trim();
      if (!name) return;
      const per100 = {
        kcal: +modal.querySelector("#mf-kcal").value || 0, p: +modal.querySelector("#mf-p").value || 0,
        c: +modal.querySelector("#mf-c").value || 0, f: +modal.querySelector("#mf-f").value || 0,
      };
      Store.addFood({ date: curDate, meal, name, grams: 100, per100 }); // grams=100 → macros == entered
      Store.saveFood({ name, per100, serving: 100 });
      modal.close(); render();
    };
  }

  function barcodeScanModal(meal) {
    const canScan = "BarcodeDetector" in window;
    openModal(`<div class="card" style="min-width:300px">
      <div class="row between"><h2>Scan barcode</h2><button data-action="modal-close" class="btn-sm">Close</button></div>
      ${canScan ? `<video id="bc-video" playsinline style="width:100%;border-radius:12px;background:#000"></video>` : `<p class="muted">Camera scanning isn't supported here — type the number below.</p>`}
      <label>Or enter barcode number</label>
      <div class="row"><input id="bc-num" inputmode="numeric" placeholder="e.g. 737628064502">
        <button class="btn-accent" id="bc-go">Find</button></div>
      <p id="bc-status" class="muted" style="font-size:13px"></p>
    </div>`);
    const status = modal.querySelector("#bc-status");
    let stop = null;
    const lookup = async (code) => {
      status.textContent = "Looking up " + code + "…";
      try {
        const item = await offByBarcode(code);
        if (!item) { status.textContent = "Not found in Open Food Facts."; return; }
        if (stop) stop();
        modal.close(); portionModal(meal, item);
      } catch (_) { status.textContent = "Lookup failed (offline?)."; }
    };
    modal.querySelector("#bc-go").onclick = () => { const c = modal.querySelector("#bc-num").value.trim(); if (c) lookup(c); };
    modal.addEventListener("close", () => { if (stop) stop(); }, { once: true });
    if (canScan) (async () => {
      const video = modal.querySelector("#bc-video");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = stream; await video.play();
        const det = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
        let running = true;
        stop = () => { running = false; stream.getTracks().forEach(t => t.stop()); };
        const scan = async () => {
          if (!running) return;
          try { const codes = await det.detect(video); if (codes.length) { stop(); lookup(codes[0].rawValue); return; } } catch (_) {}
          requestAnimationFrame(scan);
        };
        scan();
      } catch (e) { status.textContent = "Camera unavailable: " + e.message; }
    })();
  }

  function tdeeModal() {
    const u = unit();
    const lastBw = Store.bodyweights().slice(-1)[0];
    openModal(`<div class="card" style="min-width:300px;max-height:85vh;overflow:auto">
      <div class="row between"><h2>Calculate goals</h2><button data-action="modal-close" class="btn-sm">Close</button></div>
      <div class="row">
        <div class="grow"><label>Sex</label><select id="td-sex"><option value="male">Male</option><option value="female">Female</option></select></div>
        <div class="grow"><label>Age</label><input id="td-age" inputmode="numeric" placeholder="30"></div>
      </div>
      <div class="row">
        <div class="grow"><label>Weight (${u})</label><input id="td-weight" inputmode="decimal" value="${lastBw ? lastBw.value : ""}" placeholder="${u === "kg" ? 70 : 154}"></div>
        <div class="grow"><label>Height (cm)</label><input id="td-height" inputmode="numeric" placeholder="175"></div>
      </div>
      <label>Activity</label>
      <select id="td-act">
        <option value="sedentary">Sedentary (little/no exercise)</option>
        <option value="light">Light (1–3 days/wk)</option>
        <option value="moderate" selected>Moderate (3–5 days/wk)</option>
        <option value="active">Active (6–7 days/wk)</option>
        <option value="athlete">Athlete (2×/day)</option>
      </select>
      <label>Goal</label>
      <select id="td-goal"><option value="0">Maintain</option><option value="-500">Lose (~0.5 kg/wk)</option><option value="500">Gain (~0.5 kg/wk)</option></select>
      <div id="td-out" class="muted" style="margin-top:12px"></div>
      <div class="spacer"></div>
      <div class="row"><span class="grow"></span><button class="btn-accent" id="td-apply">Set as my goals</button></div>
    </div>`);
    const compute = () => {
      let weightKg = parseFloat(modal.querySelector("#td-weight").value) || 0;
      if (u === "lb") weightKg = weightKg / 2.20462;
      const cal0 = Calc.tdee({
        sex: modal.querySelector("#td-sex").value, age: +modal.querySelector("#td-age").value,
        weightKg, heightCm: +modal.querySelector("#td-height").value, activity: modal.querySelector("#td-act").value,
      });
      const cal = cal0 + (+modal.querySelector("#td-goal").value);
      const m = Calc.macrosFromCalories(cal, weightKg);
      modal.querySelector("#td-out").innerHTML = cal0
        ? `Target: <strong>${m.calories} kcal</strong> · P${m.protein} · C${m.carbs} · F${m.fat}`
        : "Fill in age, weight and height.";
      return cal0 ? m : null;
    };
    modal.querySelectorAll("select,input").forEach(el => el.addEventListener("input", compute));
    compute();
    modal.querySelector("#td-apply").onclick = () => {
      const m = compute();
      if (!m) { alert("Fill in age, weight and height first."); return; }
      Store.setGoal("calories", m.calories); Store.setGoal("protein", m.protein);
      Store.setGoal("carbs", m.carbs); Store.setGoal("fat", m.fat);
      modal.close(); render();
    };
  }

  function oneRMToolModal() {
    const u = unit();
    const pcts = [100, 95, 90, 85, 80, 75, 70, 65, 60];
    openModal(`<div class="card" style="min-width:280px;max-height:85vh;overflow:auto">
      <div class="row between"><h2>1RM & % table</h2><button data-action="modal-close" class="btn-sm">Close</button></div>
      <div class="row"><div class="grow"><label>Weight (${u})</label><input id="rm-w" inputmode="decimal" placeholder="100"></div>
        <div class="grow"><label>Reps</label><input id="rm-r" inputmode="numeric" placeholder="5"></div></div>
      <div id="rm-out" style="margin-top:12px"></div>
    </div>`);
    const out = modal.querySelector("#rm-out");
    const draw = () => {
      const orm = Math.round(Calc.epley1RM(+modal.querySelector("#rm-w").value, +modal.querySelector("#rm-r").value || 1));
      out.innerHTML = orm
        ? `<p>Estimated 1RM: <strong>${orm} ${u}</strong></p>` + pcts.map(p =>
            `<div class="list-item"><span class="muted">${p}%</span><strong>${Math.round(orm * p / 100)} ${u}</strong></div>`).join("")
        : `<p class="muted">Enter a weight and reps.</p>`;
    };
    modal.querySelectorAll("input").forEach(el => el.addEventListener("input", draw));
    draw();
  }

  // progress photos — resize to keep them small, store in a separate key
  function pickPhoto() {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*";
    inp.onchange = () => {
      const file = inp.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const max = 700, scale = Math.min(1, max / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
          const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
          cv.getContext("2d").drawImage(img, 0, 0, w, h);
          if (Store.addPhoto(cv.toDataURL("image/jpeg", 0.7))) render();
          else alert("Storage is full — delete some photos or export a backup first.");
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    };
    inp.click();
  }

  function intervalTimerModal() {
    openModal(`<div class="card" style="min-width:300px">
      <div class="row between"><h2>Interval timer</h2><button data-action="modal-close" class="btn-sm">Close</button></div>
      <div class="row">
        <div class="grow"><label>Rounds</label><input id="iv-rounds" inputmode="numeric" value="8"></div>
        <div class="grow"><label>Work (s)</label><input id="iv-work" inputmode="numeric" value="20"></div>
        <div class="grow"><label>Rest (s)</label><input id="iv-rest" inputmode="numeric" value="10"></div>
      </div>
      <div class="spacer"></div>
      <div id="iv-display" class="iv-display">Ready</div>
      <div class="spacer"></div>
      <div class="row"><button class="btn-accent grow" id="iv-start">Start</button><button class="btn-ghost" id="iv-stop">Stop</button></div>
    </div>`);
    let timer = null;
    const disp = modal.querySelector("#iv-display");
    const stop = () => { if (timer) clearInterval(timer); timer = null; };
    modal.querySelector("#iv-stop").onclick = () => { stop(); disp.textContent = "Ready"; };
    modal.addEventListener("close", stop, { once: true });
    modal.querySelector("#iv-start").onclick = () => {
      stop(); audioCtx();
      const rounds = Math.max(1, +modal.querySelector("#iv-rounds").value || 1);
      const work = Math.max(1, +modal.querySelector("#iv-work").value || 20);
      const rest = Math.max(0, +modal.querySelector("#iv-rest").value || 0);
      const steps = [];
      for (let r = 1; r <= rounds; r++) { steps.push({ phase: "WORK", round: r, secs: work }); if (r < rounds && rest > 0) steps.push({ phase: "REST", round: r, secs: rest }); }
      let si = 0, left = steps[0].secs;
      const show = () => { const s = steps[si]; disp.innerHTML = `<div class="iv-phase ${s.phase.toLowerCase()}">${s.phase}</div><div class="iv-time">${left}</div><div class="muted">Round ${s.round}/${rounds}</div>`; };
      show();
      timer = setInterval(() => {
        left--;
        if (left <= 0) {
          beep(); si++;
          if (si >= steps.length) { stop(); disp.innerHTML = `<div class="iv-phase done">DONE 🎉</div>`; if (navigator.vibrate) navigator.vibrate([200, 100, 200]); return; }
          left = steps[si].secs;
        }
        show();
      }, 1000);
    };
  }

  function reportModal(days) {
    days = days || 7;
    const u = unit(), now = Date.now(), since = now - days * 86400000, sinceDate = Store.dayKey(since);
    const ws = Store.workouts().filter(w => (w.end || w.start || 0) >= since);
    const vol = ws.reduce((s, w) => s + Calc.workoutVolume(w.entries), 0);
    const sets = ws.reduce((s, w) => s + Calc.completedSets(w.entries), 0);
    const dayKcal = {};
    Store.get().foodLog.filter(f => f.date >= sinceDate).forEach(f => { dayKcal[f.date] = (dayKcal[f.date] || 0) + Calc.foodMacros(f).kcal; });
    const kv = Object.values(dayKcal), avgKcal = kv.length ? Math.round(kv.reduce((a, b) => a + b, 0) / kv.length) : 0;
    const bw = Store.bodyweights().filter(b => b.date >= since).sort((a, b) => a.date - b.date);
    const wChange = bw.length >= 2 ? Math.round((bw[bw.length - 1].value - bw[0].value) * 10) / 10 : 0;
    openModal(`<div class="card report" style="min-width:300px;max-height:85vh;overflow:auto">
      <div class="row between"><h2>${days}-day report</h2><button data-action="modal-close" class="btn-sm">Close</button></div>
      <div class="row" style="margin:6px 0">
        <button class="btn-sm ${days === 7 ? "btn-accent" : "btn-ghost"}" data-action="report" data-days="7">7 days</button>
        <button class="btn-sm ${days === 30 ? "btn-accent" : "btn-ghost"}" data-action="report" data-days="30">30 days</button>
        <span class="grow"></span><button class="btn-sm btn-blue" id="rep-print">Print / PDF</button></div>
      <div class="list-item"><span>Workouts</span><strong>${ws.length}</strong></div>
      <div class="list-item"><span>Sets</span><strong>${sets}</strong></div>
      <div class="list-item"><span>Volume</span><strong>${Math.round(vol).toLocaleString()} ${u}</strong></div>
      <div class="list-item"><span>Avg calories / logged day</span><strong>${avgKcal}</strong></div>
      <div class="list-item"><span>Weight change</span><strong>${wChange > 0 ? "+" : ""}${wChange} ${u}</strong></div>
    </div>`);
    modal.querySelector("#rep-print").onclick = () => window.print();
  }

  function programForm() {
    const rs = Store.routines();
    if (!rs.length) { alert("Create some routines first — a program is an ordered set of routines (training days)."); return; }
    openModal(`<form method="dialog" class="card" style="min-width:300px;max-height:80vh;overflow:auto">
      <h2>New program</h2>
      <label>Name</label><input id="pg-name" placeholder="PPL 6-day" required>
      <label>Days — tick routines in order</label>
      <div id="pg-list">${rs.map(r => `<label class="row" style="margin:6px 0"><input type="checkbox" style="width:auto" value="${r.id}"><span>${esc(r.name)}</span></label>`).join("")}</div>
      <div class="spacer"></div>
      <div class="row"><span class="grow"></span><button type="button" data-action="modal-close">Cancel</button>
        <button type="button" class="btn-accent" id="pg-save">Save</button></div>
    </form>`);
    modal.querySelector("#pg-save").onclick = () => {
      const name = modal.querySelector("#pg-name").value.trim(); if (!name) return;
      const ids = [...modal.querySelectorAll("#pg-list input:checked")].map(c => c.value);
      if (!ids.length) { alert("Pick at least one routine."); return; }
      Store.addProgram({ name, dayRoutineIds: ids }); modal.close(); render();
    };
  }

  function entryMenuModal(i) {
    const ex = Store.exercise(Store.active().entries[i].exerciseId) || {};
    openModal(`<div class="card" style="min-width:280px">
      <h2>${esc(ex.name || "Exercise")}</h2>
      <button class="wide-btn" data-action="move-entry" data-e="${i}" data-dir="-1" style="margin-top:10px">↑ Move up</button>
      <button class="wide-btn" data-action="move-entry" data-e="${i}" data-dir="1" style="margin-top:8px">↓ Move down</button>
      <button class="reset-btn" data-action="del-entry" data-e="${i}" style="margin-top:8px">Remove exercise</button>
      <div class="spacer"></div>
      <div class="row"><span class="grow"></span><button data-action="modal-close">Close</button></div>
    </div>`);
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
  function importCSV() {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".csv,text/csv";
    inp.onchange = () => {
      const file = inp.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = Calc.parseWorkoutCSV(reader.result);
          if (!parsed.length) { alert("No workouts found. Expected columns like Date, Exercise Name, Weight, Reps."); return; }
          const n = Store.importWorkouts(parsed);
          render(); alert(`Imported ${n} workout${n !== 1 ? "s" : ""} from CSV.`);
        } catch (e) { alert("Import failed: " + e.message); }
      };
      reader.readAsText(file);
    };
    inp.click();
  }

  // ---------- rest timer (survives re-renders via its own element) ----------
  let rest = { id: null, remaining: 0, total: 0 };
  let _ac = null;
  function audioCtx() {
    if (!_ac) { const C = window.AudioContext || window.webkitAudioContext; if (C) _ac = new C(); }
    if (_ac && _ac.state === "suspended") _ac.resume().catch(() => {});
    return _ac;
  }
  function beep() {
    const ac = audioCtx();
    if (!ac) return;
    const tone = (freq, at, dur) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = "sine"; o.frequency.value = freq;
      g.gain.setValueAtTime(0.001, ac.currentTime + at);
      g.gain.exponentialRampToValueAtTime(0.25, ac.currentTime + at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + at + dur);
      o.connect(g); g.connect(ac.destination);
      o.start(ac.currentTime + at); o.stop(ac.currentTime + at + dur + 0.02);
    };
    try { tone(880, 0, 0.15); tone(1175, 0.18, 0.22); } catch (_) {}
  }
  function startRest(sec) {
    stopRest();
    audioCtx();                 // unlock audio during the tap gesture so the beep can fire later
    rest.remaining = sec | 0;
    rest.total = rest.remaining;
    if (rest.remaining <= 0) return;
    rest.id = setInterval(() => {
      rest.remaining--;
      if (rest.remaining <= 0) { stopRest(); if (navigator.vibrate) navigator.vibrate([200, 100, 200]); beep(); notify("Rest done", "Time for your next set 💪"); }
      else renderRest();
    }, 1000);
    renderRest();
  }
  function adjustRest(delta) {
    if (!rest.id) return;
    rest.remaining = Math.max(0, rest.remaining + delta);
    if (rest.remaining > rest.total) rest.total = rest.remaining;
    if (rest.remaining <= 0) stopRest(); else renderRest();
  }
  function stopRest() { if (rest.id) clearInterval(rest.id); rest.id = null; rest.remaining = 0; rest.total = 0; renderRest(); }
  function renderRest() {
    let el = document.getElementById("rest");
    if (!rest.id) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement("div"); el.id = "rest"; el.className = "rest-banner"; document.body.appendChild(el); }
    const m = Math.floor(rest.remaining / 60), s = rest.remaining % 60;
    const pct = rest.total ? (rest.remaining / rest.total) * 100 : 0;
    el.innerHTML = `<button class="rest-adj" data-action="rest-minus" aria-label="15 seconds less">−15s</button>
      <div class="rest-mid">
        <div class="rest-top"><span class="rest-lbl">Rest</span><span class="rest-time">${m}:${String(s).padStart(2, "0")}</span></div>
        <div class="rest-bar"><div class="rest-bar-fill" style="width:${pct.toFixed(1)}%"></div></div>
      </div>
      <button class="rest-adj" data-action="rest-plus" aria-label="15 seconds more">+15s</button>
      <button class="rest-skip" data-action="rest-stop">Skip</button>`;
  }
  function notify(title, body) {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") new Notification(title, { body });
  }

  // transient toast with optional Undo
  function showToast(msg, undoFn) {
    const old = document.getElementById("toast"); if (old) old.remove();
    const t = document.createElement("div"); t.id = "toast"; t.className = "toast";
    t.innerHTML = `<span>${esc(msg)}</span>${undoFn ? `<button class="btn-sm" id="toast-undo">Undo</button>` : ""}`;
    document.body.appendChild(t);
    const kill = () => t.remove();
    const timer = setTimeout(kill, 5000);
    if (undoFn) t.querySelector("#toast-undo").onclick = () => { clearTimeout(timer); kill(); undoFn(); render(); };
  }

  // ---------- boot ----------
  applyTheme();
  window.addEventListener("hashchange", render);
  if (!location.hash) location.hash = "#/today";
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
