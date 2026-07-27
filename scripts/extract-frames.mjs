#!/usr/bin/env node
/**
 * extract-frames.mjs — vidéo source → séquence d'images + images d'arrêt + manifest.
 *
 *   npm run extract -- --slug=5-et-demi-deux-niveaux
 *   npm run extract -- --slug=<nom> --dry-run
 *   npm run extract -- --slug=<nom> --repair=off        (rapide, pour itérer)
 *
 * Lit  : content/proprietes/<slug>/runs.json      (source, réparation, traitements de vie privée)
 *        content/proprietes/<slug>/chapters.json  (ancré sur des timecodes SOURCE)
 * Écrit: public/frames/<slug>/desktop/%04d.webp   séquence de mouvement, 1600 px
 *        public/frames/<slug>/mobile/%04d.webp    séquence de mouvement, 828 px
 *        public/frames/<slug>/arrets/<id>.webp    images d'arrêt, 2200 px quasi sans perte
 *        public/frames/<slug>/manifest.json
 * Cache: .cache/visite/<slug>/repare-<hash>.mp4   vidéo réparée (longue à produire, réutilisée)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * AUCUNE COUPE
 *
 * runs.json ne contient qu'un seul run couvrant toute la source. Chaque seconde
 * de vidéo est atteignable au scroll. Le rythme vient de la distance de scroll
 * par seconde de vidéo (chapters.json), pas du ciseau.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DEUX QUALITÉS
 *
 *   mouvement  1600 px q68  — ces images défilent, personne ne les fixe
 *   arrêt      2200 px q88  — c'est l'image que l'acheteur regarde dix secondes
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CHOIX DE L'IMAGE D'ARRÊT — et l'écart assumé avec la consigne
 *
 * La consigne : « cherche la plus nette dans une fenêtre de ±0,8 s, à la cadence
 * source (~96 candidates) ». Fait, avec une restriction délibérée : les
 * candidates sont les images de la SÉQUENCE (grille 10 im/s, 17 candidates sur
 * ±0,8 s), pas les 96 images de la source.
 *
 * Pourquoi : un arrêt affiche l'image sur laquelle le scrub s'est immobilisé.
 * Si l'image d'arrêt était prise entre deux images de la séquence, elle ne
 * correspondrait à aucun index atteignable — l'entrée dans l'arrêt sauterait.
 * La continuité du scrub est un critère d'acceptation ; la sous-grille non.
 * 17 candidates sur 1,6 s suffisent largement à éviter une image filée.
 *
 * Le score est la variance du laplacien sur l'image en niveaux de gris (640×360).
 * Il est consigné dans le manifest. Un arrêt dont le score est sous le seuil est
 * SIGNALÉ, pas affiché en douce.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * OPTIONS
 *
 *   --slug=<nom>          obligatoire
 *   --fps=10              images par seconde de la séquence
 *   --variants=desktop,mobile
 *   --repair=defish,stab,deflicker,grade   (défaut) · --repair=off
 *   --force-repair        ignore le cache et refait la vidéo réparée
 *   --ffmpeg=<chemin>     si ffmpeg n'est pas dans le PATH
 *   --dry-run             affiche le plan et les commandes, n'écrit rien
 */

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/*
 * On se place à la racine du projet, et ce n'est pas cosmétique : le fichier de
 * transformations de vidstab est passé À L'INTÉRIEUR d'un filtre ffmpeg, où le
 * « : » de « C: » est le séparateur d'options. Sous Windows aucun échappement
 * ne passe proprement les deux niveaux d'analyse syntaxique. Un chemin relatif
 * n'a pas de deux-points — le problème disparaît.
 */
process.chdir(ROOT);

/* ── options ───────────────────────────────────────────────────────────────── */

/*
 * Résolution des images de MOUVEMENT.
 *
 * 1600 px au premier jet, sur l'idée que « personne ne les fixe ». Mesuré, c'est
 * faux : elles s'affichent PLEIN ÉCRAN. Sur un écran Retina en 1440 px CSS, le
 * canvas fait 2880 px de large — on agrandissait donc 1600 px de 1,8×, et ça se
 * voit. 2048 px ramène l'agrandissement à 1,4× et reste sous la résolution utile
 * de la source (le piqué réel de l'action-cam plafonne bien avant 3840).
 */
const VARIANTS = {
  /* q76 et non q80 : comparé à l'image, q72 et q80 sont indiscernables sur
     cette source — 67 Ko contre 92 Ko pour le même rendu. Le piqué manque, les
     bits supplémentaires ne codent que du bruit de compression. q76 garde une
     marge pour une source plus propre au re-tournage. */
  desktop: { width: 2048, quality: 76, budgetKo: 85 },
  mobile: { width: 1080, quality: 70, budgetKo: 30 },
};

/**
 * Images d'arrêt : c'est l'image qu'on regarde longtemps, elle paie sa place.
 *
 * Calée sur `repair.travailWidth` : à 2560 px l'image d'arrêt sort de la vidéo
 * de travail SANS AUCUN redimensionnement. C'est un rééchantillonnage de moins
 * dans la chaîne, gratuit.
 *
 * Le budget est large parce qu'elles ne se chargent pas comme la séquence : une
 * seule à la fois, à la demande, pendant que l'utilisateur lit le panneau.
 */
