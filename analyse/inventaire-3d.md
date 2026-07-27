# Inventaire des données 3D — page `/maison`

**Date :** 27 juillet 2026
**Objet :** établir ce que le projet possède réellement avant de concevoir un visualiseur à trois
modes (cartographie 3D, plan 2D, visite à pied).
**Méthode :** lecture du dépôt, mesure des fichiers, lecture des images. Chaque affirmation est
ancrée sur un `chemin:ligne`. Rien n'est déduit d'une intention supposée.

---

## 1. La visite existante de `/maison` — ce que c'est exactement

### 1.1 La chaîne

| Rôle | Fichier |
|---|---|
| Page serveur, valide le graphe au build | `app/maison/page.tsx:11` |
| Coquille client, deep-link `?visite=1` | `app/maison/MaisonClient.tsx:71-74` |
| Modale plein écran | `components/tour/TourModal.tsx` |
| **Visionneuse** | `components/tour/Tour360.tsx:73-141` |
| Mini-plan schématique | `components/tour/TourMiniMap.tsx` |
| **Source unique de vérité** | `data/tours/maison-01.ts` |

### 1.2 Nature technique

**Des panoramas équirectangulaires 2:1 reliés par des flèches directionnelles.** Pas un modèle 3D,
pas un cubemap, pas de photogrammétrie.

- `components/tour/Tour360.tsx:104` → `positionMode: "manual"` — le mode `gps` est explicitement écarté.
- `components/tour/Tour360.tsx:105` → `renderMode: "3d"` désigne **le style des flèches** (posées au
  sol, orientées), pas un rendu 3D de la scène. Explicité en `NOTES_DEV.md:54`.
- `panorama:` reçoit une URL simple (`components/tour/Tour360.tsx:116`) — jamais la forme cubemap
  à six faces.
- Viewer : Photo Sphere Viewer v5, six plugins sur sept utilisés. `markers-plugin` est déclaré en
  `package.json:20` mais **jamais importé** — dépendance morte.

### 1.3 Les fichiers

`public/tour/maison-01/` — **68 fichiers, 16 Mo.** 17 panoramas × 4 déclinaisons, produites par
`scripts/optimize-panos.mjs:73-76` :

| Suffixe | Dimensions | Poids unitaire | Rôle |
|---|---|---|---|
| `-hd.webp` | 6144 × 3072 | 244 Ko – 1,3 Mo | Desktop ≥ 1200 px |
| `-pano.webp` | 4096 × 2048 | 165 – 913 Ko | Défaut / mobile |
| `-preview.jpg` | 512 × 256 | ~10 Ko | Placeholder flouté |
| `-thumb.webp` | 480 × 240 | ~10 Ko | Galerie, mini-plan |

Les masters 8K (7680 × 3840, Insta360 X4 Air) **ne sont pas dans le dépôt** : ils vivent sur
`/Users/allenproulx/condos/photo2` (`scripts/optimize-panos.mjs:19`), une machine macOS tierce
inaccessible d'ici.

### 1.4 La structure d'un nœud — le point qui décide de tout

`data/tours/maison-01.ts:22-34` :

```ts
export type Node360 = {
  id: string;
  name: string;
  caption?: string;
  floor: Floor360;                  // "rdc" | "etage" | "exterieur"
  file: string;
  defaultYaw: number;               // orientation d'arrivée, en degrés
  links: Link360[];                 // { to, yaw, pitch? } — des ANGLES
  map: { x: number; y: number };    // % d'un panneau CSS de 160 px
};
```

**Ce qui n'existe pas, vérifié un par un :**

| Cherché | Présent | Preuve |
|---|---|---|
| `x`/`y`/`z` en mètres | ❌ | Le seul `x/y` est `map`, en % d'un `div` de `h-40` : `components/tour/TourMiniMap.tsx:57,70` |
| `gps` (lat/lon/alt) | ❌ | 0 occurrence ; `positionMode: "manual"` désactive le mode GPS |
| `panoData`, `sphereCorrection` | ❌ | 0 occurrence. `NOTES_DEV.md:45` : « `PoseHeadingDegrees = 0` partout » |
| Distance entre deux nœuds | ❌ | `Link360` ne porte que `yaw` + `pitch` (`data/tours/maison-01.ts:14-20`) |
| Hauteur de caméra | ❌ | Aucune |

Les `map.x/map.y` ont été posés à l'œil, sans échelle, sans origine, sans repère commun entre les
trois zones. Le fichier le dit lui-même — `components/tour/TourMiniMap.tsx:16-17` :
« **Plan d'orientation assumé, pas un plan d'architecte.** »

