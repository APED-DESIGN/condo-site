# Rapport — visualiseur trois modes de `/maison`

**Date :** 27 juillet 2026
**Voie :** D — schéma extrudé, **texturé par projection des panoramas**.
**État :** livré, testé, build de production vert.

---

## 0. Correction — la cartographie montre les vraies pièces

**Première livraison : de la géométrie nue.** Boîtes grises, cloisons translucides, rectangles de
plancher unis. On ne reconnaissait pas la maison. Reproche fondé.

**Ce qui a été fait pour y répondre**, dans l'ordre imposé :

1. **Accès Matterport vérifié** → [acces-matterport.md](./acces-matterport.md).
   Le modèle de référence est **public mais appartient à un tiers** (`info@pinthree.com`), il date du
   **27 janvier 2018** — huit ans avant nos prises de vue — et **ce n'est pas notre maison**.
   Voie 1 fermée.
2. **Reconstruction depuis nos données : essai réel, pas un avis.** Appariement SIFT + RANSAC entre
   panoramas voisins, reprojetés en vues perspectives l'un vers l'autre.
   **Les paires censées se voir donnent 11-13 inliers ; les paires témoins qui ne peuvent rien
   partager en donnent 10-13.** Le signal ne se distingue pas du bruit, et COLMAP écarte une paire
   sous ~15. Résultats et image dans `analyse/essais/`. Voie 2 fermée.
3. **Voie 3 implémentée au complet : projection des panoramas sur la géométrie.**

Aujourd'hui, chaque surface de la cartographie et du plan est texturée par le panorama de sa pièce.
Les planchers montrent leur vrai bois, les murs leur vraie couleur, les fenêtres leur vraie vue, la
piscine son eau. **13 pièces sur 17 sont texturées** ; les 4 restantes n'ont jamais été
photographiées et restent grises, sans prétendre l'être.

**Ce que ça ne fait pas :** les meubles sont **écrasés** sur le sol et les murs. Ce sont des images
projetées, pas des volumes. Un divan se voit et se reconnaît, mais il n'a pas d'épaisseur. Combler
cet écart demande un vrai balayage de profondeur — la méthode est dans
[recommandation-capture.md](./recommandation-capture.md).

---

## 1. Ce qui a été fait

### Mode 1 — Cartographie 3D

Volume à deux niveaux, sans toit, orbitable, **texturé par les panoramas**.

- Rotation à la souris, zoom à la molette, panoramique au clic droit, inertie douce
  (amortissement 0,075).
- Bornes polaires `[0.14, 1.44]` rad : **on ne passe jamais sous le plancher**, et jamais au zénith
  exact — au zénith on est en mode plan.
- **Sélecteur de niveau** : le niveau choisi reste à pleine opacité, ce qui est **au-dessus
  s'estompe à 0,10 en 350 ms**, ce qui est en dessous reste lisible à 0,45. On ne fait pas
  disparaître : on garde le sens du volume, comme demandé.
- Survol : la pièce s'éclaire et son nom s'affiche en étiquette suivant le pointeur.
- Clic sur une pièce ou un repère → mode 3 au point correspondant.
- Les espaces **non photographiés** (garage, chambres non visitées, rangement) sont rendus en gris
  translucide et **ne sont pas cliquables** — ils existent sans se prétendre visitables.

**La peau : projection des panoramas.** Pour chaque fragment de sol ou de mur, on calcule la
direction depuis le point de vue de la pièce, on la convertit en coordonnées équirectangulaires et
on échantillonne le panorama (`lib/maison3d/projection.ts`). Deux points de vue au plus sont
mélangés par l'inverse du carré de la distance, ce qui fond les coutures dans l'aire ouverte —
découpée en quatre zones qui partagent un même volume, sans cloison entre elles.

