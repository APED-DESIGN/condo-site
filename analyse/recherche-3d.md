# Recherche — visualiseur trois modes

**Date :** 27 juillet 2026
**Objet :** état de l'art et arbitrages techniques pour un visualiseur cartographie 3D / plan 2D /
visite à pied sur `/maison`.
**Méthode :** documentation publique, typings publics du SDK Matterport, registre npm, littérature
académique. Aucune décompilation, aucun téléchargement d'asset, aucune rétro-ingénierie.

> **Limite de méthode assumée.** La visite de référence
> `my.matterport.com/show/?m=NEZP4hRcr76` est protégée par Cloudflare Turnstile. L'observation
> automatisée a été bloquée à la vérification anti-bot et **n'a pas été contournée**. La section 1
> repose donc sur la documentation publique, les typings `sdk.d.ts` servis en clair, et les cinq
> captures d'écran déposées dans `public/video/exemple/` (décrites dans
> [inventaire-3d.md](./inventaire-3d.md) §4).

---

## 1. La référence — mécanique observable

### 1.1 Les modes officiels

Valeurs exactes de l'énumération `Mode.Mode` des typings publics :

```ts
enum Mode {
  INSIDE        = "mode.inside",        // visite à pied
  OUTSIDE       = "mode.outside",       // orbite extérieure
  DOLLHOUSE     = "mode.dollhouse",     // maison de poupée
  FLOORPLAN     = "mode.floorplan",     // plan vu du dessus
  TRANSITIONING = "mode.transitioning"  // état transitoire, pas un mode cible
}
```

Raccourcis clavier du produit : `1` intérieur, `2` dollhouse, `3` plan, `4` maillage brut (mode
non documenté dans le SDK). **Notre choix `1`/`2`/`3` est cohérent avec cette convention sans la
copier** : nos trois modes ne sont pas les leurs, et l'ordre part du volume, pas de l'intérieur.

### 1.2 Emplacement des commandes

- **Coin inférieur gauche** : groupe des boutons de vue, icônes seules, disposition horizontale.
- **Sélecteur d'étage** : à droite du bouton de vue, présent seulement sur les biens multi-étages.
- Bas de l'écran : bandeau de vignettes. Haut : titre, recherche, mesures.

C'est confirmé par les captures : `11.webp` montre cinq boutons ronds en bas à gauche, `22.webp`
ajoute un badge de numéro d'étage sur le quatrième.

### 1.3 La mécanique de transition

Trois types exposés, à l'identique sur `Mode`, `Sweep` et `Mattertag` :

```ts
enum TransitionType {
  INSTANT = "transition.instant",
  FLY     = "transition.fly",      // « Smoothly interpolate the camera to the target position »
  FADEOUT = "transition.fade"      // « Fade out to black before moving the camera »
}
```

Appel type, avec les notes verbatim de la documentation :

```ts
mpSdk.Mode.moveTo(mpSdk.Mode.Mode.FLOORPLAN, {
  position: { x: 0, y: 0, z: 0 },   // « determined by the X and Z arguments »
  rotation: { x: -90, y: 0 },       // x = roulis du plan, y = inclinaison
  transition: mpSdk.Mode.TransitionType.FLY,
  zoom: 5,                          // plan seulement, « the lower the number, the further zoomed in »
});
```

**Durée :** aucune durée ni courbe n'est documentée pour `Mode.moveTo`. Seul `Sweep.moveTo` expose
un `transitionTime`, et l'exemple officiel utilise `2000` ms. C'est le seul chiffre du corpus. La
perception couramment rapportée pour intérieur → dollhouse est de l'ordre de 1,5 à 2,5 s, avec un
ralenti marqué en fin de course. **À traiter comme une estimation, pas une spécification.**

> **Le point conceptuel décisif, et ce qui nous sépare d'eux.**
>
> Matterport n'a **jamais deux scènes**. La vue intérieure n'est pas une sphère photo posée sur un
> fond : c'est **le maillage 3D du bien, texturé par projection des photos** prises depuis chaque
> point de capture. Le mode maillage caché montre la même géométrie sans les textures.
>
> La transition n'est donc pas un fondu entre deux représentations — c'est **un déplacement de
> caméra sur une géométrie unique**. Les meubles ne « réapparaissent » pas vus du dessus : ils
> n'ont jamais disparu, ils font partie du maillage. Seuls le toit et les plafonds sont retirés
> quand on quitte la vue intérieure, et les pastilles de déplacement sont masquées.
>
> **C'est ce qu'aucune plateforme sans capteur de profondeur ne peut reproduire**, et c'est
> exactement notre situation (voir [inventaire-3d.md](./inventaire-3d.md) §2).

