/**
 * ⚠️ PLAN SCHÉMATIQUE — PAS UN PLAN D'ARCHITECTE, PAS UNE MESURE.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Ce fichier décrit la disposition des espaces de la maison-01 en UNITÉS DE
 * PLAN ARBITRAIRES. Aucune valeur ici n'est une longueur, une superficie ou
 * une distance. Il n'existe aucune mesure de cette propriété dans le projet
 * (voir analyse/inventaire-3d.md §5) et rien n'a été inventé pour compenser.
 *
 * Ce qu'il est : une maquette de circulation, cohérente avec trois sources
 * réelles —
 *   1. la topologie du graphe de visite   (data/tours/maison-01.ts, 18 liens
 *      réciproques validés au build) ;
 *   2. les positions relatives posées par l'auteur du mini-plan  (`map.x/y`
 *      de chaque nœud, reprises telles quelles, sans être retouchées) ;
 *   3. les relèvements `yaw` calibrés à la capture, résolus en repère commun
 *      (résidu de fermeture de boucle : 24° et 41°, tous deux dans l'aire
 *      ouverte — les flèches visent un lieu de passage, pas un centre de
 *      pièce).
 *
 * Ce qu'il n'est pas : une reconstruction. Il ne peut donc alimenter aucun
 * affichage de cote, de superficie ou de distance. Le mode « mesures » n'est
 * pas implémenté, et ne doit pas l'être à partir d'ici.
 *
 * HYPOTHÈSE ASSUMÉE — repère partagé. Les `map.x/y` de `maison-01.ts` sont
 * documentés comme des pourcentages « du panneau de sa zone » : les trois
 * zones (rdc / étage / extérieur) ont formellement des repères indépendants.
 * On fait ici l'hypothèse qu'elles partagent le même, ce que la donnée
 * corrobore pour rdc↔étage (hall 50,62 sous palier 50,60 : la cage d'escalier
 * s'aligne). Pour l'extérieur elle ne tient pas — terrasse(62,44) tomberait
 * au milieu du salon — donc les quatre espaces extérieurs sont posés ici
 * d'après les légendes (« Terrasse arrière », « Façade avant ») et le graphe,
 * pas d'après leurs `map`.
 *
 * Convention : x vers l'est, y vers le SUD (comme les `map`, origine en haut).
 * L'avant de la maison est en y croissant, l'arrière en y décroissant.
 */

import type { Floor360 } from "./maison-01";

export type Pt = readonly [number, number];

/** Niveaux bâtis. L'extérieur n'est pas un niveau : c'est le sol. */
export type Niveau = "rdc" | "etage";

export type Espace = {
  id: string;
  nom: string;
  niveau: Niveau;
  /** Polygone fermé, sens horaire, en unités de plan. RECTANGLE attendu. */
  contour: readonly Pt[];
  /** Nœuds 360 situés dans cet espace. Vide = espace non photographié. */
  noeuds: readonly string[];
  /**
   * Zones d'un même volume sans cloison. Deux espaces qui partagent un
   * `groupeOuvert` ne sont pas séparés par un mur : c'est ce qui rend l'aire
   * ouverte lisible d'un seul regard, comme dans la vraie maison.
   */
  groupeOuvert?: string;
  /**
   * Point de vue d'appoint pour la projection des panoramas, mélangé au sien
   * par l'inverse du carré de la distance. Sert à fondre les coutures entre
   * zones d'un même volume ouvert.
   */
  noeudAppoint?: string;
  /** Trémie / vide sur l'étage inférieur : plancher percé, pas de sol rendu. */
  vide?: boolean;
};

export type EspaceExterieur = {
  id: string;
  nom: string;
  contour: readonly Pt[];
  noeuds: readonly string[];
  /** Nature du sol, pour la teinte de rendu. */
  nature: "terrasse" | "eau" | "dalle" | "terrain";
};

/* ── Hauteurs, en unités de plan ───────────────────────────────────────────
   Proportions visuelles uniquement. Choisies pour que le volume ait l'allure
   d'une maison à deux niveaux. Jamais affichées, jamais converties en mètres. */
export const H_NIVEAU = 9;      // hauteur d'un niveau
export const EP_PLANCHER = 1;   // épaisseur de dalle entre niveaux
export const EP_MUR = 1.2;      // épaisseur de cloison

