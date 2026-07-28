/**
 * Construction de la scène du visualiseur de la maison.
 *
 * UNE SEULE SCÈNE. Les modes « cartographie » et « plan » n'en sont pas deux :
 * c'est le même volume, regardé autrement. Rien n'est reconstruit au
 * changement de mode — seule la caméra bouge (voir lib/maison3d/camera.ts).
 *
 * La géométrie vient de data/tours/maison-01-plan.ts, qui est un SCHÉMA assumé.
 * Sa PEAU, elle, est réelle : chaque surface est texturée par projection du
 * panorama de sa pièce (voir lib/maison3d/projection.ts). Les planchers
 * montrent le vrai bois, les murs leur vraie couleur, les meubles s'y écrasent.
 *
 * Aucune valeur produite ici n'est une mesure.
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
import { CENTRE_X, CENTRE_Y, versMonde } from "./scene-repere";
import {
  cameras360,
  cartoUrl,
  creerMateriauProjete,
  type Camera360,
} from "./projection";

export { CENTRE_X, CENTRE_Y, versMonde };

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
  reperes: Map<string, THREE.Mesh>;
  jetables: { dispose: () => void }[];
  /** Résolue quand toutes les textures projetées sont chargées. */
  texturesPretes: Promise<void>;
};

/* ── Réglage de l'opacité, quel que soit le type de matériau ─────────────── */
export function poserOpacite(mat: THREE.Material, valeur: number) {
  const base = (mat.userData?.opaciteBase as number) ?? 1;
  const v = base * valeur;
  const shader = mat as THREE.ShaderMaterial;
  if (shader.uniforms?.opacite) shader.uniforms.opacite.value = v;
  else (mat as THREE.MeshStandardMaterial).opacity = v;
  mat.depthWrite = v > 0.85;
}

/* ── Géométrie ─────────────────────────────────────────────────────────────── */

/** Bornes d'un contour rectangulaire, en unités de plan. */
function bornes(contour: readonly Pt[]) {
  const xs = contour.map((p) => p[0]);
  const ys = contour.map((p) => p[1]);
  return {
    x0: Math.min(...xs),
    x1: Math.max(...xs),
    y0: Math.min(...ys),
    y1: Math.max(...ys),
  };
}

/** Dalle horizontale d'un rectangle, épaisseur vers le bas. */
function dalle(contour: readonly Pt[], epaisseur: number): THREE.BufferGeometry {
  const { x0, x1, y0, y1 } = bornes(contour);
  const geo = new THREE.BoxGeometry(x1 - x0, epaisseur, y1 - y0);
  const [cx, cz] = versMonde([(x0 + x1) / 2, (y0 + y1) / 2]);
  geo.translate(cx, -epaisseur / 2, cz);
  return geo;
}

type Cote = { cote: "nord" | "sud" | "est" | "ouest"; milieu: Pt; dehors: Pt };

/** Les quatre côtés d'un rectangle, avec un point juste à l'extérieur. */
function cotes(contour: readonly Pt[]): Cote[] {
  const { x0, x1, y0, y1 } = bornes(contour);
  const e = 0.6;
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  return [
    { cote: "nord", milieu: [mx, y0], dehors: [mx, y0 - e] },
    { cote: "sud", milieu: [mx, y1], dehors: [mx, y1 + e] },
    { cote: "ouest", milieu: [x0, my], dehors: [x0 - e, my] },
    { cote: "est", milieu: [x1, my], dehors: [x1 + e, my] },
  ];
}

/**
 * Murs d'un espace : un pavé par côté, RENTRÉ vers l'intérieur.
 *
 * Chaque pièce porte donc sa propre peau de mur, ce qui est exactement ce
 * qu'il faut pour la projection : la face qu'on voit depuis la pièce est
 * texturée par le panorama de CETTE pièce. Deux pièces mitoyennes présentent
 * deux parois parallèles, chacune avec sa vraie couleur.
 *
 * Les côtés partagés avec une zone du même volume ouvert sont omis.
 */
