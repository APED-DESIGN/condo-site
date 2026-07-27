import type { Chapter, Manifest } from "./types";

/**
 * La timeline : une fonction par morceaux qui transforme la progression globale
 * du scroll (0 → 1) en index d'image.
 *
 * Les segments `move` interpolent entre deux images ; les segments `hold`
 * retiennent une image fixe pendant que le panneau de texte s'anime. C'est ça,
 * la pause qui explique la pièce.
 */

export interface Segment {
  index: number;
  id: string;
  type: "hold" | "move";
  /** Bornes du segment sur l'axe de scroll, en vh cumulés. */
  vhStart: number;
  vhEnd: number;
  frameFrom: number;
  frameTo: number;
  ease: "linear" | "decelerate";
  chapter: Chapter;
}

export interface Timeline {
  segments: Segment[];
  totalVh: number;
  frameCount: number;
  /** Progression globale (0 → 1) → index d'image. */
  frameAt(progress: number): number;
  /** Progression globale (0 → 1) → segment courant. */
  segmentAt(progress: number): Segment;
  /** Progression globale au début d'un segment — pour la navigation clavier. */
  progressAtSegment(i: number): number;
}

export function buildTimeline(manifest: Manifest): Timeline {
  const segments: Segment[] = [];
  let vh = 0;

  for (const ch of manifest.chapters) {
    const frameFrom = ch.type === "hold" ? ch.frame : ch.frames[0];
    const frameTo = ch.type === "hold" ? ch.frame : ch.frames[1];
    segments.push({
      index: segments.length,
      id: ch.id,
      type: ch.type,
      vhStart: vh,
      vhEnd: vh + ch.scrollVh,
      frameFrom,
      frameTo,
      ease: ch.type === "move" ? ch.ease ?? "linear" : "linear",
      chapter: ch,
    });
    vh += ch.scrollVh;
  }

  if (!segments.length)
    throw new Error(
      `Manifest « ${manifest.slug} » : aucun chapitre scrollable. ` +
        `Vérifie que les runs référencés par chapters.json ont bien été extraits.`
    );

  const totalVh = vh;

  /** Décélération à l'approche : la caméra dévore ses images tôt et ralentit en arrivant. */
  const decelerate = (t: number) => 1 - (1 - t) * (1 - t);

  function segmentIndexAt(progress: number): number {
    const target = clamp(progress, 0, 1) * totalVh;
    // Recherche dichotomique — la timeline complète fera ~24 segments, mais
    // cette fonction tourne à chaque image.
    let lo = 0;
    let hi = segments.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (target >= segments[mid].vhEnd) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  function frameAt(progress: number): number {
    const s = segments[segmentIndexAt(progress)];
    if (!s) return 0;
    if (s.type === "hold") return s.frameFrom;
    const span = s.vhEnd - s.vhStart;
    const local = span > 0 ? clamp((clamp(progress, 0, 1) * totalVh - s.vhStart) / span, 0, 1) : 1;
    const eased = s.ease === "decelerate" ? decelerate(local) : local;
    return clamp(Math.round(s.frameFrom + (s.frameTo - s.frameFrom) * eased), 0, manifest.frameCount - 1);
  }

  return {
    segments,
    totalVh,
    frameCount: manifest.frameCount,
    frameAt,
    segmentAt: (p) => segments[segmentIndexAt(p)],
    progressAtSegment: (i) => (totalVh > 0 ? clamp(segments[clamp(i, 0, segments.length - 1)].vhStart / totalVh, 0, 1) : 0),
  };
}

function clamp(n: number, min: number, max: number) {
  return n < min ? min : n > max ? max : n;
}