### 1.5 Le graphe

**17 nœuds, 36 flèches, soit 18 liens bidirectionnels.** Réciprocité imposée au build par
`validateTour()` (`data/tours/maison-01.ts:149-165`).

> **Écart de documentation relevé.** `NOTES_DEV.md:52,60` et `scripts/test-360.mjs:3,108` annoncent
> « 19 liens bidirectionnels (38 flèches) ». Le comptage réel donne 36 (`grep -c 'to: "'` = 36).
> Le test itère le vrai graphe, donc il passe : seul le libellé imprimé est faux. Hors périmètre de
> cette mission — signalé, pas corrigé.

Ce que les `yaw` fournissent réellement : une **direction angulaire** de i vers j, dans le repère
arbitraire du panorama i. Ce n'est pas rien — voir §6.2 — mais ce n'est pas une position.

---

## 2. Données de profondeur — **aucune**

Recherche exhaustive sur 21 extensions (`.obj .glb .gltf .ply .fbx .usdz .splat .ksplat .e57 .las
.pts .xyz .pcd .dae .stl .3ds .ifc .dwg .dxf .pdf`) hors `node_modules` : **0 fichier.**

Inventaire complet des extensions du dépôt :

```
1678 webp · 115 jpg · 34 tsx · 16 ts · 10 mjs · 9 json · 8 mp4 · 5 md
   2 trf · 2 svg · 1 woff2 · 1 tsbuildinfo · 1 js · 1 css
```

Les deux `.trf` sont des vecteurs de stabilisation `vidstab` — de la translation/rotation 2D image
par image (`scripts/extract-frames.mjs:401-402`). Ce n'est pas de la profondeur.

Le sujet a déjà été tranché dans le projet, `NOTES_DEV.md:81` :
> « Gaussian Splatting / SuperSplat | ❌ | La reconstruction (COLMAP/Nerfstudio) exige GPU + heures
> de calcul, résultat non garanti. **Pas fiable ici.** »

> ### ❌ Aucun maillage, aucun nuage de points, aucune carte de profondeur, aucun scan.
> Le projet ne contient que **des pixels et des angles**. Zéro information tridimensionnelle
> métrique.

---

## 3. Matterport — référence visuelle, pas ressource technique

| Piste | Résultat |
|---|---|
| Chaîne `matterport` dans code / doc / config | **0 occurrence** |
| SDK, paquet npm | ❌ absent de `package.json` et `package-lock.json` |
| Clé d'API | ❌ `.env.example:1-17` ne liste que Supabase, Resend, `VISITE_ALLOW_TODO` |
| `.env` réel | ❌ inexistant (ignoré par `.gitignore:6`) |
| `<iframe>` ou URL `my.matterport.com` | **0 occurrence** |

En revanche, les cinq WebP de `public/video/exemple/` **sont des captures d'écran du visualiseur
Matterport** — le mot-marque est lisible en haut à gauche sur quatre d'entre elles. Déposées par le
commit `ea0a896` du 27/07/2026, « pour un usage à venir », référencées par aucune page.

> ### ❌ Aucun compte, aucune licence, aucune clé. → **La voie A est fermée.**
> ### ✅ Matterport sert de cahier des charges visuel, rien de plus.

---

## 4. `public/video/exemple/` — lecture des cinq captures

Une même propriété (cottage québécois habité, plancher de bois franc, escalier central) parcourue
dans les quatre modes du visualiseur Matterport. Captures navigateur desktop, ratio ~16:9.

