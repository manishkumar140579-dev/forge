// health.js — thin seam between the app and a native step source
// (Apple Health / Google Fit / Health Connect via a Capacitor plugin).
// On the web/PWA there is no plugin, so every method is a safe no-op.
//
// ponytail: adapter, not a plugin. The native Health plugin is installed at build
// time (see MOBILE.md). It registers under Capacitor.Plugins.Health and must expose
// requestAuthorization({read}) and queryTotalSteps({startDate,endDate}) — if the
// plugin you pick names them differently, match them in the two calls below. All
// calls are guarded, so a mismatch degrades to "no data", never a crash.
(function (root) {
  const Cap = root.Capacitor;
  const isNative = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  const plugin = () => (Cap && Cap.Plugins && Cap.Plugins.Health) || null;

  function startOfTodayISO() {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate()).toISOString();
  }

  const Health = {
    // True only in the native app with the Health plugin present.
    available() { return isNative && !!plugin(); },

    // Ask the OS for step-read permission. Returns true if granted.
    async connect() {
      const p = plugin();
      if (!p || typeof p.requestAuthorization !== "function") return false;
      try { await p.requestAuthorization({ read: ["steps"] }); return true; }
      catch (_) { return false; }
    },

    // Read today's step total and write it through the app's existing hook.
    // Returns the step count, 0 if none, or null if unavailable/failed.
    async syncToday() {
      const p = plugin();
      if (!p || typeof p.queryTotalSteps !== "function") return null;
      try {
        const res = await p.queryTotalSteps({ startDate: startOfTodayISO(), endDate: new Date().toISOString() });
        const steps = Math.round(Number(res && (res.steps ?? res.value ?? res.count)) || 0);
        if (steps > 0 && root.Store) root.Store.setSteps(root.Store.dayKey(), steps);
        return steps;
      } catch (_) { return null; }
    },
  };

  root.Health = Health;
})(typeof globalThis !== "undefined" ? globalThis : this);
