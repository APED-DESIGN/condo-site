# NOTES_DEV — Résidences Boréal

Journal des décisions techniques. Deux livraisons :
- **V1** — repositionnement « studio de design » → « condos locatifs » + visite immersive guidée (photos plates) sur l'unité Le 55 (§1-8).
- **V2** — vraie **visite virtuelle 360°** (panoramas équirectangulaires Insta360) sur la maison « La Panoramique » (§9 et suivants).

## 9. V2 — Visite virtuelle 360° (maison-01)

### 9.1 Les panoramas (photo2/)
- **19 fichiers fournis = les 15 attendus + 2 nouveaux + 2 doublons** (`* 2.JPG`, ignorés).
- Insta360 X4 Air, **7680×3840 (ratio 2,00), équirectangulaires** confirmés visuellement, ~130 Mo au total.
- La cartographie fournie (§3 du mandat) a été **vérifiée image par image : 15/15 exacte**.
- Les 2 panos supplémentaires (163626/163628, pris 15 min après) = **façade avant** et **porche d'entrée** — deux pièces listées « manquantes » au mandat. Intégrés comme nœuds `facade` et `porche` : la visite commence dehors, comme une vraie arrivée. **17 nœuds au total.**
- **Lien terrasse tranché** : la porte-patio à rideaux voile de la terrasse correspond à celle de la **cuisine** (mêmes voilages, îlot visible par la fenêtre étroite adjacente). → `cuisine ↔ terrasse`. La salle à manger n'a que des fenêtres fixes, **aucun lien salle-manger ↔ terrasse**.
- Aucune trace Google Maps/Street View dans le code (grep `google|maps|street|leaflet|mapbox` : zéro résultat) — le site n'en a jamais eu ; la V2 remplace la techno de visite, pas une carte.

### 9.2 Pipeline d'optimisation (`scripts/optimize-panos.mjs`)
- sharp, one-shot : par pano → `-hd.webp` 6144 (~0,3-1,7 Mo), `-pano.webp` 4096 (~0,2-0,9 Mo), `-preview.jpg` 512 flouté (<11 Ko), `-thumb.webp` 480 (<13 Ko).
- **Total des 17 panos par défaut : 6,2 Mo** (budget < 12 Mo ✓). Desktop ≥1200 px charge les HD.
- **Nadir** : bandeau « ink » fondu composé sur le master (opaque sous ~-80° de pitch) — le bâton du trépied est invisible sur les 17 panos.
- Les originaux restent dans `/Users/allenproulx/condos/photo2` (hors repo, jamais servis — vérifié par test réseau automatisé).

