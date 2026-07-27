# Plan technique — visualiseur trois modes

**Date :** 27 juillet 2026
**Voie retenue :** D — schéma 2D + volume extrudé + panoramas aux points
(voir [inventaire-3d.md](./inventaire-3d.md) §7).

---

## 1. Le principe directeur

> **Une seule scène, des états de caméra. Pas trois visualiseurs qu'on affiche tour à tour.**

L'utilisateur ne doit jamais avoir l'impression de changer d'outil, seulement de point de vue.
Concrètement :

- Les modes **1 (cartographie)** et **2 (plan)** partagent **la même scène, le même canvas, la même
  géométrie**. Rien n'est reconstruit, rien n'est masqué puis réaffiché. Seule la caméra monte, se
  redresse, et laisse sa projection glisser de la perspective vers l'orthographique.
- Le mode **3 (visite à pied)** est la visite existante, **réutilisée sans être réécrite**. Il vit
  dans un second canvas (celui de Photo Sphere Viewer) — c'est un compromis assumé, détaillé en §6.
- Le passage 2 → 3 est **chorégraphié** : la caméra plonge d'abord vers le point de visite visé, à
  hauteur d'œil, *puis* le panorama se fond par-dessus. C'est ce geste qui raccorde les deux
  canvas ; sans lui, la couture serait visible.

---

## 2. Architecture

```
data/tours/
  maison-01.ts            (existant, INTOUCHÉ) 17 nœuds, 18 liens, defaultYaw, map
  maison-01-plan.ts       (NOUVEAU) schéma des espaces + garde-fou de build

lib/maison3d/
  scene.ts                construction de la scène : dalles, réseau de murs, repères
  camera.ts               machine à états de caméra + ControlePlan

components/maison3d/
  ScenePlan.tsx           canvas, boucle de rendu, pointage, fondu des niveaux, étiquettes
  VisualiseurMaison.tsx   coquille : modes, clavier, barre de commandes, sélecteur de niveau

components/tour/
  Tour360.tsx             (existant, INTOUCHÉ) la visionneuse PSV
  TourMiniMap.tsx         (existant, INTOUCHÉ) réemployé dans le mode visite

scripts/
  test-visualiseur.mjs    (NOUVEAU) suite E2E du visualiseur
  test-360.mjs            (existant, réaligné sur la nouvelle coquille)
```

