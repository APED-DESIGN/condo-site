/**
 * Projection des panoramas de la visite sur la géométrie de la cartographie.
 *
 * ── Le principe ────────────────────────────────────────────────────────────
 * Chaque point de visite est une caméra panoramique dont on connaît la
 * position dans le plan. Pour un fragment de sol ou de mur, on calcule la
 * direction depuis cette caméra vers le fragment, on la convertit en
 * coordonnées équirectangulaires, et on échantillonne le panorama. Le sol
 * reçoit donc son vrai plancher, les murs leur vraie couleur, et les meubles
 * s'y écrasent — aplatis, mais reconnaissables.
 *
 * C'est du *projective texture mapping*. Ce n'est pas une reconstruction :
 * la géométrie reste le schéma extrudé, seule sa peau devient réelle.
 *
 * ── Ce qu'il fallait résoudre ──────────────────────────────────────────────
 * Un panorama n'a pas de nord. Son 0° est le centre arbitraire de l'image
 * (`NOTES_DEV.md:45` : « PoseHeadingDegrees = 0 partout »). Pour le projeter,
 * il faut savoir dans quelle direction du monde pointe ce centre.
 *
 * On la DÉRIVE, on ne l'ajuste pas à l'œil : pour chaque nœud, on connaît le
 * yaw calibré vers chacun de ses voisins, et la direction de ce voisin dans le
 * plan. L'orientation du panorama est la moyenne circulaire des écarts entre
 * les deux, prise sur tous ses liens. Un nœud à quatre liens est donc contraint
 * quatre fois.
 *
 * Le résidu de cet ajustement mesure l'accord entre le plan schématique et les
 * angles calibrés — il est exporté, et il est honnête qu'il ne soit pas nul.
 */

import * as THREE from "three";
import { maison01, type Node360 } from "@/data/tours/maison-01";
import {
  ESPACES,
  EXTERIEURS,
  U_PAR_M_HAUT,
  U_PAR_M_PLAN,
  altitude,
  centre,
  contient,
  uHaut,
  type Pt,
} from "@/data/tours/maison-01-plan";
import { versMonde } from "./scene-repere";

/**
 * Hauteur de la caméra au-dessus du plancher.
 *
 * ⚠️ Ce n'est PAS une mesure : la hauteur du trépied n'a jamais été relevée
 * (c'est justement la mesure qui aurait permis de mettre une reconstruction à
 * l'échelle — voir analyse/recherche-3d.md §5.1). 1,45 m est la hauteur de
 * travail courante d'un trépied de capture panoramique. Elle sert au rendu,
 * elle n'est jamais affichée.
 */
export const H_CAMERA = uHaut(1.45);

/**
 * Correction d'anisotropie du plan.
 *
 * Le plan n'a pas la même échelle à l'horizontale et à la verticale — deux
 * hypothèses distinctes, assumées dans maison-01-plan.ts. Une direction
 * calculée naïvement dans ce repère est donc FAUSSE : un point du plancher à
 * cinq mètres de la caméra y paraît à 10° sous l'horizon alors qu'il y est à
 * 14°. On échantillonne alors la bande du panorama qui montre les murs et les
 * fenêtres au lieu de celle qui montre le sol — d'où l'étoilement des textures
 * autour de chaque point de vue.
 *
 * Remettre la composante verticale à l'échelle horizontale rétablit l'angle
 * réel. Ce n'est pas un réglage à l'œil : c'est la conversion qui manquait.
 */
export const ANISOTROPIE = U_PAR_M_PLAN / U_PAR_M_HAUT;

const rad = (d: number) => (d * Math.PI) / 180;

/** Relèvement d'une direction monde. 0 = vers −z, positif vers +x. */
export const relevement = (dx: number, dz: number) => Math.atan2(dx, -dz);

