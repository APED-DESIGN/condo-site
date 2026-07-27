/**
 * Le cadre qui se rétracte.
 *
 * État A — mouvement : l'image occupe tout l'écran, bord à bord.
 * État B — arrêt     : elle se rétracte en un panneau contenu, du fond visible
 *                      tout autour, le texte à côté.
 *
 * CONTRAINTE DURE : le canvas n'est JAMAIS redimensionné pendant l'animation.
 * On anime un conteneur en `transform` + `clip-path`, tous deux composités par
 * le GPU. Le contenu du canvas ne change pas d'un pixel pendant la transition —
 * seul son cadrage change.
 *
 * Sur mobile, la rétraction ne peut pas être une simple homothétie : un panneau
 * à 54 % sur un écran de 390 px ne laisse la place ni à l'image ni au texte.
 * On y garde donc la pleine largeur et on rogne le bas au `clip-path`, ce qui
 * libère une bande pour le texte sans déformer l'image et sans redessiner.
 */

export interface Geometrie {
  /** Facteur d'échelle du conteneur. */
  scale: number;
  /** Translation en pixels. */
  tx: number;
  ty: number;
  /** clip-path inset, en pourcentage de l'élément : [haut, droite, bas, gauche]. */
  inset: [number, number, number, number];
  /** Rayon des coins, en pixels À L'ÉCRAN (déjà compensé de l'échelle). */
  radius: number;
  /**
   * true quand le `clip-path` ne change pas pendant l'animation.
   *
   * Ce n'est pas un détail. Firefox ne composite pas une animation de
   * `clip-path` : il repeint la couche à chaque image, et on est monté à 50 ms
   * au 95ᵉ centile pendant la rétraction. En rendant le clip STATIQUE — un
   * rayon constant, choisi pour rendre 6 px une fois le panneau réduit — il ne
   * reste plus que `transform` à animer, et `transform` est composité partout.
   * Au plein écran, ces coins arrondis tombent dans les coins de l'écran :
   * personne ne les voit.
   */
  radiusFixe?: boolean;
}

export interface ZoneTexte {
  /** Position de la colonne de texte, en pourcentage du viewport. */
  left: number;
  width: number;
  /** true quand le texte passe sous l'image (mobile). */
  dessous: boolean;
  top: number;
  height: number;
}

/** Repères de l'état rétracté. Rien ici n'est propre à une propriété. */
export const RETRACTE = {
  bureau: {
    /** L'image ne touche jamais les bords : 54 % de l'écran, marge de 4 %. */
    scale: 0.54,
    marge: 0.04,
    /* Mettre 0 supprime le clip-path : mesuré sur Firefox, ça ne gagne que
       50 → 42 ms au 95ᵉ centile pendant la rétraction. Le clip n'est donc pas
       la cause principale de son irrégularité, et les coins arrondis valent
       mieux que ces 8 ms. */
    radius: 6,
  },
  mobile: {
    scale: 0.94,
    /** Part de la hauteur rognée, en pourcentage de l'élément. */
    bas: 40,
    haut: 6,
    /** Marge au-dessus de la bande visible, en fraction de la hauteur d'écran. */
    margeHaut: 0.08,
    radius: 6,
  },
  /** En dessous de cette largeur, disposition mobile. */
  seuilMobile: 900,
};

export function estMobile(w: number) {
  return w < RETRACTE.seuilMobile;
}

/**
 * État mobile pour une rétraction donnée, et la position exacte du bas de la
 * bande visible — d'où le texte peut commencer.
 *
 * Le clip s'applique dans le repère de l'élément, la transformation après. Il
 * faut donc résoudre la translation pour que le HAUT de la bande visible tombe
 * où on veut. Sans ça la bande sort de l'écran par le haut.
 *
 *   y' = (y − h/2) · s + h/2 + ty
 */
