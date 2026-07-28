# Méthode de capture — obtenir la qualité de la référence

**Date :** 27 juillet 2026
**Objet :** ce qu'il faut capter, avec quel appareil et quelle application, pour que la
cartographie 3D d'une propriété soit **photoréaliste** et non projetée.
**Portée :** ce document est la méthode pour tous les mandats suivants. Il vaut pour la maison de
`/maison` si on y retourne, et pour toute nouvelle propriété.

---

## 1. Pourquoi ce document existe

La cartographie livrée aujourd'hui projette les panoramas 360 sur une géométrie schématique. On
reconnaît la maison, mais **les meubles sont écrasés au sol et sur les murs** : ce sont des images,
pas des volumes.

La référence montre autre chose — un maillage 3D où le divan est un divan, avec son épaisseur. La
différence n'est pas dans le rendu, elle est **dans la donnée captée**. Aucun réglage ne la comble.

> **Ce qui manque, en une phrase : de la profondeur.**
> Un panorama dit *ce qu'on voit dans chaque direction*. Il ne dit pas *à quelle distance*.

Et il manque aussi une chose beaucoup plus simple, qui coûte trente secondes :
**la hauteur du trépied**. Sans elle, aucune reconstruction ne peut être mise à l'échelle
(voir §5).

---

## 2. Ce qui a été mesuré sur la propriété actuelle

Pas une opinion — un essai réel, reproductible :
`analyse/essais/essai-recouvrement.json`.

**Protocole.** Pour chaque paire de pièces reliées dans la visite, on reprojette les deux panoramas
en vues perspectives dirigées l'une vers l'autre (le relèvement mutuel est connu, résolu à partir
des `yaw` calibrés), puis on apparie en SIFT et on filtre par RANSAC sur la matrice fondamentale.
C'est exactement la première étape de COLMAP.

| Paire | Appariements | **Inliers RANSAC** |
|---|---|---|
| aire-ouverte ↔ cuisine | 60 | **13** |
| cuisine ↔ salle-manger | 40 | **13** |
| aire-ouverte ↔ salon | 62 | **13** |
| hall ↔ aire-ouverte | 32 | **12** |
| palier ↔ corridor | 31 | **12** |
| corridor ↔ chambre | 31 | **11** |
| *témoin :* cuisine ↔ chambre *(étages différents, ne se voient pas)* | 51 | **13** |
| *témoin :* salle d'eau ↔ piscine *(intérieur / extérieur)* | 18 | **10** |

> ### Les paires censées se voir ne se distinguent pas du bruit.
> Médiane 12 inliers pour les paires liées, 11 pour les paires témoins qui ne peuvent
> physiquement rien partager. **COLMAP écarte une paire sous ~15 inliers.** Une reconstruction
> d'intérieur saine en compte des centaines à des milliers.

La visualisation `analyse/essais/essai-appariement.jpg` le montre à l'œil : les correspondances se
croisent dans tous les sens, sans aucune cohérence géométrique.

**Cause : un seul point de vue par pièce.** Dix-sept panoramas pour toute une maison, avec des bases
énormes entre eux. La photogrammétrie a besoin de l'inverse — beaucoup de vues rapprochées.

---

## 3. La méthode recommandée — balayage LiDAR

### 3.1 Matériel

