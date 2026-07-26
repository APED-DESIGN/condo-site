export type TourLinkDir = "forward" | "back" | "left" | "right" | "up" | "down";

export type TourLink = {
  /** id du nœud de destination */
  to: string;
  /** Position de la flèche, en % de la largeur/hauteur de la photo (portrait 9:16). */
  x: number;
  y: number;
  dir: TourLinkDir;
  label?: string;
};

export type TourNode = {
  id: string;
  name: string;
  /** Photo affichée pour cette position (dossier /public). */
  image: string;
  caption?: string;
  links: TourLink[];
  /** Position sur le mini-plan : étage 0 (RDC) ou 1, coordonnées 0-100. */
  plan: { floor: 0 | 1; x: number; y: number };
};

export type Tour = {
  id: string;
  unitName: string;
  startNodeId: string;
  floors: string[];
  nodes: TourNode[];
};

const img = (id: string, name: string) => `/tours/${id}/${name}.jpg`;

/**
 * Parcours du cottage « Le 55 ».
 * Cheminement réel du shooting : entrée → séjour → cuisine → salle à manger
 * → terrasse → salle d'eau → escalier → étage (palier, chambres, bain, buanderie).
 */
export const tourLe55: Tour = {
  id: "le-55",
  unitName: "Le 55 — Cottage urbain",
  startNodeId: "entree",
  floors: ["Rez-de-chaussée", "Étage"],
  nodes: [
    {
      id: "entree",
      name: "Vestibule",
      image: img("le-55", "entree"),
      caption: "L'entrée : porte vitrée, vestiaire à portes miroir.",
      links: [
        { to: "salon", x: 50, y: 84, dir: "back", label: "Vers le séjour" },
      ],
      plan: { floor: 0, x: 62, y: 84 },
    },
    {
      id: "salon",
      name: "Séjour",
      image: img("le-55", "salon"),
      caption: "L'aire ouverte file du séjour jusqu'à la salle à manger.",
      links: [
        { to: "cuisine", x: 44, y: 60, dir: "forward", label: "Vers la cuisine" },
        { to: "entree", x: 50, y: 90, dir: "back", label: "Vers le vestibule" },
      ],
      plan: { floor: 0, x: 30, y: 68 },
    },
    {
      id: "cuisine",
      name: "Cuisine",
      image: img("le-55", "cuisine"),
      caption: "Îlot avec évier, double suspension et électros en inox.",
      links: [
        { to: "salle-a-manger", x: 48, y: 56, dir: "forward", label: "Salle à manger" },
        { to: "escalier", x: 88, y: 62, dir: "right", label: "Escalier" },
        { to: "salon", x: 50, y: 91, dir: "back", label: "Vers le séjour" },
      ],
      plan: { floor: 0, x: 50, y: 46 },
    },
    {
      id: "salle-a-manger",
      name: "Salle à manger",
      image: img("le-55", "salle-a-manger"),
      caption: "Le coin repas, ouvert sur la cour arrière.",
      links: [
        { to: "terrasse", x: 80, y: 55, dir: "right", label: "Terrasse" },
        { to: "salle-eau", x: 12, y: 55, dir: "left", label: "Salle d'eau" },
        { to: "cuisine", x: 50, y: 90, dir: "back", label: "Vers la cuisine" },
      ],
      plan: { floor: 0, x: 50, y: 22 },
    },
    {
      id: "terrasse",
      name: "Terrasse",
      image: img("le-55", "terrasse"),
      caption: "La cour clôturée et la terrasse, côté jardin.",
      links: [
        { to: "salle-a-manger", x: 50, y: 88, dir: "back", label: "Retour à l'intérieur" },
      ],
      plan: { floor: 0, x: 50, y: 4 },
    },
    {
      id: "salle-eau",
      name: "Salle d'eau",
      image: img("le-55", "salle-eau"),
      caption: "Salle d'eau du rez-de-chaussée, vanité de bois.",
      links: [
        { to: "salle-a-manger", x: 50, y: 88, dir: "back", label: "Salle à manger" },
        { to: "escalier", x: 84, y: 74, dir: "right", label: "Escalier" },
      ],
      plan: { floor: 0, x: 78, y: 34 },
    },
    {
      id: "escalier",
      name: "Escalier",
      image: img("le-55", "escalier"),
      caption: "L'escalier vers l'étage des chambres.",
      links: [
        { to: "palier", x: 50, y: 34, dir: "up", label: "Monter à l'étage" },
        { to: "cuisine", x: 50, y: 90, dir: "back", label: "Vers la cuisine" },
      ],
      plan: { floor: 0, x: 78, y: 60 },
    },
    {
      id: "palier",
      name: "Palier",
      image: img("le-55", "palier"),
      caption: "Le palier de l'étage : coin télé et thermopompe murale.",
      links: [
        { to: "chambre-principale", x: 13, y: 60, dir: "left", label: "Chambre principale" },
        { to: "salle-bain", x: 40, y: 46, dir: "forward", label: "Salle de bain" },
        { to: "buanderie", x: 62, y: 46, dir: "forward", label: "Buanderie" },
        { to: "chambre-3", x: 87, y: 58, dir: "right", label: "Chambre 3" },
        { to: "escalier", x: 50, y: 91, dir: "down", label: "Redescendre" },
      ],
      plan: { floor: 1, x: 50, y: 55 },
    },
    {
      id: "chambre-principale",
      name: "Chambre principale",
      image: img("le-55", "chambre-principale"),
      caption: "La chambre principale et son coin lecture.",
      links: [
        { to: "palier", x: 50, y: 89, dir: "back", label: "Retour au palier" },
      ],
      plan: { floor: 1, x: 26, y: 76 },
    },
    {
      id: "chambre-2",
      name: "Chambre 2",
      image: img("le-55", "chambre-2"),
      caption: "Deuxième chambre, calme, côté cour.",
      links: [
        { to: "palier", x: 50, y: 89, dir: "back", label: "Retour au palier" },
        { to: "chambre-3", x: 86, y: 60, dir: "right", label: "Chambre 3" },
      ],
      plan: { floor: 1, x: 24, y: 26 },
    },
    {
      id: "chambre-3",
      name: "Chambre 3",
      image: img("le-55", "chambre-3"),
      caption: "Troisième chambre — bureau, chambre d'enfant ou d'invités.",
      links: [
        { to: "palier", x: 50, y: 89, dir: "back", label: "Retour au palier" },
        { to: "chambre-2", x: 13, y: 60, dir: "left", label: "Chambre 2" },
      ],
      plan: { floor: 1, x: 72, y: 22 },
    },
    {
      id: "salle-bain",
      name: "Salle de bain",
      image: img("le-55", "salle-bain"),
      caption: "Salle de bain complète, baignoire-podium.",
      links: [
        { to: "palier", x: 50, y: 89, dir: "back", label: "Retour au palier" },
        { to: "buanderie", x: 86, y: 58, dir: "right", label: "Buanderie" },
      ],
      plan: { floor: 1, x: 76, y: 44 },
    },
    {
      id: "buanderie",
      name: "Buanderie",
      image: img("le-55", "buanderie"),
      caption: "Buanderie fermée : laveuse et sécheuse pleine grandeur.",
      links: [
        { to: "palier", x: 50, y: 89, dir: "back", label: "Retour au palier" },
        { to: "salle-bain", x: 13, y: 58, dir: "left", label: "Salle de bain" },
      ],
      plan: { floor: 1, x: 76, y: 68 },
    },
  ],
};

const tours: Record<string, Tour> = { "le-55": tourLe55 };

export function getTour(id: string): Tour | undefined {
  return tours[id];
}
