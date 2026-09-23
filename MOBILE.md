# Forge — native app (Capacitor) build guide

Forge is one codebase. The **web app at the repo root is the source of truth** (also
what GitHub Pages serves). Capacitor wraps that same HTML/CSS/JS in a native Android /
iOS shell — **no rewrite, no second codebase.**

```
root *.html/.css/.js  ──(scripts/sync-www.mjs)──▶  www/  ──(cap sync)──▶  android/ , ios/
   (edit here)                                   (generated)              (generated)
```

## Roadmap status
- [x] **Phase 1 — Capacitor shell.** Config, `www/` assembler, deps, and the Android
      project are scaffolded. Web assets bundle into the app.
- [ ] **Phase 1 build** — produce an installable APK (needs Android Studio + JDK 17, below).
- [~] **Phase 2 — Health/steps.** Web seam (`health.js`) + Settings Connect done; native
      plugin install/permissions pending (needs device + SDK).
- [ ] **Phase 3 — store submission** · **Phase 4 — cloud sync** · **Phase 5 — widgets/Watch/AI**.

## Prerequisites to build the APK (one-time)
This repo's environment can scaffold but **not build** the APK. On your machine install:
1. **JDK 17** (current default here is Java 8 — Capacitor 8 / Android Gradle needs **17**).
   Set `JAVA_HOME` to the JDK 17 path.
2. **Android Studio** (installs the Android SDK + platform tools). Open it once so it
   downloads an SDK platform + build-tools.
3. **Node** (already have) — `npm install` restores the Capacitor CLI.

## Build & run (Android)
```bash
npm install                 # restore Capacitor (node_modules is git-ignored)
npm run cap:add:android     # FIRST time only — generates android/ (git-ignored)
# after this, when you change any web file:
npm run cap:sync            # re-copies www/ and syncs into the native project
npm run cap:open:android    # opens Android Studio → Run ▶ on device/emulator
```
Or from the CLI once the SDK is set up:
```bash
cd android && ./gradlew assembleDebug
# APK → android/app/build/outputs/apk/debug/app-debug.apk  → sideload to your phone
```

> First `cap:add:android` scaffolds the native project; **after that use `cap:sync`.**
> Re-running `cap:add` regenerates and would wipe native edits. Once you customize
> `android/` (Health permissions, signing), remove `android/` from `.gitignore` and
> commit it so those edits are tracked.

## iOS (later — needs a Mac)
Needs macOS + Xcode + an **Apple Developer account ($99/yr)**.
```bash
npm run cap:add:ios
npm run cap:open:ios        # build/run in Xcode
```

## Phase 2 — step count from Health (the integration you asked for)
**Web side is done:** `health.js` is the seam and Settings → **Steps & Health → Connect**
is wired. On launch and on app-resume it calls `Health.syncToday()`, which reads today's
steps and writes them via the existing hook `Store.setSteps(Store.dayKey(), n)`. On the web
it's a safe no-op. What's left is the **native plugin** (needs a device + SDK to verify):

1. **Install a Health plugin** (pick one), e.g. Health Connect for Android + HealthKit for iOS:
   ```bash
   npm install <health-connect-capacitor-plugin>
   npm run cap:sync
   ```
2. **Register it under the name `Health`** so `health.js` finds it at
   `Capacitor.Plugins.Health` (or change the `plugin()` name in `health.js` to match).
3. **Match the two method names** in `health.js` to the plugin's API:
   `requestAuthorization({ read: ["steps"] })` and
   `queryTotalSteps({ startDate, endDate }) → { steps }`. Calls are guarded, so a mismatch
   just yields "no data" until aligned — it never crashes.
4. **Android permission:** add `android.permission.health.READ_STEPS` (Health Connect) to
   `android/app/src/main/AndroidManifest.xml`. **iOS:** add HealthKit usage strings to `Info.plist`.
5. Health data means the stores require a **privacy policy** (host a page on the existing
   GitHub Pages site) and data-use declarations at submission.

## Notes / gotchas
- **App id** is `com.manishkumar.forge` (`capacitor.config.json`) — change before publishing if you want.
- **Fonts** load from the Google Fonts CDN, so first launch needs network. For fully offline
  native, bundle Archivo + IBM Plex locally later (drop the `<link>` in `index.html`).
- **Service worker** registration still runs in the WebView; it's harmless (Capacitor already
  serves the bundled assets offline) and can be left as-is.
- **What's git-ignored:** `node_modules/`, `www/`, `android/`, `ios/` — all regenerable from
  the committed config + `npm run cap:add:*`.
