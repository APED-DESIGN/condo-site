# Traitements image par image — vie privée

> **Aucune coupe.** Les passages problématiques restent dans le flux : ils sont corrigés
> localement, image par image, jamais au ciseau. Les zones sont des données
> (`content/proprietes/<slug>/runs.json` → `traitements`), pas du code.

## Méthode

Balayage complet des 80,28 s à 2 im/s en 1280 px, puis vérification **en pleine résolution
3840 × 2160** de chaque surface suspecte, avec recadrage zoomé. Toutes les surfaces
réfléchissantes ont été inspectées : miroirs (entrée, salle d'eau, salle de bain, garde-robe),
téléviseurs éteints (salon, chambre principale), réfrigérateur inox, hotte, robinetterie,
vitre du four, porte-patio et fenêtres.

Les zones sont exprimées en **fractions de l'image de travail** (2560 × 1440, après défishage
et stabilisation), `x, y, w, h`, et le flou est appliqué **après** la réparation et après la
réduction à 10 im/s.

C'est un changement par rapport à la première version, pour deux raisons. La première est
mesurée : sur la source à 59,94 im/s le graphe de flou tournait sur **4 812 images pour n'en
concerner que 84**, à +0,23 s par image — dix-huit minutes de calcul jetées. Sur la vidéo
réduite, ce sont 803 images. La seconde est meilleure encore : les zones sont maintenant
mesurées sur **les images qu'on livre réellement**, et non sur une géométrie que le défishage
va recadrer de 10 % — précisément du côté gauche, là où se trouve le miroir.

Le flou lui-même est un `avgblur` : coût constant quel que soit le rayon, et aucun
rééchantillonnage. Une première version passait par une réduction au huitième, un `gblur` à σ/8
puis un retour à la taille — élégant sur le papier, mais elle produisait **une bande verte franche
en haut de la zone**, un artefact de chroma dû au rééchantillonnage sur du yuv420p. Vu à l'image,
corrigé.

---

## Bloquant — personne identifiable

| Fenêtre | Nature | Zone | Traitement |
|---|---|---|---|
| **77,75 → 79,15 s** | **Personne parfaitement identifiable dans le garde-robe à portes miroir de la chambre principale.** Visage net (vérifié à 78,0 / 78,3 / 78,7 s), cheveux, vêtements, appareil en main. | `0,00 · 0,00 · 0,26 · 1,00` | Flou gaussien σ 55 |

**Correction d'une hypothèse du brief.** Le correctif proposait « recadrage serré (crop 15-20 %) ».
Ça ne suffit pas : à 78,3 s le miroir occupe **le quart gauche du cadre** (mesuré : 0 → 300 px sur
1280) et la personne est en plein dedans. Un rognage de 20 % laisserait passer une partie du reflet
et amputerait le plan de la chambre principale — c'est-à-dire du meilleur plan du fichier. Le flou
local est la seule option qui garde le plan.

Bornes resserrées après vérification image par image : la personne apparaît à 77,9 s et a disparu
à 79,0 s. La fenêtre appliquée déborde de 0,15 s de chaque côté par sécurité.

---

## Mineur — traité par précaution

| Fenêtre | Nature | Zone | Traitement |
|---|---|---|---|
| 77,10 → 77,42 s | Silhouette humaine à contre-jour dans le reflet du téléviseur éteint. Aucun trait de visage résoluble. | `0,00 · 0,00 · 0,28 · 0,34` | Flou gaussien σ 40 |
| 77,42 → 77,68 s | Idem, le téléviseur a traversé le cadre pendant le panoramique. | `0,18 · 0,00 · 0,44 · 0,34` | Flou gaussien σ 40 |
| 77,68 → 77,98 s | Idem, fin de course du panoramique. | `0,44 · 0,00 · 0,54 · 0,34` | Flou gaussien σ 40 |

Zones limitées au tiers supérieur du cadre, et c'est délibéré : une première version couvrait la
moitié de la hauteur et le rectangle de flou débordait visiblement sur la commode et le panier à
linge. Le reflet ne se trouve que dans la partie haute de l'écran — flouter plus ne protège
personne et abîme le plan.

Trois sous-fenêtres et non une seule : entre 77,2 et 77,8 s le téléviseur traverse le cadre de
gauche à droite (mesuré : `x` 0 → 0,23 à 77,2 s, 0,23 → 0,59 à 77,5 s, 0,51 → 0,90 à 77,8 s).
Une zone unique aurait dû couvrir 80 % de la largeur — on aurait flouté la moitié du plan pour
une silhouette non identifiable.