const ARRET = { width: 2560, quality: 92, budgetKo: 1500 };

/** Résolution d'analyse de netteté. Assez fine pour distinguer une image filée. */
const SCORE = { width: 640, height: 360 };

const REPAIR_ALL = ["defish", "stab", "deflicker", "grade"];

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = "true"] = a.replace(/^--/, "").split("=");
    return [k, v];
  })
);

const die = (msg) => {
  console.error(`\n  ✗ ${msg}\n`);
  process.exit(1);
};

if (!args.slug) die("--slug=<nom> est obligatoire.");

const slug = args.slug;
const dryRun = args["dry-run"] === "true";
const ffmpeg = args.ffmpeg || "ffmpeg";
const ffprobe = args.ffmpeg ? args.ffmpeg.replace(/ffmpeg(\.exe)?$/i, "ffprobe$1") : "ffprobe";

const variantNames = (args.variants || "desktop,mobile").split(",").map((s) => s.trim());
for (const v of variantNames)
  if (!VARIANTS[v]) die(`Variante inconnue : « ${v} ». Connues : ${Object.keys(VARIANTS).join(", ")}.`);

const repair =
  args.repair === "off"
    ? []
    : (args.repair ? args.repair.split(",").map((s) => s.trim()).filter(Boolean) : REPAIR_ALL);
for (const r of repair)
  if (!REPAIR_ALL.includes(r)) die(`--repair=${r} inconnu. Valeurs : ${REPAIR_ALL.join(", ")}, off.`);

/* ── entrées ───────────────────────────────────────────────────────────────── */

const contentDir = path.join(ROOT, "content", "proprietes", slug);
const readJson = (p, quoi) => {
  if (!fs.existsSync(p)) die(`${quoi} introuvable : ${path.relative(ROOT, p)}`);
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    die(`${quoi} illisible (${path.relative(ROOT, p)}) : ${e.message}`);
  }
};

const runsDoc = readJson(path.join(contentDir, "runs.json"), "runs.json");
const chaptersDoc = readJson(path.join(contentDir, "chapters.json"), "chapters.json");

const srcRel = runsDoc.source;
const src = path.join(ROOT, srcRel);
if (!fs.existsSync(src)) die(`Vidéo source introuvable : ${srcRel}`);

const fps = Number(args.fps ?? runsDoc.fps ?? 10);
if (!Number.isFinite(fps) || fps <= 0) die(`--fps invalide : ${args.fps}`);

if (runsDoc.runs.length !== 1)
  die(
    `runs.json contient ${runsDoc.runs.length} runs. Depuis le correctif « aucune coupe », il doit y en avoir\n` +
      `    exactement un, couvrant toute la source. Le rythme se fait dans chapters.json, pas ici.`
  );

const run = runsDoc.runs[0];
const srcDur = Number(runsDoc.sourceDuration);
if (run.in > 0.001 || run.out < srcDur - 0.05)
  die(
    `Le run « ${run.id} » couvre ${run.in}→${run.out}s alors que la source dure ${srcDur}s.\n` +
      `    « Aucune coupe » veut dire aucune : le run doit couvrir 0 → ${srcDur}s.`
  );

const traitements = (runsDoc.traitements || []).filter((t) => t.actif !== false && t.id !== "modele");

/* ── réparation : le graphe de filtres ─────────────────────────────────────── */

const R = runsDoc.repair || {};
const travailWidth = Number(R.travailWidth || 2560);

/** Chemin utilisable À L'INTÉRIEUR d'un filtre ffmpeg : relatif, sans deux-points. */
const ffPath = (p) => path.relative(ROOT, p).replace(/\\/g, "/");

/**
 * Traitements de vie privée : un flou (ou un relevage) local, activé sur une
 * fenêtre de temps.
 *
 * Appliqué APRÈS la réparation et APRÈS la réduction à `fps`, sur la vidéo de
 * travail. Deux raisons, et la première est décisive :
 *
 *  1. Sur la source à 59,94 im/s, le graphe tournait sur 4 812 images pour n'en
 *     concerner que 84 — mesuré à +0,23 s par image, soit dix-huit minutes de
 *     calcul jetées. Sur la vidéo réduite, c'est 803 images.
 *  2. Les zones sont alors mesurées sur les images qu'on livre réellement, et
 *     non sur une géométrie que le défishage et la stabilisation vont déformer.
 *
 * Les coordonnées de `traitements` sont donc des fractions de l'image DE
 * TRAVAIL (largeur `repair.travailWidth`), pas de la source.
 */
