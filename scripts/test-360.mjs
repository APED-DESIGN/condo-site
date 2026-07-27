/**
 * Suite E2E de la visite virtuelle 360° (Playwright/Chromium).
 * Vérifie : ouverture, VRAI clic sur chacune des flèches (36 directions),
 * mini-plan, galerie, clavier, remontage, réseau (aucun original 8K,
 * poids total), mobile/tablette/desktop, reduced-motion, console propre.
 *
 *   node scripts/test-360.mjs   (le serveur dev doit tourner sur :3001)
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const problems = [];
const ok = (m) => console.log(`  ✓ ${m}`);
const fail = (m) => {
  problems.push(m);
  console.log(`  ✗ ${m}`);
};

function watch(page, label, network) {
  page.on("console", (m) => {
    if (m.type() === "error") fail(`[console:${label}] ${m.text().slice(0, 300)}`);
    if (m.type() === "warning" && /react/i.test(m.text()))
      fail(`[react-warn:${label}] ${m.text().slice(0, 200)}`);
  });
  page.on("pageerror", (e) => fail(`[pageerror:${label}] ${e.message}`));
  page.on("requestfailed", (r) => {
    const url = r.url();
    if (url.includes("favicon") || url.includes("hot-update")) return;
    if (r.failure()?.errorText === "net::ERR_ABORTED" && url.includes("_rsc=")) return;
    fail(`[requestfailed:${label}] ${url} — ${r.failure()?.errorText}`);
  });
  if (network) {
    page.on("response", async (r) => {
      const url = r.url();
      if (url.includes("photo2") || /IMG_2026\d+.*\.JPG/i.test(url))
        fail(`[réseau:${label}] ORIGINAL 8K SERVI : ${url}`);
      if (r.status() >= 400 && !url.includes("favicon") && !url.includes("hot-update"))
        fail(`[http ${r.status()}:${label}] ${url}`);
      if (url.includes("/tour/maison-01/")) {
        const len = Number(r.headers()["content-length"] ?? 0);
        network.bytes += len;
        network.count++;
      }
    });
  }
}

const roomName = (page) =>
  page.locator('[data-testid="room360-name"]').textContent();

async function waitRoom(page, expected, timeout = 6000) {
  try {
    await page.waitForFunction(
      (name) =>
        document.querySelector('[data-testid="room360-name"]')?.textContent === name,
      expected,
      { timeout }
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Clique la vraie flèche DOM du lien visé : survole les flèches (les plus
 * proches du bas-centre d'abord), identifie la bonne par son infobulle,
 * puis clique.
 */