/** Moyenne circulaire d'angles en radians. */
function moyenneCirculaire(angles: number[]): { angle: number; dispersion: number } {
  let sx = 0;
  let sy = 0;
  for (const a of angles) {
    sx += Math.cos(a);
    sy += Math.sin(a);
  }
  const angle = Math.atan2(sy, sx);
  const r = Math.sqrt(sx * sx + sy * sy) / Math.max(1, angles.length);
  /* 1 − R : 0 = accord parfait, 1 = directions contradictoires. */
  return { angle, dispersion: 1 - r };
}

export type Camera360 = {
  id: string;
  /** Position monde de la prise de vue. */
  position: THREE.Vector3;
  /** Direction monde du centre de l'image, en radians. */
  orientation: number;
  /** Désaccord entre le plan et les yaw calibrés, 0 = parfait. */
  dispersion: number;
  /** Base de fichier du panorama. */
  fichier: string;
};

/** Position d'un nœud dans le plan : sa `map` si elle tombe dans son espace. */
function positionPlan(noeud: Node360): Pt {
  const brut: Pt = [noeud.map.x, noeud.map.y];
  const espace =
    ESPACES.find((e) => e.noeuds.includes(noeud.id)) ??
    EXTERIEURS.find((e) => e.noeuds.includes(noeud.id));
  if (!espace) return brut;
  return contient(espace.contour, brut[0], brut[1]) ? brut : centre(espace.contour);
}

/** Altitude du plancher sous un nœud. */
function altitudeDuNoeud(noeudId: string): number {
  const espace = ESPACES.find((e) => e.noeuds.includes(noeudId));
  return espace ? altitude(espace.niveau) : 0;
}

let cacheCameras: Map<string, Camera360> | null = null;

/**
 * Les caméras panoramiques, position et orientation, dérivées du plan et des
 * yaw calibrés. Calculé une fois — 17 nœuds, 36 liens.
 */
export function cameras360(): Map<string, Camera360> {
  if (cacheCameras) return cacheCameras;

  const positions = new Map<string, Pt>();
  for (const n of maison01.nodes) positions.set(n.id, positionPlan(n));

  const out = new Map<string, Camera360>();
  for (const n of maison01.nodes) {
    const [px, py] = positions.get(n.id)!;
    const ecarts: number[] = [];
    for (const l of n.links) {
      const cible = positions.get(l.to);
      if (!cible) continue;
      const [qx, qy] = cible;
      const dx = qx - px;
      const dz = qy - py;
      if (Math.abs(dx) < 1e-6 && Math.abs(dz) < 1e-6) continue;
      /* Le voisin est à `relevement` dans le monde, et à `yaw` dans l'image :
         l'écart des deux est l'orientation du centre de l'image. */
      ecarts.push(relevement(dx, dz) - rad(l.yaw));
    }
    const { angle, dispersion } = ecarts.length
      ? moyenneCirculaire(ecarts)
      : { angle: 0, dispersion: 1 };

    const [mx, mz] = versMonde([px, py]);
    out.set(n.id, {
      id: n.id,
      position: new THREE.Vector3(mx, altitudeDuNoeud(n.id) + H_CAMERA, mz),
      orientation: angle,
      dispersion,
      fichier: n.file,
    });
  }
  cacheCameras = out;
  return out;
}

/** URL de la texture de cartographie d'un nœud. */
export const cartoUrl = (fichier: string) =>
  `${maison01.basePath}/${fichier}-carto.webp`;

/* ── Le matériau ───────────────────────────────────────────────────────────
   Deux panoramas au plus, mélangés par l'inverse du carré de la distance. Deux
   suffisent : chaque pièce fermée n'en a qu'un, et l'aire ouverte est découpée
   en zones qui ont chacune leur point de vue plus celui du centre.

   Volontairement non éclairé (pas de `lights`) : les panoramas portent DÉJÀ
   l'éclairage réel de la maison. Y rajouter une lumière de synthèse doublerait
   les ombres et trahirait la photo. */