function mobileEtat(r: number) {
  const m = RETRACTE.mobile;
  const scale = 1 + (m.scale - 1) * r;
  const haut = m.haut * r;
  const bas = m.bas * r;
  const marge = m.margeHaut * r;
  // ty tel que le haut de la bande visible tombe à `marge` du haut de l'écran.
  const tyFrac = marge - (haut / 100 - 0.5) * scale - 0.5;
  const basVisible = (1 - bas / 100 - 0.5) * scale + 0.5 + tyFrac;
  return { scale, haut, bas, tyFrac, basVisible, radius: m.radius * r };
}

/**
 * Géométrie du cadre pour une rétraction donnée.
 * @param r      0 = plein écran, 1 = panneau contenu
 * @param cote   côté de l'écran vers lequel le panneau se range
 */
export function geometrie(r: number, w: number, h: number, cote: "droite" | "gauche"): Geometrie {
  if (r <= 0) return { scale: 1, tx: 0, ty: 0, inset: [0, 0, 0, 0], radius: 0 };

  if (estMobile(w)) {
    const { scale, haut, bas, tyFrac, radius } = mobileEtat(r);
    return { scale, tx: 0, ty: tyFrac * h, inset: [haut, 0, bas, 0], radius };
  }

  const b = RETRACTE.bureau;
  const scale = 1 + (b.scale - 1) * r;
  // Bord du panneau collé à `marge` du bord de l'écran, origine au centre.
  const cible = (w * (1 - b.scale)) / 2 - b.marge * w;
  const tx = (cote === "gauche" ? -cible : cible) * r;
  return { scale, tx, ty: 0, inset: [0, 0, 0, 0], radius: b.radius, radiusFixe: true };
}

/** Zone laissée libre pour la colonne de texte, dans le même repère. */
export function zoneTexte(w: number, cote: "droite" | "gauche"): ZoneTexte {
  if (estMobile(w)) {
    // Le texte commence juste sous la bande d'image, calculée avec les mêmes
    // constantes que la rétraction : une seule source de vérité.
    const top = (mobileEtat(1).basVisible + 0.03) * 100;
    return { left: 6, width: 88, dessous: true, top, height: Math.max(20, 100 - top - 3) };
  }
  const b = RETRACTE.bureau;
  // Largeur restante entre le bord de l'écran et le panneau, moins les marges.
  const libre = 1 - b.scale - b.marge;
  const width = (libre - 0.11) * 100;
  const left = cote === "gauche" ? (b.scale + b.marge + 0.055) * 100 : 5.5;
  return { left, width, dessous: false, top: 0, height: 100 };
}

/** Chaîne CSS prête à écrire. Deux propriétés, toutes deux composités par le GPU. */
export function styleCadre(g: Geometrie) {
  const [t, r, b, l] = g.inset;
  const transform = `translate3d(${g.tx.toFixed(2)}px, ${g.ty.toFixed(2)}px, 0) scale(${g.scale.toFixed(4)})`;

  // Le rayon subit l'échelle du conteneur : on le pré-divise pour qu'il rende
  // la bonne valeur à l'écran. Quand il est fixe, on le calcule à l'échelle
  // RÉTRACTÉE — le clip devient alors constant, donc jamais recalculé.
  if (g.radiusFixe) {
    if (g.radius === 0) return { transform, clipPath: "none" };
    const rayon = (g.radius / RETRACTE.bureau.scale).toFixed(2);
    return { transform, clipPath: `inset(0px round ${rayon}px)` };
  }

  if (g.radius === 0 && t === 0 && r === 0 && b === 0 && l === 0)
    return { transform, clipPath: "none" };

  const rayon = g.radius > 0 ? ` round ${(g.radius / g.scale).toFixed(2)}px` : "";
  return {
    transform,
    clipPath: `inset(${t.toFixed(2)}% ${r.toFixed(2)}% ${b.toFixed(2)}% ${l.toFixed(2)}%${rayon})`,
  };
}