### 1.4 Sélection d'étage

```ts
Floor.moveTo(index): Promise<number>
// « When in inside mode, this function changes the active floor, and moves the camera to the
//   nearest position on that floor. When in floorplan/dollhouse mode, this function changes the
//   active floor, but does not modify the camera. »
Floor.showAll(): Promise<void>
```

**Sémantique retenue et appliquée :** en plan et en volume, choisir un étage change ce qu'on
montre, **pas d'où on le regarde**. C'est ce que fait `Pilote.changerNiveau()` dans
`lib/maison3d/camera.ts` — une première version déplaçait la caméra, c'était une erreur.

Les étages non sélectionnés sont **masqués** chez eux. Le cahier des charges de cette mission
demande au contraire un **estompage en 350 ms** pour garder le sens du volume : c'est ce qui est
implémenté, et c'est un écart délibéré.

### 1.5 Le SDK — accès et licence

| | SDK for Embeds | SDK Bundle |
|---|---|---|
| Architecture | iframe hébergée par Matterport, postMessage | auto-hébergé, accès au moteur 3D et au graphe de scène |
| Interface propre | autour de l'iframe | y compris **dans** la scène |

- **Bac à sable gratuit** : clé SDK limitée à `localhost`, token API limité aux modèles de démo.
- **Production** : abonnement payant **plus** une *Developer Tools License* séparée, **dont le prix
  n'est pas publié**. Clés restreintes par domaine.
- Licence : *Matterport SDK Agreement*.

**Conclusion pour ce projet : sans objet.** Le dépôt n'a ni compte, ni clé, ni licence, et la visite
de référence n'est pas la nôtre.

> ⚠️ Les outils `matterport-dl` et dérivés (extraction des `.dam` vers `.obj`) circulent
> publiquement. Ils violent les conditions d'utilisation et sortent du cadre fixé. **Non utilisés,
> non consultés pour l'implémentation.**

---

## 2. Techniques web

### 2.1 Transition perspective ↔ orthographique — l'arbitrage qui a changé le code

Trois approches, par fiabilité décroissante.

**A. Dolly-zoom, puis échange — retenue.** On garde une seule caméra perspective. À distance `d` du
pivot, la demi-hauteur cadrée vaut `h = d·tan(fov/2)`. On capture `h` au départ, on recule, et on
résout le FOV à chaque image :

```ts
const d = lerp(d0, dCible, t);
camera.position.copy(pivot).addScaledVector(direction, d);
camera.fov = 2 * radToDeg(Math.atan(h / d));   // le cadrage au pivot ne bouge jamais
camera.near = Math.max(0.5, d - 220);          // sinon le tampon de profondeur se dégrade
camera.far  = d + 320;
camera.updateProjectionMatrix();
```

À FOV très petit, l'image est indiscernable d'une orthographique : on échange alors contre une
vraie caméra ortho de même demi-hauteur, et la couture est invisible.

**B. Interpolation terme à terme des matrices de projection — écartée.** C'est la solution qui vient
à l'esprit, **et c'est celle qui avait été codée en premier ici**. Elle distord : perspective et
orthographique sont mathématiquement disjointes (`w = z` contre `w = 1`) et le mélange naïf dégénère
la carte de profondeur à mi-course. Documenté depuis 2014 (three.js #5197). **Corrigée en
dolly-zoom après cette recherche.**

**C. Fondu entre deux caméras — écartée.** Double le coût GPU, et le fondu se voit parce que les
deux images divergent géométriquement.

### 2.2 Contrôles

`OrbitControls` (addon three.js) convient au mode volume : amortissement, bornes polaires,
molette. **Il ne convient pas au mode plan** : une vue plan est à la verticale exacte avec un `up`
horizontal, or `OrbitControls` dérive sa position d'un repère sphérique construit sur `camera.up`.
`up` horizontal plus décalage vertical, c'est le cas dégénéré, et son `update()` renvoie la caméra
ailleurs. **Constaté en pratique : la vue plan sortait noire.** D'où le contrôleur dédié
`ControlePlan` (déplacement et zoom seulement, ~90 lignes) dans `lib/maison3d/camera.ts`.

`camera-controls` de yomotsu (10 Ko gzip, MIT) offre `setLookAt` avec Promise et `fitToBox` gérant
les deux types de caméra. **Non adopté ici** : le pilote maison fait déjà exactement ce dont on a
besoin, et c'est une dépendance de moins.

### 2.3 Couper les étages

- **Plans de coupe** (`clippingPlanes`) : une géométrie coupée est creuse, on voit l'intérieur des
  murs. Un rendu propre exige du capage au stencil.
- **Un groupe par niveau, opacité pilotée** : zéro shader, zéro artefact. **C'est ce qui est
  implémenté**, avec un fondu de 350 ms au lieu d'un masquage sec.

### 2.4 react-three-fiber — écarté, et pourquoi

| Paquet | `peerDependencies.react` | Poids gzip |
|---|---|---|
| `@react-three/fiber@9.x` | **`>=19 <19.3`** | 42 Ko |
| `@react-three/fiber@8.18.0` | `>=18 <19` | 42 Ko |
| `@react-three/drei@10.x` | **`^19`** | 499 Ko (barrel) |
| `@react-three/drei@9.122.0` | `^18` | 499 Ko (barrel) |

Le projet est en **React 18.3.1**. Adopter r3f imposerait de se figer sur r3f 8 + drei 9, deux
branches en maintenance — une dette immédiate. Et drei tire `three-stdlib`.

**Décision : three.js vanilla.** Trois raisons :
1. `three@0.184.0` est **déjà dans le bundle**, comme dépendance de `@photo-sphere-viewer/core`.
   Le coût marginal d'une scène three.js est donc proche de zéro. *(Il a néanmoins été promu en
   dépendance directe de `package.json` : dépendre implicitement d'une dépendance transitive est
   fragile.)*
