/**
 * Les volumes déclarés de la maison : lecture, provenance, garde-fous.
 *
 * Séparé de `mobilier.ts`, qui construit la géométrie : ce module-ci ne touche
 * pas à three.js, et peut donc être importé par l'interface — le bandeau
 * d'honnêteté en a besoin, il ne doit pas faire venir 600 Ko de moteur 3D dans
 * le premier chargement de la page.
 *
 * ── Le contrat de provenance ───────────────────────────────────────────────
 * Chaque volume porte `source` : `mesure` (relevé au ruban sur place) ou
 * `estime` (déduit du panorama et de dimensions standards documentées). La
 * distinction n'est pas décorative — elle décide de ce que le visualiseur a le
 * droit d'affirmer. Tant qu'un seul volume est estimé, le bandeau le dit.
 *
 * Elle est aussi bornée par plus haut : l'échelle du plan est elle-même
 * estimée (maison-01-plan.ts). Un objet mesuré au ruban posé dans un plan sans
 * échelle reste approximatif — d'où les mesures 1 et 2 en tête de
 * analyse/mesures-a-prendre.md, qui conditionnent toutes les autres.
 */

import { ESPACES } from "@/data/tours/maison-01-plan";
import brut from "@/content/proprietes/maison-panoramique/mobilier.json";

export type Provenance = "mesure" | "estime";

export type Volume = {
  type: string;
  /** [x, y, z] en mètres, repère local de la pièce (coin nord-ouest). */
  pos: readonly [number, number, number];
  /** Degrés, sens horaire vu du dessus. */
  rot: number;
  /** [longueur, profondeur, hauteur] en mètres, avant rotation. */
  dim: readonly [number, number, number];
  source: Provenance;
  /** Escalier seulement : nombre de contremarches. */
  marches?: number;
};

/** Le JSON, débarrassé de son bloc de documentation (`_doc`). */
function parEspace(): Record<string, Volume[]> {
  const source = brut as Record<string, unknown>;
  const out: Record<string, Volume[]> = {};
  for (const cle of Object.keys(source)) {
    if (cle.startsWith("_")) continue;
    const liste = source[cle];
    if (Array.isArray(liste)) out[cle] = liste as Volume[];
  }
  return out;
}

const PAR_ESPACE = parEspace();

export const volumesDe = (espaceId: string): Volume[] => PAR_ESPACE[espaceId] ?? [];

/** Tous les volumes déclarés, à plat. */
export function tousLesVolumes(): { espaceId: string; volume: Volume }[] {
  const out: { espaceId: string; volume: Volume }[] = [];
  for (const espaceId of Object.keys(PAR_ESPACE))
    for (const volume of PAR_ESPACE[espaceId]) out.push({ espaceId, volume });
  return out;
}

/**
 * Le bandeau d'honnêteté du visualiseur.
 *
 * Il COMPTE au lieu d'affirmer : le jour où les relevés entrent dans le JSON,
 * la phrase change d'elle-même. Elle ne peut donc mentir ni dans un sens ni
 * dans l'autre — c'était la condition posée.
 */
export function mention(): string {
  const tous = tousLesVolumes();
  const mesures = tous.filter((v) => v.volume.source === "mesure").length;
  if (!tous.length) return "Schéma d'orientation — aucun volume relevé";
  if (mesures === tous.length)
    return `Volumes relevés au ruban — ${mesures} éléments, plan schématique`;
  if (mesures === 0)
    return `Maquette — ${tous.length} volumes estimés d'après les panoramas, aucune mesure`;
  return `Maquette — ${mesures} volumes mesurés sur ${tous.length}, le reste estimé`;
}

/* ── Garde-fou de build ─────────────────────────────────────────────────────
   Même contrat que validateTour() et validerPlan() : une clé qui ne désigne
   aucun espace, ou un volume posé dans une pièce jamais photographiée, casse
   `next build` plutôt que d'apparaître en silence dans la cartographie. */
export function validerMobilier(): void {
  const ids = ESPACES.map((e) => e.id);
  for (const espaceId of Object.keys(PAR_ESPACE)) {
    if (!ids.includes(espaceId))
      throw new Error(`[mobilier maison-01] espace inconnu : ${espaceId}`);
    const espace = ESPACES.find((e) => e.id === espaceId)!;
    if (!espace.noeuds.length)
      throw new Error(
        `[mobilier maison-01] « ${espaceId} » n'a aucun panorama : on ne déclare pas de volume dans une pièce qu'on n'a pas vue`
      );
    for (const v of PAR_ESPACE[espaceId]) {
      if (v.source !== "mesure" && v.source !== "estime")
        throw new Error(
          `[mobilier maison-01] provenance invalide sur ${espaceId}/${v.type}`
        );
      if (v.dim.some((d) => !(d > 0)))
        throw new Error(`[mobilier maison-01] dimension nulle sur ${espaceId}/${v.type}`);
      if (v.type === "escalier" && !(v.marches && v.marches >= 2))
        throw new Error(`[mobilier maison-01] escalier sans marches : ${espaceId}`);
    }
  }
}