**Trois fichiers existants seulement sont modifiés** : `app/maison/page.tsx` (ajout du garde-fou),
`app/maison/MaisonClient.tsx` (monte le visualiseur au lieu de la modale), et `scripts/test-360.mjs`
(réalignement + réparation d'un lien mort préexistant). `TourModal.tsx` n'est plus utilisé ;
`Tour360.tsx` et `TourMiniMap.tsx` sont réemployés tels quels.

---

## 3. Structure des données

### 3.1 Un espace

```ts
type Espace = {
  id: string;
  nom: string;
  niveau: "rdc" | "etage";
  contour: readonly Pt[];      // polygone fermé, unités de plan arbitraires
  noeuds: readonly string[];   // nœuds 360 situés là ; vide = non photographié
  ouvert?: boolean;            // aire ouverte : pas de cloison intérieure
  vide?: boolean;              // trémie : plancher percé
};
```

**Ce qu'un espace n'a pas : ni superficie, ni dimension, ni hauteur.** Le fichier porte un en-tête
qui l'écrit noir sur blanc, dans la lignée de `plan.svg` de l'appartement.

### 3.2 Comment un étage est représenté

Deux niveaux bâtis (`rdc`, `etage`), pavant exactement leur emprise. L'extérieur n'est pas un
niveau : c'est le sol, quatre espaces posés à plat (`piscine`, `terrasse`, `porche`, `avant`).

L'altitude d'un niveau est calculée, jamais saisie : `altitude(n) = n === "rdc" ? 0 : H_NIVEAU + EP_PLANCHER`.

### 3.3 Comment un point de visite se rattache à l'espace

Par `Espace.noeuds`, qui référence les `id` de `maison-01.ts`. La position de la pastille est la
`map` de l'auteur **si elle tombe dans le polygone de l'espace**, le centroïde sinon. Ce repli
rattrape les nœuds extérieurs, dont les `map` sont exprimées dans un repère de panneau distinct.

### 3.4 Le garde-fou

`validerPlan(nodeIds)` est appelé par `app/maison/page.tsx`, comme `validateTour()` juste à côté.
Il casse `next build` si un nœud est placé deux fois, s'il est inconnu du graphe de visite, ou s'il
n'a aucun espace. **Le plan et le graphe ne peuvent pas diverger silencieusement.**

---

## 4. La caméra

### 4.1 La bascule carto ↔ plan — dolly-zoom

L'invariant : à distance `d` du pivot, la demi-hauteur cadrée vaut `h = d·tan(fov/2)`. On capture
`h` au départ, on interpole la direction et la distance, et on **résout le FOV** à chaque image :

```
fov = 2·atan(h / d)
```

Le cadrage au pivot ne bouge jamais. À FOV minuscule (`d = 900`), l'image est indiscernable d'une
orthographique : on échange alors contre une vraie caméra ortho de même demi-hauteur.

> **Ce n'est pas la première implémentation.** La version initiale interpolait terme à terme les
> deux matrices de projection. C'est la solution intuitive, et elle distord à mi-course —
> perspective et orthographique sont mathématiquement disjointes. Corrigée après recherche.

`near` et `far` suivent la distance, sinon le tampon de profondeur se dégrade à mesure que le FOV
se referme.

### 4.2 Les contrôles

- **Carto** : `OrbitControls`, amortissement 0,075, bornes polaires `[0.14, 1.44]` — jamais sous le
  plancher, jamais au zénith exact (au zénith on est en mode plan).
- **Plan** : `ControlePlan`, écrit pour l'occasion. `OrbitControls` **ne peut pas** servir ici :
  une vue plan a un `up` horizontal et un décalage vertical, le cas dégénéré de sa math sphérique.
  Constaté en pratique — la vue plan sortait noire.

### 4.3 Le sélecteur de niveau

Choisir un étage **ne déplace pas la caméra** — sémantique reprise de la référence. Il change les
opacités visées, atteintes en **350 ms** : niveau choisi à 1, ce qui est au-dessus à 0,10, ce qui
est en dessous à 0,45. On garde le sens du volume au lieu de faire disparaître d'un coup.

---

## 5. Découpage des tâches, dans l'ordre suivi

1. Inventaire des données, décision de voie → `analyse/inventaire-3d.md` ✅
2. Résolution du système des `yaw` en repère commun (vérification de cohérence) ✅
3. Schéma des espaces + garde-fou de build → `data/tours/maison-01-plan.ts` ✅
4. Construction de la scène : dalles, réseau de murs dédoublonné, repères → `lib/maison3d/scene.ts` ✅
5. Machine à états de caméra + contrôle plan → `lib/maison3d/camera.ts` ✅
6. Canvas, boucle, pointage, fondu, étiquettes → `components/maison3d/ScenePlan.tsx` ✅
7. Coquille trois modes, clavier, commandes → `components/maison3d/VisualiseurMaison.tsx` ✅
8. Réemploi du mode 3 et du mini-plan, lien profond ✅
9. Suite E2E + réalignement de la suite existante ✅
10. Rapport → `analyse/rapport-3d.md` ✅

---

## 6. Budgets et mesures

| Cible | Visé | Mesuré |
|---|---|---|
| Images/seconde en rotation continue (5 s) | 60 | **120** sur Intel Iris Xe |
| Poids du modèle 3D | < 15 Mo | **0 octet** — la géométrie est procédurale, générée au montage |
| JS au premier chargement de `/maison` | — | **158 ko** (three.js et PSV en chargement différé) |
| Poids de la page `/maison` | — | **8,86 ko** |
| Ressources GPU après 20 bascules de mode | stables | **stables** (23 géométries, 1 texture) |
| Textures KTX2 / Draco | prévu | **sans objet** : aucun maillage à charger, aucune texture |

**Le budget de poids est sans objet et c'est la conséquence directe de la voie D** : il n'y a pas de
modèle à télécharger. La géométrie est construite en mémoire depuis ~200 lignes de données.

---

## 7. Ce que je ne peux pas faire, et pourquoi

### 7.1 Le mode 4 « Mesures » — non implémenté

Il exige un modèle à l'échelle métrique. **Le projet n'en a aucun** et rien n'y permet d'en établir
une : pas de profondeur, pas de plan, pas de dimension par pièce, pas même la hauteur du trépied de
prise de vue — la seule mesure qui aurait levé l'ambiguïté d'échelle
([recherche-3d.md](./recherche-3d.md) §5.1).

Afficher « 3,32 m » comme le fait la capture `55.webp` serait une donnée inventée, ce que le projet
interdit explicitement (`fiche.json:4` : « AUCUN CHIFFRE PLAUSIBLE INVENTÉ »).

**La barre de commandes a donc trois entrées, pas quatre.**

### 7.2 Les meubles vus du dessus — impossible

Le volume de la référence montre les canapés parce qu'un capteur de profondeur les a mesurés. Depuis
un panorama pris à hauteur d'homme, il n'existe **aucune information** sur le dessus des meubles.
Toute méthode qui « remplit » invente.

### 7.3 Le plan n'est pas exact

L'énoncé demandait un « plan 2D exact ». Il ne peut pas l'être. C'est un **schéma**, cohérent avec
la topologie du graphe, les `map` de l'auteur et les relèvements `yaw` calibrés — et **nommé comme
tel dans l'interface** : « Schéma d'orientation — proportions indicatives, non mesurées », visible
en permanence dans les modes volume.

### 7.4 Un seul contexte WebGL — non fait

Photo Sphere Viewer expose `setCustomRenderer()`, qui permettrait de rendre notre scène dans **son**
contexte : un seul canvas, continuité totale. Non pris, parce que le contrat n'est pas versionné en
SemVer explicite et que PSV est déclaré en `^5.14.3` : le risque portait sur le mode 3, que la
consigne demande de réutiliser sans le réécrire.

Coût réel : 2 contextes WebGL sur 8 en Chrome Android. **C'est la première chose à reprendre.**

### 7.5 Les proportions ne sont pas celles de la maison

Les espaces sont des rectangles qui pavent une emprise. La vraie maison a des murs obliques, des
décrochés, des pièces de tailles différentes. Le schéma dit *où l'on est et ce qui donne sur quoi* —
pas *à quoi ressemble* la maison. C'est la limite de la voie D, et elle est assumée.
