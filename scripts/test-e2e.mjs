/**
 * Test E2E complet du site + de la visite immersive (Playwright, Chromium).
 * Usage : node scripts/test-e2e.mjs [--shots <dir>]
 * Vérifie : zéro erreur console, sections de la home, toutes les flèches
 * de la visite, le mini-plan, la fermeture, le lien profond ?visite=1,
 * le viewport mobile et prefers-reduced-motion.
 */
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const shotsDir =
  process.argv.includes("--shots")
    ? process.argv[process.argv.indexOf("--shots") + 1]
    : null;
if (shotsDir) mkdirSync(shotsDir, { recursive: true });

const problems = [];
const note = (msg) => console.log(`  ${msg}`);
const fail = (msg) => {
  problems.push(msg);
  console.log(`  ✗ ${msg}`);
};
const ok = (msg) => console.log(`  ✓ ${msg}`);

function watch(page, label) {
  page.on("console", (m) => {
    if (m.type() === "error") fail(`[console:${label}] ${m.text()}`);
  });
  page.on("pageerror", (e) => fail(`[pageerror:${label}] ${e.message}`));
  page.on("requestfailed", (r) => {
    const url = r.url();
    if (url.includes("favicon") || url.includes("hot-update")) return;
    // Prefetchs RSC annulés par une navigation : comportement normal de Next.
    if (r.failure()?.errorText === "net::ERR_ABORTED" && url.includes("_rsc=")) return;
    fail(`[requestfailed:${label}] ${url} — ${r.failure()?.errorText}`);
  });
  page.on("response", (r) => {
    if (r.status() >= 400 && !r.url().includes("favicon") && !r.url().includes("hot-update"))
      fail(`[http ${r.status()}:${label}] ${r.url()}`);
  });
}

const shot = async (page, name) => {
  if (shotsDir) await page.screenshot({ path: `${shotsDir}/${name}.png` });
};

/** Attend la fin de la transition entre deux pièces. */
const settle = (page, ms = 950) => page.waitForTimeout(ms);

async function roomTitle(page) {
  return page
    .locator('div[role="dialog"] .font-display')
    .first()
    .textContent();
}

async function testTourExhaustive(page) {
  console.log("— Visite : parcours exhaustif de chaque flèche —");
  const tour = await page.evaluate(async () => {
    const res = await fetch("/tours/le-55/entree.jpg");
    return res.ok;
  });
  if (!tour) fail("image de départ inaccessible");

  const NODES = {
    entree: "Vestibule",
    salon: "Séjour",
    cuisine: "Cuisine",
    "salle-a-manger": "Salle à manger",
    terrasse: "Terrasse",
    "salle-eau": "Salle d'eau",
    escalier: "Escalier",
    palier: "Palier",
    "chambre-principale": "Chambre principale",
    "chambre-2": "Chambre 2",
    "chambre-3": "Chambre 3",
    "salle-bain": "Salle de bain",
    buanderie: "Buanderie",
  };
  const LINKS = {
    entree: ["salon"],
    salon: ["cuisine", "entree"],
    cuisine: ["salle-a-manger", "escalier", "salon"],
    "salle-a-manger": ["terrasse", "salle-eau", "cuisine"],
    terrasse: ["salle-a-manger"],
    "salle-eau": ["salle-a-manger", "escalier"],
    escalier: ["palier", "cuisine"],
    palier: ["chambre-principale", "salle-bain", "buanderie", "chambre-3", "escalier"],
    "chambre-principale": ["palier"],
    "chambre-2": ["palier", "chambre-3"],
    "chambre-3": ["palier", "chambre-2"],
    "salle-bain": ["palier", "buanderie"],
    buanderie: ["palier", "salle-bain"],
  };

  const waitRoom = async (name) => {
    try {
      await page.waitForFunction(
        (expected) => {
          const el = document.querySelector('div[role="dialog"] .font-display');
          return el?.textContent?.trim() === expected;
        },
        name,
        { timeout: 6000 }
      );
      return true;
    } catch {
      return false;
    }
  };
  const goPlan = async (nodeId) => {
    await page.locator(`button[data-testid="plan-${nodeId}"]:visible`).click();
    const arrived = await waitRoom(NODES[nodeId]);
    await page.waitForTimeout(700); // fin de l'animation d'entrée de la pièce
    return arrived;
  };

  let arrows = 0;
  for (const [nodeId, targets] of Object.entries(LINKS)) {
    if (!(await goPlan(nodeId)))
      fail(`plan → ${nodeId} : la pièce ne s'affiche pas`);

    for (const target of targets) {
      const arrow = page.locator(
        `button[data-testid="arrow-${nodeId}-${target}"]:visible`
      );
      if ((await arrow.count()) === 0) {
        fail(`${nodeId} : flèche vers ${target} introuvable`);
        continue;
      }
      await arrow.click();
      if (!(await waitRoom(NODES[target])))
        fail(`${nodeId} → ${target} : la pièce cible ne s'affiche pas`);
      else arrows++;
      await goPlan(nodeId);
    }
  }
  ok(`${arrows} flèches testées, toutes mènent à la bonne pièce`);

  // Position du plan suit le visiteur
  await goPlan("cuisine");
  await page.waitForTimeout(300);
  const current = await page
    .locator('div[role="dialog"] button[aria-current="location"]:visible')
    .getAttribute("aria-label");
  if (current !== "Aller : Cuisine") fail(`plan aria-current : ${current}`);
  else ok("mini-plan : position courante suit le déplacement");
}

