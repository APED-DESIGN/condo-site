#!/usr/bin/env node
/**
 * Captures des trois pages, en bureau et en mobile.
 *
 * Sert à vérifier d'un coup d'œil ce qu'un prospect voit : le choix est-il
 * évident, les deux cartes ont-elles le même poids, l'en-tête est-il le même
 * partout, et les liens croisés sont-ils là.
 */
import fs from "node:fs";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3100";
const DIR = process.argv[3] ?? "analyse/site";
fs.mkdirSync(DIR, { recursive: true });

const VUES = [
  { nom: "bureau", viewport: { width: 1440, height: 900 } },
  { nom: "mobile", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
];

const PAGES = [
  { url: "/", cles: ["#choix"], croise: null },
  { url: "/maison", cles: [], croise: "/appartement" },
  { url: "/appartement", cles: [], croise: "/maison" },
];

const b = await chromium.launch();
const erreurs = [];

for (const vue of VUES) {
  const p = await b.newPage(vue);
  p.on("console", (m) => m.type() === "error" && erreurs.push(`${vue.nom} ${m.text()}`));
  p.on("response", (r) => r.status() >= 400 && erreurs.push(`${vue.nom} ${r.status()} ${r.url()}`));

  for (const page of PAGES) {
    await p.goto(BASE + page.url, { waitUntil: "networkidle" });
    // Le préambule dure 2,1 s puis se retire en 0,9 s : sans cette attente on
    // capture le rideau, pas la page.
    await p.waitForTimeout(4200);
    const nom = page.url === "/" ? "accueil" : page.url.slice(1);
    await p.screenshot({ path: `${DIR}/${vue.nom}-${nom}-haut.jpg`, quality: 82, type: "jpeg" });

    for (const sel of page.cles) {
      const el = await p.$(sel);
      if (!el) continue;
      await el.scrollIntoViewIfNeeded();
      await p.waitForTimeout(900);
      await p.screenshot({ path: `${DIR}/${vue.nom}-${nom}${sel.replace("#", "-")}.jpg`, quality: 82, type: "jpeg" });
    }

    /* Le renvoi vers l'autre approche doit exister et être visible : sans lui,
       un prospect ne regarde qu'une seule des deux et ferme l'onglet. */
    if (page.croise) {
      const lien = await p.$(`a[href="${page.croise}"]:not(header a)`);
      if (!lien) erreurs.push(`${vue.nom} ${page.url} : renvoi vers ${page.croise} absent`);
      else {
        await lien.scrollIntoViewIfNeeded();
        await p.waitForTimeout(900);
        await p.screenshot({ path: `${DIR}/${vue.nom}-${nom}-renvoi.jpg`, quality: 82, type: "jpeg" });
      }
    }
  }
  await p.close();
}

/* Liens : aucun ne doit pointer vers une page qui n'existe plus. */
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const morts = [];
for (const page of PAGES) {
  await p.goto(BASE + page.url, { waitUntil: "networkidle" });
  const hrefs = await p.$$eval("a[href]", (as) =>
    Array.from(new Set(as.map((a) => a.getAttribute("href")).filter(Boolean)))
  );
  for (const h of hrefs) {
    if (!h.startsWith("/") || h.startsWith("//")) continue;
    const url = new URL(h, BASE);
    const r = await p.request.get(url.href);
    if (r.status() >= 400) morts.push(`${page.url} → ${h} (${r.status()})`);
  }
}
await b.close();

console.log(`\n  captures dans ${DIR}`);
console.log(morts.length ? `  ✗ liens morts :\n    ${morts.join("\n    ")}` : "  ✓ aucun lien mort");
console.log(erreurs.length ? `  ✗ erreurs :\n    ${erreurs.slice(0, 8).join("\n    ")}` : "  ✓ aucune erreur console ni requête en échec");
process.exit(morts.length || erreurs.length ? 1 : 0);