L'orientation de chaque panorama est **dérivée, pas ajustée à l'œil** : un panorama n'a pas de nord,
son 0° est le centre arbitraire de l'image. Pour chaque nœud, on connaît le `yaw` calibré vers
chacun de ses voisins et la direction de ce voisin dans le plan ; l'orientation est la moyenne
circulaire des écarts, prise sur tous ses liens. Un nœud à quatre liens est contraint quatre fois.

Les surfaces projetées ne reçoivent **aucune lumière de synthèse** : les panoramas portent déjà
l'éclairage réel de la maison. En ajouter doublerait les ombres et trahirait la photo.

### Mode 2 — Plan 2D

Vue du dessus, caméra orthographique, déplacement et zoom (pas de rotation : un plan se lit).

- **La transition depuis le mode 1 est le morceau soigné.** 900 ms, courbe cubique. La caméra monte
  et se redresse pendant que la projection glisse de la perspective vers l'orthographique par
  **dolly-zoom** : à distance `d` du pivot, on conserve l'invariant `h = d·tan(fov/2)` en résolvant
  `fov = 2·atan(h/d)` à chaque image. Le cadrage au pivot ne bouge jamais ; à FOV minuscule
  l'image est indiscernable d'une orthographique, et l'échange contre la vraie caméra ortho est
  invisible.
- Plan orienté à la convention : **entrée en bas, est à droite**.
- Étiquettes de pièce, affichées **seulement sur un niveau isolé** — empilés, deux niveaux
  superposent leurs libellés au même endroit.
- Clic sur une pièce → mode 3.

### Mode 3 — Visite à pied

**L'existant, réutilisé sans une ligne réécrite.** `components/tour/Tour360.tsx` (Photo Sphere
Viewer + VirtualTour) et `components/tour/TourMiniMap.tsx` sont montés tels quels.

- Retour vers les modes 1 et 2 toujours accessible : barre de commandes, touches `1`/`2`, `Échap`.
- La transition depuis le plan est chorégraphiée : **la caméra plonge d'abord vers le point de
  visite, à hauteur d'œil**, puis le panorama se fond par-dessus (500 ms).
- Le mini-plan « vous êtes ici » est conservé, avec téléportation et suivi de position.
- La visite reste montée après le premier passage : y revenir est instantané et ne recrée pas de
  contexte WebGL.

### Interface

- **Barre de commandes en bas à gauche**, mais **en colonne, avec libellés et rappel de raccourci**
  — délibérément différente de la référence, qui aligne des boutons ronds sans texte à l'horizontale.
- **Sélecteur de niveau en colonne sur le bord droit**, à l'opposé : deux commandes de nature
  différente ne se rangent pas ensemble.
- Icônes `lucide-react` (`Box`, `LayoutGrid`, `Footprints`) — aucune reprise des pictogrammes de la
  référence.
- Palette, typographie et courbes **reprises du site** : `nuit`/`ardoise`/`chaux`/`brume`/`cuivre`,
  Fraunces et Satoshi, `.glass-dark`, `ease-out-expo`. Aucun langage visuel nouveau.
- Clavier : `1`/`2`/`3` pour les modes, `Échap` remonte d'un cran puis ferme, flèches laissées aux
  contrôles de chaque mode. Focus visible (contour 2 px).
- Chargement : **jamais d'écran noir** — une silhouette de volume en SVG pulse pendant le
  chargement du module.
- Mobile : gestes tactiles complets (un doigt tourne ou déplace, deux doigts zooment), commandes
  dans la zone du pouce.
- `prefers-reduced-motion` : toutes les transitions passent à 0 ms.

---

## 2. Ce qui n'a pas été fait, et pourquoi

### 2.1 Le mode 4 « Mesures » — délibérément absent

Il exige un modèle à l'échelle métrique. **Le projet n'en a aucun et ne permet pas d'en établir un.**
Vérifié un par un ([inventaire-3d.md](./inventaire-3d.md)) : pas de maillage, pas de nuage de
points, pas de carte de profondeur, pas de plan d'architecte, pas de dimension par pièce, et pas
même la hauteur du trépied de prise de vue — la seule mesure qui aurait levé l'ambiguïté d'échelle.

