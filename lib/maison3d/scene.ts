/**
 * Construction de la scène du visualiseur de la maison.
 *
 * UNE SEULE SCÈNE. Les modes « cartographie » et « plan » n'en sont pas deux :
 * c'est le même volume, regardé autrement. Rien n'est reconstruit au
 * changement de mode — seule la caméra bouge (voir lib/maison3d/camera.ts).
 *
 * ── Ce que chaque couche raconte ───────────────────────────────────────────
 *   Planchers  opaques, texturés par projection du panorama de leur pièce.
 *              C'est la matière réelle : le bois, la tuile, le tapis.
 *   Murs       fins, presque blancs, transparents, soulignés d'un lisere, et
 *              qui s'effacent quand ils s'interposent entre l'œil et la pièce.
 *              Ils disent OÙ ÇA PASSE, pas de quoi c'est fait.
 *   Volumes    îlot, divan, bain, escalier — déclarés dans mobilier.json avec
 *              leur provenance, texturés par le même panorama que leur pièce.
 *   Plafonds   aucun. Jamais.
 *   Terrain    une teinte plate au niveau du sol, discrète. Aucune photo
 *              extérieure n'est projetée ici : une image d'extérieur plaquée
 *              sur une dalle est un panneau qui flotte, pas une surface.
 *
 * La géométrie vient de data/tours/maison-01-plan.ts, qui est un SCHÉMA assumé.
 * Aucune valeur produite ici n'est une mesure.
 */

import * as THREE from "three";
import {
  ESPACES,
  EXTERIEURS,
  EP_CLOISON,
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
  creerMateriauMur,
  creerMateriauProjete,
  type Camera360,
} from "./projection";
import { volumesPoses, type Provenance } from "./mobilier";

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
  /** Volumes de mobilier — cliquables eux aussi : un îlot masque son plancher. */
  volumes: THREE.Mesh[];
  materiaux: THREE.Material[];
  /** Contours des volumes, par provenance. Visibles en développement. */
  tracesSource: Partial<Record<Provenance, THREE.LineSegments>>;
};

export type SceneMaison = {
  scene: THREE.Scene;
  niveaux: NiveauGroupe[];
  exterieur: THREE.Group;
  reperes: Map<string, THREE.Mesh>;
  jetables: { dispose: () => void }[];
  /** Résolue quand toutes les textures projetées sont chargées. */
  texturesPretes: Promise<void>;
  /** Diagnostic : ce qui a réellement été construit, pièce par pièce. */
  volumes: { espaceId: string; type: string; source: Provenance }[];
};

/* ── Réglage de l'opacité, quel que soit le type de matériau ───────────────
   Trois familles cohabitent : les shaders projetés (uniforme `opacite`), le
   shader de mur (idem, mais son alpha de base vit dans le fragment), et les
   matériaux standard ou de ligne (propriété `opacity`).

   Tout reste `transparent: true` en permanence, et c'est délibéré. Faire
   basculer un matériau vers l'opaque quand il est plein serait tentant — mais
   three.js n'accepte un changement de `transparent` qu'accompagné de
   `needsUpdate`, faute de quoi le matériau garde l'état de mélange compilé
   avec lui. Sans ce drapeau, un plancher estompé à 10 % continue de peindre à
   plein et masque le niveau du dessous. L'ordre des couches est de toute façon
   garanti par `renderOrder`, pas par la file de rendu. */
export function poserOpacite(mat: THREE.Material, valeur: number) {
  const base = (mat.userData?.opaciteBase as number) ?? 1;
  const v = base * valeur;
  const shader = mat as THREE.ShaderMaterial;
  if (shader.uniforms?.opacite) shader.uniforms.opacite.value = v;
  else (mat as THREE.MeshStandardMaterial).opacity = v;

  /* Les murs et les liserés ne doivent jamais écrire dans la profondeur : ils
     masqueraient ce qu'ils laissent pourtant voir. */
  mat.depthWrite = mat.userData?.sansProfondeur ? false : v > 0.85;
}

/* ── Ordre de rendu ─────────────────────────────────────────────────────────
   Le plein d'abord, le translucide ensuite, le trait en dernier. */
const ORDRE = { terrain: -1, sol: 0, volume: 1, mur: 2, lisere: 3 } as const;

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

