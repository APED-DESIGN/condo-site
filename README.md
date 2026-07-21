# STUDIO NORDEN — Site vitrine démo (design intérieur)

Site vitrine one-page + pages projets pour un studio de design intérieur haut de gamme (marché québécois, contenu 100 % français). Direction artistique claire, chaude et éditoriale ; le glassmorphism sert de signature UI (nav flottante, carte hero, overlays, formulaire).

## Lancer le projet

```bash
npm install
npm run dev        # http://localhost:3000
```

Build de production :

```bash
npm run build && npm start
```

## Stack

| Outil | Rôle |
|---|---|
| **Next.js 14 (App Router) + TypeScript** | Framework, SSG des pages projets |
| **Tailwind CSS 3.4** | Styles + design tokens |
| **Lenis** | Smooth scroll global (`components/providers/SmoothScroll.tsx`) |
| **Framer Motion** | Révélations, staggers, transitions de page, compteurs |
| **GSAP + ScrollTrigger** | Scroll horizontal épinglé (Réalisations), compteur du preloader |
| **lucide-react** | Icônes |
| **next/font** | Fraunces (Google) + Satoshi (fichier local, `public/fonts/`) |
| **next/image** | Images Unsplash optimisées, blur placeholder |

## Structure

```
app/
  layout.tsx              Fonts, métadonnées SEO/OG, nav, footer, curseur, grain
  template.tsx            Transition de page (Framer Motion)
  page.tsx                Home (assemble les sections)
  projets/[slug]/         Pages projets (SSG, 6 projets)
components/
  providers/              AppProvider (état preloader), SmoothScroll (Lenis + GSAP)
  sections/               Hero, Manifesto, Projects, Services, Process, Studio,
                          Trust, Testimonials, Contact
  ui/                     Button, RevealText, Eyebrow, Counter, Marquee
  Preloader, Navbar, Footer, CustomCursor, Grain
lib/
  projects.ts             Données des 6 projets démo (textes, images, méta)
  images.ts               Helper Unsplash + blur placeholder
  scroll.ts               Défilement vers ancres via Lenis
  gsap.ts                 Enregistrement ScrollTrigger
```

## Où personnaliser

- **Nom du studio** : chercher/remplacer `Norden` / `STUDIO NORDEN` (Navbar, Footer, Preloader, layout). Alternatives suggérées : *Atelier Boréal*, *Maison Solveig*, *Studio Lumen*.
- **Couleurs** : `tailwind.config.ts` (tokens `bone`, `ivory`, `ink`, `greige`, `umber`, `brass`) + variables dans `app/globals.css`. Règle : un seul accent (laiton).
- **Typographies** : `app/layout.tsx` (Fraunces via Google, Satoshi dans `public/fonts/Satoshi-Variable.woff2`).
- **Projets** (textes, photos, méta) : `lib/projects.ts`. Les images sont des URLs Unsplash — remplacer par vos photos via `unsplash("photo-…")` ou des fichiers locaux dans `public/`.
- **Coordonnées / formulaire** : `components/sections/Contact.tsx` (le formulaire est visuel — aucun envoi réel, brancher une API si besoin).

## Animations incluses

Preloader compteur 0 → 100 (une fois par session) · révélation du hero caractère par caractère · smooth scroll Lenis · parallax (hero, studio, galeries projets) · scroll horizontal épinglé des réalisations (desktop) · marquees infinis (manifeste, logos) · timeline processus avec ligne de progression · compteurs de stats animés · curseur personnalisé « Voir » · transitions de page · micro-interactions (boutons, liens soulignés, zooms d'images).

## Accessibilité & performance

- `prefers-reduced-motion` respecté partout (Lenis désactivé, marquees stoppés, reveals instantanés).
- Navigation clavier : lien d'évitement, focus visibles (anneau laiton), aria-labels FR.
- Mobile-first : le scroll épinglé se dégrade en mosaïque verticale sous 1024 px.
- Images lazy-loadées (`next/image`), `alt` descriptifs français, blur placeholders.
- SEO : métadonnées + Open Graph, `lang="fr"`, balisage sémantique, pages projets statiques.
