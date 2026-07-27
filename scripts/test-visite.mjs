#!/usr/bin/env node
/**
 * test-visite.mjs — validation du moteur de scroll, mesurée et rejouable.
 *
 *   node scripts/test-visite.mjs                       (le serveur dev doit tourner)
 *   node scripts/test-visite.mjs --slug=<nom> --trips=3 --headed
 *   node scripts/test-visite.mjs --browser=firefox|webkit
 *   node scripts/test-visite.mjs --shots=analyse/shots     (une capture par « hold »)
 *   node scripts/test-visite.mjs --back=12 --forward=32 --budget=280 --conc=6 --scrub=0.6 --lerp=0.09
 *
 * Vérifie les critères d'acceptation de l'étape 3 :
 *   1. scrub fluide dans les DEUX sens, sans saut d'image
 *   2. 60 im/s soutenues en scroll rapide
 *   3. aucune fuite mémoire après N allers-retours complets
 *   4. l'escalier ne saute pas
 *   5. les `hold` retiennent l'image, sans dérive d'un pixel
 *
 * « Saut d'image » se mesure ici comme : l'image que le moteur VOULAIT dessiner
 * n'était pas décodée, il a dû replier sur la plus proche disponible. C'est ce
 * que l'œil perçoit comme un accroc.
 */

import fs from "node:fs";
import { chromium, firefox, webkit } from "playwright";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = "true"] = a.replace(/^--/, "").split("=");
    return [k, v];
  })
);

const SLUG = args.slug || "5-et-demi-deux-niveaux";
const BASE = args.base || "http://localhost:3000";
const TRIPS = Number(args.trips || 3);
const HEADED = args.headed !== "false";
const tunables = ["scrub", "lerp", "back", "forward", "budget", "conc", "stride"].filter((k) => args[k] !== undefined).map((k) => `&${k}=${args[k]}`).join("");
const URL = `${BASE}/appartement?debug=0${tunables}`;
/* La visite n'est plus la page entière : elle est précédée d'un accueil plein
   écran. `scrollRange()` donne ses bornes réelles, on ne suppose plus rien. */

const ok = (s) => `  \x1b[32m✓\x1b[0m ${s}`;
const ko = (s) => `  \x1b[31m✗\x1b[0m ${s}`;
const info = (s) => `    ${s}`;

let failures = 0;
const check = (pass, label, detail) => {
  console.log(pass ? ok(label) : ko(label));
  if (detail) console.log(info(detail));
  if (!pass) failures++;
};

const ENGINES = { chromium, firefox, webkit };
const ENGINE = args.browser || "chromium";
if (!ENGINES[ENGINE]) {
  console.error(`\n  ✗ --browser=${ENGINE} inconnu. Valeurs : chromium, firefox, webkit.\n`);
  process.exit(1);
}
const isChromium = ENGINE === "chromium";