/* ── Les murs ──────────────────────────────────────────────────────────────
 *
 * Un mur mitoyen est UN mur, pas deux. La version précédente en posait un par
 * pièce, rentré vers l'intérieur : deux parois parallèles là où il n'y en a
 * qu'une, donc une opacité doublée et une épaisseur doublée — c'est une bonne
 * part de l'effet « blocs gris » qu'on corrige ici.
 *
 * On collecte donc tous les côtés de toutes les pièces, on les regroupe par
 * droite porteuse, et on redécoupe chaque droite sur les points de rupture de
 * ses segments. Chaque intervalle élémentaire donne exactement un mur, et sait
 * s'il est mitoyen (deux pièces le couvrent) ou extérieur (une seule).
 */

type Segment = { axe: "x" | "y"; coord: number; a: number; b: number; interieur: boolean };

/** Les quatre côtés d'un rectangle, avec un point juste à l'extérieur. */
function cotes(contour: readonly Pt[]) {
  const { x0, x1, y0, y1 } = bornes(contour);
  const e = 0.6;
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  return [
    { axe: "y" as const, coord: y0, a: x0, b: x1, dehors: [mx, y0 - e] as Pt },
    { axe: "y" as const, coord: y1, a: x0, b: x1, dehors: [mx, y1 + e] as Pt },
    { axe: "x" as const, coord: x0, a: y0, b: y1, dehors: [x0 - e, my] as Pt },
    { axe: "x" as const, coord: x1, a: y0, b: y1, dehors: [x1 + e, my] as Pt },
  ];
}

function segmentsDuNiveau(espaces: readonly Espace[]): Segment[] {
  const bruts: Segment[] = [];
  for (const e of espaces)
    for (const c of cotes(e.contour)) {
      const voisin = espaces.find(
        (v) => v.id !== e.id && contient(v.contour, c.dehors[0], c.dehors[1])
      );
      /* Pas de cloison à l'intérieur d'un même volume ouvert : l'aire ouverte
         se lit d'un seul regard, la mezzanine donne sur la cage d'escalier. */
      if (voisin && e.groupeOuvert && voisin.groupeOuvert === e.groupeOuvert) continue;
      bruts.push({ axe: c.axe, coord: c.coord, a: c.a, b: c.b, interieur: !!voisin });
    }

  /* Redécoupage par droite porteuse. */
  const groupes = new Map<string, Segment[]>();
  for (const s of bruts) {
    const cle = `${s.axe}|${s.coord.toFixed(3)}`;
    const liste = groupes.get(cle);
    if (liste) liste.push(s);
    else groupes.set(cle, [s]);
  }

  const out: Segment[] = [];
  Array.from(groupes.values()).forEach((liste) => {
    const ruptures = Array.from(
      new Set(liste.flatMap((s) => [s.a, s.b]))
    ).sort((p, q) => p - q);
    for (let i = 0; i < ruptures.length - 1; i++) {
      const a = ruptures[i];
      const b = ruptures[i + 1];
      if (b - a < 1e-6) continue;
      const milieu = (a + b) / 2;
      const couvrants = liste.filter((s) => s.a <= milieu && s.b >= milieu);
      if (!couvrants.length) continue;
      out.push({
        axe: liste[0].axe,
        coord: liste[0].coord,
        a,
        b,
        /* Couvert des deux bords, ou déclaré mitoyen : c'est une cloison. */
        interieur: couvrants.length >= 2 || couvrants.some((s) => s.interieur),
      });
    }
  });
  return out;
}

/**
 * Murs d'un niveau, fusionnés, avec la normale sortante en attribut.
 *
 * `sortie` pointe vers l'extérieur du bâti — vers le dehors pour un mur de
 * façade, vers la moitié la plus proche du bord pour une cloison. C'est cette
 * normale que le shader compare à la direction de l'œil pour effacer les murs
 * qui s'interposent.
 */