const VERTEX = /* glsl */ `
  varying vec3 vMonde;
  varying vec3 vNormale;
  void main() {
    vec4 monde = modelMatrix * vec4(position, 1.0);
    vMonde = monde.xyz;
    vNormale = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * monde;
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;

  uniform sampler2D panoA;
  uniform sampler2D panoB;
  uniform vec3  posA;
  uniform vec3  posB;
  uniform float capA;
  uniform float capB;
  uniform float deuxPanos;
  uniform float opacite;
  uniform float eclat;
  uniform float anisoY;
  uniform vec3  teinteSurvol;
  uniform float survol;

  varying vec3 vMonde;
  varying vec3 vNormale;

  const float PI = 3.141592653589793;

  vec2 equirect(vec3 dir, float cap) {
    // Relèvement de la direction, ramené dans le repère de l'image.
    float lambda = atan(dir.x, -dir.z) - cap;
    float phi = asin(clamp(dir.y, -1.0, 1.0));
    float u = lambda / (2.0 * PI) + 0.5;
    // three.js téléverse les textures avec flipY = true : v = 1 est le HAUT de
    // l'image source (le ciel), v = 0 le bas (le plancher). Une direction qui
    // descend doit donc tendre vers 0, pas vers 1.
    float v = 0.5 + phi / PI;
    return vec2(fract(u), clamp(v, 0.002, 0.998));
  }

  void main() {
    // Le plan n'a pas la même échelle en hauteur qu'au sol : on ramène la
    // composante verticale à celle du sol avant de calculer l'angle, sans quoi
    // le plancher lointain va chercher sa couleur dans les murs.
    vec3 dA = vMonde - posA;
    vec3 dB = vMonde - posB;
    dA.y *= anisoY;
    dB.y *= anisoY;
    float lA = max(length(dA), 0.001);
    float lB = max(length(dB), 0.001);

    vec3 cA = texture2D(panoA, equirect(dA / lA, capA)).rgb;
    vec3 couleur = cA;

    if (deuxPanos > 0.5) {
      vec3 cB = texture2D(panoB, equirect(dB / lB, capB)).rgb;
      // Poids par l'inverse du carré de la distance : le point de vue le plus
      // proche domine, et la couture entre zones se fond.
      float wA = 1.0 / (lA * lA);
      float wB = 1.0 / (lB * lB);
      couleur = (cA * wA + cB * wB) / (wA + wB);
    }

    // Léger relief : les faces qui regardent vers le haut sont à peine
    // éclaircies, celles qui regardent vers le bas assombries. Pas d'ombre
    // portée, pas de spéculaire — la lumière réelle est déjà dans la photo.
    float pente = vNormale.y * 0.5 + 0.5;
    couleur *= mix(0.94, 1.16, pente) * eclat;

    couleur = mix(couleur, teinteSurvol, survol * 0.28);

    gl_FragColor = vec4(couleur, opacite);
    #include <colorspace_fragment>
  }
`;

export type MateriauProjete = THREE.ShaderMaterial & {
  userData: { opaciteBase: number; estProjete: true };
};

export function creerMateriauProjete(
  a: Camera360,
  texA: THREE.Texture,
  b?: Camera360,
  texB?: THREE.Texture
): MateriauProjete {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      panoA: { value: texA },
      panoB: { value: texB ?? texA },
      posA: { value: a.position.clone() },
      posB: { value: (b ?? a).position.clone() },
      capA: { value: a.orientation },
      capB: { value: (b ?? a).orientation },
      deuxPanos: { value: b && texB ? 1 : 0 },
      opacite: { value: 1 },
      /* Les panoramas d'intérieur sont exposés pour la visite immersive, où
         l'on regarde droit devant. Vus en plongée, ils rendent sombre : on
         relève légèrement. */
      eclat: { value: 1.18 },
      anisoY: { value: ANISOTROPIE },
      teinteSurvol: { value: new THREE.Color(0xffe6c8) },
      survol: { value: 0 },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    side: THREE.DoubleSide,
  });
  mat.userData = { opaciteBase: 1, estProjete: true };
  return mat as MateriauProjete;
}

