export type UnitStatus = "disponible" | "loué" | "bientôt";

export type Unit = {
  slug: string;
  name: string;
  type: string;
  status: UnitStatus;
  monthlyPrice: string;
  surface: string;
  bedrooms: number;
  bathrooms: number;
  floor: string;
  location: string;
  furnished: boolean;
  amenities: string[];
  availableFrom: string;
  excerpt: string;
  description: string[];
  cover: string;
  coverAlt: string;
  gallery: { src: string; alt: string }[];
  /** Visite virtuelle 360° (vrais panoramas) : identifiant dans data/tours/. */
  tour360?: string;
};

export const units: Unit[] = [
  {
    slug: "maison-panoramique",
    name: "La Panoramique — Maison avec piscine",
    type: "Maison unifamiliale",
    status: "disponible",
    monthlyPrice: "2 950 $/mois",
    surface: "205 m²",
    bedrooms: 3,
    bathrooms: 1.5,
    floor: "Maison — 2 niveaux + cour",
    location: "Secteur des Rivières, Trois-Rivières",
    furnished: false,
    amenities: [
      "Piscine creusée et pool house",
      "Terrasse en composite",
      "Foyer au salon",
      "Cuisinière au gaz",
      "Thermopompes murales",
      "Stationnement quadruple",
    ],
    availableFrom: "1er octobre 2026",
    excerpt:
      "Une maison d'architecte au toit incurvé : aire ouverte spectaculaire, piscine creusée — et une vraie visite virtuelle 360°, pièce par pièce.",
    description: [
      "Une unifamiliale récente au revêtement noir et à la pierre grise, posée sur un grand terrain bordé d'arbres, avec piscine creusée et pool house.",
      "Au rez-de-chaussée, l'aire ouverte enchaîne cuisine à îlot arrondi, salle à manger face aux fenêtres sur la piscine et salon au foyer, derrière la verrière d'acier noir. À l'étage : trois chambres et une salle de bain principale digne d'un spa — baignoire autoportante, douche vitrée et double vanité.",
      "Explorez-la en visite virtuelle 360° : regardez partout, déplacez-vous de pièce en pièce avec les flèches, de la façade jusqu'au bord de la piscine — comme si vous y étiez.",
    ],
    cover: "/photos/maison/maison-cover.jpg",
    coverAlt:
      "Arrière de la maison Panoramique : revêtement noir, toit incurvé et piscine creusée",
    gallery: [
      { src: "/photos/maison/maison-cuisine.jpg", alt: "Cuisine : îlot arrondi, suspensions dorées, armoires noires" },
      { src: "/photos/maison/maison-salon.jpg", alt: "Salon : foyer encastré et téléviseur sous les moulures" },
      { src: "/photos/maison/maison-sdb.jpg", alt: "Salle de bain principale : baignoire autoportante et robinetterie dorée" },
      { src: "/photos/maison/maison-salle-manger.jpg", alt: "Salle à manger : table de bois clair face aux fenêtres sur la cour" },
      { src: "/photos/maison/maison-piscine-large.jpg", alt: "Piscine creusée, patio de béton et pool house en bois" },
    ],
    tour360: "maison-01",
  },
];

export function getUnit(slug: string) {
  return units.find((u) => u.slug === slug);
}

export function formatBathrooms(n: number) {
  return Number.isInteger(n) ? String(n) : `${Math.floor(n)} + salle d'eau`;
}

export const STATUS_LABEL: Record<UnitStatus, string> = {
  disponible: "Disponible",
  loué: "Loué",
  bientôt: "Bientôt libre",
};