function mursDuNiveau(espaces: readonly Espace[]): THREE.BufferGeometry | null {
  const segments = segmentsDuNiveau(espaces);
  if (!segments.length) return null;

  const rects = espaces.map((e) => bornes(e.contour));
  const cx = (Math.min(...rects.map((r) => r.x0)) + Math.max(...rects.map((r) => r.x1))) / 2;
  const cy = (Math.min(...rects.map((r) => r.y0)) + Math.max(...rects.map((r) => r.y1))) / 2;

  const positions: number[] = [];
  const normales: number[] = [];
  const sorties: number[] = [];

  for (const s of segments) {
    const ep = s.interieur ? EP_CLOISON : EP_MUR;
    const longueur = s.b - s.a;
    const geo =
      s.axe === "x"
        ? new THREE.BoxGeometry(ep, H_NIVEAU, longueur)
        : new THREE.BoxGeometry(longueur, H_NIVEAU, ep);
    const centreSeg: Pt =
      s.axe === "x" ? [s.coord, (s.a + s.b) / 2] : [(s.a + s.b) / 2, s.coord];
    const [wx, wz] = versMonde(centreSeg);
    geo.translate(wx, H_NIVEAU / 2, wz);

    /* Signe de la normale : vers l'extérieur du bâti. */
    const signe =
      s.axe === "x"
        ? Math.sign(centreSeg[0] - cx) || 1
        : Math.sign(centreSeg[1] - cy) || 1;
    const sx = s.axe === "x" ? signe : 0;
    const sz = s.axe === "x" ? 0 : signe;

    const plate = geo.toNonIndexed();
    const pos = plate.attributes.position.array as Float32Array;
    const nor = plate.attributes.normal.array as Float32Array;
    positions.push(...Array.from(pos));
    normales.push(...Array.from(nor));
    for (let i = 0; i < pos.length / 3; i++) sorties.push(sx, 0, sz);
    plate.dispose();
    geo.dispose();
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute("normal", new THREE.Float32BufferAttribute(normales, 3));
  out.setAttribute("sortie", new THREE.Float32BufferAttribute(sorties, 3));
  return out;
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

/* ── Construction ──────────────────────────────────────────────────────────── */

/* Teintes de terrain : sourdes, proches du fond. La cartographie montre le
   bâtiment ; le terrain est un contexte, pas un sujet. */
const NATURE_TEINTE: Record<EspaceExterieur["nature"], number> = {
  eau: 0x1d3a45,
  terrasse: 0x322c26,
  dalle: 0x23272b,
  terrain: 0x1a1f19,
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
     servent qu'aux surfaces NON texturées — terrain, espaces non visités. */
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
    appoint: string | undefined
  ): THREE.Material => {
    const camA = noeuds.length ? cams.get(noeuds[0]) : undefined;
    if (!camA) {
      /* Espace non photographié : gris franc, et il ne prétend rien d'autre. */
      const mat = garde(
        new THREE.MeshStandardMaterial({
          color: 0x4a4843,
          roughness: 0.95,
          metalness: 0,
          transparent: true,
          opacity: 1,
        })
      );
      mat.userData = { opaciteBase: 1 };
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
    return mat;
  };

  /* ── Terrain ────────────────────────────────────────────────────────────
     Plat, au niveau du sol, sans photo. Les points de vue extérieurs restent
     joignables par leur pastille — c'est tout ce que la cartographie doit en
     dire. */
  const exterieur = new THREE.Group();
  exterieur.name = "exterieur";
  for (const ext of EXTERIEURS) {
    const geo = garde(dalle(ext.contour, 0.6));
    const mat = garde(
      new THREE.MeshStandardMaterial({
        color: NATURE_TEINTE[ext.nature],
        roughness: 1,
        metalness: 0,
        transparent: true,
        opacity: 0.55,
      })
    );
    mat.userData = { opaciteBase: 0.55 };
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = -0.6;
    mesh.renderOrder = ORDRE.terrain;
    mesh.userData = { espaceId: ext.id, nom: ext.nom, exterieur: true };
    exterieur.add(mesh);
  }
  scene.add(exterieur);

  /* ── Niveaux bâtis ──────────────────────────────────────────────────────── */
  const niveaux: NiveauGroupe[] = [];
  const volumesConstruits: { espaceId: string; type: string; source: Provenance }[] = [];

  for (const niveau of ["rdc", "etage"] as const) {
    const espaces = ESPACES.filter((e) => e.niveau === niveau);
    const groupe = new THREE.Group();
    groupe.name = `niveau-${niveau}`;
    groupe.position.y = altitude(niveau);

    const sols: THREE.Mesh[] = [];
    const volumes: THREE.Mesh[] = [];
    const materiaux: THREE.Material[] = [];
    /* Contours de volumes, regroupés par provenance — repère de développement. */
    const geosSource: Record<Provenance, THREE.BufferGeometry[]> = {
      mesure: [],
      estime: [],
    };

    for (const e of espaces) {
      /* Une trémie n'a pas de plancher, mais elle a des murs : c'est un trou
         dans la dalle, pas un trou dans la façade. Ses murs sont posés plus
         bas, avec ceux de tout le niveau. */
      if (!e.vide) {
        const mat = materiauDe(e.noeuds, e.noeudAppoint);
        materiaux.push(mat);

        /* Sol — c'est lui qu'on pointe et qu'on clique. */
        const geoSol = garde(dalle(e.contour, EP_PLANCHER));
        const sol = new THREE.Mesh(geoSol, mat);
        sol.renderOrder = ORDRE.sol;
        sol.userData = {
          espaceId: e.id,
          nom: e.nom,
          niveau,
          noeuds: e.noeuds,
          visitable: e.noeuds.length > 0,
        };
        sols.push(sol);
        groupe.add(sol);

        /* Volumes — même matériau, donc même panorama que la pièce. Le dessus
           du divan prend la couleur du divan, le flanc celle du mur derrière ;
           vu de loin, ça lit juste, et ça occupe enfin de l'espace. */
        for (const v of volumesPoses(e)) {
          garde(v.geometrie);
          const mesh = new THREE.Mesh(v.geometrie, mat);
          mesh.renderOrder = ORDRE.volume;
          /* Mêmes repères que le sol : cliquer l'îlot doit entrer dans la
             cuisine, sinon la pièce devient plus dure à atteindre qu'avant. */
          mesh.userData = {
            volume: true,
            type: v.type,
            espaceId: e.id,
            nom: e.nom,
            niveau,
            noeuds: e.noeuds,
            visitable: e.noeuds.length > 0,
          };
          groupe.add(mesh);
          volumes.push(mesh);
          geosSource[v.source].push(v.geometrie);
          volumesConstruits.push({ espaceId: e.id, type: v.type, source: v.source });
        }
      }
    }

    /* Murs — fins, translucides, effacés dès qu'ils s'interposent. */
    const geoMurs = mursDuNiveau(espaces);
    if (geoMurs) {
      garde(geoMurs);
      const matMur = garde(creerMateriauMur());
      materiaux.push(matMur);
      const murs = new THREE.Mesh(geoMurs, matMur);
      murs.renderOrder = ORDRE.mur;
      murs.userData = { mur: true };
      groupe.add(murs);

      /* Liseré : sans lui, des murs à 20 % d'opacité ne dessinent plus rien.
         C'est le trait qui garde la structure lisible malgré la transparence. */
      const geoAretes = garde(new THREE.EdgesGeometry(geoMurs, 20));
      const matAretes = garde(
        new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.3,
          depthWrite: false,
        })
      );
      matAretes.userData = { opaciteBase: 0.3, sansProfondeur: true };
      materiaux.push(matAretes);
      const aretes = new THREE.LineSegments(geoAretes, matAretes);
      aretes.renderOrder = ORDRE.lisere;
      groupe.add(aretes);
    }

    /* ── Repère de provenance, développement seulement ────────────────────
       Un volume estimé et un volume mesuré ne doivent pas se ressembler pour
       qui travaille dessus. En production, rien : le visiteur lit la mention
       du bandeau, qui compte les uns et les autres. */
    const tracesSource: NiveauGroupe["tracesSource"] = {};
    if (process.env.NODE_ENV !== "production") {
      const teinte: Record<Provenance, number> = {
        estime: TEINTES.cuivre,
        mesure: 0x63c39b,
      };
      (["estime", "mesure"] as const).forEach((src) => {
        if (!geosSource[src].length) return;
        const fusion = fusionner(geosSource[src]);
        const geoTrace = garde(new THREE.EdgesGeometry(fusion, 28));
        fusion.dispose();
        const matTrace = garde(
          new THREE.LineBasicMaterial({
            color: teinte[src],
            transparent: true,
            opacity: 0.75,
            depthWrite: false,
          })
        );
        matTrace.userData = { opaciteBase: 0.75, sansProfondeur: true };
        const trace = new THREE.LineSegments(geoTrace, matTrace);
        trace.renderOrder = ORDRE.lisere;
        groupe.add(trace);
        materiaux.push(matTrace);
        tracesSource[src] = trace;
      });
    }

    scene.add(groupe);
    niveaux.push({ niveau, groupe, sols, volumes, materiaux, tracesSource });
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
    mesh.renderOrder = ORDRE.volume;
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

  /* Passe initiale : sans elle, `transparent` et `depthWrite` gardent leurs
     valeurs de construction jusqu'au premier fondu de niveau, et les planchers
     restent dans la file translucide alors qu'ils sont pleins. */
  for (const ng of niveaux) for (const mat of ng.materiaux) poserOpacite(mat, 1);
  for (const mesh of exterieur.children)
    poserOpacite((mesh as THREE.Mesh).material as THREE.Material, 1);

  return {
    scene,
    niveaux,
    exterieur,
    reperes,
    jetables,
    texturesPretes: Promise.all(attentes).then(() => undefined),
    volumes: volumesConstruits,
  };
}