async function main() {
  const browser = await chromium.launch();
  console.log("— Desktop 1440×900 —");
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  watch(page, "desktop");

  // HOME
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(3200); // preloader 0→100
  const h1 = await page.locator("h1").first().textContent();
  if (!h1?.includes("Visitez votre prochain chez-vous"))
    fail(`h1 inattendu : ${h1}`);
  else ok("hero affiché après preloader");
  await shot(page, "01-home-hero");

  // Scroll complet (lenis + sections épinglées)
  for (let i = 0; i < 26; i++) {
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(160);
  }
  await page.waitForTimeout(800);
  await shot(page, "02-home-bas");
  for (const id of ["unites", "inclusions", "louer", "immeuble", "contact"]) {
    const visible = await page.locator(`#${id}`).count();
    if (!visible) fail(`section #${id} absente`);
  }
  ok("sections unites/inclusions/louer/immeuble/contact présentes");

  // Formulaire : validation
  await page.locator("#nom").scrollIntoViewIfNeeded();
  await page.locator('button[type="submit"]').click();
  const alerts = await page.locator('[role="alert"]').count();
  if (alerts < 3) fail(`validation formulaire : ${alerts} messages`);
  else ok("formulaire : erreurs de validation affichées");
  await page.locator("#nom").fill("Test Locataire");
  await page.locator("#courriel").fill("test@exemple.com");
  await page.locator("#telephone").fill("8195550123");
  await page.locator("#unite").selectOption("le-55");
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(700);
  if (!(await page.getByText("Demande reçue").count()))
    fail("formulaire : état de succès absent");
  else ok("formulaire : soumission valide → confirmation");

  // PAGE UNITÉ + VISITE
  await page.goto(`${BASE}/unites/le-55`, { waitUntil: "networkidle" });
  await shot(page, "03-unite-le-55");
  await page.getByRole("button", { name: /Lancer la visite immersive/i }).first().click();
  await page.waitForTimeout(1600);
  const title = await roomTitle(page);
  if (title?.trim() !== "Vestibule") fail(`visite : départ « ${title} »`);
  else ok("visite : ouverture sur le Vestibule");
  await shot(page, "04-tour-vestibule");

  await testTourExhaustive(page);
  await shot(page, "05-tour-cuisine");

  // Clavier : flèche avant + Échap
  await page.keyboard.press("ArrowUp");
  await settle(page);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(700);
  if (await page.locator('div[role="dialog"]').count())
    fail("Échap ne ferme pas la visite");
  else ok("clavier : ArrowUp navigue, Échap ferme");

  // Lien profond
  await page.goto(`${BASE}/unites/le-55?visite=1`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1600);
  if (!(await page.locator('div[role="dialog"]').count()))
    fail("?visite=1 n'ouvre pas la visite");
  else ok("lien profond ?visite=1 ouvre la visite");
  await page.keyboard.press("Escape");

  // Autres unités (sans visite : pas de bouton)
  await page.goto(`${BASE}/unites/unite-102`, { waitUntil: "networkidle" });
  if (await page.getByRole("button", { name: /visite immersive/i }).count())
    fail("unite-102 : bouton visite présent alors que tour désactivé");
  else ok("unite-102 : pas de bouton visite (correct)");
  await shot(page, "06-unite-102");

  await ctx.close();

  // MOBILE
  console.log("— Mobile 390×844 (tactile) —");
  const mctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  const mp = await mctx.newPage();
  watch(mp, "mobile");
  await mp.goto(BASE, { waitUntil: "networkidle" });
  await mp.waitForTimeout(3200);
  await shot(mp, "07-mobile-home");
  await mp.goto(`${BASE}/unites/le-55?visite=1`, { waitUntil: "networkidle" });
  await mp.waitForTimeout(1800);
  if (!(await mp.locator('div[role="dialog"]').count()))
    fail("mobile : visite ne s'ouvre pas");
  await shot(mp, "08-mobile-tour");
  // Tap sur la première flèche
  await mp.locator('button[data-cursor="Aller"]').first().tap();
  await mp.waitForTimeout(1100);
  const mTitle = await roomTitle(mp);
  if (mTitle?.trim() !== "Séjour") fail(`mobile : tap flèche → « ${mTitle} »`);
  else ok("mobile : tap sur flèche fonctionne");
  // Toggle plan
  await mp.locator('button[aria-label="Afficher le plan"]').tap();
  await mp.waitForTimeout(600);
  if (!(await mp.getByText("Plan — vous êtes ici").count()))
    fail("mobile : le plan ne s'affiche pas");
  else ok("mobile : mini-plan togglable");
  await shot(mp, "09-mobile-plan");
  await mctx.close();

  // REDUCED MOTION
  console.log("— prefers-reduced-motion —");
  const rctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "reduce",
  });
  const rp = await rctx.newPage();
  watch(rp, "reduced");
  await rp.goto(BASE, { waitUntil: "networkidle" });
  await rp.waitForTimeout(600);
  const rh1 = await rp.locator("h1").first().textContent();
  if (!rh1?.includes("Visitez")) fail("reduced-motion : hero absent (preloader bloqué ?)");
  else ok("reduced-motion : preloader sauté, hero direct");
  await rp.goto(`${BASE}/unites/le-55?visite=1`, { waitUntil: "networkidle" });
  await rp.waitForTimeout(1200);
  await rp.locator('button[data-cursor="Aller"]').first().click();
  await rp.waitForTimeout(500);
  const rTitle = await roomTitle(rp);
  if (rTitle?.trim() !== "Séjour") fail(`reduced-motion : navigation → « ${rTitle} »`);
  else ok("reduced-motion : visite navigable sans animations");
  await rctx.close();

  await browser.close();

  console.log("");
  if (problems.length) {
    console.log(`ÉCHEC — ${problems.length} problème(s) :`);
    problems.forEach((p) => console.log(`  • ${p}`));
    process.exit(1);
  }
  console.log("SUCCÈS — zéro erreur console, zéro bug bloquant.");
}

main().catch((e) => {
  console.error("ERREUR FATALE :", e);
  process.exit(1);
});