| | |
|---|---|
| **Appareil** | iPhone **Pro** ou iPad **Pro** (le LiDAR n'existe pas sur les modèles non-Pro) |
| **Application** | **Polycam** (mode *Space* ou *Room*) ou **Scaniverse** |
| **Secours Android** | KIRI Engine ou RealityScan — photogrammétrie infonuagique, sans LiDAR, qualité inférieure |
| **Durée** | ~1 h pour une maison complète |
| **Coût** | Scaniverse gratuit et illimité · Polycam gratuit en GLTF seulement, les autres formats et les plans d'étage demandent l'abonnement |

Polycam capte l'espace comme si on filmait la pièce, détecte les meubles, les électroménagers, la
couleur des murs, les fenêtres et les armoires, puis produit un plan d'étage avec les mesures. Son
mode *Space* avec LiDAR gère la profondeur et exporte plans, mesures et rapports spatiaux. L'export
se fait en **OBJ, PLY, USDZ ou GLB**, avec réglage du nombre de polygones et de la résolution des
textures.

### 3.2 Règles de capture — non négociables

Ce sont elles qui font la différence entre un scan exploitable et une heure perdue.

1. **Une capture par pièce.** Jamais la maison en une seule passe : la dérive est cumulative
   (10 à 20 cm sur un logement complet).
2. **Rester à moins de 4 m des surfaces.** Le LiDAR d'iPhone donne ±2 cm jusqu'à 3 m, 3-5 cm
   jusqu'à 4 m, et **s'effondre au-delà de 4-5 m**. Une grande pièce se capte en plusieurs passes.
3. **Marcher en continu, ne jamais pivoter sur place.** Un pivot ne produit aucune parallaxe et
   l'alignement échoue.
4. **Couvrir les couloirs et les seuils de porte.** C'est le recouvrement entre pièces qui permet de
   les recoller. C'est exactement ce qui manque aujourd'hui (§2).
5. **Portes complètement ouvertes ou complètement fermées**, jamais entrebâillées. Pause de deux
   secondes avant et après chaque passage de porte.
6. **Couvrir les miroirs d'un drap.** Sinon la pièce est dupliquée derrière le miroir. Ce n'est pas
   théorique : le projet a déjà eu un cas de miroir bloquant sur l'appartement
   (`analyse/traitements.md:35-37`).
7. **Lumière constante :** tout allumé, rideaux à mi-course. Pas de soleil direct qui bouge pendant
   la capture.
8. **Éteindre ventilateurs et écrans.** Tout ce qui bouge devient du bruit géométrique.

### 3.3 Ce qui échoue, quoi qu'on fasse

| Situation | Effet |
|---|---|
| Grands murs blancs unis | Trous et bombements |
| Fenêtres | Géométrie fantôme au-delà de la vitre |
| Miroirs | Pièce dupliquée |
| Surfaces vitrées et brillantes | Bruit |

Prévoir de les retoucher au nettoyage, ou de les cadrer autrement.

---

## 4. Chaîne de production, du scan au site

```
balayage LiDAR, une capture par pièce
  → vérification de l'échelle contre deux mesures au ruban  (§5)
  → export GLB texturé, un par étage
  → nettoyage Blender : décimation, suppression du bruit, fermeture des trous,
    retrait de la géométrie fantôme des fenêtres
  → gltfpack -i etage.glb -o etage-web.glb -si 0.3 -tc -cc
      (-si simplification 30 % · -tc textures KTX2 · -cc compression meshopt)
  → GLTFLoader + MeshoptDecoder + KTX2Loader dans three.js
  → alignement des points de la visite 360 sur le maillage
```

**Budgets à tenir**

| Cible | Valeur |
|---|---|
| Maillage par étage | **< 15 Mo** compressé |
| Textures | **2048 px**, KTX2/basis |
| Compression géométrie | **meshopt** de préférence à Draco — taux comparable une fois gzippé, décodage bien plus rapide |

> **Le visualiseur actuel n'a pas à être réécrit.** Ses trois modes, ses transitions, son sélecteur
> de niveau et son clavier sont indépendants de la source de géométrie. Remplacer le schéma extrudé
> par un maillage scanné, c'est changer ce que `lib/maison3d/scene.ts` construit — pas comment on le
> regarde.

---

## 5. ⚠️ La mesure qui change tout : la hauteur de l'appareil

**Trente secondes, un ruban, et c'est la seule chose qui permet de mettre une reconstruction à
l'échelle métrique.**

La reconstruction monoculaire est indéterminée à un facteur d'échelle près — c'est structurel, pas
une limite d'implémentation. Toute la littérature lève cette ambiguïté de la même façon : en
supposant une hauteur de caméra connue. HorizonNet et ses successeurs **supposent 1,6 m** et en
déduisent les coins 3D.

Conséquence pratique :

- **Si l'on relève la hauteur du trépied**, l'erreur d'échelle vaut l'erreur sur cette hauteur —
  environ **1 % pour ±1,5 cm**.
- **Si on ne la relève pas**, aucun affichage de cote n'est légitime. C'est exactement pourquoi
  Zillow, qui ne contrôle pas la hauteur du téléphone de l'agent, doit écrire que ses dimensions
  sont « approximatives et sujettes à vérification indépendante ».

**À noter systématiquement dans la fiche de tournage :**

```
Hauteur du trépied (sol → centre de l'objectif) : ______ cm
Deux distances de référence par pièce, au ruban  : ______ / ______ cm
Appareil et application utilisés                 : ______________
```

Sans cette fiche, **le mode « mesures » ne peut pas exister** — et il n'existe pas aujourd'hui, pour
cette raison précise.

---

## 6. Si l'accès au bien est impossible

Trois recours, par ordre de qualité :

1. **Les plans du promoteur.** Souvent déjà en DWG. Une modélisation manuelle sous Blender ou
   SketchUp donne la géométrie **la plus exacte possible**, dont nous sommes propriétaires, en
   environ une demi-journée par typologie. C'est plus exact que n'importe quelle reconstruction.
2. **Realsee « Pano to 3D ».** On téléverse des panoramas et la plateforme calcule leurs positions
   relatives puis génère un modèle 3D multi-étages. Contrainte dure : les panoramas doivent avoir
   des **points de vue communs**, sans quoi la validation échoue — ce qui disqualifie le jeu actuel
   (§2). Crédits ~2,55 à 2,97 $.
3. **Reprojection des panoramas sur une géométrie schématique** — ce qui est en ligne. Honnête,
   reconnaissable, mais les meubles restent plats.

---

## 7. Fiche de tournage — à imprimer

**Avant**
- [ ] iPhone/iPad **Pro** chargé, stockage libre
- [ ] Polycam ou Scaniverse installé et testé
- [ ] Miroirs couverts, ventilateurs et écrans éteints
- [ ] Toutes les lumières allumées, rideaux à mi-course
- [ ] Portes franchement ouvertes ou fermées
- [ ] **Hauteur du trépied mesurée et notée**
- [ ] Deux distances de référence par pièce, au ruban

**Pendant**
- [ ] Une capture **par pièce**, jamais la maison d'un bloc
- [ ] Marche continue, moins de 4 m des surfaces, aucun pivot sur place
- [ ] **Couloirs et seuils de porte captés** — c'est le liant entre les pièces
- [ ] Panoramas 360 aux mêmes emplacements, pour conserver la visite à pied
- [ ] Photographier **toutes** les pièces, y compris celles qu'on croit secondaires
      *(sur la propriété actuelle il manque la chambre principale, deux chambres, le garage, le
      sous-sol et l'intérieur du pool house — `NOTES_DEV.md:56-57`)*

**Après**
- [ ] Vérifier l'échelle contre les mesures au ruban ; écart > 2 % → remise à l'échelle
- [ ] Export GLB par étage
- [ ] Nettoyage, décimation, `gltfpack`
- [ ] Remplir `fiche.json` — le build échoue tant qu'un champ reste en `TODO`
