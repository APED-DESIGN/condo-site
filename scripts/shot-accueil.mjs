#!/usr/bin/env node
/** Capture de l'accueil et des sections statiques, pour relecture. */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3100";
const SLUG = process.argv[3] ?? "5-et-demi-deux-niveaux";
const DIR = process.argv[4] ?? "analyse/shots";

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await p.goto(`${BASE}/visite/${SLUG}`, { waitUntil: "networkidle" });
await p.waitForTimeout(1200);
await p.screenshot({ path: `${DIR}/aa-accueil.jpg`, quality: 82, type: "jpeg" });

for (const [nom, sel] of [
  ["ab-fiche", "#fiche"],
  ["ac-galerie", "#galerie"],
  ["ad-plan", "#plan"],
  ["ae-quartier", "#quartier"],
  ["af-contact", "#contact"],
]) {
  const el = await p.$(sel);
  if (!el) continue;
  await el.scrollIntoViewIfNeeded();
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${DIR}/${nom}.jpg`, quality: 82, type: "jpeg" });
}

await b.close();
console.log("captures écrites dans", DIR);
