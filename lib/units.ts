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
  tour: {
    enabled: boolean;
    startNodeId: string;
    /** Identifiant du parcours dans lib/tours.ts (dossier /public/tours/<id>/). */
    nodesFile: string;
  };
  /** Visite virtuelle 360° (vrais panoramas) : identifiant dans data/tours/. */
  tour360?: string;
};

const p = (name: string) => `/photos/${name}.jpg`;

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
      "La Panoramique est la propriété signature de Boréal : une unifamiliale récente au revêtement noir et à la pierre grise, posée sur un grand terrain bordé d'arbres, avec piscine creusée et pool house.",
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
    tour: { enabled: false, startNodeId: "", nodesFile: "" },
    tour360: "maison-01",
  },
  {
    slug: "le-55",
    name: "Le 55 — Cottage urbain",
    type: "5½ sur deux niveaux",
    status: "disponible",
    monthlyPrice: "1 895 $/mois",
    surface: "112 m²",
    bedrooms: 3,
    bathrooms: 1.5,
    floor: "Cottage — 2 niveaux",
    location: "Secteur des Rivières, Trois-Rivières",
    furnished: false,
    amenities: [
      "Stationnement privé",
      "Thermopompe murale",
      "Cour arrière clôturée",
      "Terrasse",
      "Buanderie à l'étage",
      "Animaux acceptés",
    ],
    availableFrom: "1er septembre 2026",
    excerpt:
      "Un cottage de ville complet : aire ouverte au rez-de-chaussée, trois chambres à l'étage, cour privée — et une visite immersive pièce par pièce.",
    description: [
      "Le 55 est l'unité signature des Résidences Boréal : un vrai cottage sur deux niveaux, pensé comme une maison. Au rez-de-chaussée, l'aire ouverte enchaîne salon, cuisine à îlot et salle à manger, avec une salle d'eau discrète près de l'escalier.",
      "La cuisine réunit armoires deux tons, électroménagers en inox et îlot avec évier sous double suspension. La salle à manger s'ouvre sur la terrasse et la cour arrière clôturée — le coin barbecue est déjà prêt.",
      "À l'étage : trois chambres, une salle de bain complète avec baignoire-podium, et une vraie buanderie fermée. La thermopompe murale garde l'étage frais l'été, confortable l'hiver. Visitez chaque pièce en ligne, comme si vous y étiez.",
    ],
    cover: p("cuisine-ilot"),
    coverAlt:
      "Cuisine à îlot du cottage Le 55, double suspension et réfrigérateur en inox",
    gallery: [
      { src: p("salon-ouvert"), alt: "Aire ouverte : salon, cuisine et salle à manger en enfilade" },
      { src: p("salle-a-manger"), alt: "Salle à manger lumineuse ouverte sur la cour arrière" },
      { src: p("chambre-principale"), alt: "Chambre principale et sa grande fenêtre" },
      { src: p("salle-bain"), alt: "Salle de bain de l'étage avec baignoire-podium" },
      { src: p("cour-arriere"), alt: "Cour arrière clôturée avec terrasse et mobilier d'extérieur" },
    ],
    tour: { enabled: true, startNodeId: "entree", nodesFile: "le-55" },
  },
  {
    slug: "unite-102",
    name: "Unité 102 — Rez-de-jardin",
    type: "4½",
    status: "disponible",
    monthlyPrice: "1 425 $/mois",
    surface: "68 m²",
    bedrooms: 2,
    bathrooms: 1,
    floor: "Rez-de-chaussée",
    location: "Secteur des Rivières, Trois-Rivières",
    furnished: false,
    amenities: [
      "Stationnement inclus",
      "Thermopompe murale",
      "Accès à la cour commune",
      "Rangement au sous-sol",
      "Animaux acceptés",
    ],
    availableFrom: "1er août 2026",
    excerpt:
      "Un 4½ de plain-pied, cuisine à îlot et deux chambres au calme, avec accès direct à la cour.",
    description: [
      "L'unité 102 offre la simplicité du plain-pied : aucune marche, une aire de vie traversante et deux chambres du côté jardin.",
      "La cuisine à îlot fait face au coin repas, avec assez de rangement pour cuisiner en vrai — pas juste réchauffer. Les planchers sont neufs, l'insonorisation aussi.",
      "À deux pas des services du secteur des Rivières, l'unité comprend un stationnement et un espace de rangement au sous-sol.",
    ],
    cover: p("salle-a-manger"),
    coverAlt: "Aire de vie lumineuse de l'unité 102, ouverte sur la cour",
    gallery: [
      { src: p("cuisine-evier"), alt: "Îlot avec évier et robinet col-de-cygne" },
      { src: p("salle-a-manger-suspension"), alt: "Coin repas sous la suspension noire" },
      { src: p("salle-eau"), alt: "Salle de bain à vanité de bois" },
    ],
    tour: { enabled: false, startNodeId: "", nodesFile: "" },
  },
  {
    slug: "unite-201",
    name: "Unité 201 — Le Lumineux",
    type: "3½",
    status: "bientôt",
    monthlyPrice: "1 175 $/mois",
    surface: "52 m²",
    bedrooms: 1,
    bathrooms: 1,
    floor: "2e étage",
    location: "Secteur des Rivières, Trois-Rivières",
    furnished: true,
    amenities: [
      "Meublé avec goût",
      "Stationnement inclus",
      "Thermopompe murale",
      "Balcon",
      "Internet inclus",
    ],
    availableFrom: "1er novembre 2026",
    excerpt:
      "Un 3½ meublé, baigné de lumière, parfait pour un premier appart ou un pied-à-terre sans tracas.",
    description: [
      "Au deuxième étage, l'unité 201 profite d'une orientation sud qui inonde la pièce principale de lumière du matin au soir.",
      "Livré meublé : lit, rangements, table et chaises choisis pour durer. Vous arrivez avec vos valises, le reste est déjà là.",
      "Internet et stationnement inclus dans le loyer — un seul paiement, zéro surprise.",
    ],
    cover: p("salle-a-manger-suspension"),
    coverAlt: "Coin repas lumineux de l'unité 201 sous sa suspension noire",
    gallery: [
      { src: p("chambre-2"), alt: "Chambre au lit fait, commode de bois clair" },
      { src: p("salle-a-manger"), alt: "Pièce principale ouverte sur la fenêtre plein sud" },
      { src: p("salle-bain-vanite"), alt: "Salle de bain, vanité et grand miroir" },
    ],
    tour: { enabled: false, startNodeId: "", nodesFile: "" },
  },
  {
    slug: "unite-302",
    name: "Unité 302 — Le Coin",
    type: "4½ d'angle",
    status: "loué",
    monthlyPrice: "1 495 $/mois",
    surface: "71 m²",
    bedrooms: 2,
    bathrooms: 1,
    floor: "3e étage",
    location: "Secteur des Rivières, Trois-Rivières",
    furnished: false,
    amenities: [
      "Fenestration sur deux façades",
      "Stationnement inclus",
      "Thermopompe murale",
      "Balcon d'angle",
    ],
    availableFrom: "Présentement loué",
    excerpt:
      "Un 4½ d'angle avec fenêtres sur deux façades — le plus demandé de l'immeuble.",
    description: [
      "L'unité d'angle du troisième : deux murs de fenêtres, une lumière qui tourne avec la journée et un balcon orienté sur le parc.",
      "Le salon accueille facilement un grand canapé et un coin télé, sans compromis sur l'espace repas.",
      "Cette unité est présentement louée. Inscrivez-vous à la liste d'attente pour être contacté dès qu'elle se libère.",
    ],
    cover: p("salon-tv"),
    coverAlt: "Salon de l'unité 302, canapé de cuir et coin télé",
    gallery: [
      { src: p("salon-vers-entree"), alt: "Aire de vie vers l'entrée et le vestiaire à miroirs" },
      { src: p("cuisine-comptoir"), alt: "Cuisine, comptoirs dégagés et hotte en inox" },
    ],
    tour: { enabled: false, startNodeId: "", nodesFile: "" },
  },
  {
    slug: "unite-401",
    name: "Unité 401 — Le Familial",
    type: "5½",
    status: "disponible",
    monthlyPrice: "1 750 $/mois",
    surface: "96 m²",
    bedrooms: 3,
    bathrooms: 1,
    floor: "4e étage",
    location: "Secteur des Rivières, Trois-Rivières",
    furnished: false,
    amenities: [
      "Trois vraies chambres",
      "Stationnement double",
      "Thermopompe murale",
      "Buanderie dans l'unité",
      "Animaux acceptés",
    ],
    availableFrom: "15 août 2026",
    excerpt:
      "Trois chambres fermées, une buanderie dans l'unité et de l'espace pour toute la famille.",
    description: [
      "Pensé pour la vie de famille : trois chambres fermées, un séjour assez grand pour les soirs de semaine comme pour les visites du dimanche.",
      "La buanderie fermée — laveuse et sécheuse pleine grandeur — évite les allers-retours au sous-sol, et le stationnement double simplifie les matins pressés.",
      "Les écoles, la piste cyclable et les Promenades sont à quelques minutes.",
    ],
    cover: p("cuisine-comptoir"),
    coverAlt: "Cuisine de l'unité 401, longue enfilade de comptoirs",
    gallery: [
      { src: p("chambre-3"), alt: "Chambre secondaire, lit simple et fenêtre" },
      { src: p("buanderie"), alt: "Buanderie fermée, laveuse et sécheuse pleine grandeur" },
      { src: p("couloir-etage"), alt: "Couloir desservant les trois chambres" },
    ],
    tour: { enabled: false, startNodeId: "", nodesFile: "" },
  },
  {
    slug: "unite-501",
    name: "Unité 501 — La Terrasse",
    type: "5½ penthouse",
    status: "loué",
    monthlyPrice: "2 150 $/mois",
    surface: "104 m²",
    bedrooms: 3,
    bathrooms: 2,
    floor: "5e étage — dernier niveau",
    location: "Secteur des Rivières, Trois-Rivières",
    furnished: false,
    amenities: [
      "Terrasse privée de 30 m²",
      "Deux salles de bain",
      "Stationnement double",
      "Thermopompe murale",
      "Plafonds de 9 pieds",
    ],
    availableFrom: "Présentement loué",
    excerpt:
      "Le dernier étage au complet : terrasse privée, deux salles de bain et des plafonds de 9 pieds.",
    description: [
      "Au sommet de l'immeuble, l'unité 501 s'offre le luxe rare d'une terrasse privée de 30 m² — assez grande pour un salon d'été complet.",
      "Deux salles de bain, dont une attenante à la chambre principale, et des plafonds de 9 pieds qui donnent de l'air à chaque pièce.",
      "Cette unité est présentement louée. La liste d'attente est ouverte — elle part vite.",
    ],
    cover: p("cour-arriere"),
    coverAlt: "Terrasse extérieure avec mobilier de jardin, vue dégagée",
    gallery: [
      { src: p("cour-terrasse"), alt: "Terrasse et verdure en fin de journée" },
      { src: p("coin-lecture"), alt: "Coin lecture de la chambre principale" },
      { src: p("salle-bain"), alt: "Salle de bain principale, baignoire-podium" },
    ],
    tour: { enabled: false, startNodeId: "", nodesFile: "" },
  },
];

export function getUnit(slug: string) {
  return units.find((u) => u.slug === slug);
}

export function getNextUnit(slug: string) {
  const i = units.findIndex((u) => u.slug === slug);
  return units[(i + 1) % units.length];
}

export function formatBathrooms(n: number) {
  return Number.isInteger(n) ? String(n) : `${Math.floor(n)} + salle d'eau`;
}

export const STATUS_LABEL: Record<UnitStatus, string> = {
  disponible: "Disponible",
  loué: "Loué",
  bientôt: "Bientôt libre",
};