---

## Inspecté, non traité — et pourquoi

### L'ombre du caméraman (40,6 → 43,2 s) — **non traitée, décision à confirmer**

Le correctif demandait un « assombrissement local / correction de luminance ». Après examen,
**je ne l'applique pas**, pour deux raisons :

1. **Ce n'est pas une donnée identifiante.** C'est une ombre portée molle, sans aucun trait :
   une forme de tête et un bras levé. Elle ne permet d'identifier personne. L'audit indépendant
   arrive à la même conclusion.
2. **Le remède serait pire.** L'ombre est projetée sur un grand mur blanc uni, avec des bords
   très dégradés. Un relevage local de luminance sur une surface plate et unie produit une
   **tache claire à bord franc** — beaucoup plus visible que l'ombre elle-même. Il n'existe pas
   de masque rectangulaire propre pour ce cas.

À la place : **aucun arrêt ne tombe dessus.** Le chapitre `palier` (qui s'arrêtait à 41,0 s, en
plein dedans) a été supprimé — le mur blanc du palier n'était de toute façon pas un plan vendeur.
Son argument (thermopompe à l'étage) a été déplacé sur l'arrêt `mezzanine` à 55,5 s. Le passage
est maintenant traversé à 14 vh par seconde de vidéo, soit un cinquième d'écran de défilement.

**Si tu veux quand même la traiter, dis-le** — c'est une ligne à ajouter dans `traitements`.

### Cadres photo de la chambre principale — **traités, sur la fenêtre des arrêts seulement**

Vérification faite sur les images d'arrêt produites, en recadrant à pleine résolution : **deux
cadres photo montrent bien des personnes** — un visage sur l'étagère de la chambre principale
(73,3 s), deux personnes sur l'étagère du coin bureau (76,1 s). Ce n'était pas résoluble sur les
planches d'analyse ; ça l'est sur les images d'arrêt en 2200 px.

C'est justement là que ça compte : les images d'arrêt sont celles qu'on regarde dix secondes, et
elles **s'ouvrent en grand dans la galerie**. Elles sont donc floutées, sur une fenêtre serrée
autour de chaque arrêt (± 0,4 s) :

| Fenêtre | Zone | Force |
|---|---|---|
| 73,05 → 73,55 s | `0,625 · 0,455 · 0,065 · 0,095` | 44 |
| 75,85 → 76,35 s | `0,225 · 0,545 · 0,105 · 0,190` | 44 |

**Les images de mouvement ne sont pas floutées**, et c'est délibéré : les cadres y traversent le
cadre pendant dix secondes, un masque rectangulaire fixe ne les suivrait pas, et à cette vitesse
et cette résolution rien n'y est lisible. Flouter dix secondes de plan pour un objet illisible
abîmerait la chambre principale — le meilleur plan du fichier — sans protéger personne de plus.

### Cadres muraux de la salle d'eau (~27,8 s)

Contenu blanc / vide en gros plan — vraisemblablement des estampes, pas des photos de personnes.
La résolution effective ne permet pas de l'affirmer catégoriquement. Non traités.

### Le chat (57,7 / 66-68 / 78-79 s)

Conservé. Un chat n'identifie personne et les plans sont bons.

### Papiers sur l'îlot de cuisine (10,0 → 14,5 s)

Une feuille manuscrite est posée sur le comptoir. **Texte illisible à toute résolution testée**,
y compris en recadrage plein cadre. Non traitée. Le segment est par ailleurs le plus rapide du
rez-de-chaussée (16 vh par seconde de vidéo) et aucun arrêt n'y tombe.

---

## Surfaces réfléchissantes déclarées propres

| Surface | Timecodes inspectés | Constat |
|---|---|---|
| Miroirs de l'entrée | 0,0 → 2,4 s | Aucun reflet de personne |
| Téléviseur du salon | 2,5 → 7,0 s · 33,5 → 36,5 s | Écran sombre, aucun reflet exploitable |
| Réfrigérateur inox | 10,0 → 11,5 s | Inox brossé, aucune image réfléchie nette |
| Cuisinière, hotte, robinetterie | 10,0 → 13,0 s | Aucun reflet identifiant |
| Porte-patio et cour | 19,0 → 24,8 s | Cour clôturée vide, aucun passant, aucune rue dans le champ |
| Miroir de la salle d'eau | 25,0 → 30,0 s | Reflète la fenêtre et une porte |
| Miroir de la salle de bain | 58,0 → 65,8 s | Reflète le plafond et le luminaire |
| Garde-robe miroir, avant l'incident | 70,0 → 77,8 s | Reflet vide — la chambre est inoccupée à ce moment |

L'arrêt `garde-robe-miroir` est calé à **71,0 s**, soit 6,8 s avant l'entrée de la personne dans
le champ du miroir. Le reflet y est vide, vérifié.

---

## Vérification à refaire après chaque nouvelle extraction

- [x] Ouvrir les 14 images d'arrêt de `public/frames/<slug>/arrets/` et les regarder une par une.
- [x] Vérifier qu'aucun cadre photo n'y est lisible — **aucun arrêt ne tombe sur les tables de chevet.**
- [x] Vérifier que les zones floutées ne débordent pas sur un élément vendeur — **une première
      version des zones du téléviseur débordait sur la commode ; resserrée au tiers supérieur du cadre.**
- [x] Vérifier les alertes de netteté. **`pied-escalier` (38,8) et `mezzanine` (95,6) ont été
      regardées : les deux images sont nettes.** Leur score est bas parce qu'un mur blanc et un
      tapis foncé ne contiennent presque aucun détail — la mesure compte le détail, pas la mise
      au point. Aucune des deux n'est à remplacer.

## Ce que la vérification a changé dans les images d'arrêt

Regarder les quatorze images une par une a déplacé deux arrêts :

| Arrêt | Avant | Après | Pourquoi |
|---|---|---|---|
| `terrasse` | 21,0 s | **22,3 s**, fenêtre ±0,3 s | À 21,0 s le montant de porte mange le cadre et on ne voit qu'un coin de dalle. À 22,3 s la cour entière est là. La mesure de netteté choisissait 21,5 s — l'image où la **moustiquaire** est la plus contrastée. C'est du détail, mais pas celui qu'on vend. |
| `pied-escalier` | 37,0 s | **37,2 s**, fenêtre ±0,3 s | À fenêtre large, la mesure partait chercher un plan du salon (meubles, fenêtres, reflets) plutôt que l'escalier. |

Reste à assumer sur cette vidéo, et qui ne se corrige qu'au re-tournage :

- **La terrasse est filmée à travers la moustiquaire** — le maillage reste visible. La caméra ne sort jamais.
- **L'entrée a une station de musculation dans le cadre**, et c'est aussi l'image d'accueil par défaut.
- **La salle d'eau contient un bac à litière et un tapis rouge.** Aucun autre cadrage de cette pièce n'existe dans la source.

## Ce que la vérification a changé dans les textes

Regarder les images d'arrêt a corrigé trois affirmations qui promettaient plus que ce qu'elles
montrent :

| Écrit d'abord | Corrigé en | Pourquoi |
|---|---|---|
| « escalier ouvert sur l'aire de vie » (accueil et panneau) | « Volée droite… » / « aire de vie ouverte du salon à la salle à manger » | La cage est fermée par un mur dès la deuxième marche. Seul le PIED donne sur l'aire de vie. |
| « micro-ondes hotte » | « hotte, micro-ondes encastré » | Il y a une hotte au-dessus de la cuisinière et un micro-ondes encastré ailleurs — deux appareils, pas un. |
| « un lit queen » (chambre principale) · « un lit double » (chambre 2) | « le lit » · « un lit » | **Je ne peux pas mesurer un matelas sur une image.** Une dimension de lit est un chiffre, et la règle vaut aussi pour les chiffres qui ne portent pas d'unité. |
| « Fenêtre pleine hauteur sur la façade » (salon) | « Grande fenêtre sur la façade » | La fenêtre s'arrête au-dessus d'une plinthe chauffante : elle n'est pas pleine hauteur. |
| « la pièce s'éclaire toute la journée sans lampe » | supprimé | L'orientation n'est pas relevée. Sans boussole, cette phrase est une invention. |
| « Plafond cathédrale dès le vestibule » | « Penderie d'entrée à portes miroir » | Le plafond du vestibule est plat. La cathédrale est au salon. |
| « elle s'aère sans ventilateur » (salle de bain) | « elle s'aère à l'air libre » | Rien ne dit qu'il n'y a pas de ventilateur. |