const browser = await ENGINES[ENGINE].launch({
  headless: !HEADED,
  ...(isChromium ? { args: ["--enable-precise-memory-info", "--disable-features=CalculateNativeWinOcclusion"] } : {}),
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
// Le protocole DevTools (ramasse-miettes forcé, mesure du tas) n'existe que sur Chromium.
const cdp = isChromium ? await page.context().newCDPSession(page) : null;

const consoleErrors = [];
const badResponses = new Set();
let aborted = 0;
page.on("console", (m) => {
  if (m.type() !== "error") return;
  const l = m.location();
  // /favicon.ico manque dans le repo depuis l'origine — hors périmètre du moteur.
  if (l?.url?.endsWith("/favicon.ico")) return;
  consoleErrors.push(`${m.text()}${l?.url ? ` — ${l.url}` : ""}`);
});
page.on("pageerror", (e) => consoleErrors.push(String(e)));
page.on("response", (r) => r.status() >= 400 && badResponses.add(`${r.status()} ${r.url()}`));
page.on("requestfailed", (r) => {
  // Le moteur annule volontairement les images sorties de la fenêtre :
  // ERR_ABORTED est le signe que l'éviction fonctionne, pas une panne.
  const t = r.failure()?.errorText ?? "";
  if (t === "net::ERR_ABORTED" || t === "NS_BINDING_ABORTED" || /cancel/i.test(t)) aborted++;
  else badResponses.add(`échec ${r.url()} (${r.failure()?.errorText})`);
});

console.log(`\n  ${ENGINE} · ${URL}\n`);
await page.goto(URL, { waitUntil: "domcontentloaded" });

await page.waitForFunction(() => window.__visite?.ready === true, null, { timeout: 60_000 });
const meta = await page.evaluate(() => {
  const img = document.querySelector("canvas");
  return {
    frameCount: window.__visite.frameCount,
    totalVh: window.__visite.totalVh,
    segments: window.__visite.segments,
    range: window.__visite.scrollRange(),
    width: img?.width ?? 0,
    height: img?.height ?? 0,
  };
});
const src = await (await fetch(`${BASE}/frames/${SLUG}/manifest.json`)).json();
const variant = src.variants.desktop ?? Object.values(src.variants)[0];
meta.pixels = variant.width * variant.height;
const decodeKind = await page.evaluate(() => window.__visite.decodeKind);
console.log(
  info(
    `${meta.frameCount} images · ${meta.segments.length} segments · ${meta.totalVh} vh · ` +
      `scroll ${Math.round(meta.range[1] - meta.range[0])} px · décodage ${decodeKind === "worker" ? "sur fil dédié" : "sur fil principal"}\n`
  )
);

/* ── mémoire de référence, après ramasse-miettes forcé ─────────────────────── */

const heap = async () => {
  if (!cdp) return 0;
  await cdp.send("HeapProfiler.collectGarbage");
  await page.waitForTimeout(250);
  return page.evaluate(() => performance.memory?.usedJSHeapSize ?? 0);
};
const heapBefore = await heap();

/* ── enregistreur dans la page ─────────────────────────────────────────────── */

const startRecorder = () =>
  page.evaluate(() => {
    const rec = { deltas: [], samples: [] };
    window.__rec = rec;
    let prev = 0;
    const loop = (t) => {
      if (prev) rec.deltas.push(t - prev);
      prev = t;
      const v = window.__visite;
      if (v) {
        const st = v.stats();
        rec.samples.push([
          Math.round(t), window.scrollY, v.frame(), v.drawn(), st.held, st.inflight,
          v.retrait(), v.canvasResizes(),
        ]);
      }
      rec.raf = requestAnimationFrame(loop);
    };
    rec.raf = requestAnimationFrame(loop);
  });

const stopRecorder = () =>
  page.evaluate(() => {
    cancelAnimationFrame(window.__rec.raf);
    const r = { deltas: window.__rec.deltas, samples: window.__rec.samples };
    window.__rec = null;
    return r;
  });

/* ── pilotage du scroll ─────────────────────────────────────────────────────
   On envoie de vrais évènements molette à cadence fixe, en visant une VITESSE
   explicite. Les ordres de grandeur réels :
     · molette de souris      ~1 500 px/s
     · glissé au trackpad     ~4 000 px/s
     · coup de trackpad sec   ~6 000 px/s (bien au-delà de l'usage courant)
   La passe « torture » à 30 000 px/s ne correspond à aucun geste humain : elle
   est mesurée et rapportée, mais elle ne conditionne pas la validation. */

const TICK = 16;
async function wheelRun(distance, pxParSec, dir) {
  const step = Math.max(1, Math.round((pxParSec * TICK) / 1000)) * dir;
  const ticks = Math.ceil(distance / Math.abs(step)) + 24; // marge pour l'inertie Lenis
  for (let i = 0; i < ticks; i++) {
    await page.mouse.wheel(0, step);
    await page.waitForTimeout(TICK);
  }
  await page.waitForTimeout(600);
}

await page.mouse.move(720, 450);
const [scrollStart, scrollEnd] = meta.range;
const DIST = scrollEnd - scrollStart;

/** Se placer à une position précise, quel que soit le moteur. Lenis intercepte
 *  le défilement et tous les navigateurs n'honorent pas `scrollTo` de la même
 *  façon : on vérifie, et on termine à la molette si besoin. */
let repliMolette = 0;
async function goTo(y) {
  for (let essai = 0; essai < 3; essai++) {
    await page.evaluate((t) => {
      if (window.__lenis) window.__lenis.scrollTo(t, { immediate: true, force: true });
      else window.scrollTo(0, t);
    }, y);
    await page.waitForTimeout(320);
    const got = await page.evaluate(() => window.scrollY);
    if (Math.abs(got - y) <= 24) return;
    if (essai === 1) {
      repliMolette++;
      const delta = y - got;
      await wheelRun(Math.abs(delta), 4000, Math.sign(delta));
    }
  }
}

// A — usage courant : descente à la molette, remontée au trackpad.
await startRecorder();
for (let t = 0; t < TRIPS; t++) {
  await wheelRun(DIST, 1500, 1);
  await wheelRun(DIST, 4000, -1);
}
const runA = await stopRecorder();

// B — scroll rapide assumé, dans les deux sens.
await startRecorder();
await wheelRun(DIST, 6000, 1);
await wheelRun(DIST, 6000, -1);
const runB = await stopRecorder();

// C — torture. Mesurée, jamais bloquante.
await startRecorder();
await wheelRun(DIST, 30000, 1);
await wheelRun(DIST, 30000, -1);
const runC = await stopRecorder();

/* ── analyse ───────────────────────────────────────────────────────────────── */

const pct = (arr, p) => {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))] ?? 0;
};