2. `components/tour/Tour360.tsx` est déjà 100 % impératif dans un `useEffect`. Le visualiseur est
   une scène unique fortement scriptée, pas un arbre de composants dynamique.
3. Le budget : ~540 Ko gzip de sucre syntaxique contre 0 Ko.

### 2.5 Gaussian splatting

`@sparkjsdev/spark` 2.1.0 (MIT, peer `three >= 0.180`) est le standard 2026 : streaming, LOD,
`SplatMesh` qui dérive de `THREE.Object3D` et s'intègre au pipeline standard. Notre `three` est en
0.184.0, donc compatible.

**Sans objet ici** : il faudrait un splat, et le projet n'en a aucun. Et **1,7 Mo gzip** sur une
page vitrine mobile serait de toute façon prohibitif hors chargement à la demande.

### 2.6 Visionneuses de panoramas

| | Photo Sphere Viewer 5.15 | Marzipano | Pannellum |
|---|---|---|---|
| Maintenance | ✅ 26/07/2026 | ❌ dernière version 06/2022 | ✅ |
| Accès à la scène three.js | ✅ `addObject` / `setCustomRenderer` | ❌ | ❌ |

**PSV est le seul des trois qui rende ce projet possible. Il est conservé, et `Tour360.tsx` n'a pas
été touché d'une ligne.**

### 2.7 ⭐ Faire coexister three.js et PSV — le point critique

Limites navigateur : Chrome et Safari desktop plafonnent à **16 contextes WebGL**, **Chrome Android
à 8**. Au-delà, le plus ancien contexte est perdu.

**Quatre options, et ce qui a été retenu :**

1. **Deux canvas superposés, fondu CSS.** Deux contextes WebGL. La continuité est *approchée* : on
   fond deux images qui ne partagent ni caméra ni tampon de profondeur.
2. **`viewer.renderer.addObject()`** — un seul contexte, mais la caméra de PSV est **verrouillée à
   l'origine** (`position.set(0,0,0)`, `far = 20`). On peut tourner, pas s'éloigner. **Inutilisable
   pour une orbite autour d'une maquette.**
3. **`viewer.renderer.setCustomRenderer()`** — PSV appelle
   `(customRenderer || renderer).render(scene, camera)`. Le hook livre le `WebGLRenderer` réel et
   laisse rendre **notre** scène avec **notre** caméra. Un seul contexte, continuité réelle,
   composition possible. Précédent officiel : le stereo-plugin de PSV.
4. **Tout dans notre scène, PSV supprimé** — la voie Matterport. Exige un vrai maillage, et
   reviendrait à réécrire ce que PSV fait bien (préchargement, gyroscope iOS, boussole, galerie,
   i18n, gestion WebGL).

