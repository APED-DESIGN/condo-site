# RÉSIDENCES BORÉAL — Condos locatifs + visites virtuelles (démo)

Site vitrine one-page + pages unités pour un ensemble de condos locatifs haut de gamme à Trois-Rivières (contenu 100 % français québécois). Direction artistique chaude et éditoriale, glassmorphism en signature UI — et deux expériences de visite :

- **Visite virtuelle 360°** (maison « La Panoramique ») : 17 vrais panoramas équirectangulaires 8K optimisés, navigation type Street View avec Photo Sphere Viewer — on regarde à 360° en glissant, on avance de pièce en pièce en cliquant les flèches au sol, mini-plan « vous êtes ici » à 3 zones, galerie, boussole, gyroscope mobile.
- **Visite immersive guidée** (cottage « Le 55 ») : photos grand angle réelles, navigation point-à-point custom.

## Lancer le projet

```bash
npm install
npm run dev        # http://localhost:3000
```

Build de production :

```bash
npm run build && npm start
```

Tests navigateur (Chromium — le serveur dev doit tourner) :

```bash
node scripts/test-e2e.mjs            # site + visite guidée (option --shots <dossier>)
node scripts/test-360.mjs            # visite 360° : 38 flèches, réseau, viewports
node scripts/optimize-panos.mjs      # (one-shot) régénérer les panoramas optimisés
node scripts/calibrate-360.mjs /tmp/calib [nodeId…]  # captures de calibration des flèches
```

> Ne pas lancer `npm run build` pendant que `npm run dev` tourne (`.next` partagé).

## Stack

| Outil | Rôle |
|---|---|
| **Next.js 14 (App Router) + TypeScript** | Framework, SSG des pages unités |
| **Tailwind CSS 3.4** | Styles + design tokens |
| **Lenis** | Smooth scroll global (`components/providers/SmoothScroll.tsx`) |
| **Framer Motion** | Révélations, staggers, transitions de page + de visite, compteurs |
| **GSAP + ScrollTrigger** | Scroll horizontal épinglé (Unités), compteur du preloader |
| **lucide-react** | Icônes |
| **next/font** | Fraunces (Google) + Satoshi (fichier local, `public/fonts/`) |
| **next/image** | Photos locales optimisées, blur placeholder |
| **Playwright** (dev) | Tests E2E : sections, formulaire, les 28 flèches de la visite, mobile, reduced-motion |

## La visite virtuelle 360° (maison-01)

- **Données** : `data/tours/maison-01.ts` — 17 nœuds, 19 liens bidirectionnels, `defaultYaw` par pièce, positions du mini-plan. **Ajouter une pièce = un objet ici + 4 images optimisées, rien d'autre** (`validateTour()` casse le build si le graphe est incohérent).
- **Viewer** : `components/tour/Tour360.tsx` — Photo Sphere Viewer + VirtualTour/Gallery/Compass/Autorotate, client-only, `destroy()` au démontage.
- **Modale** : `components/tour/TourModal.tsx` — plein écran, nom de pièce, indice de navigation, Échap, repli WebGL.
- **Mini-plan** : `components/tour/TourMiniMap.tsx` — RDC / Étage / Extérieur, point actif pulsant, téléportation.
- **Images** : `public/tour/maison-01/` (WebP 4K/6K + previews) générées par `scripts/optimize-panos.mjs` depuis les originaux 8K (hors repo, jamais servis). Ne jamais passer un panorama par `next/image`.
- **Entrées** : bouton « Visite virtuelle 360° » sur `/unites/maison-panoramique`, badge sur la carte, CTA du hero, lien profond `?visite=1`.

## La visite immersive guidée (le-55)

- **Données** : `lib/tours.ts` — graphe de 13 pièces (photo, flèches directionnelles positionnées en % de l'image, coordonnées sur le plan 2 étages).
- **Visionneuse** : `components/tour/TourViewer.tsx` — plein écran, transitions caméra directionnelles, letterbox flou, préchargement des pièces voisines, clavier (↑ ↓ ← → / Échap), plein écran natif, `prefers-reduced-motion` respecté.
- **Mini-plan** : `components/tour/TourPlan.tsx` — position courante pulsante, téléportation au clic, panneau togglable sur mobile.
- **Entrées** : bouton « Lancer la visite immersive » sur `/unites/le-55`, badge sur la carte de l'unité, lien profond `/unites/le-55?visite=1`.

Les photos sont de vraies photos grand angle (pas des panoramas 360) — la fonctionnalité est donc nommée « visite immersive », jamais « 360° ». Détails, décisions et mode d'emploi complet : **[NOTES_DEV.md](NOTES_DEV.md)**.

## Structure

```
app/
  layout.tsx            # fonts, SEO/OG, nav, footer, curseur, grain
  page.tsx              # home : Hero → Manifesto → Units → Amenities → RentalProcess → Building → Trust → Testimonials → Contact
  template.tsx          # transition de page
  unites/[slug]/        # fiches unités (SSG) + visite immersive
components/
  sections/             # sections de la home
  tour/                 # TourViewer + TourPlan (visite immersive)
  ui/                   # Button, RevealText, Eyebrow, Counter, Marquee
  Navbar / Footer / Preloader / CustomCursor / Grain
lib/
  units.ts              # données des unités (l'équivalent « projets » du site d'origine)
  tours.ts              # graphes des visites immersives
  images.ts / scroll.ts / gsap.ts
public/
  photos/               # galeries + couvertures (JPEG exportés des photos réelles)
  tours/le-55/          # les 13 photos-nœuds de la visite
scripts/
  test-e2e.mjs          # suite E2E Playwright
```

## Personnaliser

- **Ajouter une unité** : un objet dans `lib/units.ts` (+ photos dans `public/photos/`). Carte, page, formulaire et SSG suivent.
- **Ajouter une visite** : photos 9:16 dans `public/tours/<id>/`, graphe dans `lib/tours.ts`, `tour.enabled: true` sur l'unité — procédure détaillée dans [NOTES_DEV.md](NOTES_DEV.md) §7.
- **Textes/SEO** : sections dans `components/sections/`, métadonnées dans `app/layout.tsx`.
- **Palette/typos** : `tailwind.config.ts` (bone, ivory, ink, greige, umber, brass) — héritées du design d'origine, inchangées.

## Accessibilité & perf

- `prefers-reduced-motion` respecté partout (y compris la visite : fondus simples, pas d'auto-animations).
- Navigation clavier complète (visite incluse), focus laiton visible, `aria-label`/`alt` FR, `lang="fr"`.
- Images compressées à l'export + préchargement ciblé; `npm run build` et `npm run lint` passent sans erreur ni warning.