Afficher des cotes comme le fait la capture `55.webp` de la référence serait de la donnée inventée.
Le projet l'interdit explicitement (`fiche.json:4` : « AUCUN CHIFFRE PLAUSIBLE INVENTÉ », avec un
build qui casse). **La barre a donc trois entrées, pas quatre.**

### 2.2 Le plan n'est pas exact, et le dit

L'énoncé demandait un « plan 2D exact ». Il ne peut pas l'être : aucune mesure n'existe.

C'est un **schéma**, construit sur trois sources réelles — la topologie du graphe de visite (18 liens
réciproques validés au build), les positions `map` posées par l'auteur du mini-plan, et les
relèvements `yaw` calibrés résolus en repère commun. La mention
**« Schéma d'orientation — proportions indicatives, non mesurées »** est affichée en permanence dans
les modes volume, et l'en-tête de `data/tours/maison-01-plan.ts` développe la limite.

Les espaces sont des rectangles qui pavent une emprise. Le schéma dit *où l'on est et ce qui donne
sur quoi*, pas *à quoi ressemble* la maison.

### 2.3 Les meubles sont écrasés, pas volumétriques

C'est la limite dure de la projection. Un panorama dit *ce qu'on voit dans chaque direction*, jamais
*à quelle distance*. Le divan est donc peint sur le plancher et sur le mur derrière lui : on le voit
et on le reconnaît, il n'a pas d'épaisseur.

La référence les montre en volume parce qu'un capteur de profondeur les a mesurés. Et le dessus des
meubles reste de toute façon inconnu — depuis un appareil à hauteur d'homme, c'est de l'occlusion
pure ; toute méthode qui « remplit » invente.

**Combler cet écart demande une nouvelle capture au LiDAR.** Méthode complète dans
[recommandation-capture.md](./recommandation-capture.md).

### 2.4 Deux contextes WebGL au lieu d'un — compromis assumé

Les modes 1 et 2 partagent déjà une scène, une caméra et un canvas : la continuité y est réelle.
Le mode 3 vit dans le canvas de Photo Sphere Viewer.

Photo Sphere Viewer expose `viewer.renderer.setCustomRenderer()`, qui permettrait de rendre notre
scène dans **son** contexte — un seul canvas, continuité totale. Non pris ici : le contrat n'est pas
versionné en SemVer explicite, PSV est déclaré en `^5.14.3`, et le risque portait sur le mode 3 que
la consigne demande de réutiliser sans le réécrire.

Coût réel : 2 contextes WebGL sur les 8 de Chrome Android. **C'est la première chose à reprendre.**

---

## 3. Résultats des tests

### 3.1 Suite du visualiseur — `npm run test:visualiseur`

```
— Desktop 1440×900 —
  ✓ ouverture sur la cartographie, sans erreur console
  ✓ bouton « plan » : bascule et transition terminée
  ✓ bouton « carto » : bascule et transition terminée
  ✓ touche « 2 » → plan
  ✓ touche « 1 » → carto
  ✓ niveau « etage » : appliqué et annoncé
  ✓ niveau « rdc » : appliqué et annoncé
  ✓ niveau « tous » : appliqué et annoncé
  ✓ plan étage : 7 pièces étiquetées
  ✓ plan « tout » : aucune étiquette superposée
  ✓ clic sur une pièce du plan → visite au bon point
  ✓ retour depuis la visite vers le plan
  ✓ retour depuis la visite vers la cartographie
  ✓ Échap : plan → cartographie
  ✓ Échap : ferme le visualiseur
  ✓ lien profond ?visite=1 : ouvre la visite à pied
  ✓ visite : mini-plan conservé
  ✓ 20 bascules de mode : ressources GPU stables (géométries 23, textures 1)
  ✓ focus visible sur les commandes (solid 2px)
— Mobile 390×844 —
  ✓ mobile : cartographie affichée
  ✓ mobile : bascule au toucher vers le plan
  ✓ mobile : barre de modes accessible au pouce
  ✓ mobile : visite à pied accessible
  ✓ reduced-motion : bascule instantanée
— Fluidité en rotation continue (fenêtré) —
  ℹ rendu : ANGLE (Intel(R) Iris(R) Xe Graphics, D3D11)
  ✓ rotation continue 5 s : 116 im/s

SUCCÈS — visualiseur : zéro erreur.
```