> **Retenu : option 1, deux canvas.** C'est un compromis assumé, pas le meilleur choix technique.
>
> Justification : les modes 1 et 2 — la bascule volume ↔ plan, « le moment qui impressionne » —
> partagent **déjà** une scène, une caméra et un canvas. La continuité y est réelle, pas simulée.
> Seul le passage vers la visite à pied traverse la frontière des deux canvas, et il est
> chorégraphié (plongée de caméra vers le point, puis fondu de 500 ms), ce qui masque la couture.
>
> L'option 3 serait meilleure, mais le contrat de `setCustomRenderer` n'est pas versionné en SemVer
> explicite, et PSV est déclaré en `^5.14.3` dans ce dépôt. La prendre maintenant aurait mis en
> risque le mode 3, que la consigne demande de **réutiliser sans le réécrire**. Coût réel du
> compromis : 2 contextes WebGL sur 8 en Chrome Android.
>
> **C'est la première chose à reprendre** si l'on veut une continuité totale — voir
> [rapport-3d.md](./rapport-3d.md).

---

## 3. Concurrents — ce qu'ils avouent

| Plateforme | Plan 2D | Volume 3D | Sans capteur de profondeur | Cotes garanties |
|---|---|---|---|---|
| **Zillow 3D Home** | ✅ auto (vision + apprentissage) | ❌ | ✅ **la référence** | ⚠️ « approximatives » |
| **Giraffe360** | ✅ | ✅ splats | ❌ caméra robotisée | ✅ ~98 % |
| **iGUIDE** | ✅ | ❌ assumé | ❌ LiDAR | ✅ **≤ 0,5 %** |
| **EyeSpy360** | ✅ auto | ✅ | ✅ | ⚠️ « approximatives » |
| **Asteroom** | ✅ | ✅ | ✅ | non spécifié |
| **Realsee** | ✅ | ✅ | ✅ **le plus avancé** | ⚠️→✅ |
| **Kuula** | ❌ image téléversée | ❌ | s.o. | ❌ |

**Personne ne coche les trois cases** plan coté fiable / volume convaincant / sans matériel
propriétaire.

Trois aveux valent tout le benchmark :

1. **Zillow**, qui a la meilleure IA du secteur : « toutes les dimensions sont **approximatives et
   sujettes à vérification indépendante** ».
2. **Asteroom** : « il est **normal d'avoir de petits trous** dans le volume 3D pour les espaces de
   forme irrégulière ».
3. **CloudPano** : les cotes ne sont ajoutées **que si le client les fournit**, et « les mesures
   sont des **approximations** ».

**Tous les plans à garantie chiffrée exigent du LiDAR. Sans exception.** C'est ce qui fonde le refus
d'implémenter le mode 4.

---

## 4. Outils de reconstruction — pour mémoire

| Outil | Vidéo tél. | Panorama | Échelle métrique | Local |
|---|---|---|---|---|
| **Scaniverse** | ✅ | ❌ | ✅ métrique, mesure intégrée | ✅ sur appareil |
| **Polycam** | ✅ | ✅ | ✅ LiDAR/ARKit + outil de remise à l'échelle | ❌ nuage |
| **RealityScan 2.2** | images | ✅ depuis juin 2026 | ✅ le meilleur outillage (mire, GCP) | ✅ Windows |
| **Nerfstudio + gsplat** | ✅ | ✅ | ✅ si poses ARKit, sinon arbitraire | ✅ |
| **3DGS Inria** | ❌ | ❌ | ❌ jamais | ⛔ **licence NON COMMERCIALE** |
| **Luma AI** | — | — | — | ⚠️ **téléversements désactivés, produits arrêtés** |

**Quatre points durs.**

1. **Aucun algorithme ne produit d'échelle métrique par lui-même.** La reconstruction monoculaire
   est indéterminée à un facteur près — c'est structurel. L'échelle vient d'ailleurs : LiDAR, poses
   ARKit, mire, ou une distance connue saisie a posteriori.
2. ⛔ **Pièges de licence.** Le dépôt Inria `gaussian-splatting` est explicitement non commercial.
   Utiliser `gsplat` ou Brush (Apache-2.0) si le sujet revient.
3. ⚠️ **Luma AI est à écarter** : téléversements désactivés depuis novembre 2024, produits arrêtés
   au 1ᵉʳ janvier 2026.
