/** Types du moteur de visite. Le manifest est produit par scripts/extract-frames.mjs. */

export type Variant = "desktop" | "mobile";

export interface VariantInfo {
  width: number;
  height: number;
  path: string;
  frameCount: number;
  bytes: number;
  avgBytes: number;
  maxBytes: number;
}

export interface Panel {
  piece?: string;
  /** Sur-titre en petites capitales espacées, au-dessus du titre. */
  surTitre?: string;
  /** Titre display, une entrée par ligne. Deux lignes maximum. */
  titre?: string[] | string | null;
  ligne?: string;
  /** Trois faits maximum. Un fait, une conséquence concrète. Aucun chiffre en dur. */
  faits?: string[];
  /** Côté de l'écran où le panneau d'image se rétracte. Alterne d'un arrêt à l'autre. */
  cote?: "droite" | "gauche";
  afficherPrix?: boolean;
}

/** Netteté d'une image d'arrêt — mesurée, pas estimée. */
export interface Nettete {
  demande: number;
  retenue: number;
  score: number;
  scoreDemande: number;
  candidates: number;
  /** Demi-largeur de la fenêtre de recherche, en secondes. */
  fenetre?: number;
  /** true quand les segments voisins ont raccourci la fenêtre de recherche. */
  fenetreBridee?: boolean;
  seuil: number;
  sousLeSeuil: boolean;
}

export interface Arret {
  frame: number;
  file: string;
  width: number;
  height: number;
  bytes: number;
  nettete: Nettete | null;
}

export type Chapter =
  | { id: string; type: "hold"; frame: number; scrollVh: number; panel?: Panel; bascule?: never }
  | {
      id: string;
      type: "move";
      frames: [number, number];
      scrollVh: number;
      ease?: "linear" | "decelerate";
      bascule?: { de: number; vers: number };
      panel?: never;
    };

export interface Manifest {
  slug: string;
  generatedFrom: string;
  generatedOn?: string;
  fps: number;
  frameCount: number;
  indexOffset: number;
  pattern: string;
  aspect: number;
  /** Toujours false depuis le correctif : la visite couvre la source sans coupe. */
  coupe: boolean;
  sourceDuration: number;
  repair: string | string[];
  traitements: { id: string; t0: number; t1: number; type: string; raison?: string }[];
  nettete: {
    mesure: string;
    fenetre: number;
    grille: string;
    mediane: number;
    seuil: number;
    sousLeSeuil: string[];
  };
  variants: Record<string, VariantInfo>;
  /** Images d'arrêt en haute définition, clé = id du chapitre. */
  arrets: Record<string, Arret>;
  /** Image de fond de l'accueil = image 0 de la séquence, en haute définition. */
  accueil: Arret | null;
  chapters: Chapter[];
  totalScrollVh: number;
  rythmeGlobal: number;
  preloadFrames: number;
  warnings: string[];
}

/* ── fiche technique ────────────────────────────────────────────────────────
   Règle du projet : aucun chiffre plausible inventé. Une valeur inconnue vaut
   null avec status "TODO", et se rend « — ». Voir lib/visite/fiche.ts. */

export type Statut = "OK" | "TODO";
export interface Champ<T = unknown> {
  v: T | null;
  status: Statut;
  src: string;
  unite?: string;
}

export interface PieceFiche {
  id: string;
  nom: string;
  niveau: number;
  superficiePi2: Champ<number>;
  dimensionsM: Champ<string>;
  orientation?: Champ<string>;
  ilotM?: Champ<number>;
  gardeRobeM?: Champ<number>;
  finis: Champ<string>[];
}

export interface LieuQuartier {
  id: string;
  nom: string;
  minutes: Champ<number>;
}

export interface Accueil {
  surTitre: string;
  titre: string[];
  ligne: string;
  ctaPrimaire: string;
  ctaSecondaire: string;
  /**
   * Identifiant de l'image de fond dans `manifest.arrets`.
   * « _accueil » = image 0 de la séquence : raccord accueil → canvas invisible.
   */
  image?: string;
}

export interface Fiche {
  slug: string;
  accueil: Accueil;
  propriete: Record<string, Champ>;
  contact: Record<string, Champ>;
  courtier: Record<string, Champ>;
  quartier: { lieux: LieuQuartier[] };
  pieces: PieceFiche[];
}

/* ── instrumentation ────────────────────────────────────────────────────────
   Exposée sur `window.__visite` par le moteur. Sert à scripts/test-visite.mjs
   (fluidité, fuites mémoire, stabilité des `hold`) et au débogage manuel. */

export interface VisiteHandle {
  ready: boolean;
  decodeKind: "worker" | "inline";
  frameCount: number;
  totalVh: number;
  segments: {
    id: string;
    type: "hold" | "move";
    vhStart: number;
    vhEnd: number;
    frameFrom: number;
    frameTo: number;
    /** Pièce de fiche.json à mettre en évidence sur le plan. */
    piece?: string;
    /** Changement de niveau à mi-segment (l'escalier). */
    bascule?: { de: number; vers: number };
  }[];
  progress(): number;
  frame(): number;
  drawn(): number;
  /** Rétraction du cadre : 0 = plein écran, 1 = panneau contenu. */
  retrait(): number;
  /** Nombre de redimensionnements du canvas depuis le montage. Doit rester stable pendant l'animation. */
  canvasResizes(): number;
  stats(): {
    held: number;
    inflight: number;
    bytesLoaded: number;
    framesFetched: number;
    failed: number;
    maxBitmaps: number;
    decodedMo: number;
  };
  scrollRange(): [number, number];
}

declare global {
  interface Window {
    __visite?: VisiteHandle;
  }
}
