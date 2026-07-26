/**
 * Visite virtuelle 360° — Maison-01 (maison unifamiliale avec piscine).
 *
 * ⭐ Fichier unique de vérité : ajouter une pièce = ajouter un objet `Node360`
 * ici + déposer ses 4 images optimisées dans /public/tour/maison-01/
 * (voir scripts/optimize-panos.mjs). Rien d'autre à modifier.
 *
 * Yaw/pitch en DEGRÉS (convention PSV : 0° = centre de l'équirectangulaire,
 * positif vers la droite). Mesurés depuis les images puis calibrés au navigateur.
 */

export type Floor360 = "rdc" | "etage" | "exterieur";

export type Link360 = {
  /** Nœud cible (doit exister, et le lien inverse doit exister aussi). */
  to: string;
  /** Position de la flèche dans le panorama courant, en degrés. */
  yaw: number;
  pitch?: number;
};

export type Node360 = {
  id: string;
  name: string;
  caption?: string;
  floor: Floor360;
  /** Base des fichiers dans /public/tour/maison-01/ (ex. "03-entree"). */
  file: string;
  /** Orientation de la caméra à l'arrivée dans la pièce (degrés). */
  defaultYaw: number;
  links: Link360[];
  /** Position sur le mini-plan, en % du panneau de sa zone. */
  map: { x: number; y: number };
};

export type Tour360Data = {
  id: string;
  title: string;
  startNodeId: string;
  basePath: string;
  floors: { id: Floor360; label: string }[];
  nodes: Node360[];
};

const N = (
  id: string,
  name: string,
  floor: Floor360,
  file: string,
  defaultYaw: number,
  map: { x: number; y: number },
  links: Link360[],
  caption?: string
): Node360 => ({ id, name, caption, floor, file, defaultYaw, links, map });

