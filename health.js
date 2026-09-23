// health.js — bridge to the `capacitor-health` plugin (Apple Health / Google
// Health Connect). On the web/PWA there is no plugin, so every method is a
// safe no-op. The native plugin auto-registers as Capacitor.Plugins.HealthPlugin
// once `capacitor-health` is installed and `cap sync` has run (see MOBILE.md).
(function (root) {
  const Cap = root.Capacitor;
  const isNative = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  const plugin = () => (Cap && Cap.Plugins && Cap.Plugins.HealthPlugin) || null;

  function todayRange() {
    const n = new Date();
    const start = new Date(n.getFullYear(), n.getMonth(), n.getDate());
    return { startDate: start.toISOString(), endDate: n.toISOString() };
  }

  const Health = {
    // Sync gate for UI: native app with the plugin present.
    available() { return isNative && !!plugin(); },

    // Ensure Health is usable and ask for step-read permission. Returns true to proceed.
    async connect() {
      const p = plugin();
      if (!p) return false;
      try {
        const a = await p.isHealthAvailable();
        if (!a || !a.available) {
          // Android: Health Connect app not installed — send the user to the Play Store.
          try { await p.showHealthConnectInPlayStore(); } catch (_) {}
          return false;
        }
        await p.requestHealthPermissions({ permissions: ["READ_STEPS"] });
        return true;
      } catch (_) { return false; }
    },

    // Read today's step total and write it through the app's existing hook.
    // Returns step count, 0 if none, or null if unavailable/failed.
    async syncToday() {
      const p = plugin();
      if (!p) return null;
      try {
        const r = todayRange();
        const res = await p.queryAggregated({ startDate: r.startDate, endDate: r.endDate, dataType: "steps", bucket: "day" });
        const rows = (res && res.aggregatedData) || [];
        const steps = Math.round(rows.reduce((sum, x) => sum + (Number(x.value) || 0), 0));
        if (steps > 0 && root.Store) root.Store.setSteps(root.Store.dayKey(), steps);
        return steps;
      } catch (_) { return null; }
    },
  };

  root.Health = Health;
})(typeof globalThis !== "undefined" ? globalThis : this);
