# Mesures à prendre — La Panoramique (maison-01)

Ce qu'il faut relever au ruban pour que la cartographie cesse d'être une
maquette et devienne un plan. Les mesures sont classées par ce qu'elles
débloquent, pas par ordre de visite : les deux premières valent à elles seules
plus que les quarante suivantes.

Chaque valeur relevée se saisit dans
`content/proprietes/maison-panoramique/mobilier.json` et le volume concerné
passe de `"source": "estime"` à `"source": "mesure"`. Le bandeau du visualiseur
compte ces deux mots et se réécrit tout seul — il n'y a rien d'autre à changer
dans le code.

---

## Conventions de relevé

- **Ruban, pas laser à main levée.** Un télémètre convient pour les longueurs
  mur à mur ; il dérive sur les meubles, où le ruban est plus sûr.
- **Mur fini à mur fini**, à 1 m du sol, plinthe exclue.
- **En centimètres**, arrondi au centimètre. Pas de fraction de pouce
  reconvertie : on saisit ensuite en mètres à deux décimales.
- **Ordre constant : longueur × profondeur × hauteur.** La longueur est le
  grand côté horizontal, la profondeur le petit, la hauteur la verticale.
- **Position d'un objet** : distance des DEUX murs les plus proches jusqu'au
  bord de l'objet. Deux nombres suffisent, on en déduit le centre.
- **Photographier le ruban en place** quand la mesure est ambiguë (îlot
  arrondi, foyer en saillie). Une photo tranche mieux qu'une note.

---

## Priorité 0 — les trois relevés qui débloquent tout le reste (10 minutes)

Aujourd'hui le plan n'a **aucune échelle** : ses coordonnées viennent des
pourcentages du mini-plan, et sa hauteur d'étage a été choisie pour que le
volume ait l'allure d'une maison. Deux nombres suffisent à lui en donner une,
et ils sont utilisés à deux endroits distincts
(`data/tours/maison-01-plan.ts`, en tête de fichier).

| N° | Mesure | Où exactement | Sert à |
|---|---|---|---|
| **1** | **Hauteur sous plafond du rez-de-chaussée** | Plancher fini → plafond fini, au centre de l'aire ouverte. Éviter le plafond en retrait de la salle à manger, qui est plus haut. | `H_SOUS_PLAFOND_M` — toutes les hauteurs d'objets |
| **2** | **Largeur hors-tout du bâti** | Façade avant, coin extérieur gauche → coin extérieur droit, garage compris. | `LARGEUR_BATIE_M` — toutes les emprises et épaisseurs |
| **3** | **Nombre de marches de l'escalier** | Se compte, ne se mesure pas. Compter les contremarches, du plancher du rez au plancher de l'étage inclus. | `mobilier.json` → `escalier.marches` |

Tant que 1 et 2 ne sont pas prises, **aucun volume ne peut être marqué
`mesure`**, même s'il a été mesuré : un objet exact posé dans un plan sans
échelle reste approximatif. C'est pour cette raison que le bandeau parle de
maquette.

À titre indicatif, les estimations actuelles sont 2,44 m et 12,20 m. Si le
relevé s'en écarte de plus de 10 %, la maquette changera visiblement de
proportions — c'est normal et c'est le but.

---

## Priorité 1 — l'emprise des pièces (45 minutes)

Remplace le pavage schématique par la vraie disposition. Deux nombres par
pièce, mur à mur.

### Rez-de-chaussée

| Pièce | Ce qu'il faut |
|---|---|
| Aire ouverte (cuisine + salle à manger + salon) | Longueur totale mur nord → mur sud, et largeur totale mur est → mur ouest. Puis la position des deux retours de mur qui la referment. |
| Cuisine | Sa part de l'aire ouverte : du mur du fond au nez de l'îlot, et la largeur du mur d'armoires. |
| Salle à manger | Distance du mur de fenêtres côté piscine au mur opposé. |
| Salon | Mur du foyer → mur opposé, et la largeur entre les deux murs latéraux. |
| Hall / escalier | Emprise de la cage d'escalier au sol : largeur × profondeur. |
| Salle d'eau | Ses deux dimensions. |
| Vestibule | Ses deux dimensions, plus la largeur de la porte d'entrée. |
| Garage, rangement | Ses deux dimensions **si accessible** — ces pièces n'ont pas de panorama, elles restent grises, mais leur emprise corrige la forme du bâti. |

### Étage

| Pièce | Ce qu'il faut |
|---|---|
| Chambre (mur vert forêt) | Ses deux dimensions, plus la largeur du mur d'accent. |
| Salle de bain principale | Ses deux dimensions. |
| Corridor | Longueur et largeur. |
| Palier & mezzanine | Emprise, et longueur du garde-corps le long de la trémie. |
| Coin lecture | Ses deux dimensions, plus la largeur de la fenêtre panoramique. |
| Chambre principale, 3ᵉ chambre | Ses deux dimensions **si accessibles** — jamais photographiées, mais l'emprise compte. |