### 3.2 Non-régression de la visite existante — `npm run test:360`

```
  ✓ 36/36 flèches cliquées mènent à la bonne pièce
  ✓ mini-plan : téléportation + suivi de position
  ✓ galerie : vignettes fonctionnelles
  ✓ clavier : flèches pivotent la vue
  ✓ Échap remonte les modes puis ferme le visualiseur
  ✓ réouverture après fermeture : aucun crash
  ✓ remontage après navigation client : aucun contexte WebGL perdu
  ✓ tablette 768×1024 · 1920×1080 · mobile 390×844 · reduced-motion
SUCCÈS — visite 360° : zéro erreur, zéro flèche perdue.
```

### 3.3 Build et types

- `npx tsc --noEmit` : propre.
- `npx next lint` sur les nouveaux modules : aucun avertissement.
- `VISITE_ALLOW_TODO=1 npm run build` : succès. `/maison` = **8,86 ko**, **158 ko** de JS au premier
  chargement (three.js et PSV restent en chargement différé).
- ⚠️ `npm run build` **sans** la variable échoue sur `/appartement` : le garde-fou anti-invention du
  projet trouve 52 champs `TODO` dans `fiche.json`. **Préexistant, sans rapport avec cette mission.**

### 3.4 Captures — `analyse/captures/`

`desktop-1-carto.png` · `desktop-2-plan-etage.png` · `desktop-3-visite.png` ·
`mobile-1-carto.png` · `mobile-2-plan.png` · `mobile-3-visite.png`

---

## 4. Sur la mesure de fluidité — à lire avant de relancer les tests

Le Chromium **headless** de Playwright rend en **SwiftShader**, c'est-à-dire en logiciel : il
plafonne à ~15 im/s quel que soit le code. `scripts/gpu-check.mjs` existe dans ce projet exactement
pour cette raison.

La suite relance donc un Chromium **en fenêtre** pour la seule mesure de fluidité — seul moyen
d'obtenir l'accélération matérielle ici. Mesuré : **116-120 im/s** sur Intel Iris Xe, contre 60
visés. `--fps-headless` force la mesure en headless si l'on accepte qu'elle soit non concluante.

**Autre piège rencontré :** sur un serveur de développement à cache froid, `test:360` échoue
partiellement (10/36 puis 28/36 puis 36/36 sur trois passes successives). Ce ne sont pas des liens
cassés — les panoramas 6144×3072 se compilent et se chargent à la demande pendant que le test
clique. **Préchauffer les routes avant de conclure.**

---

## 5. Défauts trouvés et corrigés en cours de route

Consignés parce qu'ils sont instructifs :

