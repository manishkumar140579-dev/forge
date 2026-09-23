# Forge — native app (Capacitor) build guide

Forge is one codebase. The **web app at the repo root is the source of truth** (also
what GitHub Pages serves). Capacitor wraps that same HTML/CSS/JS in a native Android /
iOS shell — **no rewrite, no second codebase.**

```
root *.html/.css/.js  ──(scripts/sync-www.mjs)──▶  www/  ──(cap sync)──▶  android/ , ios/
   (edit here)                                   (generated)              (generated)
```

## Roadmap status
- [x] **Phase 1 — Capacitor shell.** Config, `www/` assembler, deps, Android project.
- [x] **Phase 1 build — verified.** Debug APK builds (`app-debug.apk`, ~6 MB).
- [x] **Phase 2 — Health/steps.** `health.js` seam + Settings Connect; `capacitor-health`
      plugin wired and compiled into the APK; steps read via Health Connect / HealthKit →
      `Store.setSteps()`. **Remaining: test on a physical device + a privacy policy for the store.**
- [ ] **Phase 3 — store submission** · **Phase 4 — cloud sync** · **Phase 5 — widgets/Watch/AI**.

## Prerequisites (already installed on this machine)
- **JDK 21** at `C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot` — **Capacitor 8 compiles
  against Java 21** (JDK 17 fails with `invalid source release: 21`).
- **Android SDK** at `%LOCALAPPDATA%\Android\Sdk` (cmdline-tools, platform-tools,
  `platforms;android-36`, `build-tools;36.0.0`).
- **Android Studio** — installing via winget; only needed for the emulator/GUI, not for CLI builds.

## Build the debug APK (CLI, no Studio needed)
```bash
npm install                 # restore Capacitor + capacitor-health (node_modules git-ignored)
npm run cap:add:android     # FIRST time only — generates android/ + runs patch:android
# after any web change:
npm run cap:sync            # re-copies www/, syncs plugins, re-applies patch:android
```
Then, with JDK 21 + the SDK on the environment:
```powershell
$env:JAVA_HOME="C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot"
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
cd android; .\gradlew.bat :app:assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk   (sideload to your phone)
```
`android/local.properties` points Gradle at the SDK (`sdk.dir=...`).

> `android/` is git-ignored and regenerable. **`scripts/patch-android.mjs`** re-applies the
> two native requirements after every `cap:add`/`cap:sync`: bump `minSdkVersion` to 26 and add
> the Health Connect rationale activity + `<queries>` to the manifest. Edit native config there,
> not by hand — hand edits are wiped when `android/` regenerates.

## Phase 2 — steps from Health (done in code; device test pending)
- Plugin: **`capacitor-health`** (Apple Health + Google Health Connect), registers as
  `Capacitor.Plugins.HealthPlugin`.
- **`health.js`** calls `isHealthAvailable()` → `requestHealthPermissions({permissions:['READ_STEPS']})`
  → `queryAggregated({dataType:'steps', bucket:'day', ...})`, then `Store.setSteps()`. Runs on
  launch + app-resume; **Settings → Steps & Health → Connect** triggers the permission prompt.
- `READ_STEPS` permission is merged in from the plugin; `minSdk 26` + rationale activity + the
  `com.google.android.apps.healthdata` `<queries>` are applied by `patch-android.mjs`.
- **On device:** the Google **Health Connect** app must be installed (the plugin routes users to
  the Play Store if not). Grant the step-read permission when prompted.
- **For the stores:** Health data requires a **privacy policy** (host a page on the GitHub Pages
  site) + data-use declarations at submission.

## iOS (later — needs a Mac)
macOS + Xcode + **Apple Developer $99/yr**. `npm run cap:add:ios` → `npm run cap:open:ios`.
`capacitor-health` covers HealthKit too; add the HealthKit usage strings to `Info.plist`.

## Notes
- **App id** `com.manishkumar.forge` (`capacitor.config.json`) — change before publishing if you want.
- **Fonts** load from the Google Fonts CDN, so first launch needs network. Bundle Archivo + IBM
  Plex locally later for full offline.
- **Service worker** registration still runs in the WebView; harmless (Capacitor serves the
  bundled assets offline) and can be left as-is.
- **Git-ignored (regenerable):** `node_modules/`, `www/`, `android/`, `ios/`.
