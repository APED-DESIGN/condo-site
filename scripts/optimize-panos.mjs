/**
 * Pipeline d'optimisation des panoramas 360° (à exécuter une seule fois).
 *
 *   node scripts/optimize-panos.mjs
 *
 * Source : /Users/allenproulx/condos/photo2 (JPEG 8K équirectangulaires, hors repo).
 * Sorties par panorama dans public/tour/maison-01/ :
 *   NN-piece-hd.webp      6144×3072  q80   — desktop / plein écran
 *   NN-piece-pano.webp    4096×2048  q78   — défaut / mobile
 *   NN-piece-preview.jpg   512×256   q60   — placeholder flou instantané
 *   NN-piece-thumb.webp    480×240   q70   — galerie + mini-plan
 * Le nadir (bâton du trépied) est masqué par un bandeau « ink » fondu,
 * appliqué sur le master avant les redimensionnements.
 */
import sharp from "sharp";
import { mkdirSync, readdirSync, statSync } from "fs";
import { join } from "path";

const SRC = "/Users/allenproulx/condos/photo2";
const OUT = new URL("../public/tour/maison-01/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

/** Correspondance fichier source → nom sémantique (ordre de la visite). */
const PANOS = [
  ["IMG_20260724_163626_966.JPG", "01-facade"],
  ["IMG_20260724_163628_875.JPG", "02-porche"],
  ["IMG_20260724_162049_608.JPG", "03-entree"],
  ["IMG_20260724_162051_495.JPG", "04-hall"],
  ["IMG_20260724_162053_047.JPG", "05-salle-eau"],
  ["IMG_20260724_162054_551.JPG", "06-aire-ouverte"],
  ["IMG_20260724_162056_058.JPG", "07-cuisine"],
  ["IMG_20260724_162057_652.JPG", "08-salle-manger"],
  ["IMG_20260724_162059_218.JPG", "09-salon"],
  ["IMG_20260724_162100_666.JPG", "10-escalier"],
  ["IMG_20260724_162102_178.JPG", "11-palier"],
  ["IMG_20260724_162103_757.JPG", "12-sdb-principale"],
  ["IMG_20260724_162105_336.JPG", "13-mezzanine-fenetre"],
  ["IMG_20260724_162106_814.JPG", "14-corridor-etage"],
  ["IMG_20260724_162108_348.JPG", "15-chambre"],
  ["IMG_20260724_162111_718.JPG", "16-terrasse"],
  ["IMG_20260724_162110_033.JPG", "17-piscine"],
];

/* Bandeau nadir : fondu à partir de ~-73° de pitch, opaque sous ~-80°. */
const W = 7680;
const H = 3840;
const FADE_TOP = Math.round(H * 0.905); // début du dégradé
const SOLID_TOP = Math.round(H * 0.955); // zone pleinement opaque
const NADIR_SVG = Buffer.from(
  `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#1C1A17" stop-opacity="0"/>
        <stop offset="${((SOLID_TOP - FADE_TOP) / (H - FADE_TOP)).toFixed(3)}" stop-color="#1C1A17" stop-opacity="1"/>
        <stop offset="1" stop-color="#1C1A17" stop-opacity="1"/>
      </linearGradient>
    </defs>
    <rect x="0" y="${FADE_TOP}" width="${W}" height="${H - FADE_TOP}" fill="url(#g)"/>
  </svg>`
);

const kb = (p) => Math.round(statSync(p).size / 1024);

for (const [src, name] of PANOS) {
  const master = sharp(join(SRC, src)).composite([{ input: NADIR_SVG, top: 0, left: 0 }]);
  const masterBuf = await master.toBuffer();

  const hd = join(OUT, `${name}-hd.webp`);
  const std = join(OUT, `${name}-pano.webp`);
  const preview = join(OUT, `${name}-preview.jpg`);
  const thumb = join(OUT, `${name}-thumb.webp`);

  await sharp(masterBuf).resize(6144, 3072).webp({ quality: 73 }).toFile(hd);
  await sharp(masterBuf).resize(4096, 2048).webp({ quality: 78 }).toFile(std);
  await sharp(masterBuf).resize(512, 256).blur(1.2).jpeg({ quality: 60 }).toFile(preview);
  await sharp(masterBuf).resize(480, 240).webp({ quality: 70 }).toFile(thumb);

  console.log(
    `${name}: hd ${kb(hd)} Ko | pano ${kb(std)} Ko | preview ${kb(preview)} Ko | thumb ${kb(thumb)} Ko`
  );
}

const total = readdirSync(OUT)
  .filter((f) => f.endsWith("-pano.webp"))
  .reduce((s, f) => s + statSync(join(OUT, f)).size, 0);
console.log(`\nTotal des 17 panos "défaut" : ${(total / 1024 / 1024).toFixed(1)} Mo`);