| Défaut | Cause | Correction |
|---|---|---|
| Sols et murs en miroir l'un de l'autre | `rotateX(-π/2)` envoie le *y* du plan sur **−z** monde, alors que les murs étaient posés sur **+z** | Négation compensatoire dans `formeDe()`, commentée |
| Mode plan entièrement noir | Le brouillard `Fog(150, 320)` : la caméra ortho est à ~400 et le dolly-zoom pousse à 900 — tout se peignait en couleur de fond | Brouillard supprimé |
| Vue plan qui téléporte la caméra | `OrbitControls` avec `up` horizontal et décalage vertical = cas dégénéré de sa math sphérique | `ControlePlan` dédié (déplacement + zoom) |
| Transition qui distord à mi-course | Interpolation terme à terme des matrices de projection (three.js #5197) | Dolly-zoom + échange de caméra |
| Plan en miroir gauche-droite | Vu de dessus depuis +y avec l'écran vers +z, l'axe +x part à gauche | `up` négatif |
| 28 étiquettes au lieu de 14 | Double montage de React StrictMode ; le nettoyage libérait three.js mais pas les nœuds DOM | `replaceChildren()` à la création et au démontage |
| Lien profond `?visite=1` sans effet | `useState(modeInitial)` ne s'évalue qu'au premier montage, bien avant la lecture de l'URL | Application du mode à l'ouverture |
| Étiquettes superposées en mode « Tout » | Deux niveaux empilés projettent leurs libellés au même endroit | Étiquettes sur niveau isolé seulement |
| Boussole PSV sous la carte de titre | Deux éléments dans le même coin | Décalage de mes éléments en mode visite |

Un défaut **préexistant** a aussi été réparé au passage : `scripts/test-360.mjs` cliquait
`a[href="/#unites"]`, un lien supprimé par le commit `74b2d67`. Le test était cassé avant cette
mission. Ses libellés annonçaient également « 38 flèches » alors que le graphe en compte **36**.

---

## 6. Fichiers

**Nouveaux**
```
data/tours/maison-01-plan.ts        schéma des espaces + garde-fou de build
lib/maison3d/scene.ts               dalles, réseau de murs dédoublonné, repères
lib/maison3d/camera.ts              machine à états + ControlePlan
components/maison3d/ScenePlan.tsx   canvas, boucle, pointage, fondu, étiquettes
components/maison3d/VisualiseurMaison.tsx   coquille trois modes
scripts/test-visualiseur.mjs        suite E2E
analyse/inventaire-3d.md · recherche-3d.md · plan-3d.md · rapport-3d.md
```

**Modifiés**
```
app/maison/page.tsx          + validerPlan() au build
app/maison/MaisonClient.tsx  monte le visualiseur ; ?visite=1 ouvre le mode visite
scripts/test-360.mjs         réaligné sur la nouvelle coquille + lien mort réparé
package.json                 three + @types/three en dépendances directes, script de test
```

**Intouchés** : `components/tour/Tour360.tsx`, `components/tour/TourMiniMap.tsx`,
`data/tours/maison-01.ts`, la page d'accueil, la page de l'appartement, la palette, la typographie,
les composants partagés.

`components/tour/TourModal.tsx` n'est plus référencé — conservé sur le disque, à supprimer si l'on
confirme qu'aucun retour en arrière n'est prévu.

---

## 7. Ce qu'il faudrait pour aller plus loin

**Par ordre de valeur.**

1. **Un seul contexte WebGL** (`setCustomRenderer` de PSV) — supprime la dernière couture, celle du
   passage vers la visite à pied. Épingler PSV en `~5.15.x` et couvrir par un test.
2. **Une vraie géométrie.** Le visualiseur n'a pas à changer : seule la source du plan change.
   - *Le plus exact et le moins cher* : modélisation manuelle depuis les plans du promoteur, une
     demi-journée par typologie. Exactitude maximale, propriété pleine.
   - *Si le bien est accessible* : scan LiDAR iPhone (Scaniverse ou Polycam, ~2 h), qui donne un
     GLB **à l'échelle métrique** — ±2-5 cm par pièce.
3. **Le mode 4 devient alors possible**, et seulement alors. Avec mention de la précision réelle et
   du mot « approximatif », comme le fait tout le secteur.
4. **Relever la hauteur du trépied** au prochain tournage : c'est la seule mesure qui lève
   l'ambiguïté d'échelle d'une reconstruction depuis panoramas, et elle coûte trente secondes.
5. **Photographier les pièces manquantes** — chambre principale, deux chambres, garage, sous-sol,
   pool house ([NOTES_DEV.md](../NOTES_DEV.md) §9.5) — et **les couloirs et seuils**, dont le
   recouvrement conditionne toute reconstruction future.
6. Remplir `fiche.json` pour que `npm run build` passe sans échappatoire.
