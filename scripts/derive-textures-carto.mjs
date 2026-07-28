/**
 * Dérive les textures de la cartographie à partir des panoramas de la visite.
 *
 * La cartographie projette les panoramas 360 sur la géométrie (voir
 * lib/maison3d/projection.ts). Elle n'a pas besoin des 4096×2048 de la visite :
 * une surface vue de loin, sous un angle rasant, ne rend pas ce détail. On
 * dérive donc une variante 1024×512.
 *
 *   17 × 4096×2048 en mémoire GPU  =  ~570 Mo   → intenable sur mobile
 *   17 × 1024×512                  =   ~36 Mo   → tenable
 *
 * Le bandeau de nadir des panoramas (le masque du trépied, composé par
 * scripts/optimize-panos.mjs) se projetterait en disque sombre au pied de
 * chaque point de vue. On le remplace par la couleur moyenne de la bande de
 * plancher juste au-dessus : le sol reste continu, et rien n'est inventé —
 * c'est la teinte réelle du plancher de cette pièce.
 *
 *   node scripts/derive-textures-carto.mjs [--force]
 */
import sharp from "sharp";
import { readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const SRC = "public/tour/maison-01";
const LARGEUR = 1024;
const HAUTEUR = 512;
const QUALITE = 74;
/** Fraction basse de l'image occupée par le masque de nadir. */
const NADIR = 0.14;
/** Bande juste au-dessus du nadir, dont on prend la couleur moyenne. */
const REFERENCE = 0.06;

const force = process.argv.includes("--force");

const octets = (n) => `${(n / 1024).toFixed(0)} Ko`;

async function derive(base) {
  const entree = path.join(SRC, `${base}-pano.webp`);
  const sortie = path.join(SRC, `${base}-carto.webp`);

  if (!force && existsSync(sortie)) {
    const [a, b] = await Promise.all([stat(entree), stat(sortie)]);
    if (b.mtimeMs >= a.mtimeMs) {
      console.log(`  = ${base} (à jour)`);
      return 0;
    }
  }

  const reduite = await sharp(entree)
    .resize(LARGEUR, HAUTEUR, { fit: "fill", kernel: "lanczos3" })
    .toColorspace("srgb")
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = reduite;
  const canaux = info.channels;
  const hNadir = Math.round(HAUTEUR * NADIR);
  const yDebut = HAUTEUR - hNadir;
  const hRef = Math.round(HAUTEUR * REFERENCE);

  /* Couleur moyenne de la bande de plancher qui précède le masque. */
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let y = yDebut - hRef; y < yDebut; y++) {
    for (let x = 0; x < LARGEUR; x++) {
      const i = (y * LARGEUR + x) * canaux;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n++;
    }
  }
  r = Math.round(r / n);
  g = Math.round(g / n);
  b = Math.round(b / n);

  /* Fondu du plancher réel vers cette moyenne sur toute la zone du masque :
     pas de disque noir, pas de couture franche. */
  for (let y = yDebut; y < HAUTEUR; y++) {
    const t = (y - yDebut) / hNadir;
    const k = Math.min(1, t * 1.6);
    for (let x = 0; x < LARGEUR; x++) {
      const i = (y * LARGEUR + x) * canaux;
      data[i] = Math.round(data[i] * (1 - k) + r * k);
      data[i + 1] = Math.round(data[i + 1] * (1 - k) + g * k);
      data[i + 2] = Math.round(data[i + 2] * (1 - k) + b * k);
    }
  }

  const info2 = await sharp(data, {
    raw: { width: LARGEUR, height: HAUTEUR, channels: canaux },
  })
    .webp({ quality: QUALITE })
    .toFile(sortie);

  console.log(
    `  ✓ ${base.padEnd(22)} ${LARGEUR}×${HAUTEUR}  ${octets(info2.size).padStart(8)}  plancher rgb(${r},${g},${b})`
  );
  return info2.size;
}

const fichiers = await readdir(SRC);
const bases = [
  ...new Set(
    fichiers.filter((f) => f.endsWith("-pano.webp")).map((f) => f.replace("-pano.webp", ""))
  ),
].sort();

console.log(`Dérivation des textures de cartographie — ${bases.length} panoramas\n`);
let total = 0;
for (const b of bases) total += await derive(b);
console.log(`\nTotal ajouté : ${(total / 1024 / 1024).toFixed(2)} Mo`);