function privacyChain(inLabel, outLabel, W, H) {
  if (!traitements.length) return { parts: [`[${inLabel}]null[${outLabel}]`] };
  const parts = [];
  const outs = traitements.map((_, i) => `pz${i}`);
  parts.push(`[${inLabel}]split=${traitements.length + 1}[pbase]${outs.map((o) => `[${o}src]`).join("")}`);

  traitements.forEach((t, i) => {
    const [fx, fy, fw, fh] = t.zone;
    const w = Math.max(2, Math.round((fw * W) / 2) * 2);
    const h = Math.max(2, Math.round((fh * H) / 2) * 2);
    const x = Math.max(0, Math.min(W - w, Math.round(fx * W)));
    const y = Math.max(0, Math.min(H - h, Math.round(fy * H)));
    const fenetre = `enable='between(t\\,${t.t0}\\,${t.t1})'`;

    /*
     * `avgblur` et non `gblur`, et surtout pas de réduction/agrandissement.
     *
     * Un gblur à grand rayon coûte plusieurs secondes par image. La ruse
     * évidente — réduire au huitième, flouter, remonter — s'est retournée
     * contre nous : elle produisait une bande verte franche en haut de la zone,
     * un artefact de chroma dû au rééchantillonnage sur du yuv420p. Vérifié à
     * l'image.
     *
     * `avgblur` a un coût constant quel que soit le rayon (image intégrale), ne
     * rééchantillonne rien, et son rendu plus « plat » convient mieux ici : on
     * masque, on ne cherche pas un beau bokeh. `enable` évite en plus de le
     * calculer hors de la fenêtre de temps.
     */
    const flou = (force) => {
      const r = Math.max(2, Math.round(force / 2));
      return `avgblur=sizeX=${r}:sizeY=${r}:${fenetre}`;
    };

    const traitement =
      t.filtres ||
      (t.type === "eclaircir"
        ? `${flou(t.force ?? 30)},eq=brightness=0.10:contrast=0.88:${fenetre}`
        : t.type === "noircir"
        ? `${flou(t.force ?? 20)},eq=brightness=-0.10:${fenetre}`
        : flou(t.force ?? 40));
    parts.push(`[${outs[i]}src]crop=${w}:${h}:${x}:${y},${traitement}[${outs[i]}]`);
  });

  let cur = "pbase";
  traitements.forEach((t, i) => {
    const [fx, fy, fw, fh] = t.zone;
    const w = Math.max(2, Math.round((fw * W) / 2) * 2);
    const h = Math.max(2, Math.round((fh * H) / 2) * 2);
    const x = Math.max(0, Math.min(W - w, Math.round(fx * W)));
    const y = Math.max(0, Math.min(H - h, Math.round(fy * H)));
    const next = i === traitements.length - 1 ? outLabel : `po${i}`;
    parts.push(
      `[${cur}][${outs[i]}]overlay=x=${x}:y=${y}:enable='between(t\\,${t.t0}\\,${t.t1})'[${next}]`
    );
    cur = next;
  });
  return { parts };
}

/** Géométrie : defish puis réduction. Identique dans les deux passes vidstab. */
function geometryChain() {
  const f = [];
  if (repair.includes("defish") && R.defish)
    f.push(`lenscorrection=k1=${R.defish.k1}:k2=${R.defish.k2}:i=${R.defish.interpol || "bilinear"}`);
  f.push(`scale=${travailWidth}:-2:flags=lanczos`);
  return f.join(",");
}

function colourChain() {
  const f = [];
  if (repair.includes("deflicker") && R.deflicker)
    f.push(`deflicker=mode=${R.deflicker.mode}:size=${R.deflicker.size}`);
  if (repair.includes("grade") && R.grade) {
    if (R.grade.greyedge) f.push(`greyedge=${R.grade.greyedge}`);
    if (R.grade.eq) f.push(`eq=${R.grade.eq}`);
  }
  return f;
}

const stat = fs.statSync(src);
const hash = (o) => crypto.createHash("sha1").update(JSON.stringify(o)).digest("hex").slice(0, 10);

/*
 * Trois clés distinctes, et ce n'est pas de la coquetterie : chaque étape
 * coûteuse ne doit être refaite que si CE dont elle dépend a changé.
 *
 * L'analyse du bougé ne dépend que de la géométrie et des paramètres de
 * DÉTECTION. Elle a été relancée une fois pour rien parce que la clé
 * embarquait aussi `smoothing`, `optzoom` et `interpol`, qui n'appartiennent
 * qu'à la passe de transformation — douze minutes jetées pour un changement
 * d'interpolateur. La clé ne retient plus que ce que vidstabdetect lit.
 */
const detect = R.stab
  ? { shakiness: R.stab.shakiness, accuracy: R.stab.accuracy, stepsize: R.stab.stepsize, mincontrast: R.stab.mincontrast }
  : null;
const geometryKey = hash({ defish: repair.includes("defish") ? R.defish : null, travailWidth, detect, size: stat.size, mtime: stat.mtimeMs });
const repairKey = hash({ repair, R, travailWidth, fps, size: stat.size, mtime: stat.mtimeMs });
const priveKey = hash({ repairKey, traitements });

const cacheDir = path.join(ROOT, ".cache", "visite", slug);
const repairedPath = path.join(cacheDir, `repare-${repairKey}.mp4`);
const privePath = path.join(cacheDir, `prive-${priveKey}.mp4`);
const trfPath = path.join(cacheDir, `stab-${geometryKey}.trf`);

/* ── chapitres : timecode source → index d'image ───────────────────────────── */

/* +1 : le filtre `fps` émet une image à t=0 ET une à la dernière graduation. */
const predictedFrames = Math.floor(srcDur * fps) + 1;

