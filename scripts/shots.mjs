// scripts/shots.mjs — dev-only: screenshot the app at several phone ratios via
// headless Chrome, to check the layout holds. Needs the local server running
// (python -m http.server 8000) and Chrome installed. Output → shots/.
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = "http://127.0.0.1:8000/";
const OUT = "shots";
mkdirSync(OUT, { recursive: true });

const devices = [
  { name: "320x568", w: 320, h: 568 },   // smallest realistic (iPhone SE 1)
  { name: "390x844", w: 390, h: 844 },   // design baseline (iPhone 12–14)
  { name: "430x932", w: 430, h: 932 },   // large phone (15 Pro Max)
];
const routes = ["today", "fuel", "stats", "settings"];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();

await page.goto(BASE + "#/today", { waitUntil: "networkidle2" });
await page.evaluate(() => {
  localStorage.setItem("forge.welcomed", "1");
  const t = Store.dayKey();
  Store.setSteps(t, 7421);
  Store.setWater(t, 5);
  if (!Store.medications().length) {
    Store.addMedication({ name: "Vitamin D", dose: "1000 IU" });
    Store.addMedication({ name: "Creatine", dose: "5 g" });
    Store.toggleMed(t, Store.medications()[0].id);
  }
  if (!Store.foodByDate(t).length) {
    const add = (meal, name, g, kcal, p, c, f) => Store.addFood({ date: t, meal, name, grams: g, per100: { kcal, p, c, f } });
    add("Breakfast", "Rolled oats", 80, 379, 13, 68, 6.5);
    add("Lunch", "Chicken breast", 200, 165, 31, 0, 3.6);
    add("Lunch", "Basmati rice", 180, 130, 2.7, 28, 0.3);
  }
});

async function shoot(route, file) {
  await page.evaluate((r) => { location.hash = "#/" + r; }, route);
  await page.waitForFunction(() => document.querySelector("#app") && document.querySelector("#app").children.length > 0);
  await wait(250);
  await page.screenshot({ path: `${OUT}/${file}.png` });
}

for (const d of devices) {
  await page.setViewport({ width: d.w, height: d.h, deviceScaleFactor: 2 });
  for (const r of routes) await shoot(r, `${r}-${d.name}`);
}

// Add-food sheet at the tightest width (4 tabs must fit).
await page.setViewport({ width: 320, height: 568, deviceScaleFactor: 2 });
await page.evaluate(() => { location.hash = "#/fuel"; });
await page.waitForFunction(() => document.querySelector('[data-action="add-food"]'));
await page.evaluate(() => document.querySelector('[data-action="add-food"]').click());
await wait(400);
await page.screenshot({ path: `${OUT}/addfood-sheet-320x568.png` });

await browser.close();
console.log("shots done");