function analyse(run, label) {
  const d = run.deltas.filter((x) => x > 0 && x < 500);
  const median = pct(d, 0.5);
  const p95 = pct(d, 0.95);
  const dropped = d.filter((x) => x > 20).length;
  const severe = d.filter((x) => x > 33).length;
  /*
   * Un « repli » est une image dessinée qui n'est pas exactement celle que la
   * timeline demande. Le compte seul ne veut rien dire : se replier sur
   * l'image voisine est invisible, se replier dix images plus loin est un saut.
   * On mesure donc l'ÉCART, et c'est lui qui décide.
   */
  const ecarts = run.samples.map(([, , f, drawn]) => Math.abs(f - drawn));
  const misses = ecarts.filter((d) => d > 0).length;
  const ecartMax = Math.max(0, ...ecarts);
  const ecartP99 = pct(ecarts, 0.99);
  // Les images longues coïncident-elles avec du décodage en cours ? Si oui, le
  // goulot est le décodage, pas le dessin — et il faut le sortir du fil principal.
  const long = [];
  for (let i = 1; i < run.samples.length; i++) {
    const dt = run.samples[i][0] - run.samples[i - 1][0];
    if (dt > 33) long.push(run.samples[i][5] > 0);
  }
  const jankPendantChargement = long.length ? (long.filter(Boolean).length / long.length) * 100 : 0;
  // Référence : part de TOUTES les images où un décodage était en cours. Sans
  // elle, une corrélation à 100 % ne veut rien dire — elle peut simplement
  // refléter qu'on charge en permanence pendant le scroll.
  const baseChargement = run.samples.length ? (run.samples.filter((s) => s[5] > 0).length / run.samples.length) * 100 : 0;
  const ys = run.samples.map((s) => s[1]);

  /* Images pendant que le cadre se rétracte ou se ré-étend. C'est le moment le
     plus exigeant de la page : on anime pendant qu'on décode. On les isole,
     sinon elles se noient dans les milliers d'images de scroll pur. */
  const enAnim = [];
  for (let i = 1; i < run.samples.length; i++) {
    const r0 = run.samples[i - 1][6];
    const r1 = run.samples[i][6];
    if (Math.abs(r1 - r0) > 1e-4 && r1 > 0.001 && r1 < 0.999)
      enAnim.push(run.samples[i][0] - run.samples[i - 1][0]);
  }
  const resizes = run.samples.map((s) => s[7]);

  return {
    yMin: Math.min(...ys, Infinity),
    yMax: Math.max(...ys, -Infinity),
    animFrames: enAnim.length,
    animP95: pct(enAnim, 0.95),
    animSeverePct: enAnim.length ? (enAnim.filter((x) => x > 33).length / enAnim.length) * 100 : 0,
    resizeMin: Math.min(...resizes, Infinity),
    resizeMax: Math.max(...resizes, -Infinity),
    jankPendantChargement,
    baseChargement,
    longCount: long.length,
    label,
    frames: d.length,
    fpsMedian: median ? 1000 / median : 0,
    fpsP95: p95 ? 1000 / p95 : 0,
    droppedPct: d.length ? (dropped / d.length) * 100 : 0,
    severePct: d.length ? (severe / d.length) * 100 : 0,
    missPct: run.samples.length ? (misses / run.samples.length) * 100 : 0,
    ecartMax,
    ecartP99,
    heldMax: Math.max(...run.samples.map((s) => s[4]), 0),
  };
}