### 9.3 Stack et intégration
- **Photo Sphere Viewer 5.14** + VirtualTourPlugin (`positionMode: manual`, `renderMode: 3d`, `preload: true`, transition fondue) + GalleryPlugin (vignettes auto des nœuds) + CompassPlugin + AutorotatePlugin (12 s d'inactivité, désactivé si `prefers-reduced-motion`).
- `components/tour/Tour360.tsx` : client-only (`dynamic … ssr:false`), viewer créé dans `useEffect`, `viewer.destroy()` au démontage. **Piège StrictMode** : en dev, le double montage détruisait le viewer pendant l'init du VirtualTour (`datasource.loadNode` sur undefined) → création différée d'un tick (`setTimeout` annulable), seul le montage survivant crée le viewer.
- Orientation d'arrivée : `PoseHeadingDegrees = 0` partout → chaque nœud porte un `defaultYaw` curaté ; sur `node-changed`, la caméra pivote instantanément vers ce point de vue pendant le fondu.
- `TourModal.tsx` : modale plein écran (fade), nom de pièce permanent, indice premier lancement (disparaît au premier pointerdown), Échap, repli WebGL (message + renvoi galerie photos).
- `TourMiniMap.tsx` : plan schématique custom (le PlanPlugin officiel exige GPS/Leaflet — inadapté) : 3 zones RDC/Étage/Extérieur, point actif pulsant laiton, voisins surlignés, téléportation, replié par défaut sur mobile.
- Thème : navbar/galerie/tooltips PSV en verre « ink », flèches 3D bone→laiton au survol (`arrowStyle`).
- Hook dev-only `window.__tour360` (viewer + plugin + graphe) pour la calibration et les tests ; absent en production.

### 9.4 Graphe et calibration (`data/tours/maison-01.ts`)
- **Un seul fichier de vérité** : 17 nœuds, **19 liens bidirectionnels (38 flèches)**, `defaultYaw`, positions mini-plan. Ajouter une pièce = un objet + 4 images. `validateTour()` casse `next build` si un lien est non réciproque, orphelin ou l'étage inconnu (importé par la page serveur).
- Calibration : `scripts/calibrate-360.mjs` capture chaque flèche caméra centrée sur son yaw → revue visuelle → 11 corrections appliquées (hall→escalier -95→-65, terrasse→cuisine -10→+30 sur la poignée de la porte coulissante, piscine→terrasse -80→-98 sur l'escalier noir, palier→escalier -18→-5/-35 dans la cage, etc.). **2e et 3e passes : 19/19 liens tombent dans la vraie ouverture.**
- En `renderMode: 3d`, PSV ancre les flèches au bas de la vue et les **oriente** selon le yaw du lien — un yaw faux = flèche qui pointe dans un mur ; la calibration valide la direction ET le tooltip.

### 9.5 Pièces non photographiées (à compléter plus tard)
Chambre principale (derrière les portes doubles du palier), 2 autres chambres, garage, sous-sol, intérieur du pool house. **Aucun nœud inventé, aucune photo dupliquée.** Pour les ajouter : photographier en 360, passer `optimize-panos.mjs`, ajouter le nœud + ses liens réciproques dans `data/tours/maison-01.ts`.

### 9.6 Tests (`scripts/test-360.mjs`)
Playwright/Chromium : clic réel sur **chacune des 38 flèches** (vérification de la pièce d'arrivée), mini-plan (téléportation + `aria-current`), galerie, clavier (rotation, Échap), **remontage** (fermer → rouvrir → naviguer → revenir : zéro contexte WebGL perdu), réseau (**aucun original 8K servi**, poids total mesuré), viewports 390/768/1440/1920, tactile, reduced-motion (autorotate désactivé), console 100 % propre.

---

## 1. Analyse des 328 photos fournies

- **326 HEIC + 2 MOV**, tous iPhone 14, objectif **ultra grand angle (14 mm équiv.)**, format **portrait 2268 × 4032 (9:16)**.
- EXIF : prise de vue continue (~1 photo/seconde) sur ~6 minutes, GPS = Trois-Rivières (secteur des Rivières).
- **Aucun panorama équirectangulaire (ratio 2:1), aucune face de cubemap.** Ce sont des photos rectilignes prises en marchant.
- Le nom de fichier (IMG_4915 → IMG_5242) suit l'ordre chronologique = le trajet du photographe dans l'unité.
- Contenu : **une seule unité réelle**, un cottage sur 2 niveaux :
  - RDC : vestibule → séjour/coin gym → cuisine à îlot → salle à manger → porte-patio/cour → salle d'eau → escalier.
  - Étage : palier télé (thermopompe murale) → 3 chambres → salle de bain (baignoire) → buanderie.
  - Les 2 MOV : passes vidéo du vestibule et de la cuisine (non utilisées sur le site).

## 2. Choix de la techno de visite (et pourquoi pas les autres)

| Option | Verdict | Raison |
|---|---|---|
| Photo Sphere Viewer + VirtualTourPlugin | ❌ | Exige des panoramas équirectangulaires — il n'y en a aucun. Reprojeter des photos rectilignes 80° sur une sphère donne des murs courbés, rendu amateur. |
| Stitching en panoramas | ❌ | Photos prises **en marchant** (parallaxe), pas en rotation sur trépied : le stitching indoor échoue ou produit des artefacts. |
| Gaussian Splatting / SuperSplat | ❌ | La couverture multi-angles existe en partie, mais la reconstruction (COLMAP/Nerfstudio) exige GPU + heures de calcul, résultat non garanti. Pas fiable ici. |
| **Visite guidée point-à-point (custom React)** | ✅ | Exploite exactement ce que les photos sont : des vues grand angle depuis des positions de marche. Navigation type Street View : flèches cliquables, mini-plan, transitions caméra. |

**Honnêteté d'affichage** : la fonctionnalité est nommée « **Visite immersive** » partout — jamais « 360° » — car les images ne sont pas des panoramas (exigence §8 du mandat).
Le **gyroscope mobile n'est pas implémenté** : sans image 360, incliner le téléphone n'a rien à révéler — ce serait un gadget mensonger.

## 3. Architecture de la visite

- `lib/tours.ts` — graphe typé du parcours : 13 nœuds (pièces), chaque nœud = photo + flèches (`links`) + position sur le plan (`plan {floor, x, y}`).
  - Les positions de flèches sont en **% de la photo 9:16** (x, y), posées sur le sol/les passages réels de l'image, ajustées visuellement via captures Playwright.
- `components/tour/TourViewer.tsx` — visionneuse plein écran (`role="dialog"`, z-96 sous le curseur custom) :
  - photo `object-contain` centrée + **letterbox flou** (même photo en `cover + blur`) : les photos portrait restent pro sur écran paysage;
  - transitions caméra directionnelles (avancer = zoom-in cross-fade, reculer = zoom-out, gauche/droite = glissement) via Framer Motion, `prefers-reduced-motion` → fondu simple;
  - préchargement des pièces voisines (`new Image()`), voile de chargement glassmorphism au premier affichage;
  - clavier : ↑↓←→ suivent les flèches correspondantes, Échap ferme; boutons plein écran (API Fullscreen) et plan;
  - verrouillage scroll + arrêt de Lenis pendant la visite (même pattern que le menu mobile).
- `components/tour/TourPlan.tsx` — mini-plan schématique 2 étages, point laiton pulsant = position courante, chaque point = téléportation. Fixe en bas-droite sur desktop, panneau togglable centré sur mobile.
- Lien profond : `/unites/le-55?visite=1` ouvre la visite à l'arrivée (utilisé par le hero et la section unités).

### Pièges rencontrés (à retenir)
- **Framer Motion écrase les classes Tailwind `-translate-x-1/2`** (il pose son propre `transform` inline, puis `transform: none` au repos). Tout élément *positionné* par translate ET *animé* par framer doit être séparé : wrapper `<span>` pour le positionnement, `motion.*` interne pour l'animation. C'était la cause des flèches décalées et du plan mobile coupé.
- **Avertissements d'hydratation en reduced-motion** : le serveur rend sans média query, le client reduced rend différemment. Corrigés par gate `mounted` (RevealText) et `suppressHydrationWarning` sur les wrappers parallax dont le style est 100 % client (Hero, Building, ParallaxImage, template).
- **RevealText avalait les espaces** entre mots (espace de fin collapsé dans un `inline-block`) : l'espace séparateur doit être un nœud texte *entre* les spans inline-block.
- Ne jamais lancer `npm run build` pendant que `next dev` tourne : `.next` est partagé → 500. 

## 4. Repositionnement (Partie A)

- Marque : **Résidences Boréal** (`Boréal.` dans la nav, cohérent avec l'esthétique nordique du design d'origine). Appliquée : Navbar, Footer, Preloader (`boreal-visited`), métadonnées/OG (`/og.jpg` généré des vraies photos), `lang="fr"` conservé.
- **Palette, typos (Fraunces + Satoshi), glassmorphism, grain, curseur « Voir », Lenis, GSAP scroll horizontal épinglé, preloader compteur, marquees, timeline, compteurs : intacts.** Seuls les textes, données et images ont changé.
- Sections renommées (fichiers → contenu) :
  - `Projects.tsx` → `Units.tsx` (#unites) — cartes = unités, prix en méta, pastilles statut + badge « Visite immersive », overlay verre au survol conservé.
  - `Services.tsx` → `Amenities.tsx` (#inclusions) — stationnement, thermopompe, buanderie, cour, animaux, entretien (tirés des vraies photos).
  - `Process.tsx` → `RentalProcess.tsx` (#louer) — visite en ligne → visite en personne → demande → bail → clés.
  - `Studio.tsx` → `Building.tsx` (#immeuble) — présentation de l'ensemble.
  - Trust : 48 unités / 24 h entretien / 97 % occupation + marquee « À quelques minutes » (UQTR, Cégep, District 55…).
  - Contact : formulaire de location (nom, courriel, téléphone, unité visée, date d'emménagement, message) avec validation FR.
- Modèle de données : `lib/units.ts` (`Unit` avec statut/loyer/chambres/inclusions/`tour`). 6 unités; **Le 55** est l'unité vedette avec la visite (les photos viennent réellement d'elle). Les 5 autres réutilisent le fonds de photos réel, sans visite (`tour.enabled: false` → aucun bouton, aucun badge).
- Routes : `app/projets/[slug]` → `app/unites/[slug]` (SSG conservé, `generateStaticParams` + métadonnées OG par unité).

## 5. Images

- Export via `sips` (script one-shot, voir §7) : HEIC → JPEG.
  - `public/tours/le-55/*.jpg` : 13 nœuds, 2400 px bord long, q82 (~600 Ko/photo, préchargées par voisinage).
  - `public/photos/*.jpg` : 23 photos galeries/couvertures, 1800 px, q80.
  - `public/og.jpg` : 1200 × 630 recadrée.
- `next/image` avec `placeholder blur` partout; dans la visionneuse : `unoptimized` (fichiers déjà calibrés + le préchargement doit viser exactement la même URL).

## 6. Tests (Partie C)

- `scripts/test-e2e.mjs` (Playwright/Chromium — équivalent en autonomie d'un MCP navigateur, exécutable en CI) :
  desktop 1440×900, mobile 390×844 tactile, contexte `reducedMotion`.
- Couverture : preloader→hero, 5 sections, validation + soumission du formulaire, ouverture visite, **les 28 flèches du graphe une à une** (vérification de la pièce d'arrivée), suivi du mini-plan (`aria-current`), clavier (↑, Échap), lien profond, absence du bouton sur unité sans visite, tap mobile, plan mobile, reduced-motion.
- Résultat final : **14 ✓, zéro erreur console, zéro requête en échec** (les prefetchs RSC annulés par navigation sont ignorés — comportement normal de Next).
- Lancer : `npm run dev` puis `node scripts/test-e2e.mjs` (option `--shots <dir>` pour des captures).

## 7. Ajouter / modifier du contenu

**Ajouter une unité** : ajouter l'objet dans `lib/units.ts` (couverture + galerie dans `public/photos/`). La carte, la page `/unites/<slug>`, le sélecteur du formulaire et le SSG suivent automatiquement.

**Ajouter une visite à une unité** :
1. Exporter les photos des pièces (JPEG 9:16, ~2400 px) dans `public/tours/<id>/`.
2. Décrire le graphe dans `lib/tours.ts` (nouveau `Tour` enregistré dans `tours`) : un nœud par pièce, flèches `links` avec `x/y` (% de la photo — poser la flèche sur le plancher/le passage visible), `dir` (`forward|back|left|right|up|down`), positions `plan`.
3. Activer sur l'unité : `tour: { enabled: true, startNodeId: "<nœud>", nodesFile: "<id>" }`.
4. Ajuster les `x/y` en regardant le rendu (les flèches doivent pointer vers ce qu'elles annoncent), re-passer `node scripts/test-e2e.mjs` après avoir mis à jour la table `LINKS` du script.

**Remplacer un panorama/une photo de nœud** : remplacer le JPEG dans `public/tours/<id>/` (même nom), vérifier les `x/y` des flèches.

## 8. Écarts au mandat, assumés et documentés

- PSV/SuperSplat non utilisés (voir §2) — le mandat les donnait comme références, pas comme obligations, et exigeait de ne pas annoncer du faux 360.
- Le graphe de visite vit dans `lib/tours.ts` (TypeScript typé, tree-shaké, pas de fetch waterfall) plutôt qu'un JSON dans `public/` ; le champ `nodesFile` de `Unit.tour` référence l'identifiant du parcours. Même modèle de données, meilleure DX.
- Tests : Playwright en script direct plutôt que via serveur MCP (même moteur, même autonomie, reproductible en CI sans dépendre d'une session d'agent).