function resolve(anchor, where) {
  if (!anchor || typeof anchor.t !== "number")
    die(`Ancre invalide dans ${where} : attendu { "t": 6.0 } (le champ "run" est facultatif, il n'y a plus qu'un run).`);
  if (anchor.t < -1e-6 || anchor.t > srcDur + 1e-6)
    die(`${where} : t=${anchor.t}s est hors de la source (0–${srcDur}s).`);
  return Math.max(0, Math.min(predictedFrames - 1, Math.round(anchor.t * fps)));
}

const warnings = [];
const chapters = [];

for (const ch of chaptersDoc.chapters) {
  if (ch.type === "hold") {
    chapters.push({ ...ch, frame: resolve(ch.at, `chapitre « ${ch.id} »`), tSource: ch.at.t, at: undefined });
    continue;
  }
  if (ch.type === "move") {
    const from = resolve(ch.from, `chapitre « ${ch.id} » (from)`);
    const to = resolve(ch.to, `chapitre « ${ch.id} » (to)`);
    if (to < from) die(`Chapitre « ${ch.id} » : l'image d'arrivée (${to}) précède celle de départ (${from}).`);
    chapters.push({
      ...ch,
      frames: [from, to],
      tSource: [ch.from.t, ch.to.t],
      from: undefined,
      to: undefined,
    });
    continue;
  }
  die(`Chapitre « ${ch.id} » : type inconnu « ${ch.type} ».`);
}

/* Rythme : scrollVh explicite, ou dérivé de vhParSeconde × durée du segment. */
const rythme = Number(chaptersDoc.rythmeGlobal ?? 1);
if (!Number.isFinite(rythme) || rythme <= 0) die(`rythmeGlobal invalide : ${chaptersDoc.rythmeGlobal}`);
for (const c of chapters) {
  if (typeof c.scrollVh !== "number") {
    if (c.type === "hold") die(`Chapitre « ${c.id} » : un arrêt exige "scrollVh".`);
    if (typeof c.vhParSeconde !== "number")
      die(`Chapitre « ${c.id} » : il faut "scrollVh" ou "vhParSeconde".`);
    c.scrollVh = (c.tSource[1] - c.tSource[0]) * c.vhParSeconde;
  }
  c.scrollVh = Math.max(20, Math.round(c.scrollVh * rythme));
}

/* Aucune coupe côté chapitrage non plus : la chaîne doit être continue de 0 à la fin. */
{
  let attendu = 0;
  for (const c of chapters) {
    const debut = c.type === "hold" ? c.frame : c.frames[0];
    const fin = c.type === "hold" ? c.frame : c.frames[1];
    if (debut !== attendu)
      die(
        `Trou dans le chapitrage avant « ${c.id} » : la séquence en est à l'image ${attendu}, ` +
          `le chapitre commence à ${debut}. Aucune coupe — les chapitres doivent se toucher.`
      );
    attendu = fin;
  }
  if (attendu < predictedFrames - 1)
    warnings.push(
      `Le chapitrage s'arrête à l'image ${attendu} sur ${predictedFrames - 1} : ` +
        `les ${((predictedFrames - 1 - attendu) / fps).toFixed(1)} dernières secondes ne sont pas atteignables.`
    );
}

const totalScrollVh = chapters.reduce((n, c) => n + (c.scrollVh || 0), 0);
const holds = chapters.filter((c) => c.type === "hold");

/* ── plan ──────────────────────────────────────────────────────────────────── */

const rel = (p) => path.relative(ROOT, p).replace(/\\/g, "/");
console.log(`\n  ${slug}`);
console.log(`  source      ${srcRel}  —  ${srcDur.toFixed(2)}s, aucune coupe`);
console.log(`  séquence    ~${predictedFrames} images à ${fps} im/s`);
console.log(`  réparation  ${repair.length ? repair.join(", ") : "off"}${repair.length ? `  (travail à ${travailWidth} px)` : ""}`);
console.log(`  vie privée  ${traitements.length} zone(s) traitée(s) image par image`);
console.log(`  chapitres   ${chapters.length} · ${holds.length} arrêts · ${totalScrollVh} vh de scroll`);
console.log("");

/* ── ffmpeg ────────────────────────────────────────────────────────────────── */

function repairPass1Args() {
  const a = ["-y", "-hide_banner", "-loglevel", "error", "-stats", "-i", src];
  const chain =
    geometryChain() +
    `,vidstabdetect=shakiness=${R.stab.shakiness}:accuracy=${R.stab.accuracy}` +
    `:stepsize=${R.stab.stepsize}:mincontrast=${R.stab.mincontrast}:result=${ffPath(trfPath)}`;
  a.push("-vf", chain, "-f", "null", "-");
  return a;
}