export const maison01: Tour360Data = {
  id: "maison-01",
  title: "La Panoramique — Maison avec piscine",
  startNodeId: "facade",
  basePath: "/tour/maison-01",
  floors: [
    { id: "rdc", label: "Rez-de-chaussée" },
    { id: "etage", label: "Étage" },
    { id: "exterieur", label: "Extérieur" },
  ],
  nodes: [
    N("facade", "Façade avant", "exterieur", "01-facade", -8, { x: 22, y: 80 }, [
      { to: "porche", yaw: -5, pitch: -8 },
    ], "L'arrivée : revêtement noir, pierre grise et toit incurvé."),
    N("porche", "Porche d'entrée", "exterieur", "02-porche", -3, { x: 40, y: 62 }, [
      { to: "facade", yaw: -127, pitch: -10 },
      { to: "entree", yaw: -3, pitch: -12 },
    ], "Colonnes de pierre et porte pivotante noire."),
    N("entree", "Vestibule", "rdc", "03-entree", 0, { x: 50, y: 84 }, [
      { to: "porche", yaw: -155, pitch: -12 },
      { to: "hall", yaw: 0, pitch: -14 },
    ], "Tuile à motifs et luminaire « branches » doré."),
    N("hall", "Hall & escalier", "rdc", "04-hall", -10, { x: 50, y: 62 }, [
      { to: "entree", yaw: -176, pitch: -14 },
      { to: "salle-eau", yaw: 82, pitch: -12 },
      { to: "escalier", yaw: -65, pitch: -10 },
      { to: "aire-ouverte", yaw: -10, pitch: -12 },
    ], "Le carrefour du rez-de-chaussée, au pied de l'escalier."),
    N("salle-eau", "Salle d'eau", "rdc", "05-salle-eau", 67, { x: 72, y: 62 }, [
      { to: "hall", yaw: -10, pitch: -14 },
    ], "Vasque sur meuble de bois et murale de bois sculpté."),
    N("aire-ouverte", "Aire ouverte", "rdc", "06-aire-ouverte", 20, { x: 50, y: 42 }, [
      { to: "hall", yaw: -85, pitch: -12 },
      { to: "cuisine", yaw: 141, pitch: -14 },
      { to: "salle-manger", yaw: 44, pitch: -12 },
      { to: "salon", yaw: 8, pitch: -10 },
    ], "Le cœur de la maison : cuisine, salle à manger et salon d'un seul regard."),
    N("cuisine", "Cuisine", "rdc", "07-cuisine", 0, { x: 30, y: 24 }, [
      { to: "aire-ouverte", yaw: -15, pitch: -12 },
      { to: "salle-manger", yaw: 18, pitch: -12 },
      { to: "terrasse", yaw: 77, pitch: -12 },
    ], "Îlot arrondi, suspensions dorées et dosseret noir."),
    N("salle-manger", "Salle à manger", "rdc", "08-salle-manger", 0, { x: 64, y: 24 }, [
      { to: "cuisine", yaw: -44, pitch: -12 },
      { to: "salon", yaw: 49, pitch: -12 },
      { to: "aire-ouverte", yaw: -18, pitch: -12 },
    ], "Table de bois clair face aux fenêtres sur la piscine."),
    N("salon", "Salon", "rdc", "09-salon", 5, { x: 82, y: 42 }, [
      { to: "salle-manger", yaw: 62, pitch: -12 },
      { to: "aire-ouverte", yaw: 98, pitch: -10 },
    ], "Foyer, verrière noire et coin échecs."),
    N("escalier", "Escalier", "rdc", "10-escalier", 28, { x: 30, y: 62 }, [
      { to: "hall", yaw: 115, pitch: -14 },
      { to: "palier-etage", yaw: 28, pitch: 8 },
    ], "Bois blond et contremarches noires, sous la suspension tressée."),
    N("palier-etage", "Palier de l'étage", "etage", "11-palier", 16, { x: 50, y: 60 }, [
      { to: "escalier", yaw: -5, pitch: -35 },
      { to: "sdb-principale", yaw: 16, pitch: -10 },
      { to: "mezzanine-fenetre", yaw: 136, pitch: -10 },
      { to: "corridor-etage", yaw: -51, pitch: -10 },
    ], "La mezzanine ouverte sur le hall."),
    N("sdb-principale", "Salle de bain principale", "etage", "12-sdb-principale", -87, { x: 28, y: 38 }, [
      { to: "palier-etage", yaw: 103, pitch: -12 },
    ], "Baignoire autoportante, robinetterie dorée et double vanité."),
    N("mezzanine-fenetre", "Coin lecture de la mezzanine", "etage", "13-mezzanine-fenetre", 0, { x: 74, y: 60 }, [
      { to: "palier-etage", yaw: -167, pitch: -12 },
    ], "La fenêtre panoramique plonge sur la piscine et le pool house."),
    N("corridor-etage", "Corridor de l'étage", "etage", "14-corridor-etage", 0, { x: 50, y: 30 }, [
      { to: "palier-etage", yaw: 140, pitch: -12 },
      { to: "chambre", yaw: 0, pitch: -12 },
    ], "Dessert les chambres, sous la thermopompe murale."),
    N("chambre", "Chambre", "etage", "15-chambre", -16, { x: 26, y: 16 }, [
      { to: "corridor-etage", yaw: -134, pitch: -12 },
    ], "Mur d'accent vert forêt et tasseaux de bois."),
    N("terrasse", "Terrasse arrière", "exterieur", "16-terrasse", 120, { x: 62, y: 44 }, [
      { to: "cuisine", yaw: 30, pitch: -12 },
      { to: "piscine", yaw: 112, pitch: -16 },
    ], "Composite gris, rampe de fer noire, vue directe sur la piscine."),
    N("piscine", "Piscine & cour arrière", "exterieur", "17-piscine", -80, { x: 80, y: 20 }, [
      { to: "terrasse", yaw: -98, pitch: -2 },
    ], "Piscine creusée, patio de béton et pool house."),
  ],
};

/* ─── Aides de chemin ────────────────────────────────────────────── */

export const panoUrl = (t: Tour360Data, n: Node360) => `${t.basePath}/${n.file}-pano.webp`;
export const panoHdUrl = (t: Tour360Data, n: Node360) => `${t.basePath}/${n.file}-hd.webp`;
export const previewUrl = (t: Tour360Data, n: Node360) => `${t.basePath}/${n.file}-preview.jpg`;
export const thumbUrl = (t: Tour360Data, n: Node360) => `${t.basePath}/${n.file}-thumb.webp`;

/* ─── Validation du graphe (appelée au build par la page serveur) ── */

export function validateTour(t: Tour360Data): void {
  const ids = new Set(t.nodes.map((n) => n.id));
  if (ids.size !== t.nodes.length) throw new Error(`[tour ${t.id}] ids dupliqués`);
  if (!ids.has(t.startNodeId))
    throw new Error(`[tour ${t.id}] startNodeId inconnu : ${t.startNodeId}`);
  for (const n of t.nodes) {
    if (!t.floors.some((f) => f.id === n.floor))
      throw new Error(`[tour ${t.id}] ${n.id} : étage inconnu ${n.floor}`);
    for (const l of n.links) {
      if (!ids.has(l.to))
        throw new Error(`[tour ${t.id}] ${n.id} → ${l.to} : nœud cible inexistant`);
      const target = t.nodes.find((m) => m.id === l.to)!;
      if (!target.links.some((r) => r.to === n.id))
        throw new Error(`[tour ${t.id}] lien non réciproque : ${n.id} → ${l.to}`);
    }
  }
}

export const tours360: Record<string, Tour360Data> = { "maison-01": maison01 };
