import { unsplash } from "./images";

export type Project = {
  slug: string;
  title: string;
  type: string;
  year: string;
  location: string;
  surface: string;
  client: string;
  excerpt: string;
  story: string[];
  cover: string;
  coverAlt: string;
  images: { src: string; alt: string }[];
};

export const projects: Project[] = [
  {
    slug: "residence-outremont",
    title: "Résidence Outremont",
    type: "Résidentiel",
    year: "2025",
    location: "Montréal, QC",
    surface: "320 m²",
    client: "Privé",
    excerpt:
      "Une maison centenaire réinterprétée dans une palette de chêne clair, de laiton et de pierre calcaire.",
    story: [
      "La famille souhaitait préserver l'âme de cette maison de 1912 tout en l'ouvrant à la lumière. Nous avons décloisonné le rez-de-chaussée autour d'un axe central en chêne blanchi, révélant les moulures d'origine restaurées une à une.",
      "La cuisine, pensée comme une pièce de mobilier, marie un îlot monolithique en calcaire à des façades sans poignées. Le laiton brossé — rampes, luminaires, robinetterie — traverse la maison comme un fil conducteur.",
      "Chaque chambre a reçu sa propre nuance de la même palette, pour que la maison se lise comme un ensemble cohérent plutôt qu'une suite de pièces décorées.",
    ],
    cover: unsplash("photo-1600585154340-be6161a56a0c"),
    coverAlt: "Salon lumineux de la Résidence Outremont, canapé crème et grandes fenêtres",
    images: [
      { src: unsplash("photo-1600566753086-00f18fb6b3ea"), alt: "Cuisine ouverte au comptoir de pierre calcaire" },
      { src: unsplash("photo-1600210492486-724fe5c67fb0"), alt: "Coin lecture baigné de lumière naturelle" },
      { src: unsplash("photo-1615529182904-14819c35db37"), alt: "Chambre principale aux textiles de lin naturel" },
    ],
  },
  {
    slug: "loft-griffintown",
    title: "Loft Griffintown",
    type: "Résidentiel",
    year: "2024",
    location: "Montréal, QC",
    surface: "180 m²",
    client: "Privé",
    excerpt:
      "Un ancien atelier industriel converti en loft habité : brique, acier noir et bois chaleureux.",
    story: [
      "Le défi : habiter un volume industriel de 5 mètres sous plafond sans le domestiquer à outrance. Nous avons conservé la brique et les poutres d'acier apparentes, puis inséré une mezzanine en chêne comme un meuble posé dans l'espace.",
      "Un noyau central — cuisine, rangements, salle d'eau — structure le plateau sans jamais toucher les fenêtres d'origine, laissant la lumière traverser le loft de part en part.",
      "Le mobilier, chiné et contemporain, assume le contraste : pièces brutes contre textiles profonds, dans une palette resserrée de noir, de tabac et d'écru.",
    ],
    cover: unsplash("photo-1493809842364-78817add7ffb"),
    coverAlt: "Loft Griffintown, grande fenêtre industrielle et lumière du matin",
    images: [
      { src: unsplash("photo-1522708323590-d24dbb6b0267"), alt: "Espace de vie ouvert du loft, canapé et tapis texturé" },
      { src: unsplash("photo-1560448204-e02f11c3d0e2"), alt: "Vue d'ensemble du plateau, mezzanine en chêne" },
      { src: unsplash("photo-1586023492125-27b2c045efd7"), alt: "Fauteuil de cuir cognac près de la fenêtre d'atelier" },
    ],
  },
  {
    slug: "chalet-charlevoix",
    title: "Chalet Charlevoix",
    type: "Résidentiel",
    year: "2024",
    location: "Charlevoix, QC",
    surface: "240 m²",
    client: "Privé",
    excerpt:
      "Un refuge contemporain face au fleuve : cèdre local, laine et pierre des champs.",
    story: [
      "Posé sur un promontoire face au Saint-Laurent, le chalet devait s'effacer devant le paysage. À l'intérieur, tout converge vers la vue : mobilier bas, matières mates, palette empruntée aux battures.",
      "Le cèdre de la région habille murs et plafonds ; la pierre des champs ancre le foyer central, autour duquel s'organisent les espaces de vie.",
      "Nous avons dessiné sur mesure la grande table et les banquettes de la fenêtre, pour que quinze personnes puissent s'y retrouver sans que l'espace perde son calme.",
    ],
    cover: unsplash("photo-1600607687920-4e2a09cf159d"),
    coverAlt: "Séjour du Chalet Charlevoix, bois clair et larges ouvertures sur la nature",
    images: [
      { src: unsplash("photo-1600585154526-990dced4db0d"), alt: "Salle à manger en bois massif face au paysage" },
      { src: unsplash("photo-1616486338812-3dadae4b4ace"), alt: "Salon aux tons naturels, textiles de laine" },
      { src: unsplash("photo-1598928506311-c55ded91a20c"), alt: "Canapé profond près du foyer de pierre" },
    ],
  },
  {
    slug: "condo-vieux-quebec",
    title: "Condo Vieux-Québec",
    type: "Résidentiel",
    year: "2023",
    location: "Québec, QC",
    surface: "95 m²",
    client: "Privé",
    excerpt:
      "Dans les murs de 1830, un pied-à-terre précis et feutré pour un couple de collectionneurs.",
    story: [
      "Quatre-vingt-quinze mètres carrés dans un bâtiment classé : chaque centimètre compte. Nous avons travaillé le rangement comme une architecture — bibliothèques toute hauteur, banquettes coffres, portes affleurantes.",
      "Les murs de pierre d'origine dialoguent avec un mobilier contemporain choisi pièce par pièce avec les clients, autour de leur collection d'art québécois.",
      "L'éclairage, entièrement repensé, met en scène les œuvres le soir et disparaît le jour au profit de la lumière des fenêtres à carreaux.",
    ],
    cover: unsplash("photo-1556228453-efd6c1ff04f6"),
    coverAlt: "Séjour feutré du Condo Vieux-Québec, fauteuil clair et murs anciens",
    images: [
      { src: unsplash("photo-1567767292278-a4f21aa2d36e"), alt: "Chambre calme aux tons de lin et de craie" },
      { src: unsplash("photo-1600121848594-d8644e57abab"), alt: "Détail de mobilier et d'objets choisis" },
      { src: unsplash("photo-1595526114035-0d45ed16cfbf"), alt: "Coin nuit sous les combles, lumière douce" },
    ],
  },
  {
    slug: "maison-cantons-de-lest",
    title: "Maison Cantons-de-l'Est",
    type: "Résidentiel",
    year: "2023",
    location: "Cantons-de-l'Est, QC",
    surface: "290 m²",
    client: "Privé",
    excerpt:
      "Une maison de campagne où le vert profond des collines entre jusque dans les pièces.",
    story: [
      "Les clients rêvaient d'une maison de campagne vivante à l'année, pas d'un décor de fin de semaine. Nous avons organisé le plan autour de la cuisine, cœur battant de la maison, ouverte sur le verger.",
      "Une teinte signature — un vert forêt profond — habille la bibliothèque et le bureau, en écho aux collines. Ailleurs, plâtre naturel, chêne fumé et laine bouclée tiennent la palette.",
      "Les antiquités familiales ont été restaurées et intégrées au projet, pour que la maison raconte leur histoire plutôt que la nôtre.",
    ],
    cover: unsplash("photo-1583847268964-b28dc8f51f92"),
    coverAlt: "Bibliothèque vert forêt de la Maison Cantons-de-l'Est",
    images: [
      { src: unsplash("photo-1618219908412-a29a1bb7b86e"), alt: "Espace de vie ouvert sur la campagne" },
      { src: unsplash("photo-1615873968403-89e068629265"), alt: "Salon aux textiles chauds et bois fumé" },
      { src: unsplash("photo-1600494603989-9650cf6ddd3d"), alt: "Salle de bain de pierre claire et bois" },
    ],
  },
  {
    slug: "penthouse-montreal",
    title: "Penthouse Montréal",
    type: "Résidentiel",
    year: "2025",
    location: "Montréal, QC",
    surface: "410 m²",
    client: "Privé",
    excerpt:
      "Au 32e étage, un appartement-paysage suspendu au-dessus du fleuve et du mont Royal.",
    story: [
      "Un plateau de 410 m² ceinturé de verre : le projet consistait moins à décorer qu'à cadrer. Chaque espace a été orienté vers une vue — le fleuve au lever, la montagne au couchant.",
      "Les matériaux jouent la continuité : un même travertin file du hall au bain principal, un même noyer des bibliothèques au dressing. Les plafonds acoustiques dissimulent l'éclairage et la technique.",
      "Le mobilier, bas et sculptural, laisse l'horizon dominer. Rien ne dépasse la ligne des fenêtres.",
    ],
    cover: unsplash("photo-1600607687939-ce8a6c25118c"),
    coverAlt: "Séjour du Penthouse Montréal, baies vitrées sur la ville",
    images: [
      { src: unsplash("photo-1613490493576-7fde63acd811"), alt: "Espace de vie au crépuscule, vue panoramique" },
      { src: unsplash("photo-1600210491892-03d54c0aaf87"), alt: "Salon minéral aux lignes basses" },
      { src: unsplash("photo-1584622650111-993a426fbf0a"), alt: "Salle de bain de travertin, lumière tamisée" },
    ],
  },
];

export function getProject(slug: string) {
  return projects.find((p) => p.slug === slug);
}

export function getNextProject(slug: string) {
  const i = projects.findIndex((p) => p.slug === slug);
  return projects[(i + 1) % projects.length];
}