function repairPass2Args() {
  const chain = [geometryChain()];
  if (repair.includes("stab"))
    chain.push(
      `vidstabtransform=input=${ffPath(trfPath)}:smoothing=${R.stab.smoothing}` +
        `:maxshift=${R.stab.maxshift}:maxangle=${R.stab.maxangle}` +
        `:optzoom=${R.stab.optzoom}:interpol=${R.stab.interpol}`
    );
  /*
   * `fps` AVANT l'étalonnage, et c'est ce qui rend la chaîne tenable.
   * Mesuré sur 3 s de source : greyedge coûte 0,81 s par image. À 59,94 im/s
   * c'est 65 min ; sur les 803 images qu'on garde, 11 min. La stabilisation,
   * elle, a besoin de voir chaque image — elle reste avant.
   */
  chain.push(`fps=${fps}`, ...colourChain(), "format=yuv420p");
  return [
    "-y", "-hide_banner", "-loglevel", "error", "-stats",
    "-i", src,
    "-vf", chain.join(","),
    "-an", "-r", String(fps),
    /* crf 12 et non 15 : cette vidéo n'est pas livrée, elle est REDIMENSIONNÉE
       ensuite. Toute perte introduite ici se retrouve amplifiée dans les images
       finales. Le fichier grossit — il est en cache, hors dépôt. */
    "-c:v", "libx264", "-preset", "slow", "-crf", "12", "-pix_fmt", "yuv420p",
    repairedPath,
  ];
}

function privacyArgs(W, H) {
  const { parts } = privacyChain("0:v", "priv", W, H);
  parts.push(`[priv]format=yuv420p[vout]`);
  return [
    "-y", "-hide_banner", "-loglevel", "error", "-stats",
    "-i", repairedPath,
    "-filter_complex", parts.join(";"),
    "-map", "[vout]", "-an", "-r", String(fps),
    "-c:v", "libx264", "-preset", "slow", "-crf", "12", "-pix_fmt", "yuv420p",
    privePath,
  ];
}

function sequenceArgs(variant, outDir, input) {
  const { width, quality } = VARIANTS[variant];
  return [
    "-y", "-hide_banner", "-loglevel", "error", "-stats",
    "-i", input,
    "-vf", `fps=${fps},scale=${width}:-2:flags=lanczos,setsar=1`,
    "-fps_mode", "passthrough", "-an",
    "-c:v", "libwebp", "-quality", String(quality), "-compression_level", "6", "-preset", "picture",
    path.join(outDir, "%04d.webp"),
  ];
}

/** Une seule passe pour toutes les images d'arrêt, prises SUR la grille de la séquence. */
function arretsArgs(indices, outDir, input) {
  const sel = indices.map((i) => `eq(n\\,${i})`).join("+");
  return [
    "-y", "-hide_banner", "-loglevel", "error", "-stats",
    "-i", input,
    "-vf", `fps=${fps},select='${sel}',scale=${ARRET.width}:-2:flags=lanczos,setsar=1`,
    "-fps_mode", "passthrough", "-an",
    "-c:v", "libwebp", "-quality", String(ARRET.quality), "-compression_level", "6", "-preset", "picture",
    path.join(outDir, "a%04d.webp"),
  ];
}

/** Toute la séquence en niveaux de gris, pour mesurer la netteté image par image. */
function scoreArgs(input) {
  return [
    "-hide_banner", "-loglevel", "error",
    "-i", input,
    "-vf", `fps=${fps},scale=${SCORE.width}:${SCORE.height}:flags=area,format=gray`,
    "-f", "rawvideo", "-pix_fmt", "gray", "-",
  ];
}

if (dryRun) {
  const show = (label, a) =>
    console.log(`  [dry-run] ${label} :\n    ${ffmpeg} ${a.map((x) => (/[ ;,[\]']/.test(x) ? `"${x}"` : x)).join(" ")}\n`);
  if (repair.includes("stab")) show("réparation passe 1 (vidstabdetect)", repairPass1Args());
  if (repair.length) show("réparation passe 2", repairPass2Args());
  if (traitements.length) show("vie privée", privacyArgs(travailWidth, Math.round(travailWidth * 9 / 16)));
  for (const v of variantNames) show(`séquence ${v}`, sequenceArgs(v, path.join(ROOT, "public", "frames", slug, v), repair.length ? repairedPath : src));
  show("images d'arrêt", arretsArgs(holds.map((h) => h.frame).sort((a, b) => a - b), path.join(ROOT, "public", "frames", slug, "arrets"), repair.length ? repairedPath : src));
  process.exit(0);
}

try {
  execFileSync(ffmpeg, ["-version"], { stdio: "ignore" });
} catch {
  die(`ffmpeg introuvable. Installe-le, ou passe --ffmpeg=<chemin complet>.\n    Windows : winget install --id Gyan.FFmpeg -e`);
}

const t0 = Date.now();
const chrono = () => `${((Date.now() - t0) / 1000).toFixed(0)}s`;

/* ── étape 1 : vidéo réparée (mise en cache) ───────────────────────────────── */

let source = src;

if (repair.length) {
  fs.mkdirSync(cacheDir, { recursive: true });
  const cacheOk = fs.existsSync(repairedPath) && args["force-repair"] !== "true";

  if (cacheOk) {
    console.log(`  → réparation : cache réutilisé (${rel(repairedPath)})`);
  } else {
    if (repair.includes("stab")) {
      if (fs.existsSync(trfPath) && fs.statSync(trfPath).size > 0) {
        console.log(`  → réparation passe 1/2 — analyse du bougé déjà en cache`);
      } else {
        console.log(`  → réparation passe 1/2 — analyse du bougé (vidstabdetect)…`);
        execFileSync(ffmpeg, repairPass1Args(), { stdio: ["ignore", "inherit", "inherit"] });
      }
    }
    console.log(`  → réparation passe 2/2 — ${[...repair].join(" + ")}…`);
    execFileSync(ffmpeg, repairPass2Args(), { stdio: ["ignore", "inherit", "inherit"] });
    console.log(`    ${rel(repairedPath)}  (${(fs.statSync(repairedPath).size / 1048576).toFixed(0)} Mo, ${chrono()})`);
  }
  source = repairedPath;
} else {
  console.log(`  → réparation désactivée (--repair=off) : extraction directe de la source.`);
}

