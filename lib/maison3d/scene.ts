/**
 * Construction de la scène du visualiseur de la maison.
 *
 * UNE SEULE SCÈNE. Les modes « cartographie » et « plan » n'en sont pas deux :
 * c'est le même volume, regardé autrement. Rien n'est reconstruit au
 * changement de mode — seule la caméra bouge (voir lib/maison3d/camera.ts).
 *
 * La géométrie vient de data/tours/maison-01-plan.ts, qui est un SCHÉMA
 * assumé, pas un relevé. Aucune valeur produite ici n'est une mesure.
 */

import * as THREE from "three";
import {
  ESPACES,
  EXTERIEURS,
  EP_MUR,
  EP_PLANCHER,
  H_NIVEAU,
  altitude,
  centre,
  contient,
  type Espace,
  type EspaceExterieur,
  type Niveau,
  type Pt,
} from "@/data/tours/maison-01-plan";
import { maison01 } from "@/data/tours/maison-01";

/* ── Palette — reprise des pages de propriété (tailwind.config.ts) ───────── */
export const TEINTES = {
  nuit: 0x0c0f12,
  ardoise: 0x171c21,
  chaux: 0xf1ede6,
  brume: 0x98a1a8,
  patine: 0x7c8c82,
  cuivre: 0xb4713f,
  cuivreClair: 0xc98a57,
} as const;

export type NiveauGroupe = {
  niveau: Niveau;
  groupe: THREE.Group;
  /** Sols cliquables, porteurs de `userData.espaceId`. */
  sols: THREE.Mesh[];
  materiaux: THREE.Material[];
};

export type SceneMaison = {
  scene: THREE.Scene;
  niveaux: NiveauGroupe[];
  exterieur: THREE.Group;
  /** Pastilles des points de visite, par id de nœud. */
  reperes: Map<string, THREE.Mesh>;
  /** Tout ce qui doit être libéré au démontage. */
  jetables: { dispose: () => void }[];
};

/* ── Conversion plan → monde ───────────────────────────────────────────────
   Le plan a x vers l'est et y vers le sud. Trois.js a y vers le haut : on
   envoie donc le y du plan sur le z du monde, sans miroir (le sud reste le
   +z), et on centre l'emprise bâtie sur l'origine pour que l'orbite tourne
   autour de la maison et non autour d'un coin. */
export const CENTRE_X = 53;
export const CENTRE_Y = 51;

export const versMonde = ([x, y]: Pt): [number, number] => [
  x - CENTRE_X,
  y - CENTRE_Y,
];

/**
 * Forme three.js d'un polygone de plan.
 *
 * Le y de la forme est NÉGATIF du y du plan, et c'est voulu : la dalle est
 * ensuite couchée par `rotateX(-π/2)`, qui envoie le y de la forme sur −z du
 * monde. Les deux négations s'annulent, et le y du plan retombe sur +z —
 * exactement la convention qu'utilisent les murs, qui posent leurs boîtes
 * directement en (x, y, z) monde. Sans cela, sols et murs sont en miroir.
 */
function formeDe(contour: readonly Pt[]): THREE.Shape {
  const forme = new THREE.Shape();
  contour.forEach((p, i) => {
    const [x, z] = versMonde(p);
    if (i === 0) forme.moveTo(x, -z);
    else forme.lineTo(x, -z);
  });
  forme.closePath();
  return forme;
}

