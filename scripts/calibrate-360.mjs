/**
 * Outil de calibration des flèches de la visite 360°.
 * Pour chaque nœud et chaque lien : centre la caméra sur le yaw du lien et
 * capture l'écran → la flèche doit tomber pile dans l'ouverture (porte,
 * corridor, escalier). Sinon, ajuster data/tours/maison-01.ts et relancer.
 *
 *   node scripts/calibrate-360.mjs <dossier-captures> [nodeId...]
 */
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const OUT = process.argv[2] ?? "/tmp/calib360";
const ONLY = process.argv.slice(3);
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await (
  await browser.newContext({ viewport: { width: 1280, height: 800 } })
).newPage();
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => m.type() === "error" && console.log("CONSOLE:", m.text()));

await page.goto("http://localhost:3001/unites/maison-panoramique?visite=1", {
  waitUntil: "networkidle",
});
await page.waitForFunction(() => window.__tour360?.viewer, null, { timeout: 30000 });
await page.waitForTimeout(2500);

const nodes = await page.evaluate(() =>
  window.__tour360.data.nodes.map((n) => ({
    id: n.id,
    links: n.links.map((l) => ({ to: l.to, yaw: `${l.yaw}deg` })),
  }))
);

for (const node of nodes) {
  if (ONLY.length && !ONLY.includes(node.id)) continue;
  await page.evaluate(
    (id) => window.__tour360.tourPlugin.setCurrentNode(id),
    node.id
  );
  await page.waitForTimeout(2200);
  for (const link of node.links) {
    await page.evaluate(
      (yaw) => window.__tour360.viewer.rotate({ yaw, pitch: "-8deg" }),
      link.yaw
    );
    await page.waitForTimeout(450);
    await page.screenshot({ path: `${OUT}/${node.id}--vers--${link.to}.png` });
    console.log(`${node.id} → ${link.to} (${link.yaw})`);
  }
}
await browser.close();
console.log("Captures dans", OUT);