/* ── étape 1 bis : vie privée, sur la vidéo de travail (mise en cache) ─────── */

if (traitements.length) {
  const dim = JSON.parse(
    execFileSync(ffprobe, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "json", source], { encoding: "utf8" })
  ).streams[0];

  if (fs.existsSync(privePath) && args["force-repair"] !== "true") {
    console.log(`  → vie privée : cache réutilisé (${rel(privePath)})`);
  } else {
    console.log(`  → vie privée — ${traitements.length} zone(s) sur ${dim.width}×${dim.height}…`);
    for (const t of traitements)
      console.log(`      ${t.id.padEnd(18)} ${t.t0}→${t.t1}s   ${t.type}   ${t.zone.map((n) => n.toFixed(2)).join(" ")}`);
    fs.mkdirSync(cacheDir, { recursive: true });
    execFileSync(ffmpeg, privacyArgs(dim.width, dim.height), { stdio: ["ignore", "inherit", "inherit"] });
    console.log(`    ${rel(privePath)}  (${(fs.statSync(privePath).size / 1048576).toFixed(0)} Mo, ${chrono()})`);
  }
  source = privePath;
}

/* ── étape 2 : séquence de mouvement ───────────────────────────────────────── */

const framesRoot = path.join(ROOT, "public", "frames", slug);
const variants = {};

for (const v of variantNames) {
  const outDir = path.join(framesRoot, v);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`  → séquence ${v} (${VARIANTS[v].width} px, q${VARIANTS[v].quality})…`);
  execFileSync(ffmpeg, sequenceArgs(v, outDir, source), { stdio: ["ignore", "inherit", "inherit"] });

  const files = fs.readdirSync(outDir).filter((f) => f.endsWith(".webp")).sort();
  if (!files.length) die(`${v} : ffmpeg n'a produit aucune image.`);
  const sizes = files.map((f) => fs.statSync(path.join(outDir, f)).size);
  const bytes = sizes.reduce((a, b) => a + b, 0);
  const probe = JSON.parse(
    execFileSync(ffprobe, ["-v", "error", "-show_entries", "stream=width,height", "-of", "json", path.join(outDir, files[0])], { encoding: "utf8" })
  ).streams[0];

  variants[v] = {
    width: probe.width,
    height: probe.height,
    path: `/frames/${slug}/${v}`,
    frameCount: files.length,
    bytes,
    avgBytes: Math.round(bytes / files.length),
    maxBytes: Math.max(...sizes),
  };

  const avgKo = variants[v].avgBytes / 1024;
  console.log(
    `    ${files.length} images · ${probe.width}×${probe.height} · ${(bytes / 1048576).toFixed(1)} Mo · ` +
      `moy ${avgKo.toFixed(1)} Ko (budget ${VARIANTS[v].budgetKo} Ko)${avgKo > VARIANTS[v].budgetKo ? " ⚠ hors budget" : " ✓"}`
  );
  if (avgKo > VARIANTS[v].budgetKo)
    warnings.push(`${v} : ${avgKo.toFixed(1)} Ko/image en moyenne, budget ${VARIANTS[v].budgetKo} Ko.`);
}

const counts = [...new Set(Object.values(variants).map((v) => v.frameCount))];
if (counts.length > 1) die(`Les variantes n'ont pas le même nombre d'images (${counts.join(" vs ")}).`);
const frameCount = counts[0];

if (frameCount !== predictedFrames)
  warnings.push(
    `${frameCount} images produites, ${predictedFrames} prévues : les index de chapitres ont été calculés sur la prévision (écart ${frameCount - predictedFrames}).`
  );
for (const ch of chapters) {
  const bad = ch.type === "hold" ? ch.frame >= frameCount : ch.frames[1] >= frameCount;
  if (bad) die(`Chapitre « ${ch.id} » pointe au-delà de la dernière image (${frameCount - 1}).`);
}

/* ── étape 3 : netteté de chaque image de la séquence ──────────────────────── */

console.log(`  → mesure de netteté (variance du laplacien, ${SCORE.width}×${SCORE.height})…`);

const raw = execFileSync(ffmpeg, scoreArgs(source), {
  maxBuffer: 1024 * 1024 * 1024,
  encoding: "buffer",
  stdio: ["ignore", "pipe", "inherit"],
});
const px = SCORE.width * SCORE.height;
const nScored = Math.floor(raw.length / px);

