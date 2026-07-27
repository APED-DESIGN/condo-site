# Deux façons de faire visiter une propriété en ligne

Site vitrine. Il montre **deux approches** de visite en ligne, sur deux vraies propriétés, à des
courtiers et des promoteurs. Aucun nom de client, d'agence ou de marque n'y apparaît : le même lien
sert à tous les prospects.

## Trois pages, trois adresses

| Adresse | Ce qu'elle démontre |
|---|---|
| `/` | L'accueil : le choix entre les deux approches |
| `/maison` | **Visite 360°** — l'acheteur se déplace librement de pièce en pièce |
| `/appartement` | **Visite au défilement** — la vidéo avance au scroll et s'arrête pour expliquer chaque pièce |

Il n'y a rien d'autre. L'en-tête, la section contact et le pied de page sont les mêmes partout, et
on passe d'une propriété à l'autre sans repasser par l'accueil.

## Démarrer

```bash
npm install
npm run dev            # http://localhost:3000
npm run build && npm start
```

Les images de la visite au défilement sont versionnées (`public/frames/`) : le build les lit sur
disque. Pas besoin de ffmpeg pour lancer le site.

## La visite 360° — `/maison`

Vrais panoramas équirectangulaires, rendus par Photo Sphere Viewer.

- **Données** : `data/tours/maison-01.ts` (nœuds, liens, coordonnées, étages)
- **Images** : `public/tour/maison-01/`
- **Composants** : `components/tour/Tour360.tsx`, `TourModal.tsx`, `TourMiniMap.tsx`
- **Garde-fou** : le graphe est validé au build — un lien non réciproque, un nœud inconnu ou un
  étage invalide fait échouer `next build`
- **Lien profond** : `/maison?visite=1` ouvre la visite à l'arrivée

```bash
npm run test:360       # parcours du graphe, chargement des panoramas, mini-carte
```

## La visite au défilement — `/appartement`

Séquence d'images tirée d'une vidéo, dessinée sur un `<canvas>`, pilotée au scroll. Aux arrêts,
l'image se rétracte en panneau contenu et le texte prend la colonne d'à côté.

- **Contenu** : `content/proprietes/<slug>/` — `runs.json`, `chapters.json`, `fiche.json`, `plan.svg`
- **Images** : `public/frames/<slug>/` — `desktop/`, `mobile/`, `arrets/`, `manifest.json`
- **Moteur** : `app/appartement/VisiteClient.tsx` + `lib/visite/`
- **Règle non négociable** : aucun chiffre inventé. Un champ inconnu vaut `null` / `status: "TODO"`,
  s'affiche « — », et **fait échouer le build de production**.

```bash
npm run extract -- --slug=<slug>       # vidéo → images + manifest (ffmpeg requis)
npm run test:visite -- --browser=chromium
```

Tout est détaillé dans **`README-NOUVELLE-PROPRIETE.md`** : comment ajouter une propriété, régler
le rythme du défilement, traiter la vie privée image par image, et ce que le banc d'essai mesure.

## Le formulaire

Une seule section contact, partagée par les trois pages, qui envoie vers `/api/leads` avec un champ
`source` indiquant la page d'origine. Table Supabase et variables d'environnement : voir
`.env.example` et le SQL en fin de `README-NOUVELLE-PROPRIETE.md`. Sans configuration, la route
répond 503 et le dit à l'utilisateur — une demande perdue en silence est pire qu'une erreur
affichée.

## Structure

```
app/
  page.tsx              accueil — le choix
  maison/               visite 360°
  appartement/          visite au défilement
  api/leads/            réception du formulaire
components/
  sections/             Hero, Choix, Contact — le langage visuel du site
  tour/                 visite 360°
  visite/               sections de la page de défilement
  Navbar, Footer, AutreApproche
lib/
  units.ts              données de la maison
  contact.ts            coordonnées, en un seul endroit
  visite/               moteur de la visite au défilement
content/proprietes/     contenu éditorial de la visite au défilement
public/
  photos/ tour/ frames/ fonts/
analyse/                analyse vidéo, traitements de vie privée, captures
```

Les sections `Manifesto`, `Units`, `Amenities`, `RentalProcess`, `Building`, `Trust` et
`Testimonials` restent dans `components/sections/` mais **ne sont plus rendues** : elles venaient de
la version précédente du site. Elles servent de référence visuelle — à supprimer si elles ne
servent plus.

## Réglages utiles

`/appartement?debug=1` affiche les mesures du moteur (image courante, débit, mémoire, réseau).
Les autres paramètres — `scrub`, `lerp`, `back`, `forward`, `budget`, `stride` — sont documentés
en tête de `app/appartement/VisiteClient.tsx`.