| Fichier | Dimensions | Mode montré |
|---|---|---|
| `11.webp` | 1456 × 813 | **Dollhouse** — maillage 3D texturé d'un étage, vu de trois-quarts en plongée, murs sectionnés |
| `22.webp` | 1467 × 812 | **Dollhouse, étage 2 isolé** — pastille « Floor 2 » + `✕`, étages voisins en gris fantôme |
| `33webp.webp` | 1481 × 812 | **Floor Plan** — vue zénithale orthographique, **texture photographique réelle projetée** (grain du bois, marches de l'escalier visibles une à une) |
| `44.webp` | 1480 × 812 | **Walk** — vue panoramique intérieure, réticule de déplacement au sol |
| `55.webp` | 1334 × 896 | **Plan + outil de mesure** — quatre cotes en pastilles : `3,32 m`, `1,93 m`, `0,65 m`, `2,72 m` |

Éléments d'interface récurrents : barre flottante **en bas à gauche, cinq boutons ronds**
(dollhouse, plan, piéton, sélecteur d'étage avec badge de numéro, ruban de mesure) ; pastille
d'étage centrée en haut ; bouton `⋮` en bas à droite ; tiroir de vignettes en bas au centre.

Deux enseignements :

1. Le maillage Matterport porte les **franges de reconstruction** typiques d'un scan de profondeur
   (géométrie déchiquetée en bord de champ, textures étirées). C'est un produit de capteur, pas
   d'astuce d'affichage.
2. La capture `55.webp` montre exactement la capacité que **ce projet ne peut pas honorer** : des
   cotes métriques réelles. Elles supposent un modèle à l'échelle. Nous n'en avons pas.

**Conséquence d'interface :** notre barre de commandes ne sera **ni au même endroit, ni de la même
forme, ni avec les mêmes icônes**. Fonctions voisines, exécution indépendante.

---

## 5. Plans, dimensions, mesures — rien pour la maison

- **Aucun PDF, aucun DWG/DXF/IFC, aucun certificat de localisation** dans tout le dépôt.
- Deux SVG seulement : le favicon, et `content/proprietes/5-et-demi-deux-niveaux/plan.svg`.
- Ce dernier concerne **l'appartement, pas la maison**, et se déclare faux en tête de fichier
  (`plan.svg:1-5`) :
  > « PLAN PROVISOIRE — Les proportions sont FAUSSES et assumées […] Il sera redessiné aux
  > proportions réelles après les mesures au ruban. »

### 5.1 D'où viennent les chiffres affichés sur `/maison`

D'un objet TypeScript codé en dur, `lib/units.ts:27-66` :

| Affiché | Source | Ligne |
|---|---|---|
| « 205 m² » | `surface: "205 m²"` — **chaîne littérale** | `lib/units.ts:33` |
| « 3 chambres » | `bedrooms: 3` | `lib/units.ts:34` |
| « 2 950 $/mois » | `monthlyPrice: "2 950 $/mois"` | `lib/units.ts:32` |

`surface` n'est ni calculée, ni sourcée, ni tracée. Contrairement à `fiche.json` de l'appartement,
`lib/units.ts` n'a aucun mécanisme anti-invention. Le pied de page l'assume :
« Présentation de démonstration — données fournies à titre d'exemple » (`components/Footer.tsx:87`).

### 5.2 Dimensions par pièce

**Inexistantes pour la maison.** Ni `Unit` (`lib/units.ts:3-24`) ni `Node360` ne portent de
superficie, de dimension ou de hauteur.

Pour l'appartement, un schéma existe mais est **entièrement vide** : les dix pièces de
`fiche.json:81-188` ont toutes `superficiePi2: null`, `dimensionsM: null`, `status: "TODO"`,
`src: "mesure"`. La règle est inscrite en tête, `fiche.json:4` :
> « AUCUN CHIFFRE PLAUSIBLE INVENTÉ. […] Le build de production échoue si un champ TODO est atteint. »

C'est la règle de la maison. Cette mission s'y tient.

---

## 6. Ce dont on dispose vraiment

### 6.1 L'actif

| Ressource | État |
|---|---|
| 17 panoramas équirectangulaires calibrés, 4 déclinaisons, 16 Mo | ✅ solide |
| Graphe de circulation à 18 liens réciproques, validé au build | ✅ solide |
| `defaultYaw` par pièce, calibré à la capture (11 corrections, `NOTES_DEV.md:53`) | ✅ solide |
| Classement des pièces en 3 zones (`rdc` / `etage` / `exterieur`) | ✅ solide |
| Disposition relative approximative (`map.x/y`), posée à l'œil | ⚠️ indicatif |
| 8 photos plates de la maison (`public/photos/maison/`, 2,1 Mo) | ✅ pour l'habillage |
| `three@0.184.0` déjà installé (dépendance de `@photo-sphere-viewer/core`) | ✅ zéro install |
| Navigateurs Playwright installés, convention de test établie (`scripts/test-360.mjs`) | ✅ |

> La vidéo 4K de 612 Mo (`public/video/VID_…mp4`) concerne **l'appartement**, pas la maison
> (`analyse/decoupage.md:42-49`). Et elle a subi `lenscorrection` + `vidstab`
> (`scripts/extract-frames.mjs:270-272,410-414`), ce qui détruit la calibration de la caméra. Elle
> est inexploitable pour une reconstruction, y compris pour l'appartement.

### 6.2 Un actif sous-estimé : les `yaw` forment un système résoluble

Chaque panorama a une orientation propre inconnue mais fixe, `h_i`. Un lien i→j de relèvement
`yaw_ij` pointe donc, dans un repère commun, vers `h_i + yaw_ij`. Le lien réciproque donne :

```
h_i + yaw_ij  ≡  h_j + yaw_ji + 180°   (mod 360°)
```

18 équations pour 16 inconnues (17 orientations moins une fixée comme référence) : le système est
**surdéterminé**, donc résoluble aux moindres carrés, et son résidu **mesure la cohérence** des
angles calibrés à la main.

Cela ne donne pas de distances — donc pas d'échelle, donc pas de mesures. Mais cela donne des
**relèvements mutuels cohérents**, ce qui est une contrainte géométrique réelle et vérifiable pour
poser une disposition. C'est la seule structure spatiale que le projet contienne, et elle est
dérivée, pas inventée.

---

## 7. Les voies, avec leur coût réel

| Voie | Ce que ça exige | Rendu | Effort | Risque | Verdict ici |
|---|---|---|---|---|---|
| **A** · Intégrer la visite Matterport via son SDK, avec notre interface | Un compte Matterport actif et le droit d'usage | Photoréaliste, immédiat | Faible | Aucun si la visite est à nous | ❌ **Fermée.** Ni compte, ni clé, ni licence (§3). La visite du lien de référence n'est pas la nôtre et ne montre pas notre propriété. |
| **B** · Reconstruire un maillage par photogrammétrie / gaussian splatting | Vidéo de qualité, calibration intacte, GPU, heures de calcul | Photoréaliste variable | Élevé | Qualité incertaine | ❌ **Fermée.** Pas de couverture multi-angles de la maison ; les masters 8K sont hors dépôt ; la seule vidéo est celle de l'appartement et sa géométrie est détruite par le défishage et la stabilisation. Déjà écartée par le projet (`NOTES_DEV.md:81`). |
| **C** · Modéliser un volume simplifié rendu en three.js | Des mesures, du temps de modélisation | Stylisé, propre, non photoréaliste | Moyen | Aucun | ⚠️ Possible, mais « des mesures » n'existent pas. Sans elles, C se réduit à D. |
| **D** · **Plan schématique + volume extrudé + panoramas aux points** | Les panoramas et le graphe existants, une disposition assumée comme schématique | Honnête et lisible | Moyen | Aucun, **à condition de le nommer schéma** | ✅ **Retenue.** |

### La décision

**Voie D**, par application de la règle imposée :

1. Matterport accessible avec nos identifiants ? → **non** (§3). On passe.
2. Données de profondeur ou maillage exploitable dans le projet ? → **non** (§2). On passe.
3. → **Voie D.**

### Ce que la voie D change par rapport à l'énoncé

L'énoncé dit « plan 2D **exact** ». **Il ne peut pas être exact** : aucune mesure n'existe, et en
inventer violerait la règle du projet (`fiche.json:4`) autant que la consigne de cette mission.

Ce sera donc un **plan schématique**, cohérent avec trois sources réelles — la topologie du graphe,
les relèvements `yaw` calibrés (§6.2), et la disposition `map.x/y` déjà posée par l'auteur — et
**nommé comme tel dans l'interface**, dans la lignée de ce que fait déjà le mini-plan existant
(« Plan d'orientation assumé, pas un plan d'architecte »).

### Conséquence directe : le mode 4 n'existera pas

Le mode « Mesures » exige un modèle à l'échelle métrique. Nous n'en avons pas, et aucune donnée du
dépôt ne permet d'en établir une. **Il ne sera pas implémenté.** Afficher « 3,32 m » comme le fait
la capture `55.webp` serait une donnée inventée.

C'est la bonne décision, pas un renoncement : une cote fausse sur une page immobilière est un
risque, pas une fonctionnalité — le projet l'a déjà écrit lui-même en `analyse/decoupage.md:261`.

---

## 8. Synthèse

| Question | Réponse |
|---|---|
| Panoramas exploitables ? | ✅ 17 nœuds, 6144×3072, 16 Mo |
| Graphe de circulation ? | ✅ 18 liens réciproques validés au build |
| Coordonnées spatiales sur les nœuds ? | ❌ des angles et des % de panneau CSS |
| Données de profondeur ? | ❌ absolument aucune |
| Compte / SDK Matterport ? | ❌ aucun |
| Plan d'architecte de la maison ? | ❌ aucun |
| Dimensions par pièce ? | ❌ aucune |
| Échelle métrique établissable ? | ❌ non |
| **Voie retenue** | **D — schéma 2D + volume extrudé + panoramas aux points** |
| **Mode 4 (mesures)** | **Non implémenté, faute d'échelle. Assumé et déclaré.** |
