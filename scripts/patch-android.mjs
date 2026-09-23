// scripts/patch-android.mjs — re-apply required native tweaks after Capacitor
// (re)generates android/. Runs from the cap:add / cap:sync npm scripts, so the
// native Health Connect setup stays reproducible even though android/ is git-ignored.
// Idempotent: safe to run repeatedly.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const vars = join(root, "android", "variables.gradle");
const manifest = join(root, "android", "app", "src", "main", "AndroidManifest.xml");
if (!existsSync(vars) || !existsSync(manifest)) { console.log("patch-android: no android/ yet — skipping"); process.exit(0); }

// 1) Health Connect requires Android 8.0 / API 26.
let v = readFileSync(vars, "utf8");
const v2 = v.replace(/minSdkVersion\s*=\s*\d+/, "minSdkVersion = 26");
if (v2 !== v) { writeFileSync(vars, v2); console.log("patch-android: minSdkVersion -> 26"); }

// 2) Health Connect permissions-rationale activity + the healthdata <queries> package.
//    (READ_STEPS itself is merged in from the capacitor-health plugin manifest.)
let m = readFileSync(manifest, "utf8");
if (!m.includes("PermissionsRationaleActivity")) {
  const activities = `
        <!-- capacitor-health: Health Connect permissions rationale (patch-android.mjs) -->
        <activity android:name="com.fit_up.health.capacitor.PermissionsRationaleActivity" android:exported="true">
            <intent-filter>
                <action android:name="androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE" />
            </intent-filter>
        </activity>
        <activity-alias android:name="ViewPermissionUsageActivity" android:exported="true" android:targetActivity="com.fit_up.health.capacitor.PermissionsRationaleActivity" android:permission="android.permission.START_VIEW_PERMISSION_USAGE">
            <intent-filter>
                <action android:name="android.intent.action.VIEW_PERMISSION_USAGE" />
                <category android:name="android.intent.category.HEALTH_PERMISSIONS" />
            </intent-filter>
        </activity-alias>
`;
  m = m.replace("</application>", activities + "    </application>");
}
if (!m.includes("com.google.android.apps.healthdata")) {
  const queries = `
    <!-- capacitor-health: allow querying the Health Connect app (patch-android.mjs) -->
    <queries>
        <package android:name="com.google.android.apps.healthdata" />
    </queries>
`;
  m = m.replace("</manifest>", queries + "</manifest>");
}
writeFileSync(manifest, m);
console.log("patch-android: AndroidManifest Health Connect entries ensured");
