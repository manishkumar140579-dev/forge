// scripts/sync-www.mjs — assemble the web app into www/ for Capacitor to bundle.
// The repo root stays the source of truth (also what GitHub Pages serves); www/ is
// generated and git-ignored. Run before `cap add`/`cap sync`. No dependencies.
import { rmSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const www = join(root, "www");

// The app's runtime files only — no design/, node_modules/, tests or markdown.
const FILES = [
  "index.html", "app.css", "app.js", "calc.js", "store.js", "qrcode.js", "health.js",
  "sw.js", "manifest.webmanifest",
  "icon.svg", "icon-180.png", "icon-192.png", "icon-512.png", "icon-light-512.png",
];

rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });

let n = 0;
for (const f of FILES) {
  const src = join(root, f);
  if (!existsSync(src)) { console.warn("skip (missing):", f); continue; }
  copyFileSync(src, join(www, f));
  n++;
}
console.log(`sync-www: copied ${n} files to www/`);