/* ── Les murs ──────────────────────────────────────────────────────────────
 *
 * Les murs ne sont PAS texturés, et c'est délibéré. Une cloison à 20 %
 * d'opacité portant une photo ne donne ni la photo ni la cloison : elle donne
 * une bouillie. Ce qui doit se lire d'un mur en cartographie, c'est où il
 * passe — la matière, elle, est sur le plancher et sur les volumes.
 *
 * Ils s'effacent en plus quand ils s'interposent. `sortie` est la normale du
 * mur orientée vers l'extérieur du bâti ; quand elle regarde vers l'œil, le
 * mur est entre l'œil et la pièce, et il descend à `aDevant`. Le calcul est
 * par fragment et se refait à chaque image : la vue s'ouvre pendant qu'on
 * tourne, sans à-coup et sans qu'aucun état ne soit à tenir à jour.
 */

const VERTEX_MUR = /* glsl */ `
  attribute vec3 sortie;
  varying vec3 vMonde;
  varying vec3 vSortie;
  void main() {
    vec4 monde = modelMatrix * vec4(position, 1.0);
    vMonde = monde.xyz;
    vSortie = normalize(mat3(modelMatrix) * sortie);
    gl_Position = projectionMatrix * viewMatrix * monde;
  }
`;

const FRAGMENT_MUR = /* glsl */ `
  precision highp float;

  uniform vec3  teinte;
  uniform float aBase;
  uniform float aDevant;
  uniform float opacite;

  varying vec3 vMonde;
  varying vec3 vSortie;

  void main() {
    vec3 versCam = normalize(cameraPosition - vMonde);
    // 1 = le mur nous fait face, 0 = on le voit par la tranche.
    float devant = dot(normalize(vSortie), versCam);
    float a = mix(aBase, aDevant, smoothstep(0.08, 0.62, devant));
    gl_FragColor = vec4(teinte, a * opacite);
    #include <colorspace_fragment>
  }
`;

export function creerMateriauMur(): THREE.ShaderMaterial {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      /* Presque blanc : le mur est une surface de lecture, pas une masse. */
      teinte: { value: new THREE.Color(0xf2efe9) },
      /* Un mur est un pavé, pas une feuille : en DoubleSide on traverse DEUX
         peaux, celle du dehors et celle du dedans. L'opacité VUE est donc
         1 − (1 − a)², et ce sont ces valeurs-là qui doivent tomber dans la
         fourchette voulue — 0,12 par peau donne 0,23 à l'écran, 0,042 donne
         0,08. Mettre 0,22 par peau donnerait 0,39, soit le mur opaque qu'on
         corrige ici. */
      aBase: { value: 0.12 },
      aDevant: { value: 0.042 },
      opacite: { value: 1 },
    },
    vertexShader: VERTEX_MUR,
    fragmentShader: FRAGMENT_MUR,
    transparent: true,
    /* Sans quoi un mur proche masquerait dans le tampon de profondeur tout ce
       qu'il laisse pourtant voir. */
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  mat.userData = { opaciteBase: 1, sansProfondeur: true };
  return mat;
}

/** Diagnostic : accord entre le plan schématique et les yaw calibrés. */
export function diagnosticOrientations(): {
  pire: { id: string; dispersion: number };
  moyenne: number;
} {
  const cams = Array.from(cameras360().values());
  let pire = cams[0];
  let somme = 0;
  for (const c of cams) {
    somme += c.dispersion;
    if (c.dispersion > pire.dispersion) pire = c;
  }
  return {
    pire: { id: pire.id, dispersion: pire.dispersion },
    moyenne: somme / cams.length,
  };
}