/** Variance du laplacien 4-voisins. Une image filée a peu de hautes fréquences. */
function laplacianVariance(buf, off) {
  const { width: W, height: H } = SCORE;
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < H - 1; y++) {
    const r = off + y * W;
    for (let x = 1; x < W - 1; x++) {
      const i = r + x;
      const l = 4 * buf[i] - buf[i - 1] - buf[i + 1] - buf[i - W] - buf[i + W];
      sum += l;
      sumSq += l * l;
      n++;
    }
  }
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

const nettete = new Array(Math.min(nScored, frameCount));
for (let i = 0; i < nettete.length; i++) nettete[i] = laplacianVariance(raw, i * px);

const tries = [...nettete].sort((a, b) => a - b);
const pct = (p) => tries[Math.min(tries.length - 1, Math.floor((p / 100) * tries.length))];

/*
 * Seuil au 15ᵉ centile, et pas au 40ᵉ comme au premier jet. Raison mesurée :
 * la variance du laplacien mesure la QUANTITÉ DE DÉTAIL, pas la mise au point.
 * Un couloir aux murs blancs marque 96 en étant parfaitement net ; une terrasse
 * pleine de feuillage marque 2 272. Au 40ᵉ centile on signalait des pièces unies
 * comme « molles », ce qui est faux et fait perdre confiance dans l'alerte.
 * Au 15ᵉ, on ne signale plus que la vraie queue basse — les images filées.
 */
const seuil = Math.max(Number(runsDoc.seuilNettete ?? 0), pct(15));
console.log(
  `    ${nettete.length} images mesurées · médiane ${pct(50).toFixed(0)} · ` +
    `seuil d'alerte ${seuil.toFixed(0)} (15ᵉ centile)`
);

/* Choix de l'image d'arrêt : la plus nette dans ±0,8 s, SUR la grille de la séquence. */
const FENETRE = 0.8;

for (const h of holds) {
  /*
   * La fenêtre de recherche est bornée par les segments voisins. Déplacer un
   * arrêt raccourcit le `move` qui y mène et rallonge celui qui en part ; si on
   * le laissait sortir de son segment d'approche, ce dernier partirait à
   * reculons. Un chapitre d'approche court (0,6 s = 6 images) est donc plus
   * contraignant que la fenêtre de ±0,8 s, et c'est lui qui gagne.
   */
  const k = chapters.indexOf(h);
  const prev = chapters[k - 1];
  const next = chapters[k + 1];
  const planchier = prev && prev.type === "move" ? prev.frames[0] + 1 : 0;
  const plafond = next && next.type === "move" ? next.frames[1] - 1 : nettete.length - 1;

  /*
   * `fenetre` réglable par arrêt, et ce n'est pas un luxe. La mesure préfère
   * l'image la plus DÉTAILLÉE de la fenêtre, pas la mieux cadrée : au pied de
   * l'escalier, une fenêtre large fait gagner un plan du salon plein de meubles
   * et de reflets contre le plan de l'escalier lui-même. Resserrer la fenêtre,
   * c'est dire « c'est ce plan-là que je veux, trouve juste l'image la moins
   * filée dedans ».
   */
  const demi = Math.max(1, Math.round((h.fenetre ?? FENETRE) * fps));
  const a = Math.max(0, planchier, h.frame - demi);
  const b = Math.min(nettete.length - 1, plafond, h.frame + demi);
  let best = h.frame;
  let bestScore = nettete[h.frame] ?? 0;
  for (let i = a; i <= b; i++) if (nettete[i] > bestScore) { bestScore = nettete[i]; best = i; }

  const bride = a > h.frame - demi || b < h.frame + demi;
  h.nettete = {
    demande: h.frame,
    retenue: best,
    score: +bestScore.toFixed(1),
    scoreDemande: +(nettete[h.frame] ?? 0).toFixed(1),
    candidates: b - a + 1,
    fenetre: h.fenetre ?? FENETRE,
    fenetreBridee: bride,
    seuil: +seuil.toFixed(1),
    sousLeSeuil: bestScore < seuil,
  };
  if (bride && b - a + 1 < demi)
    warnings.push(
      `Arrêt « ${h.id} » : la recherche de netteté n'a eu que ${b - a + 1} candidates au lieu de ${2 * demi + 1}, ` +
        `bridée par la longueur des segments voisins. Rallonge son approche dans chapters.json pour lui laisser du choix.`
    );
  h.frame = best;
}

/* Déplacer un arrêt casse la continuité avec ses voisins : on la rétablit. */
for (let i = 0; i < chapters.length; i++) {
  const c = chapters[i];
  if (c.type !== "hold") continue;
  const prev = chapters[i - 1];
  const next = chapters[i + 1];
  if (prev && prev.type === "move") prev.frames[1] = c.frame;
  if (next && next.type === "move") next.frames[0] = c.frame;
}
for (const c of chapters)
  if (c.type === "move" && c.frames[1] < c.frames[0])
    die(
      `Chapitre « ${c.id} » : après recalage sur les images les plus nettes, il irait à reculons ` +
        `(${c.frames[0]} → ${c.frames[1]}). Les arrêts voisins sont trop rapprochés — écarte-les dans chapters.json.`
    );