/** Dalle horizontale : forme extrudée puis couchée à plat. */
function dalle(contour: readonly Pt[], epaisseur: number): THREE.BufferGeometry {
  const geo = new THREE.ExtrudeGeometry(formeDe(contour), {
    depth: epaisseur,
    bevelEnabled: false,
  });
  /* L'extrusion pousse vers +z ; on bascule pour que ce soit vers +y. */
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

/* ── Réseau de murs ────────────────────────────────────────────────────────
   Les espaces pavent le niveau : deux pièces voisines partagent une arête,
   et une longue arête (l'aire ouverte) recouvre plusieurs arêtes courtes.
   Poser un mur par arête de polygone produirait des faces coplanaires qui
   se battent en profondeur.

   On découpe donc toutes les arêtes portées par une même droite aux points
   de rupture de toutes les autres, puis on n'émet qu'un mur par intervalle
   atomique. Le nombre d'espaces qui couvrent l'intervalle dit au passage si
   c'est un mur extérieur (1) ou une cloison (2). */

type Segment = { fixe: number; a: number; b: number; vertical: boolean };

function segmentsDuNiveau(espaces: readonly Espace[]): Segment[] {
  const out: Segment[] = [];
  for (const e of espaces) {
    const c = e.contour;
    for (let i = 0; i < c.length; i++) {
      const [x1, y1] = c[i];
      const [x2, y2] = c[(i + 1) % c.length];
      if (x1 === x2) out.push({ fixe: x1, a: Math.min(y1, y2), b: Math.max(y1, y2), vertical: true });
      else if (y1 === y2) out.push({ fixe: y1, a: Math.min(x1, x2), b: Math.max(x1, x2), vertical: false });
      /* Le schéma n'a que des arêtes orthogonales ; une oblique serait ignorée
         ici, ce que `validerPlan` n'autorise pas à passer inaperçu. */
    }
  }
  return out;
}

type Mur = { fixe: number; a: number; b: number; vertical: boolean; cloison: boolean };

function reseauDeMurs(espaces: readonly Espace[]): Mur[] {
  const groupes = new Map<string, Segment[]>();
  for (const s of segmentsDuNiveau(espaces)) {
    const cle = `${s.vertical ? "v" : "h"}:${s.fixe}`;
    (groupes.get(cle) ?? groupes.set(cle, []).get(cle)!).push(s);
  }

  const murs: Mur[] = [];
  for (const segs of Array.from(groupes.values())) {
    const bornes: number[] = [];
    for (const s of segs) {
      if (bornes.indexOf(s.a) === -1) bornes.push(s.a);
      if (bornes.indexOf(s.b) === -1) bornes.push(s.b);
    }
    const coupures = bornes.sort((p, q) => p - q);
    for (let i = 0; i < coupures.length - 1; i++) {
      const a = coupures[i];
      const b = coupures[i + 1];
      const couverture = segs.filter((s) => s.a <= a && s.b >= b).length;
      if (couverture === 0) continue;
      murs.push({ fixe: segs[0].fixe, a, b, vertical: segs[0].vertical, cloison: couverture > 1 });
    }
  }
  return murs;
}

function geometrieDesMurs(murs: Mur[], hauteur: number): THREE.BufferGeometry | null {
  const morceaux: THREE.BufferGeometry[] = [];
  for (const m of murs) {
    const longueur = m.b - m.a;
    if (longueur <= 0) continue;
    const geo = new THREE.BoxGeometry(
      m.vertical ? EP_MUR : longueur,
      hauteur,
      m.vertical ? longueur : EP_MUR
    );
    const milieu = (m.a + m.b) / 2;
    const [mx, mz] = m.vertical
      ? versMonde([m.fixe, milieu])
      : versMonde([milieu, m.fixe]);
    geo.translate(mx, hauteur / 2, mz);
    morceaux.push(geo);
  }
  if (!morceaux.length) return null;
  const fusion = fusionner(morceaux);
  morceaux.forEach((g) => g.dispose());
  return fusion;
}

/** Fusion manuelle : évite d'embarquer BufferGeometryUtils pour trois lignes. */
function fusionner(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const normales: number[] = [];
  for (const g of geos) {
    const nonIndexee = g.index ? g.toNonIndexed() : g;
    positions.push(...Array.from(nonIndexee.attributes.position.array as Float32Array));
    normales.push(...Array.from(nonIndexee.attributes.normal.array as Float32Array));
    if (nonIndexee !== g) nonIndexee.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute("normal", new THREE.Float32BufferAttribute(normales, 3));
  return out;
}

/* ── Construction ──────────────────────────────────────────────────────────── */

const NATURE_TEINTE: Record<EspaceExterieur["nature"], number> = {
  eau: 0x2e5f6e,
  terrasse: 0x5c5147,
  dalle: 0x3a3f44,
  terrain: 0x2a3128,
};

export function construireScene(): SceneMaison {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(TEINTES.nuit);
  /* Pas de brouillard. Il est calculé sur la profondeur vue, or le dolly-zoom
     recule la caméra jusqu'à ~900 unités et la vue plan la pose à ~400 : toute
     plage de brouillard utile en cartographie repeint la scène entière en
     couleur de fond dès qu'on bascule. Le volume est petit et stylisé, il n'a
     pas besoin d'indice de profondeur atmosphérique. */

  const jetables: { dispose: () => void }[] = [];
  const garde = <T extends { dispose: () => void }>(o: T): T => {
    jetables.push(o);
    return o;
  };

  /* ── Lumières ───────────────────────────────────────────────────────────
     Trois sources fixes, sans ombres portées : la scène est schématique, une
     ombre douce ferait croire à un relevé. */
  scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  const cle = new THREE.DirectionalLight(0xfff2e0, 2.0);
  cle.position.set(60, 90, 40);
  scene.add(cle);
  const contre = new THREE.DirectionalLight(0x9fb6c4, 0.8);
  contre.position.set(-50, 40, -60);
  scene.add(contre);

  /* ── Extérieur ──────────────────────────────────────────────────────────── */
  const exterieur = new THREE.Group();
  exterieur.name = "exterieur";
  for (const ext of EXTERIEURS) {
    const geo = garde(dalle(ext.contour, 0.6));
    const mat = garde(
      new THREE.MeshStandardMaterial({
        color: NATURE_TEINTE[ext.nature],
        /* L'eau reste mate : un spéculaire dur sur une dalle plate produit une
           tache brûlée, pas un reflet. On suggère l'eau par la teinte. */
        roughness: ext.nature === "eau" ? 0.6 : 0.95,
        metalness: 0,
        transparent: true,
      })
    );
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = -0.6;
    mesh.userData = { espaceId: ext.id, nom: ext.nom, exterieur: true };
    exterieur.add(mesh);
  }
  scene.add(exterieur);

  /* ── Niveaux bâtis ──────────────────────────────────────────────────────── */
  const niveaux: NiveauGroupe[] = [];
  for (const niveau of ["rdc", "etage"] as const) {
    const espaces = ESPACES.filter((e) => e.niveau === niveau);
    const groupe = new THREE.Group();
    groupe.name = `niveau-${niveau}`;
    groupe.position.y = altitude(niveau);

    const sols: THREE.Mesh[] = [];
    const materiaux: THREE.Material[] = [];

    /* Sols, un par espace : ce sont eux qu'on pointe et qu'on éclaire. */
    for (const e of espaces) {
      if (e.vide) continue;
      const geo = garde(dalle(e.contour, EP_PLANCHER));
      const mat = garde(
        new THREE.MeshStandardMaterial({
          color: e.noeuds.length ? TEINTES.chaux : 0x6f6a63,
          roughness: 0.92,
          metalness: 0,
          transparent: true,
          /* Un espace non photographié ne se donne pas pour visitable. */
          opacity: e.noeuds.length ? 1 : 0.55,
        })
      );
      /* Le fondu des niveaux multiplie cette base : il ne l'écrase pas, sinon
         les espaces non visités redeviendraient opaques en s'estompant. */
      mat.userData = { opaciteBase: mat.opacity };
      materiaux.push(mat);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = -EP_PLANCHER;
      mesh.userData = {
        espaceId: e.id,
        nom: e.nom,
        niveau,
        noeuds: e.noeuds,
        visitable: e.noeuds.length > 0,
        teinteBase: mat.color.getHex(),
        opaciteBase: mat.opacity,
      };
      sols.push(mesh);
      groupe.add(mesh);
    }

    /* Murs : deux maillages fusionnés, l'un pour l'enveloppe, l'autre pour
       les cloisons — deux teintes, deux hauteurs. La cloison est plus basse :
       le volume se lit mieux vu du dessus, et de trois quarts on plonge dans
       les pièces. */
    const murs = reseauDeMurs(espaces);
    const paires: [Mur[], number, number, number][] = [
      [murs.filter((m) => !m.cloison), H_NIVEAU, TEINTES.ardoise, 1],
      [murs.filter((m) => m.cloison), H_NIVEAU * 0.72, TEINTES.brume, 0.9],
    ];
    for (const [lot, hauteur, teinte, opacite] of paires) {
      const geo = geometrieDesMurs(lot, hauteur);
      if (!geo) continue;
      garde(geo);
      const mat = garde(
        new THREE.MeshStandardMaterial({
          color: teinte,
          roughness: 0.85,
          metalness: 0,
          transparent: true,
          opacity: opacite,
        })
      );
      mat.userData = { opaciteBase: opacite };
      materiaux.push(mat);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData = { mur: true };
      groupe.add(mesh);
    }

    scene.add(groupe);
    niveaux.push({ niveau, groupe, sols, materiaux });
  }

  /* ── Repères des points de visite ───────────────────────────────────────
     Une pastille par nœud. Position : la `map` de l'auteur quand elle tombe
     bien dans l'espace du nœud, le centre de l'espace sinon. Ce repli est ce
     qui rattrape les nœuds extérieurs, dont les `map` sont exprimées dans un
     repère de panneau distinct (voir l'en-tête de maison-01-plan.ts). */
  const reperes = new Map<string, THREE.Mesh>();
  const geoRepere = garde(new THREE.CylinderGeometry(1.6, 1.6, 0.4, 24));

  const poserRepere = (
    noeudId: string,
    espace: Espace | EspaceExterieur,
    y: number,
    parent: THREE.Object3D
  ) => {
    const noeud = maison01.nodes.find((n) => n.id === noeudId);
    const brut: Pt = noeud ? [noeud.map.x, noeud.map.y] : centre(espace.contour);
    const position = contient(espace.contour, brut[0], brut[1])
      ? brut
      : centre(espace.contour);

    const mat = garde(
      new THREE.MeshStandardMaterial({
        color: TEINTES.cuivre,
        roughness: 0.4,
        metalness: 0.2,
        transparent: true,
      })
    );
    const mesh = new THREE.Mesh(geoRepere, mat);
    const [x, z] = versMonde(position);
    mesh.position.set(x, y, z);
    mesh.userData = { noeudId, repere: true, nom: noeud?.name ?? espace.nom };
    parent.add(mesh);
    reperes.set(noeudId, mesh);
  };

  for (const groupeNiveau of niveaux) {
    for (const e of ESPACES.filter((s) => s.niveau === groupeNiveau.niveau))
      for (const id of e.noeuds) poserRepere(id, e, 0.25, groupeNiveau.groupe);
  }
  for (const ext of EXTERIEURS)
    for (const id of ext.noeuds) poserRepere(id, ext, 0.05, exterieur);

  return { scene, niveaux, exterieur, reperes, jetables };
}