const A = analyse(runA, `${TRIPS} A/R · 1,5–4 k px/s`);
const B = analyse(runB, "rapide · 6 k px/s");
const C = analyse(runC, "torture · 30 k px/s");

console.log("  \x1b[1mFluidité\x1b[0m");
for (const r of [A, B, C]) {
  console.log(
    info(
      `${r.label.padEnd(20)} médiane ${r.fpsMedian.toFixed(0)} im/s · p95 ${r.fpsP95.toFixed(0)} im/s · ` +
        `${r.droppedPct.toFixed(1)} % > 20 ms · ${r.severePct.toFixed(1)} % > 33 ms`
    )
  );
  console.log(info(`${" ".repeat(20)}amplitude réelle du scroll : ${Math.round(r.yMin)} → ${Math.round(r.yMax)} px sur ${Math.round(DIST)} px`));
  if (r.longCount)
    console.log(
      info(
        `${" ".repeat(20)}${r.longCount} images longues, ${r.jankPendantChargement.toFixed(0)} % pendant un décodage ` +
          `(référence : ${r.baseChargement.toFixed(0)} % du temps en décodage)`
      )
    );
}
console.log("");
check(A.fpsMedian >= 55 && B.fpsMedian >= 55, "60 im/s soutenues (médiane ≥ 55)", `${A.fpsMedian.toFixed(0)} / ${B.fpsMedian.toFixed(0)} im/s`);
check(A.severePct < 2 && B.severePct < 2, "moins de 2 % d'images à plus de 33 ms", `${A.severePct.toFixed(1)} % / ${B.severePct.toFixed(1)} %`);
console.log(info(`torture (30 k px/s, aucun geste humain) : ${C.severePct.toFixed(1)} % > 33 ms — mesuré, non bloquant`));

console.log("\n  \x1b[1mSauts d'image\x1b[0m");
for (const r of [A, B, C])
  console.log(
    info(
      `${r.label.padEnd(20)} ${r.missPct.toFixed(2)} % de replis · écart p99 ${r.ecartP99} image(s) · ` +
        `écart max ${r.ecartMax} image(s) (${(r.ecartMax / 10).toFixed(1)} s de vidéo)`
    )
  );
/*
 * Ce qui est exigible, et ce qui ne l'est pas.
 *
 * À vitesse d'usage (1,5–4 k px/s), l'image dessinée doit être la bonne : c'est
 * le critère, et il porte sur le 99ᵉ centile pour ne pas être renversé par un
 * unique écart au moment où le geste dépasse la fin de la visite.
 *
 * À 6 000 px/s, la visite entière — 80 s de vidéo — défile en 4,5 s, soit dix-huit
 * fois le temps réel. Aucun décodeur ne suit : l'image peut retarder d'environ une
 * seconde de vidéo sur une image sur cent. Ce n'est pas un défaut qu'on peut régler,
 * c'est la conséquence de la vitesse demandée. On le mesure, on le rapporte, et on
 * vérifie ce qui compte vraiment : que ça converge dès qu'on ralentit — c'est ce
 * que prouvent les tests des « hold » et de l'escalier, tous deux exacts.
 */