const flous = holds.filter((h) => h.nettete.sousLeSeuil);
for (const h of flous)
  warnings.push(
    `Arrêt « ${h.id} » : la meilleure image de sa fenêtre marque ${h.nettete.score}, sous le seuil ${h.nettete.seuil}. ` +
      `Regarde-la : soit elle est filée et il faut un autre angle dans la même pièce, ` +
      `soit la pièce est simplement unie — la mesure compte le détail, elle ne sait pas faire la différence.`
  );

/* ── étape 4 : images d'arrêt en 2200 px ───────────────────────────────────── */

const arretsDir = path.join(framesRoot, "arrets");
fs.rmSync(arretsDir, { recursive: true, force: true });
fs.mkdirSync(arretsDir, { recursive: true });

/*
 * L'image d'accueil, c'est l'image 0 de la séquence — pas une photo à part.
 * C'est ce qui rend le raccord accueil → canvas exact par construction : quand
 * le canvas prend le relais il dessine exactement ce que le <img> affichait.
 */
const accueil = { id: "_accueil", frame: 0, nettete: null };
const ordre = [...holds, ...(holds.some((h) => h.frame === 0) ? [] : [accueil])].sort(
  (a, b) => a.frame - b.frame
);
console.log(`  → ${ordre.length} images d'arrêt (${ARRET.width} px, q${ARRET.quality})…`);
execFileSync(ffmpeg, arretsArgs(ordre.map((h) => h.frame), arretsDir, source), {
  stdio: ["ignore", "inherit", "inherit"],
});

const produits = fs.readdirSync(arretsDir).filter((f) => f.endsWith(".webp")).sort();
if (produits.length !== ordre.length)
  die(`${produits.length} images d'arrêt produites pour ${ordre.length} demandées.`);

const arrets = {};
for (let i = 0; i < ordre.length; i++) {
  const h = ordre[i];
  const from = path.join(arretsDir, produits[i]);
  const to = path.join(arretsDir, `${h.id}.webp`);
  fs.renameSync(from, to);
  const meta = await sharp(to).metadata();
  arrets[h.id] = {
    frame: h.frame,
    file: `/frames/${slug}/arrets/${h.id}.webp`,
    width: meta.width,
    height: meta.height,
    bytes: fs.statSync(to).size,
    nettete: h.nettete,
  };
}
const arretBytes = Object.values(arrets).reduce((n, a) => n + a.bytes, 0);
const arretMax = Math.max(...Object.values(arrets).map((a) => a.bytes));
console.log(
  `    ${ordre.length} images · ${(arretBytes / 1048576).toFixed(1)} Mo · max ${(arretMax / 1024).toFixed(0)} Ko` +
    `${arretMax / 1024 > ARRET.budgetKo ? " ⚠ hors budget" : " ✓"}`
);
if (arretMax / 1024 > ARRET.budgetKo)
  warnings.push(`Image d'arrêt la plus lourde : ${(arretMax / 1024).toFixed(0)} Ko (budget ${ARRET.budgetKo} Ko).`);

/* ── manifest ──────────────────────────────────────────────────────────────── */

const premier = chapters[0];
const preloadFrames = Math.max((premier.type === "hold" ? premier.frame : premier.frames[1]) + 1, 1);
if (variants.desktop && preloadFrames * variants.desktop.avgBytes > 1.5 * 1048576)
  warnings.push(
    `Premier chapitre : ${preloadFrames} images ≈ ${((preloadFrames * variants.desktop.avgBytes) / 1048576).toFixed(2)} Mo ` +
      `(budget 1,5 Mo). L'accueil doit rester affiché pendant la fin du chargement.`
  );

const manifest = {
  slug,
  generatedFrom: srcRel,
  generatedOn: new Date().toISOString().slice(0, 10),
  fps,
  frameCount,
  indexOffset: 1,
  pattern: "%04d.webp",
  aspect: +(variants[variantNames[0]].width / variants[variantNames[0]].height).toFixed(6),
  coupe: false,
  sourceDuration: srcDur,
  repair: repair.length ? repair : "off",
  traitements: traitements.map((t) => ({ id: t.id, t0: t.t0, t1: t.t1, type: t.type, raison: t.raison })),
  accueil: arrets["_accueil"] ?? arrets[ordre[0].id] ?? null,
  rythmeGlobal: rythme,
  nettete: {
    mesure: "variance du laplacien, niveaux de gris 640×360",
    fenetre: FENETRE,
    grille: "images de la séquence uniquement — une image hors grille casserait le scrub",
    mediane: +pct(50).toFixed(1),
    seuil: +seuil.toFixed(1),
    sousLeSeuil: flous.map((h) => h.id),
  },
  variants,
  arrets,
  chapters: chapters.map((c) =>
    Object.fromEntries(Object.entries(c).filter(([k, v]) => v !== undefined && !k.startsWith("_")))
  ),
  totalScrollVh,
  preloadFrames,
  warnings,
};

fs.writeFileSync(path.join(framesRoot, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

console.log(`\n  ✓ ${rel(path.join(framesRoot, "manifest.json"))}  (${chrono()})`);
console.log(`    ${frameCount} images · ${chapters.length} chapitres · ${ordre.length} arrêts · ${totalScrollVh} vh`);
if (warnings.length) {
  console.log("\n  Avertissements :");
  warnings.forEach((w) => console.log(`    ! ${w}`));
}
console.log("");