async function clickArrow(page, vw, vh, targetName) {
  const cx = vw / 2;
  const cy = vh * 0.75;
  const arrows = await page.locator("button.psv-virtual-tour-arrow:visible").all();
  const boxes = [];
  for (const el of arrows) {
    const b = await el.boundingBox();
    if (b)
      boxes.push({
        el,
        d: Math.hypot(b.x + b.width / 2 - cx, b.y + b.height / 2 - cy),
      });
  }
  boxes.sort((a, b) => a.d - b.d);
  for (const { el } of boxes) {
    await el.hover({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(350);
    const tip = await page
      .locator(".psv-tooltip")
      .textContent({ timeout: 800 })
      .catch(() => null);
    if (tip && tip.includes(targetName)) {
      await el.click({ timeout: 2000 }).catch(() => {});
      return waitRoom(page, targetName, 6000);
    }
  }
  return false;
}

/**
 * Amène la page dans la visite à pied.
 *
 * Depuis l'ajout du visualiseur, la visite est le mode 3 d'une coquille à trois
 * modes : ouverte par le bouton de la page on arrive sur la cartographie, et
 * il faut basculer. Le lien profond ?visite=1, lui, y entre directement.
 */
async function openTour(page) {
  await page.waitForSelector('[data-testid="visualiseur"]', { timeout: 30000 });
  const mode = await page
    .locator('[data-testid="visualiseur"]')
    .getAttribute("data-mode");
  if (mode !== "visite") {
    await page.locator('[data-testid="mode-visite"]').click();
    await page.waitForTimeout(1200);
  }
  await page.waitForFunction(() => window.__tour360?.viewer, null, { timeout: 30000 });
  await page.waitForTimeout(2500);
}

async function main() {
  const browser = await chromium.launch();

  /* ── Desktop : parcours exhaustif ─────────────────────────── */
  console.log("— Desktop 1440×900 : les 36 flèches, une par une —");
  const network = { bytes: 0, count: 0 };
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  watch(page, "desktop", network);

  await page.goto(`${BASE}/maison`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Visite virtuelle 360°/i }).first().click();
  await openTour(page);
  if ((await roomName(page)) !== "Façade avant") fail("départ ≠ Façade avant");
  else ok("ouverture sur la façade avant");

  const graph = await page.evaluate(() =>
    window.__tour360.data.nodes.map((n) => ({
      id: n.id,
      name: n.name,
      links: n.links.map((l) => ({ to: l.to, yaw: l.yaw })),
    }))
  );
  const nameOf = Object.fromEntries(graph.map((n) => [n.id, n.name]));

  let clicked = 0;
  for (const node of graph) {
    for (const link of node.links) {
      /* Se placer sur le nœud, orienter la caméra vers la flèche, cliquer. */
      await page.evaluate(
        ([id, yaw]) =>
          window.__tour360.tourPlugin
            .setCurrentNode(id)
            .then(() => window.__tour360.viewer.rotate({ yaw: `${yaw}deg`, pitch: "-12deg" })),
        [node.id, link.yaw]
      );
      await page.waitForTimeout(1400);
      const arrived = await clickArrow(page, 1440, 900, nameOf[link.to]);
      if (!arrived) {
        const now = await roomName(page);
        fail(`${node.id} → ${link.to} : clic flèche → « ${now} »`);
      } else clicked++;
    }
  }
  const totalLinks = graph.reduce((s, n) => s + n.links.length, 0);
  ok(`${clicked}/${totalLinks} flèches cliquées mènent à la bonne pièce`);

  /* Mini-plan : changer de zone puis se téléporter */
  await page.getByRole("tab", { name: "Rez-de-chaussée" }).click();
  await page.waitForTimeout(400);
  await page.locator('[data-testid="map360-cuisine"]:visible').click();
  if (!(await waitRoom(page, "Cuisine"))) fail("mini-plan : téléportation cuisine");
  else ok("mini-plan : téléportation + suivi de position");
  const cur = await page
    .locator('[data-testid="map360-cuisine"]:visible')
    .getAttribute("aria-current");
  if (cur !== "location") fail("mini-plan : aria-current absent");

  /* Galerie PSV */
  await page.locator(".psv-navbar .psv-gallery-button").click();
  await page.waitForTimeout(600);
  await page.locator('.psv-gallery-item[data-psv-gallery-item="salon"]').click();
  if (!(await waitRoom(page, "Salon"))) fail("galerie : saut vers le salon");
  else ok("galerie : vignettes fonctionnelles");

  /* Clavier : rotation + fermeture */
  const yawBefore = await page.evaluate(() => window.__tour360.viewer.getPosition().yaw);
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(500);
  await page.keyboard.up("ArrowRight");
  const yawAfter = await page.evaluate(() => window.__tour360.viewer.getPosition().yaw);
  if (Math.abs(yawAfter - yawBefore) < 0.01) fail("clavier : ArrowRight ne pivote pas");
  else ok("clavier : flèches pivotent la vue");
  /* Échap remonte d'un mode à la fois (visite → plan → carto) puis ferme :
     c'est la sémantique du visualiseur, pas une fermeture immédiate. */
  for (let i = 0; i < 4 && (await page.locator('div[role="dialog"]').count()); i++) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
  }
  if (await page.locator('div[role="dialog"]').count()) fail("Échap ne ferme pas");
  else ok("Échap remonte les modes puis ferme le visualiseur");

  /* Remontage : rouvrir après fermeture, puis navigation client + retour */
  await page.getByRole("button", { name: /Visite virtuelle 360°/i }).first().click();
  await openTour(page);
  if ((await roomName(page)) !== "Façade avant") fail("réouverture : viewer cassé");
  else ok("réouverture après fermeture : aucun crash");
  /* Fermeture directe par le bouton : Échap ne ferait que remonter d'un mode
     et la modale resterait devant le lien. */
  await page.locator('[data-testid="fermer-visualiseur"]').click();
  await page.waitForTimeout(600);
  /* `/#unites` n'existe plus depuis le commit 74b2d67 (« Clarifier le site ») :
     le test pointait un lien mort. On navigue vers l'autre approche, qui est
     bien une navigation client depuis /maison. */
  await page.locator('a[href="/appartement"]').first().click();
  await page.waitForTimeout(1200);
  await page.goBack({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Visite virtuelle 360°/i }).first().click();
  await openTour(page);
  if ((await roomName(page)) !== "Façade avant") fail("remontage après navigation : cassé");
  else ok("remontage après navigation client : aucun contexte WebGL perdu");

  console.log(
    `  ℹ réseau visite complète : ${(network.bytes / 1024 / 1024).toFixed(1)} Mo sur ${network.count} requêtes /tour/`
  );
  if (network.bytes > 40 * 1024 * 1024)
    fail(`poids réseau excessif : ${(network.bytes / 1024 / 1024).toFixed(1)} Mo`);
  await ctx.close();

  /* ── Tablette + grand desktop : fumée ─────────────────────── */
  for (const [w, h, label] of [[768, 1024, "tablette"], [1920, 1080, "1920"]]) {
    const c = await browser.newContext({ viewport: { width: w, height: h } });
    const p = await c.newPage();
    watch(p, label);
    await p.goto(`${BASE}/maison?visite=1`, { waitUntil: "networkidle" });
    await p.waitForFunction(() => window.__tour360?.viewer, null, { timeout: 30000 });
    await p.waitForTimeout(2200);
    if ((await roomName(p)) !== "Façade avant") fail(`${label} : la visite ne démarre pas`);
    else ok(`${label} ${w}×${h} : visite fonctionnelle`);
    await c.close();
  }

  /* ── Mobile tactile ───────────────────────────────────────── */
  console.log("— Mobile 390×844 —");
  const mc = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const mp = await mc.newPage();
  watch(mp, "mobile");
  await mp.goto(`${BASE}/maison?visite=1`, { waitUntil: "networkidle" });
  await mp.waitForFunction(() => window.__tour360?.viewer, null, { timeout: 30000 });
  await mp.waitForTimeout(2500);
  await mp.locator("button.psv-virtual-tour-arrow:visible").first().tap();
  if (!(await waitRoom(mp, "Porche d'entrée", 6000))) fail("mobile : tap sur flèche");
  else ok("mobile : tap sur flèche fonctionne");
  await mp.locator('button[aria-label="Afficher le plan"]').tap();
  await mp.waitForTimeout(600);
  if (!(await mp.locator('[data-testid="map360-porche"]:visible').count()))
    fail("mobile : mini-plan ne s'ouvre pas");
  else ok("mobile : mini-plan repliable");
  await mc.close();

  /* ── prefers-reduced-motion ───────────────────────────────── */
  const rc = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "reduce",
  });
  const rp = await rc.newPage();
  watch(rp, "reduced");
  await rp.goto(`${BASE}/maison?visite=1`, { waitUntil: "networkidle" });
  await rp.waitForFunction(() => window.__tour360?.viewer, null, { timeout: 30000 });
  await rp.waitForTimeout(2000);
  const hasAutorotate = await rp.evaluate(
    () => !!window.__tour360.viewer.getPlugin?.("autorotate")
  );
  if (hasAutorotate) fail("reduced-motion : autorotate encore actif");
  else ok("reduced-motion : autorotate désactivé, visite navigable");
  await rc.close();

  await browser.close();
  console.log("");
  if (problems.length) {
    console.log(`ÉCHEC — ${problems.length} problème(s) :`);
    problems.forEach((p) => console.log(`  • ${p}`));
    process.exit(1);
  }
  console.log("SUCCÈS — visite 360° : zéro erreur, zéro flèche perdue.");
}

main().catch((e) => {
  console.error("ERREUR FATALE :", e);
  process.exit(1);
});