/** Altitude du plancher d'un niveau. */
export const altitude = (n: Niveau): number =>
  n === "rdc" ? 0 : H_NIVEAU + EP_PLANCHER;

/* ── Rez-de-chaussée ───────────────────────────────────────────────────────
   Pavage exact de l'emprise x∈[20,86], y∈[14,88]. */
export const ESPACES: readonly Espace[] = [
  /* L'aire ouverte est UN volume, découpé en quatre zones pour la projection :
     chaque zone reçoit son propre point de vue. Aucun mur ne les sépare —
     c'est ce que dit la légende du nœud : « cuisine, salle à manger et salon
     d'un seul regard ». */
  {
    id: "cuisine",
    nom: "Cuisine",
    niveau: "rdc",
    contour: [[20, 14], [53, 14], [53, 32], [20, 32]],
    noeuds: ["cuisine"],
    groupeOuvert: "aire",
    noeudAppoint: "aire-ouverte",
  },
  {
    id: "salle-manger",
    nom: "Salle à manger",
    niveau: "rdc",
    contour: [[53, 14], [86, 14], [86, 32], [53, 32]],
    noeuds: ["salle-manger"],
    groupeOuvert: "aire",
    noeudAppoint: "aire-ouverte",
  },
  {
    id: "sejour",
    nom: "Aire ouverte",
    niveau: "rdc",
    contour: [[20, 32], [64, 32], [64, 50], [20, 50]],
    noeuds: ["aire-ouverte"],
    groupeOuvert: "aire",
  },
  {
    id: "salon",
    nom: "Salon",
    niveau: "rdc",
    contour: [[64, 32], [86, 32], [86, 50], [64, 50]],
    noeuds: ["salon"],
    groupeOuvert: "aire",
    noeudAppoint: "aire-ouverte",
  },
  {
    id: "escalier",
    nom: "Escalier",
    niveau: "rdc",
    contour: [[20, 50], [42, 50], [42, 72], [20, 72]],
    noeuds: ["escalier"],
  },
  {
    id: "hall",
    nom: "Hall",
    niveau: "rdc",
    contour: [[42, 50], [64, 50], [64, 72], [42, 72]],
    noeuds: ["hall"],
  },
  {
    id: "salle-eau",
    nom: "Salle d'eau",
    niveau: "rdc",
    contour: [[64, 50], [86, 50], [86, 72], [64, 72]],
    noeuds: ["salle-eau"],
  },
  {
    id: "vestibule",
    nom: "Vestibule",
    niveau: "rdc",
    contour: [[42, 72], [64, 72], [64, 88], [42, 88]],
    noeuds: ["entree"],
  },
  /* Documentées comme non photographiées — NOTES_DEV.md §9.5. Rendues, mais
     jamais présentées comme visitables. */
  {
    id: "garage",
    nom: "Garage",
    niveau: "rdc",
    contour: [[64, 72], [86, 72], [86, 88], [64, 88]],
    noeuds: [],
  },
  {
    id: "rangement-rdc",
    nom: "Rangement",
    niveau: "rdc",
    contour: [[20, 72], [42, 72], [42, 88], [20, 88]],
    noeuds: [],
  },

  /* ── Étage ───────────────────────────────────────────────────────────────
     Emprise x∈[20,86], y∈[14,72] : l'étage ne couvre pas l'avant du rez. */
  {
    id: "chambre",
    nom: "Chambre",
    niveau: "etage",
    contour: [[20, 14], [42, 14], [42, 34], [20, 34]],
    noeuds: ["chambre"],
  },
  {
    id: "sdb-principale",
    nom: "Salle de bain principale",
    niveau: "etage",
    contour: [[20, 34], [42, 34], [42, 52], [20, 52]],
    noeuds: ["sdb-principale"],
  },
  {
    id: "corridor-etage",
    nom: "Corridor",
    niveau: "etage",
    contour: [[42, 14], [64, 14], [64, 52], [42, 52]],
    noeuds: ["corridor-etage"],
  },
  {
    id: "chambre-principale",
    nom: "Chambre principale",
    niveau: "etage",
    contour: [[64, 14], [86, 14], [86, 34], [64, 34]],
    noeuds: [],
  },
  {
    id: "chambre-3",
    nom: "Chambre",
    niveau: "etage",
    contour: [[64, 34], [86, 34], [86, 52], [64, 52]],
    noeuds: [],
  },
  {
    id: "palier",
    nom: "Palier & mezzanine",
    niveau: "etage",
    contour: [[42, 52], [64, 52], [64, 72], [42, 72]],
    noeuds: ["palier-etage"],
  },
  {
    id: "coin-lecture",
    nom: "Coin lecture",
    niveau: "etage",
    contour: [[64, 52], [86, 52], [86, 72], [64, 72]],
    noeuds: ["mezzanine-fenetre"],
  },
  {
    /* La mezzanine est ouverte sur le hall : trémie au-dessus de l'escalier. */
    id: "tremie",
    nom: "Vide sur l'escalier",
    niveau: "etage",
    contour: [[20, 52], [42, 52], [42, 72], [20, 72]],
    noeuds: [],
    vide: true,
  },
];

