/**
 * Les volumes de la maison, en géométrie : mobilier fixe, mobilier mobile,
 * escalier. Leur déclaration et leur provenance vivent dans
 * lib/maison3d/mobilier-donnees.ts, qui n'importe pas three.js.
 *
 * ── Pourquoi des volumes ───────────────────────────────────────────────────
 * Un panorama projeté sur un plancher étale le divan et l'îlot en taches de
 * couleur. On reconnaît la matière, pas l'objet : rien n'occupe d'espace. Ce
 * module pose, par-dessus la projection, des primitives simples aux arêtes
 * arrondies — texturées par le même panorama que leur pièce, donc de la bonne
 * couleur, sans qu'on prétende avoir capté leur forme.
 *
 * ── Ce que ce n'est pas ────────────────────────────────────────────────────
 * Ce n'est pas de la reconstruction. Chaque boîte est une DÉCLARATION. Le
 * dessus du divan prendra la couleur du divan, son flanc celle du mur derrière.
 * Vu de loin ça lit juste ; de près, ça ne prétend rien.
 *
 * ── L'échelle ──────────────────────────────────────────────────────────────
 * Le JSON est en mètres, le plan en unités arbitraires. La conversion passe
 * par les DEUX facteurs de data/tours/maison-01-plan.ts — l'un vertical,
 * l'autre horizontal, tous deux estimés, et tous deux remplacés par une seule
 * mesure au ruban chacun.
 */

import * as THREE from "three";
import { uHaut, uPlan, type Espace, type Pt } from "@/data/tours/maison-01-plan";
import { volumesDe, type Provenance } from "./mobilier-donnees";
import { versMonde } from "./scene-repere";

export type { Provenance, Volume } from "./mobilier-donnees";
export { mention, tousLesVolumes, validerMobilier, volumesDe } from "./mobilier-donnees";

/** Coin nord-ouest du contour d'un espace, en unités de plan. */
function coinNO(contour: readonly Pt[]): Pt {
  return [
    Math.min(...contour.map((p) => p[0])),
    Math.min(...contour.map((p) => p[1])),
  ];
}

/**
 * Boîte aux arêtes arrondies.
 *
 * On extrude un rectangle à coins arrondis en biseautant les deux faces : ça
 * suffit à ce que l'objet accroche la lumière sur ses arêtes et se détache du
 * plancher, sans coûter le prix d'un vrai maillage. `ExtrudeGeometry` pousse
 * le long de +z, d'où la rotation qui remet la hauteur sur +y — une rotation,
 * pas une symétrie, donc l'orientation des faces est préservée.
 */
function boiteArrondie(l: number, p: number, h: number): THREE.BufferGeometry {
  const r = Math.min(0.14 * Math.min(l, p), uPlan(0.04));
  const biseau = Math.min(uHaut(0.015), h / 6);
  const forme = new THREE.Shape();
  const x = l / 2 - r;
  const y = p / 2 - r;
  forme.moveTo(-x, -p / 2);
  forme.lineTo(x, -p / 2);
  forme.quadraticCurveTo(l / 2, -p / 2, l / 2, -y);
  forme.lineTo(l / 2, y);
  forme.quadraticCurveTo(l / 2, p / 2, x, p / 2);
  forme.lineTo(-x, p / 2);
  forme.quadraticCurveTo(-l / 2, p / 2, -l / 2, y);
  forme.lineTo(-l / 2, -y);
  forme.quadraticCurveTo(-l / 2, -p / 2, -x, -p / 2);

  const geo = new THREE.ExtrudeGeometry(forme, {
    depth: h - 2 * biseau,
    bevelEnabled: true,
    bevelThickness: biseau,
    bevelSize: biseau,
    bevelSegments: 2,
    curveSegments: 3,
    steps: 1,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, biseau, 0);
  return geo;
}

/**
 * L'escalier, en vraies marches.
 *
 * C'est l'élément le plus reconnaissable d'une maison à étages, et un
 * rectangle ne le dit pas. La montée est répartie EXACTEMENT sur la hauteur
 * déclarée, pour que la dernière marche affleure le plancher de l'étage —
 * autrement l'escalier finirait dans le vide, ce qui se voit tout de suite.
 */
function volee(l: number, p: number, h: number, marches: number): THREE.BufferGeometry {
  const n = Math.max(2, Math.round(marches));
  const giron = l / n;
  const contremarche = h / n;
  const morceaux: THREE.BufferGeometry[] = [];
  for (let i = 0; i < n; i++) {
    /* Chaque marche est un bloc plein depuis le sol : de côté la volée montre
       son profil en escalier, de dessus ses nez de marche. */
    const hauteur = contremarche * (i + 1);
    const g = new THREE.BoxGeometry(giron, hauteur, p);
    g.translate(-l / 2 + giron * (i + 0.5), hauteur / 2, 0);
    morceaux.push(g);
  }
  const fusion = fusionnerSimple(morceaux);
  morceaux.forEach((g) => g.dispose());
  return fusion;
}

function fusionnerSimple(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const normales: number[] = [];
  for (const g of geos) {
    const plate = g.index ? g.toNonIndexed() : g;
    positions.push(...Array.from(plate.attributes.position.array as Float32Array));
    normales.push(...Array.from(plate.attributes.normal.array as Float32Array));
    if (plate !== g) plate.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute("normal", new THREE.Float32BufferAttribute(normales, 3));
  return out;
}

export type VolumePose = {
  geometrie: THREE.BufferGeometry;
  source: Provenance;
  type: string;
};

/**
 * Les volumes d'un espace, placés en coordonnées du niveau. Le groupe du
 * niveau porte déjà l'altitude : on ne l'ajoute pas ici.
 */
export function volumesPoses(espace: Espace): VolumePose[] {
  const [ox, oy] = coinNO(espace.contour);
  const out: VolumePose[] = [];

  for (const v of volumesDe(espace.id)) {
    const l = uPlan(v.dim[0]);
    const p = uPlan(v.dim[1]);
    const h = uHaut(v.dim[2]);

    const geo =
      v.type === "escalier" ? volee(l, p, h, v.marches ?? 14) : boiteArrondie(l, p, h);

    /* Rotation autour de la verticale, puis pose au bon endroit du plan.
       `applyMatrix4` transporte déjà les normales : les recalculer ici
       facetterait les arêtes arrondies qu'on vient de construire. */
    geo.rotateY(-THREE.MathUtils.degToRad(v.rot));
    const [wx, wz] = versMonde([ox + uPlan(v.pos[0]), oy + uPlan(v.pos[2])]);
    geo.translate(wx, uHaut(v.pos[1]), wz);

    out.push({ geometrie: geo, source: v.source, type: v.type });
  }
  return out;
}
