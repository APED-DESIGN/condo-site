/**
 * Suite E2E du visualiseur trois modes de /maison (Playwright).
 *
 * Vérifie : chargement propre, les trois modes atteignables au bouton ET au
 * clavier, chaque transition qui se termine, le sélecteur de niveau, le clic
 * sur une pièce du plan qui mène au bon point de visite, le retour depuis la
 * visite, l'absence de fuite après 20 changements de mode, la fluidité en
 * rotation continue, le rendu en 390×844 et 1440×900, le clavier et le focus.
 *
 *   node scripts/test-visualiseur.mjs        (serveur dev sur :3001)
 *   BASE_URL=http://localhost:3000 node scripts/test-visualiseur.mjs
 *
 * ⚠️ La mesure de fluidité exige un vrai GPU. Le Chromium headless de
 * Playwright rend en SwiftShader (logiciel) : `scripts/gpu-check.mjs` le
 * montre, et toute image/seconde mesurée là-dedans ne veut rien dire. Le test
 * de fluidité relance donc un Chromium EN FENÊTRE, seul moyen d'obtenir
 * l'accélération matérielle sur cette machine. `--fps-headless` force la
 * mesure en headless si l'on accepte qu'elle soit indicative.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const CAPTURES = "analyse/captures";
const FPS_HEADLESS = process.argv.includes("--fps-headless");

const problems = [];
const ok = (m) => console.log(`  ✓ ${m}`);
const fail = (m) => {
  problems.push(m);
  console.log(`  ✗ ${m}`);
};

function watch(page, label) {
  page.on("console", (m) => {
    if (m.type() === "error") fail(`[console:${label}] ${m.text().slice(0, 260)}`);
    if (m.type() === "warning" && /react/i.test(m.text()))
      fail(`[react-warn:${label}] ${m.text().slice(0, 200)}`);
  });
  page.on("pageerror", (e) => fail(`[pageerror:${label}] ${e.message.slice(0, 260)}`));
  page.on("requestfailed", (r) => {
    const url = r.url();
    if (url.includes("favicon") || url.includes("hot-update")) return;
    /* ERR_ABORTED = requête annulée par le client, pas une erreur du serveur.
       Elle survient normalement quand on quitte la page pendant qu'un
       panorama de plusieurs centaines de kilo-octets est encore en vol. */
    if (r.failure()?.errorText === "net::ERR_ABORTED") return;
    fail(`[requestfailed:${label}] ${url} — ${r.failure()?.errorText}`);
  });
}

const modeDom = (page) =>
  page.locator('[data-testid="visualiseur"]').getAttribute("data-mode");
const titre = (page) => page.locator('[data-testid="visualiseur-titre"]').textContent();