/* ── Extérieur ─────────────────────────────────────────────────────────────
   Posé d'après les légendes et le graphe, PAS d'après les `map` (voir
   l'hypothèse en tête de fichier). Terrasse et piscine à l'arrière (y < 14),
   porche et façade à l'avant (y > 88). */
export const EXTERIEURS: readonly EspaceExterieur[] = [
  {
    id: "piscine",
    nom: "Piscine & cour arrière",
    contour: [[26, -40], [76, -40], [76, -12], [26, -12]],
    noeuds: ["piscine"],
    nature: "eau",
  },
  {
    id: "terrasse",
    nom: "Terrasse arrière",
    contour: [[30, -12], [72, -12], [72, 14], [30, 14]],
    noeuds: ["terrasse"],
    nature: "terrasse",
  },
  {
    id: "porche",
    nom: "Porche d'entrée",
    contour: [[42, 88], [64, 88], [64, 100], [42, 100]],
    noeuds: ["porche"],
    nature: "dalle",
  },
  {
    id: "avant",
    nom: "Façade avant",
    contour: [[16, 100], [90, 100], [90, 124], [16, 124]],
    noeuds: ["facade"],
    nature: "terrain",
  },
];

/* ── Index et aides ────────────────────────────────────────────────────────── */

/** Espace (intérieur ou extérieur) contenant un nœud 360 donné. */
export const espaceDuNoeud = (
  noeudId: string
): Espace | EspaceExterieur | undefined =>
  ESPACES.find((e) => e.noeuds.includes(noeudId)) ??
  EXTERIEURS.find((e) => e.noeuds.includes(noeudId));

/** Centroïde d'un polygone, en unités de plan. */
export function centre(contour: readonly Pt[]): Pt {
  let x = 0;
  let y = 0;
  for (const [px, py] of contour) {
    x += px;
    y += py;
  }
  return [x / contour.length, y / contour.length];
}

/** Un point est-il dans le polygone ? (lancer de rayon) */
export function contient(contour: readonly Pt[], px: number, py: number): boolean {
  let dedans = false;
  for (let i = 0, j = contour.length - 1; i < contour.length; j = i++) {
    const [xi, yi] = contour[i];
    const [xj, yj] = contour[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)
      dedans = !dedans;
  }
  return dedans;
}

/** Emprise totale, extérieur compris — sert à cadrer la caméra. */
export const EMPRISE = { xMin: 16, xMax: 90, yMin: -40, yMax: 124 } as const;

/** Étage 360 → niveau bâti. L'extérieur se rattache au rez pour l'altitude. */
export const niveauDeZone = (z: Floor360): Niveau =>
  z === "etage" ? "etage" : "rdc";

/* ── Garde-fou de cohérence, appelé au build ───────────────────────────────
   Le plan et le graphe de visite doivent parler des mêmes nœuds. Si l'un
   bouge sans l'autre, `next build` casse — même contrat que validateTour(). */
export function validerPlan(nodeIds: readonly string[]): void {
  const places = [
    ...ESPACES.flatMap((e) => e.noeuds),
    ...EXTERIEURS.flatMap((e) => e.noeuds),
  ];
  const doublons = places.filter((id, i) => places.indexOf(id) !== i);
  if (doublons.length)
    throw new Error(`[plan maison-01] nœud placé deux fois : ${doublons.join(", ")}`);

  for (const id of places)
    if (!nodeIds.includes(id))
      throw new Error(`[plan maison-01] nœud inconnu du graphe de visite : ${id}`);

  const manquants = nodeIds.filter((id) => !places.includes(id));
  if (manquants.length)
    throw new Error(`[plan maison-01] nœud sans espace : ${manquants.join(", ")}`);
}