4. **Les intérieurs sont le pire cas** : murs blancs (échec), fenêtres (géométrie fantôme), miroirs
   (pièce dupliquée), faible parallaxe (l'alignement échoue).

**Sans objet pour cette mission** : la seule vidéo du dépôt est celle de l'appartement, et sa
géométrie a été détruite par le défishage et la stabilisation.

---

## 5. Le point à trancher

> **Peut-on produire une cartographie 3D volumétrique convaincante à partir UNIQUEMENT de panoramas
> équirectangulaires, sans données de profondeur ?**

**Oui pour une maquette blanche architecturale. Non pour un volume photoréaliste avec meubles.**

### 5.1 L'état de l'art, en trois étapes

**Étape 1 — Structure d'une pièce depuis un panorama : problème résolu.**
LayoutNet (2018) → HorizonNet (2019, représentation 1D + ResNet-50 + Bi-LSTM) → DuLa-Net →
AtlantaNet → HoHoNet → LED2-Net → **LGT-Net (2022, 85,29 % de 3D IoU)** → DOPNet → uLayout (2026).
Autour de **85 % de 3D IoU sur une pièce isolée**, c'est résolu au sens de la recherche.

**Étape 2 — Recoller les pièces sans odométrie : le vrai verrou.**
CoVisPose (ECCV 2022, Zillow) estime la pose relative entre deux panoramas par co-visibilité.
SALVe (ECCV 2022) est le pipeline complet en six étapes. NadirFloorNet (CVPRW 2025) et **PanoFloor
(ISMAR 2025)** — ce dernier reconstruit et explore de grands multi-pièces depuis des panoramas
**sans profondeur en entrée**, à l'échelle métrique, avec transitions plan ↔ panorama. C'est
littéralement ce cahier des charges, publié.

> **Contrainte physique non négociable :** ces méthodes exigent un **recouvrement visuel entre
> panoramas**. Deux pièces qui ne se voient pas ne peuvent pas être positionnées l'une par rapport
> à l'autre. Realsee refuse explicitement le téléversement quand les points de vue communs manquent.

**Étape 3 — L'échelle : le point le plus mal compris.**
HorizonNet **n'extrait pas** l'échelle. Il **suppose une hauteur de caméra de 1,6 m** et en déduit
les coins 3D. L'ambiguïté monoculaire se lève avec **une seule mesure connue**. C'est pourquoi
Zillow, qui ne contrôle pas la hauteur du téléphone de l'agent, doit écrire « approximatif ».

### 5.2 Verdict

**Réaliste à partir de panoramas seuls :** un plan 2D à l'échelle (erreur 2-5 % avec une capture
soignée), une maquette blanche extrudée orbitable, les transitions animées entre modes (c'est un
problème de rendu web, pas de reconstruction), et la position relative de chaque point de vue.

**Fantasme :** les meubles (Matterport les a parce qu'il a un capteur) ; les surfaces
photoréalistes vues de dessus (depuis un panorama à 1,55 m il n'existe **aucune information** sur le
dessus des meubles — toute méthode qui « remplit » invente) ; les pièces non-Manhattan ; un plan
coté opposable.

⚠️ Les méthodes génératives (Pano2Room, PanoDreamer, Marble) **hallucinent**. Pour un bien
immobilier, présenter une géométrie inventée comme le bien réel est un problème juridique, pas
seulement esthétique. **Bannies de tout mode plan ou mesure.**

### 5.3 Ce qui s'applique ici

Ce projet n'a **ni recouvrement documenté entre panoramas, ni hauteur de trépied relevée, ni accès
aux masters 8K**. Le pipeline académique est donc hors de portée sans nouvelle acquisition. La
maquette schématique de [maison-01-plan.ts](../data/tours/maison-01-plan.ts) est la réponse
honnête : elle ne prétend à aucune exactitude, et le dit dans l'interface.

**Le chemin le plus court vers une vraie géométrie**, si le sujet revient : une modélisation
manuelle depuis les plans du promoteur (une demi-journée par typologie, exactitude maximale,
propriété pleine), ou un scan LiDAR iPhone (~2 h, ±2-5 cm par pièce). Dans les deux cas, **le
visualiseur écrit ici n'a pas à changer** : seule la source de la géométrie change.

---

## 6. Synthèse

1. **Une scène, une caméra, deux états pour les modes 1 et 2 : fait, et c'est là que la continuité
   compte le plus.**
2. **Coût de bundle marginal ≈ 0 :** three.js était déjà chargé par PSV.
3. **react-three-fiber écarté** : exigerait React 19, ou fige sur des branches en maintenance, pour
   ~540 Ko gzip de sucre syntaxique.
4. **Dolly-zoom, pas interpolation de matrices.** Correction appliquée après cette recherche.
5. **Sélecteur d'étage par opacité de groupe, jamais par plan de coupe.**
6. **Choisir un étage ne déplace pas la caméra** — sémantique reprise de la référence.
7. **Le mode mesures ne peut pas exister ici** : tous les plans cotés fiables du marché exigent un
   capteur de profondeur.
8. **Deux canvas au lieu d'un** : compromis assumé, documenté, avec la voie de sortie identifiée
   (`setCustomRenderer`).