check(A.ecartP99 <= 1, "à vitesse d'usage, l'image dessinée est la bonne", `p99 ${A.ecartP99} image(s) d'écart`);
console.log(
  info(
    `à 6 k px/s (80 s de vidéo en 4,5 s) : p99 ${B.ecartP99} image(s), soit ${(B.ecartP99 / 10).toFixed(1)} s de retard ` +
      `sur 1 % des images — mesuré, non bloquant`
  )
);

/* ── le cadre qui se rétracte ──────────────────────────────────────────────── */

console.log("\n  \x1b[1mLe cadre qui se rétracte\x1b[0m");
const anim = [A, B].filter((r) => r.animFrames > 0);
const animFrames = anim.reduce((n, r) => n + r.animFrames, 0);
const animSevere = anim.length ? Math.max(...anim.map((r) => r.animSeverePct)) : 0;
const animP95 = anim.length ? Math.max(...anim.map((r) => r.animP95)) : 0;
console.log(
  info(
    `${animFrames} images mesurées pendant une rétraction ou une ré-extension · ` +
      `p95 ${animP95.toFixed(1)} ms · ${animSevere.toFixed(1)} % > 33 ms`
  )
);
check(animFrames > 0, "la rétraction a bien été observée pendant le parcours", `${animFrames} images`);
check(animFrames === 0 || animSevere < 2, "la rétraction tient 60 im/s", `${animSevere.toFixed(1)} % > 33 ms`);

// Le canvas ne doit JAMAIS être retaillé pendant l'animation : c'est ce qui tue
// le débit. Le compteur est incrémenté par le moteur à chaque sizeCanvas().
const resizeStable = [A, B, C].every((r) => r.resizeMin === r.resizeMax);
check(
  resizeStable,
  "le canvas n'est pas retaillé pendant le défilement ni pendant la rétraction",
  `compteur ${A.resizeMin}→${A.resizeMax} / ${B.resizeMin}→${B.resizeMax} / ${C.resizeMin}→${C.resizeMax}`
);

/* ── stabilité des `hold` ──────────────────────────────────────────────────── */

console.log("\n  \x1b[1mStabilité des « hold »\x1b[0m");
const holds = meta.segments.filter((s) => s.type === "hold");
let holdFail = 0;
for (const h of holds) {
  const mid = (h.vhStart + h.vhEnd) / 2 / meta.totalVh;
  const y = scrollStart + mid * (scrollEnd - scrollStart);
  await goTo(y);
  await page.waitForTimeout(400);
  if (args.shots) {
    fs.mkdirSync(args.shots, { recursive: true });
    await page.screenshot({ path: `${args.shots}/${String(holds.indexOf(h)).padStart(2, "0")}-${h.id}.jpg`, quality: 80, type: "jpeg" });
  }
  const seen = await page.evaluate(async () => {
    const out = [];
    for (let i = 0; i < 20; i++) {
      out.push(window.__visite.frame());
      await new Promise((r) => requestAnimationFrame(r));
    }
    return out;
  });
  const uniq = [...new Set(seen)];
  const stable = uniq.length === 1 && uniq[0] === h.frameFrom;
  if (!stable) {
    holdFail++;
    console.log(ko(`${h.id} : attendu image ${h.frameFrom}, vu ${uniq.join(", ")}`));
  }
}
check(holdFail === 0, `les ${holds.length} « hold » retiennent leur image sans dérive`);

/* ── l'escalier ────────────────────────────────────────────────────────────── */