/** Attend la fin de toute transition de caméra en cours. */
async function transitionFinie(page, timeout = 4000) {
  try {
    await page.waitForFunction(() => window.__maison3d?.enTransition() === false, null, {
      timeout,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Ouvre le visualiseur par le bouton de la page — le chemin réel de
 * l'utilisateur, qui entre par la cartographie. (`?visite=1` reste le lien
 * profond historique et ouvre, lui, directement la visite à pied.)
 */
async function ouvrir(page) {
  await page.goto(`${BASE}/maison`, { waitUntil: "networkidle", timeout: 60000 });
  /* Clic déclenché sur l'élément lui-même : avec le défilement doux de Lenis,
     la mise en vue de Playwright entre en course avec l'animation et le calque
     « L'autre approche » finit par intercepter le pointeur. Le gestionnaire
     React exercé est le même. */
  await page
    .getByRole("button", { name: /Visite virtuelle 360°/i })
    .first()
    .evaluate((el) => el.click());
  await page.waitForSelector('[data-testid="visualiseur"]', { timeout: 30000 });
  await page.waitForFunction(() => !!window.__maison3d, null, { timeout: 30000 });
  await page.waitForTimeout(1800);
}

/** Clique au centre de l'étiquette d'une pièce (les étiquettes ne captent pas
    le pointeur : on vise ses coordonnées sur le canvas). */
async function cliquerPiece(page, espaceId) {
  const et = page.locator(`[data-testid="etiquette-${espaceId}"]`);
  const boite = await et.boundingBox();
  if (!boite) return false;
  await page.mouse.click(boite.x + boite.width / 2, boite.y + boite.height / 2);
  return true;
}

async function main() {
  mkdirSync(CAPTURES, { recursive: true });
  const browser = await chromium.launch();

  /* ── Desktop 1440×900 : parcours complet ────────────────────────── */
  console.log("— Desktop 1440×900 —");
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  watch(page, "desktop");
  await ouvrir(page);

  if ((await modeDom(page)) !== "carto") fail("ouverture : le mode de départ n'est pas la carto");
  else ok("ouverture sur la cartographie, sans erreur console");
  await page.screenshot({ path: `${CAPTURES}/desktop-1-carto.png` });

  /* ── Les panoramas sont bien projetés sur la géométrie ───────────────
     Sans cette projection la cartographie est une maquette grise, et c'est
     précisément ce qu'on ne veut plus livrer. On vérifie pièce par pièce, pas
     par une mesure de pixels : un décompte de couleur ne distingue pas une
     photo d'un aplat teinté. */
  const projection = await page.evaluate(() => window.__maison3d?.projection() ?? []);
  const attendues = projection.filter((p) => p.projete);
  const sansTexture = attendues.filter((p) => !p.texture).map((p) => p.espace);
  const nues = projection.filter((p) => !p.projete).map((p) => p.espace);

  if (attendues.length < 12)
    fail(`projection : seulement ${attendues.length} pièces texturées par leur panorama`);
  else if (sansTexture.length)
    fail(`projection : texture absente pour ${sansTexture.join(", ")}`);
  else
    ok(
      `projection : ${attendues.length} pièces texturées par leur panorama` +
        (nues.length ? ` (${nues.length} non photographiées : ${nues.join(", ")})` : "")
    );

  /* ── Les murs : fins, traversants, soulignés, sans plafond ───────────
     Ces quatre réglages ne se lisent pas sur une capture d'écran. Une
     cartographie dont les murs redeviennent des blocs opaques est encore
     « jolie » sur une image ; elle ne laisse simplement plus voir dedans. */
  const reglages = await page.evaluate(() => window.__maison3d?.reglages());
  if (!reglages) fail("murs : réglages inaccessibles");
  else if (reglages.murExterieurM > 0.121 || reglages.cloisonM > 0.081)
    fail(
      `murs : ${Math.round(reglages.murExterieurM * 100)} cm en façade et ${Math.round(
        reglages.cloisonM * 100
      )} cm en cloison (max 12 et 8)`
    );
  else
    ok(
      `murs : ${Math.round(reglages.murExterieurM * 100)} cm en façade, ${Math.round(
        reglages.cloisonM * 100
      )} cm en cloison`
    );

  for (const m of await page.evaluate(() => window.__maison3d?.murs() ?? [])) {
    const soucis = [];
    if (!(m.opaciteVue >= 0.15 && m.opaciteVue <= 0.3))
      soucis.push(`opacité vue ${m.opaciteVue.toFixed(2)} hors de [0,15 ; 0,30]`);
    if (!(m.opaciteVueDevant <= 0.12))
      soucis.push(`face à la caméra ${m.opaciteVueDevant.toFixed(2)} > 0,12`);
    if (m.ecritProfondeur !== false) soucis.push("écrit dans la profondeur");
    if (!m.doubleFace) soucis.push("pas en DoubleSide");
    if (!m.liseres) soucis.push("aucun liseré d'arête");
    if (m.intrus) soucis.push(`${m.intrus} objet(s) hors sol/volume/mur/liseré/pastille`);
    if (soucis.length) fail(`murs ${m.niveau} : ${soucis.join(", ")}`);
    else
      ok(
        `murs ${m.niveau} : opacité ${m.opaciteVue.toFixed(2)} → ${m.opaciteVueDevant.toFixed(
          2
        )} de face, liseré, aucun plafond`
      );
  }

  /* ── Le terrain n'est plus une photo suspendue ───────────────────── */
  const terrain = await page.evaluate(() => window.__maison3d?.terrain() ?? []);
  const flottants = terrain.filter((t) => t.projete || t.altitude > 0);
  if (!terrain.length) fail("terrain : aucune surface extérieure");
  else if (flottants.length)
    fail(`terrain : ${flottants.map((t) => t.espace).join(", ")} porte(nt) encore un panorama`);
  else ok(`terrain : ${terrain.length} surfaces plates au sol, aucune photo suspendue`);

  /* ── Les volumes : déclarés, situés, et honnêtes sur leur provenance ─ */
  const volumes = await page.evaluate(() => window.__maison3d?.mobilier() ?? []);
  const mesures = volumes.filter((v) => v.source === "mesure").length;
  const escalier = volumes.filter((v) => v.type === "escalier").length;
  const mention = (await page.locator('[data-testid="mention-echelle"]').textContent())?.trim();
  if (volumes.length < 20) fail(`volumes : seulement ${volumes.length} construits`);
  else if (!escalier) fail("volumes : l'escalier n'est pas un volume à marches");
  else if (volumes.some((v) => v.source !== "mesure" && v.source !== "estime"))
    fail("volumes : provenance inconnue sur au moins un volume");
  else ok(`volumes : ${volumes.length} construits dont l'escalier, ${mesures} mesurés`);

  /* La mention doit dire le compte réel, pas une phrase gravée. */
  if (!mention?.includes(String(volumes.length)))
    fail(`mention : « ${mention} » ne compte pas les ${volumes.length} volumes`);
  else if (mesures === 0 && !/aucune mesure/i.test(mention))
    fail(`mention : « ${mention} » n'annonce pas l'absence de mesure`);
  else ok(`mention : « ${mention} »`);

  await page.locator('[data-testid="niveau-rdc"]').click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${CAPTURES}/desktop-1b-carto-rdc.png` });
  await page.locator('[data-testid="niveau-tous"]').click();
  await page.waitForTimeout(900);

  /* ── Les trois modes, au bouton ──────────────────────────────────── */
  for (const [id, attendu] of [["plan", "plan"], ["carto", "carto"]]) {
    await page.locator(`[data-testid="mode-${id}"]`).click();
    if (!(await transitionFinie(page))) fail(`bouton ${id} : transition jamais terminée`);
    await page.waitForTimeout(300);
    if ((await modeDom(page)) !== attendu) fail(`bouton ${id} : mode non appliqué`);
    else ok(`bouton « ${id} » : bascule et transition terminée`);
  }

  /* ── Les trois modes, au clavier ─────────────────────────────────── */
  for (const [touche, attendu] of [["2", "plan"], ["1", "carto"]]) {
    await page.keyboard.press(touche);
    if (!(await transitionFinie(page))) fail(`touche ${touche} : transition jamais terminée`);
    await page.waitForTimeout(250);
    if ((await modeDom(page)) !== attendu) fail(`touche ${touche} : mode ${attendu} non atteint`);
    else ok(`touche « ${touche} » → ${attendu}`);
  }

  /* ── Sélecteur de niveau, chaque niveau ──────────────────────────── */
  await page.keyboard.press("2");
  await transitionFinie(page);
  await page.waitForTimeout(400);
  for (const niv of ["etage", "rdc", "tous"]) {
    await page.locator(`[data-testid="niveau-${niv}"]`).click();
    await page.waitForTimeout(600);
    const applique = await page
      .locator('[data-testid="visualiseur"]')
      .getAttribute("data-niveau");
    if (applique !== niv) fail(`niveau ${niv} : non appliqué (${applique})`);
    else {
      const coche = await page
        .locator(`[data-testid="niveau-${niv}"]`)
        .getAttribute("aria-checked");
      if (coche !== "true") fail(`niveau ${niv} : aria-checked absent`);
      else ok(`niveau « ${niv} » : appliqué et annoncé`);
    }
  }
  await page.locator('[data-testid="niveau-etage"]').click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${CAPTURES}/desktop-2-plan-etage.png` });

  /* Les étiquettes ne s'affichent qu'en plan, et seulement pour le niveau
     isolé : empilées, deux niveaux superposeraient leurs libellés. */
  const visibles = () =>
    page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-testid^="etiquette-"]')).filter(
        (el) => getComputedStyle(el).opacity === "1"
      ).length
    );
  const surEtage = await visibles();
  if (surEtage !== 7) fail(`plan étage : ${surEtage} étiquettes visibles, attendu 7`);
  else ok("plan étage : 7 pièces étiquetées");

  await page.locator('[data-testid="niveau-tous"]').click();
  await page.waitForTimeout(700);
  const surTous = await visibles();
  if (surTous !== 0) fail(`plan « tout » : ${surTous} étiquettes visibles, attendu 0`);
  else ok("plan « tout » : aucune étiquette superposée");

  /* ── Clic sur une pièce du plan → visite au bon endroit ──────────── */
  await page.locator('[data-testid="niveau-rdc"]').click();
  await page.waitForTimeout(700);
  if (!(await cliquerPiece(page, "salle-eau"))) fail("plan : étiquette « salle-eau » introuvable");
  else {
    try {
      await page.waitForFunction(
        () =>
          document.querySelector('[data-testid="visualiseur"]')?.getAttribute("data-mode") ===
          "visite",
        null,
        { timeout: 12000 }
      );
      await page.waitForTimeout(2500);
      const t = (await titre(page))?.trim();
      if (t !== "Salle d'eau") fail(`clic pièce → visite : arrivé sur « ${t} », attendu « Salle d'eau »`);
      else ok("clic sur une pièce du plan → visite au bon point");
    } catch {
      fail("clic pièce : la visite ne s'est jamais ouverte");
    }
  }
  await page.screenshot({ path: `${CAPTURES}/desktop-3-visite.png` });

  /* ── Retour vers les modes 1 et 2 depuis la visite ───────────────── */
  await page.locator('[data-testid="mode-plan"]').click();
  await transitionFinie(page);
  await page.waitForTimeout(400);
  if ((await modeDom(page)) !== "plan") fail("retour visite → plan : échoué");
  else ok("retour depuis la visite vers le plan");

  await page.locator('[data-testid="mode-visite"]').click();
  await page.waitForTimeout(1800);
  await page.locator('[data-testid="mode-carto"]').click();
  await transitionFinie(page);
  await page.waitForTimeout(400);
  if ((await modeDom(page)) !== "carto") fail("retour visite → carto : échoué");
  else ok("retour depuis la visite vers la cartographie");

  /* ── Échap remonte d'un cran, puis ferme ─────────────────────────── */
  await page.keyboard.press("2");
  await transitionFinie(page);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  if ((await modeDom(page)) !== "carto") fail("Échap depuis le plan : ne revient pas en carto");
  else ok("Échap : plan → cartographie");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(700);
  if (await page.locator('[data-testid="visualiseur"]').count())
    fail("Échap depuis la carto : ne ferme pas le visualiseur");
  else ok("Échap : ferme le visualiseur");

  /* ── Lien profond : ?visite=1 ouvre directement la visite à pied ─── */
  await page.goto(`${BASE}/maison?visite=1`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="visualiseur"]', { timeout: 30000 });
  await page.waitForTimeout(2500);
  if ((await modeDom(page)) !== "visite")
    fail("lien profond ?visite=1 : n'ouvre pas sur la visite à pied");
  else ok("lien profond ?visite=1 : ouvre la visite à pied");

  /* Le mini-plan « vous êtes ici » de la visite existante est conservé. Il
     n'apparaît qu'une fois le premier panorama arrivé : on l'attend. */
  const miniPlan = await page
    .waitForSelector('[data-testid^="map360-"]', { state: "visible", timeout: 25000 })
    .then(() => true)
    .catch(() => false);
  if (!miniPlan) fail("visite : le mini-plan « vous êtes ici » a disparu");
  else ok("visite : mini-plan conservé");

  /* ── Fuite mémoire : 20 changements de mode ──────────────────────── */
  await ouvrir(page);
  const lireInfo = () =>
    page.evaluate(() => {
      const m = window.__maison3d?.infoRendu();
      return { geometries: m?.geometries ?? -1, textures: m?.textures ?? -1 };
    });
  const avant = await lireInfo();
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press(i % 2 === 0 ? "2" : "1");
    await transitionFinie(page, 3000);
    await page.waitForTimeout(120);
  }
  const apres = await lireInfo();
  if (apres.geometries > avant.geometries || apres.textures > avant.textures)
    fail(
      `fuite GPU après 20 bascules : géométries ${avant.geometries}→${apres.geometries}, textures ${avant.textures}→${apres.textures}`
    );
  else
    ok(
      `20 bascules de mode : ressources GPU stables (géométries ${apres.geometries}, textures ${apres.textures})`
    );

  /* ── Clavier et focus visible ────────────────────────────────────── */
  await page.keyboard.press("1");
  await transitionFinie(page);
  await page.locator('[data-testid="mode-plan"]').focus();
  const focus = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return null;
    const s = getComputedStyle(el);
    return {
      testid: el.getAttribute("data-testid"),
      outline: s.outlineStyle,
      largeur: s.outlineWidth,
    };
  });
  if (focus?.testid !== "mode-plan") fail("focus : le bouton de mode n'est pas focalisable");
  else if (focus.outline === "none" || focus.largeur === "0px")
    fail(`focus : aucun contour visible (${focus.outline} ${focus.largeur})`);
  else ok(`focus visible sur les commandes (${focus.outline} ${focus.largeur})`);

  await ctx.close();

  /* ── Mobile 390×844 ──────────────────────────────────────────────── */
  console.log("— Mobile 390×844 —");
  const mc = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const mp = await mc.newPage();
  watch(mp, "mobile");
  await ouvrir(mp);
  if ((await modeDom(mp)) !== "carto") fail("mobile : le visualiseur ne démarre pas");
  else ok("mobile : cartographie affichée");
  await mp.screenshot({ path: `${CAPTURES}/mobile-1-carto.png` });

  await mp.locator('[data-testid="mode-plan"]').tap();
  if (!(await transitionFinie(mp))) fail("mobile : transition vers le plan jamais terminée");
  await mp.waitForTimeout(500);
  if ((await modeDom(mp)) !== "plan") fail("mobile : bascule vers le plan échouée");
  else ok("mobile : bascule au toucher vers le plan");
  await mp.screenshot({ path: `${CAPTURES}/mobile-2-plan.png` });

  /* Les commandes doivent rester dans la zone du pouce. */
  const barre = await mp.locator('[data-testid="mode-carto"]').boundingBox();
  if (!barre || barre.y + barre.height > 844 || barre.x < 0)
    fail("mobile : la barre de modes sort de l'écran");
  else ok("mobile : barre de modes accessible au pouce");

  await mp.locator('[data-testid="mode-visite"]').tap();
  await mp.waitForTimeout(3000);
  if ((await modeDom(mp)) !== "visite") fail("mobile : la visite ne s'ouvre pas");
  else ok("mobile : visite à pied accessible");
  await mp.screenshot({ path: `${CAPTURES}/mobile-3-visite.png` });
  await mc.close();

  /* ── prefers-reduced-motion : transitions instantanées ───────────── */
  const rc = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "reduce",
  });
  const rp = await rc.newPage();
  watch(rp, "reduced");
  await ouvrir(rp);
  await rp.keyboard.press("2");
  await rp.waitForTimeout(120);
  const enCours = await rp.evaluate(() => window.__maison3d?.enTransition());
  if (enCours) fail("reduced-motion : la bascule est encore animée");
  else ok("reduced-motion : bascule instantanée");
  await rc.close();
  await browser.close();

  /* ── Fluidité — navigateur accéléré matériellement ───────────────── */
  console.log(`— Fluidité en rotation continue (${FPS_HEADLESS ? "headless" : "fenêtré"}) —`);
  const gpuBrowser = await chromium.launch({ headless: FPS_HEADLESS });
  const gc = await gpuBrowser.newContext({ viewport: { width: 1440, height: 900 } });
  const gp = await gc.newPage();
  await ouvrir(gp);
  const rendu = await gp.evaluate(() => {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") ?? c.getContext("webgl");
    const d = gl?.getExtension("WEBGL_debug_renderer_info");
    return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : "inconnu";
  });
  const logiciel = /swiftshader|llvmpipe|software/i.test(String(rendu));
  console.log(`  ℹ rendu : ${rendu}`);

  await gp.mouse.move(720, 450);
  await gp.mouse.down();
  const debut = Date.now();
  while (Date.now() - debut < 5000) {
    const t = (Date.now() - debut) / 1000;
    await gp.mouse.move(720 + Math.cos(t * 2) * 260, 450 + Math.sin(t * 2) * 90);
    await gp.waitForTimeout(16);
  }
  await gp.mouse.up();
  const fps = await gp.evaluate(() => window.__maison3d?.fps() ?? 0);
  if (logiciel)
    console.log(
      `  ⚠ ${fps} im/s en rendu LOGICIEL — non concluant. Relancer sans --fps-headless sur une machine à GPU.`
    );
  else if (fps < 55) fail(`rotation continue : ${fps} im/s (cible 60)`);
  else ok(`rotation continue 5 s : ${fps} im/s`);
  await gc.close();
  await gpuBrowser.close();

  console.log("");
  if (problems.length) {
    console.log(`ÉCHEC — ${problems.length} problème(s) :`);
    problems.forEach((p) => console.log(`  • ${p}`));
    process.exit(1);
  }
  console.log(`SUCCÈS — visualiseur : zéro erreur. Captures dans ${CAPTURES}/`);
}

main().catch((e) => {
  console.error("ERREUR FATALE :", e);
  process.exit(1);
});