---

## Priorité 2 — les éléments fixes (60 minutes)

Ce sont eux qui structurent une pièce et la rendent reconnaissable, bien plus
que les meubles. À relever **en premier parmi les volumes**.

| Pièce | Élément | Mesures | Estimation actuelle |
|---|---|---|---|
| Cuisine | Îlot | longueur × profondeur × hauteur, + distance aux deux murs les plus proches | 2,60 × 1,15 × 0,92 |
| Cuisine | Comptoir périphérique | longueur du linéaire × profondeur × hauteur | 5,40 × 0,65 × 0,92 |
| Cuisine | Réfrigérateur | largeur × profondeur × hauteur | 0,95 × 0,75 × 1,90 |
| Cuisine | Garde-manger | largeur × profondeur × hauteur | 0,90 × 0,60 × 2,03 |
| Escalier | Volée | **contremarche** (hauteur d'une marche), **giron** (profondeur d'une marche), **largeur de la volée**, + longueur totale au sol | 0,18 / 0,26 / 1,15 |
| Salon | Foyer et sa saillie | largeur × saillie × hauteur du massif | 1,80 × 0,55 × 2,20 |
| Salon | Étagère intégrée | largeur × profondeur × hauteur | 1,00 × 0,35 × 2,10 |
| Salle de bain | Baignoire autoportante | longueur × largeur × hauteur, + distance aux deux murs | 1,70 × 0,80 × 0,62 |
| Salle de bain | Douche vitrée | emprise au sol × hauteur de la paroi | 1,20 × 1,00 × 2,03 |
| Salle de bain | Vanités (les deux) | longueur × profondeur × hauteur, + **hauteur du dessous** si suspendue | 1,80 × 0,55 × 0,55 à 0,35 du sol |
| Salle d'eau | Vanité suspendue | idem | 1,60 × 0,55 × 0,55 à 0,35 du sol |
| Palier | Garde-corps | longueur × hauteur | 3,40 × 1,05 |

---

## Priorité 3 — le mobilier mobile (30 minutes)

Utile, mais il déménagera avec les vendeurs. À faire en dernier, et à refaire
si la maison est restagée.

| Pièce | Élément | Estimation actuelle |
|---|---|---|
| Salle à manger | Table | 2,60 × 1,10 × 0,76 |
| Salle à manger | Chaise (une seule suffit, ×6 posées) | 0,46 × 0,50 × 0,95 |
| Salle à manger | Fauteuil d'appoint | 0,70 × 0,72 × 0,95 |
| Salon | Sectionnel — les deux retours séparément | 2,20 × 0,95 × 0,85 et 1,80 × 0,95 × 0,85 |
| Salon | Table basse ronde | ⌀ 1,10 × 0,40 |
| Chambre | Lit (largeur × longueur du matelas) | 1,53 × 2,03 × 0,60 |
| Chambre | Tables de chevet | 0,45 × 0,40 × 0,55 |
| Chambre | Bureau | 1,60 × 0,60 × 0,75 |
| Chambre | Commode | 1,10 × 0,50 × 0,90 |
| Coin lecture | Banc | 1,20 × 0,50 × 0,45 |

---

## Pièces sans volume déclaré, et pourquoi

- **Aire ouverte (zone centrale), hall, vestibule, corridor** : leur panorama
  ne montre pas d'élément fixe assez net pour en poser un. On préfère le vide à
  une boîte inventée. Si un relevé révèle un banc, une console ou un îlot de
  rangement, il s'ajoute au JSON.
- **Garage, rangement, chambre principale, 3ᵉ chambre** : jamais photographiées.
  Le garde-fou de build refuse d'y déclarer un volume — on ne meuble pas une
  pièce qu'on n'a pas vue.

---

## Ce que les mesures ne corrigeront pas

Il faut le dire pour éviter une déception au retour du relevé.

Mesurer donne les bonnes **proportions**. Ça ne donne pas la **forme** des
objets : l'îlot arrondi de la cuisine restera un pavé arrondi, le sectionnel
restera deux pavés, et les meubles resteront **écrasés sur le plancher dans la
texture** — un panorama dit ce qu'on voit dans chaque direction, jamais à
quelle distance.

Le seul chemin vers le rendu de la référence reste un balayage de profondeur :
matériel, règles de capture et chaîne de production dans
[`recommandation-capture.md`](recommandation-capture.md). Le visualiseur, lui,
n'aura pas à changer — seule la source de la géométrie change.