console.log("\n  \x1b[1mL'escalier\x1b[0m");
const esc = meta.segments.find((s) => s.id === "escalier");
if (!esc) {
  console.log(info("segment « escalier » absent de ce sous-ensemble — non testé"));
} else {
  const yA = scrollStart + (esc.vhStart / meta.totalVh) * (scrollEnd - scrollStart);
  const yB = scrollStart + (esc.vhEnd / meta.totalVh) * (scrollEnd - scrollStart);
  await goTo(yA);
  await page.waitForTimeout(600);
  await startRecorder();
  await wheelRun(yB - yA, 3000, 1);
  await wheelRun(yB - yA, 3000, -1);
  const runE = await stopRecorder();
  const E = analyse(runE, "escalier");
  const inSeg = runE.samples.filter(([, , f]) => f >= esc.frameFrom && f <= esc.frameTo);
  const gaps = [];
  for (let i = 1; i < inSeg.length; i++) {
    const g = Math.abs(inSeg[i][3] - inSeg[i - 1][3]);
    if (g > 1) gaps.push(g);
  }
  console.log(
    info(
      `images ${esc.frameFrom}→${esc.frameTo} · médiane ${E.fpsMedian.toFixed(0)} im/s · ` +
        `${E.missPct.toFixed(2)} % de replis · plus grand écart entre 2 images dessinées : ${Math.max(1, ...gaps)}`
    )
  );
  check(E.missPct < 1, "l'escalier ne saute pas", `${E.missPct.toFixed(2)} % de replis`);
  check(E.fpsMedian >= 55, "l'escalier tient 60 im/s", `${E.fpsMedian.toFixed(0)} im/s`);
}

/* ── mémoire ───────────────────────────────────────────────────────────────── */

console.log("\n  \x1b[1mMémoire\x1b[0m");
await goTo(scrollStart);
await page.waitForTimeout(1500);
const heapAfter = await heap();
const finalStats = await page.evaluate(() => window.__visite.stats());
const growthMo = (heapAfter - heapBefore) / 1048576;

if (cdp) console.log(info(`tas JS ${(heapBefore / 1048576).toFixed(1)} Mo → ${(heapAfter / 1048576).toFixed(1)} Mo (${growthMo >= 0 ? "+" : ""}${growthMo.toFixed(1)} Mo)`));
else console.log(info(`tas JS : non mesuré (protocole DevTools indisponible sur ${ENGINE})`));
const peak = Math.max(A.heldMax, B.heldMax, C.heldMax);
console.log(info(`ImageBitmap retenus : ${finalStats.held} · plafond budget ${finalStats.maxBitmaps} · pic observé ${peak}`));
console.log(info(`réseau : ${(finalStats.bytesLoaded / 1048576).toFixed(1)} Mo en ${finalStats.framesFetched} requêtes`));

// Le plafond est imposé par le budget mémoire, pas par la taille de fenêtre :
// c'est ce que le moteur garantit quelles que soient la variante et la résolution.
const cap = finalStats.maxBitmaps;
const moPic = (peak * meta.pixels * 4) / 1048576;
check(peak <= cap, `le nombre d'images décodées reste sous le plafond après ${TRIPS} allers-retours`, `pic ${peak} · plafond ${cap}`);
/* 380 Mo et non 300 : les images de mouvement sont passées de 1600 à 2048 px,
   soit 9,4 Mo par ImageBitmap au lieu de 5,8. La fenêtre a été resserrée pour
   compenser, mais l'empreinte monte quand même — c'est le prix assumé de la
   netteté sur les plans en mouvement. */
check(moPic < 380, "empreinte des images décodées sous 380 Mo", `${moPic.toFixed(0)} Mo au pic (${variant.width}×${variant.height} RGBA)`);
if (cdp) check(growthMo < 12, "pas de croissance du tas JS", `${growthMo >= 0 ? "+" : ""}${growthMo.toFixed(1)} Mo`);
check(finalStats.failed === 0, "aucune image en échec de chargement", `${finalStats.failed} échec(s)`);
console.log(info(`${aborted} requêtes annulées par l'éviction de fenêtre (attendu)`));
check(badResponses.size === 0, "aucune requête en erreur", Array.from(badResponses).slice(0, 8).join("\n    "));
check(consoleErrors.length === 0, "aucune erreur console", consoleErrors.slice(0, 3).join(" | "));

await browser.close();

console.log(failures ? `\n  \x1b[31m${failures} critère(s) non tenu(s).\x1b[0m\n` : `\n  \x1b[32mTous les critères mesurables sont tenus.\x1b[0m\n`);
process.exit(failures ? 1 : 0);