function mursDeLEspace(
  espace: Espace,
  voisins: readonly Espace[],
  hauteur: number
): THREE.BufferGeometry | null {
  const { x0, x1, y0, y1 } = bornes(espace.contour);
  const m = EP_MUR;
  const morceaux: THREE.BufferGeometry[] = [];

  for (const c of cotes(espace.contour)) {
    const voisin = voisins.find(
      (v) => v.id !== espace.id && contient(v.contour, c.dehors[0], c.dehors[1])
    );
    /* Pas de cloison à l'intérieur d'un même volume ouvert. */
    if (
      voisin &&
      espace.groupeOuvert &&
      voisin.groupeOuvert === espace.groupeOuvert
    )
      continue;

    const horizontal = c.cote === "nord" || c.cote === "sud";
    const longueur = horizontal ? x1 - x0 : y1 - y0;
    const geo = new THREE.BoxGeometry(
      horizontal ? longueur : m,
      hauteur,
      horizontal ? m : longueur
    );
    /* Rentré de la demi-épaisseur, PLUS un jeu. Sans ce jeu, les parois de
       deux pièces mitoyennes se touchent exactement et leurs faces coplanaires
       se battent en profondeur — un moiré rayé très visible en orbite. */
    const decal = m / 2 + 0.2;
    const px =
      c.cote === "ouest" ? x0 + decal : c.cote === "est" ? x1 - decal : (x0 + x1) / 2;
    const py =
      c.cote === "nord" ? y0 + decal : c.cote === "sud" ? y1 - decal : (y0 + y1) / 2;
    const [wx, wz] = versMonde([px, py]);
    geo.translate(wx, hauteur / 2, wz);
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

/** Coque extérieure du bâti : ce qu'on voit quand on tourne autour. */
function coqueExterieure(niveau: Niveau): THREE.BufferGeometry {
  const rects = ESPACES.filter((e) => e.niveau === niveau).map((e) => bornes(e.contour));
  const x0 = Math.min(...rects.map((r) => r.x0));
  const x1 = Math.max(...rects.map((r) => r.x1));
  const y0 = Math.min(...rects.map((r) => r.y0));
  const y1 = Math.max(...rects.map((r) => r.y1));
  const ep = EP_MUR * 1.6;
  const morceaux: THREE.BufferGeometry[] = [];
  const poser = (l: number, p: number, cx: number, cy: number) => {
    const g = new THREE.BoxGeometry(l, H_NIVEAU, p);
    const [wx, wz] = versMonde([cx, cy]);
    g.translate(wx, H_NIVEAU / 2, wz);
    morceaux.push(g);
  };
  poser(x1 - x0 + ep, ep, (x0 + x1) / 2, y0 - ep / 2);
  poser(x1 - x0 + ep, ep, (x0 + x1) / 2, y1 + ep / 2);
  poser(ep, y1 - y0 + ep, x0 - ep / 2, (y0 + y1) / 2);
  poser(ep, y1 - y0 + ep, x1 + ep / 2, (y0 + y1) / 2);
  const fusion = fusionner(morceaux);
  morceaux.forEach((g) => g.dispose());
  return fusion;
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

  const jetables: { dispose: () => void }[] = [];
  const garde = <T extends { dispose: () => void }>(o: T): T => {
    jetables.push(o);
    return o;
  };

  /* ── Lumières ───────────────────────────────────────────────────────────
     Douces et sans ombre portée : les surfaces projetées portent déjà
     l'éclairage réel de la maison, capté par les panoramas. Ces lumières ne
     servent qu'aux surfaces NON texturées — coque, espaces non visités. */
  scene.add(new THREE.AmbientLight(0xffffff, 1.15));
  const cle = new THREE.DirectionalLight(0xfff2e0, 1.5);
  cle.position.set(60, 90, 40);
  scene.add(cle);
  const contre = new THREE.DirectionalLight(0x9fb6c4, 0.6);
  contre.position.set(-50, 40, -60);
  scene.add(contre);

  /* ── Textures projetées ─────────────────────────────────────────────────── */
  const cams = cameras360();
  const chargeur = new THREE.TextureLoader();
  const textures = new Map<string, THREE.Texture>();
  const attentes: Promise<unknown>[] = [];

  const texturePour = (cam: Camera360): THREE.Texture => {
    const existante = textures.get(cam.id);
    if (existante) return existante;
    const tex = garde(
      chargeur.load(cartoUrl(cam.fichier), () => {
        /* rien : le rendu est continu, la frame suivante l'affiche */
      })
    );
    tex.colorSpace = THREE.SRGBColorSpace;
    /* Le panorama fait le tour : l'horizontale se répète, la verticale non. */
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    textures.set(cam.id, tex);
    attentes.push(
      new Promise((resoudre) => {
        if (tex.image) return resoudre(null);
        const fin = () => resoudre(null);
        tex.addEventListener("dispose", fin);
        const t = setInterval(() => {
          if (tex.image) {
            clearInterval(t);
            resoudre(null);
          }
        }, 60);
        setTimeout(() => {
          clearInterval(t);
          resoudre(null);
        }, 8000);
      })
    );
    return tex;
  };

  /** Matériau d'un espace : projeté s'il a un point de vue, neutre sinon. */
  const materiauDe = (
    noeuds: readonly string[],
    appoint: string | undefined,
    visitable: boolean
  ): THREE.Material => {
    const camA = noeuds.length ? cams.get(noeuds[0]) : undefined;
    if (!camA) {
      /* Espace non photographié : gris franc, et il ne prétend rien d'autre. */
      const mat = garde(
        new THREE.MeshStandardMaterial({
          color: 0x5f5b55,
          roughness: 0.95,
          metalness: 0,
          transparent: true,
          opacity: 0.75,
        })
      );
      mat.userData = { opaciteBase: 0.75 };
      return mat;
    }
    const camB = appoint ? cams.get(appoint) : undefined;
    const mat = garde(
      creerMateriauProjete(
        camA,
        texturePour(camA),
        camB,
        camB ? texturePour(camB) : undefined
      )
    );
    void visitable;
    return mat;
  };

  /* ── Extérieur ──────────────────────────────────────────────────────────── */
  const exterieur = new THREE.Group();
  exterieur.name = "exterieur";
  for (const ext of EXTERIEURS) {
    const cam = ext.noeuds.length ? cams.get(ext.noeuds[0]) : undefined;
    const geo = garde(dalle(ext.contour, 0.6));
    const mat = cam
      ? garde(creerMateriauProjete(cam, texturePour(cam)))
      : garde(
          new THREE.MeshStandardMaterial({
            color: NATURE_TEINTE[ext.nature],
            roughness: 0.95,
            metalness: 0,
            transparent: true,
          })
        );
    if (!cam) mat.userData = { opaciteBase: 1 };
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

    for (const e of espaces) {
      if (e.vide) continue;
      const visitable = e.noeuds.length > 0;
      const mat = materiauDe(e.noeuds, e.noeudAppoint, visitable);
      materiaux.push(mat);

      /* Sol — c'est lui qu'on pointe et qu'on clique. */
      const geoSol = garde(dalle(e.contour, EP_PLANCHER));
      const sol = new THREE.Mesh(geoSol, mat);
      sol.userData = {
        espaceId: e.id,
        nom: e.nom,
        niveau,
        noeuds: e.noeuds,
        visitable,
      };
      sols.push(sol);
      groupe.add(sol);

      /* Murs — même matériau, donc même panorama : la pièce est d'un bloc. */
      const geoMurs = mursDeLEspace(e, espaces, H_NIVEAU * 0.92);
      if (geoMurs) {
        garde(geoMurs);
        const murs = new THREE.Mesh(geoMurs, mat);
        murs.userData = { mur: true, espaceId: e.id };
        groupe.add(murs);
      }
    }

    /* Coque : la maison vue de l'extérieur reste un volume plein et sombre. */
    const geoCoque = garde(coqueExterieure(niveau));
    const matCoque = garde(
      new THREE.MeshStandardMaterial({
        color: TEINTES.ardoise,
        roughness: 0.9,
        metalness: 0,
        transparent: true,
        side: THREE.BackSide,
      })
    );
    matCoque.userData = { opaciteBase: 1 };
    materiaux.push(matCoque);
    groupe.add(new THREE.Mesh(geoCoque, matCoque));

    scene.add(groupe);
    niveaux.push({ niveau, groupe, sols, materiaux });
  }

  /* ── Repères des points de visite ───────────────────────────────────────── */
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
        roughness: 0.35,
        metalness: 0.25,
        emissive: new THREE.Color(0x2a1405),
        transparent: true,
      })
    );
    mat.userData = { opaciteBase: 1 };
    const mesh = new THREE.Mesh(geoRepere, mat);
    const [x, z] = versMonde(position);
    mesh.position.set(x, y, z);
    mesh.userData = { noeudId, repere: true, nom: noeud?.name ?? espace.nom };
    parent.add(mesh);
    reperes.set(noeudId, mesh);
  };

  for (const groupeNiveau of niveaux) {
    for (const e of ESPACES.filter((s) => s.niveau === groupeNiveau.niveau))
      for (const id of e.noeuds) poserRepere(id, e, 0.3, groupeNiveau.groupe);
  }
  for (const ext of EXTERIEURS)
    for (const id of ext.noeuds) poserRepere(id, ext, 0.1, exterieur);

  return {
    scene,
    niveaux,
    exterieur,
    reperes,
    jetables,
    texturesPretes: Promise.all(attentes).then(() => undefined),
  };
}
