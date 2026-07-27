# Découpage vidéo — 5½ sur deux niveaux

> ## ⚠️ §6 est CADUC — le montage à 32,6 s est annulé
>
> Depuis le correctif : **aucune coupe.** Les 80,28 s sont parcourues du début à la fin, et
> chaque seconde est atteignable au scroll. Ce qui faisait le montage — jeter la redite, la
> transition, l'encombrement — se fait maintenant par **la distance de scroll par seconde de
> vidéo** (`chapters.json`), pas par le ciseau. On garde tout, on module la vitesse.
>
> Les passages de vie privée ne sont plus coupés non plus : ils sont **traités image par image**.
> Voir `analyse/traitements.md`.
>
> **Ce qui reste valable dans ce document, et qui l'a fait écrire :** §1 (la source), §2 (ce que
> la vidéo contient et surtout ce qu'elle ne contient pas), §3 (le découpage par pièce et les
> meilleurs timecodes d'arrêt), §5 (les défauts techniques). Le rythme de `chapters.json` est
> construit directement sur les timecodes de §3 et §4 : ce que §4 proposait de couper est
> maintenant traversé vite.
>
> ---

> **Étape 1 du brief.** Analyse factuelle de la source, découpage par pièce, montage cible.
> Les questions ouvertes sont en §7.

---

## 1. La source — faits mesurés

| | |
|---|---|
| Fichier | `public/video/VID_20260725_130541_00_036.mp4` |
| Durée | **80,28 s** |
| Résolution | 3840 × 2160 (16:9 **plat**, pas équirectangulaire) |
| Codec | HEVC, yuvj420p, 59,94 fps (60000/1001) |
| Images | 4 812 |
| Débit | 63,9 Mb/s — **612 Mo** |
| Audio | AAC présent (inutilisable : bruit de pas, respiration) |

**Nature du plan :** walkthrough **caméra à la main**, action-cam grand-angle (nommage `VID_…_00_036` = Insta360, export mono-objectif 16:9). Ce n'est **pas** un plan au stabilisateur. Conséquences détaillées en §5.

---

## 2. Ce que la vidéo contient réellement

Un **5½ sur deux niveaux**, meublé et **habité** (occupants + chat présents pendant le tournage).

**Rez-de-chaussée** — entrée, aire ouverte salon / cuisine / salle à manger, porte-patio, salle d'eau, escalier.
**Étage** — palier, mezzanine, chambre 2, salle de bain complète avec laveuse-sécheuse, chambre principale.

Décompte 5½ cohérent : salon + cuisine + salle à manger + 2 chambres = 5 pièces, + salle de bain = ½.
La **salle d'eau du rez-de-chaussée est un bonus** (elle ne compte pas dans le 5½).

### ⚠️ Ce que la vidéo ne contient PAS

Le brief (§5, chapitre 00) prévoit une ouverture sur la façade. **Elle n'existe pas.** Corrigé dans le montage proposé.

| Manquant | Impact |
|---|---|
| **Aucun plan extérieur / façade** | La vidéo démarre déjà à l'intérieur, porte d'entrée dans le dos. Chapitre 00 « façade » **supprimé**. |
| **Aucun stationnement, garage, cour, rangement extérieur** | Chapitre 10 du brief **supprimé**. |
| **La caméra ne sort jamais sur la terrasse** | Le seuil et le rail de la porte coulissante restent dans le cadre de 20,0 s à 24,0 s. C'est une **vue de la terrasse depuis la porte-patio**, pas une sortie. Chapitre conservé mais renommé honnêtement. |
| **Aucune douche séparée** | Vérifié en pleine résolution (58,8 / 59,6 / 60,6 / 61,4 / 62,2 / 63,4 / 64,8 s) : la salle de bain contient **bain podium, toilette, vanité, laveuse-sécheuse** — pas de douche. L'objet « bleu turquoise » vu vers 66-68 s **n'est pas une douche** : c'est le **garde-corps arrondi de la cage d'escalier**, viré au bleu par une dérive de balance des blancs (mesuré : R77/G137/B183 à 67,0 s vs R143/G133/B130 à 80,0 s sur **le même mur**). **À confirmer auprès du propriétaire avant publication.** |
| **Aucune vue d'ensemble du volume de l'aire ouverte** | Le grand-angle est toujours trop près des murs. Le plan le plus large reste partiel. |

---

## 3. Découpage par pièce

Timecodes en secondes, précision ±0,25 s (échantillonnage d'analyse à 2 im/s, vérifications ponctuelles en pleine résolution).

### Rez-de-chaussée

| Début → Fin | Pièce | Ce qu'on voit | **Meilleur arrêt** |
|---|---|---|---|
| 0,0 → 2,0 | Entrée / vestibule | Porte blanche à vitrage latéral givré, tapis gris, vinyle planche gris-brun, enfilade vers l'aire ouverte. Plafond cathédrale. | **1,5 s** — mais plan faible : la porte mange 25 % du cadre. *Recommandé : supprimer le chapitre.* |
| 2,0 → 7,5 | Salon / aire de vie | Divan inclinable cuir brun, téléviseur sur meuble bas noir, grande fenêtre à rideaux noirs, plinthe électrique, plafond cathédrale, ouverture sans porte vers la cuisine. **Station de musculation + banc + haltères de 2,5 à 4,5 s.** | **6,0 s** — horizon droit, divan centré, fenêtre à gauche / TV à droite, plafond cathédrale lisible, **équipement de gym hors champ**, caméra stabilisée 5,5→6,5 s. |
| 7,5 → 13,5 | Cuisine | Armoires shaker blanches, îlot bleu-gris à comptoir stratifié bois clair, évier + robinet col-de-cygne, 2 tabourets noirs, cuisinière blanche + micro-ondes hotte, réfrigérateur inox graphite, suspension linéaire 4 lampes, escalier à gauche, fenêtre à droite. | **9,0 s** — cadrage frontal complet (îlot + tabourets + mur d'armoires + électros + suspension), sans comptoir en amorce déformante, sans objets, roulis nul. |
| 13,5 → 20,0 | Salle à manger | Table bois foncé 6 chaises à barreaux, suspension dôme métallique noir, grande palme en pot, porte-patio coulissante pleine hauteur à droite (à partir de 18,0 s), fenêtre latérale, plinthe électrique. | **16,0 s** — table centrée sous la suspension, cadre équilibré, caméra très stable 15,5→16,5 s. Variante « lumière » : **18,2 s** (porte-patio dans le cadre, extérieur pas encore brûlé). |
| 20,0 → 24,2 | **Vue de la terrasse** (depuis la porte) | Terrasse en pavé clair, table basse bleue, parasol vert fermé, 3-4 chaises pliantes, pelouse, haie de cèdres, maisons voisines, fils électriques, ciel bleu. | **21,0 s** — extérieur maximal dans le cadre, montants noirs réduits au minimum, exposition extérieure propre. |
| 24,2 → 24,8 | *(transition noire)* | Pivot rapide, image quasi noire, traînée floue. | — **point de coupe gratuit**, à exploiter. |
| 25,0 → 29,8 | Salle d'eau | Cuvette, meuble-vanité bois clair rainuré, comptoir blanc, robinet chromé, miroir à bandeau lumineux, panneau mural bois vertical, tapis rouge, cadre photo. **Pas de douche ni bain.** | **26,0 s** — cuvette + vanité + miroir lisibles d'un coup, **avant l'entrée de l'aspirateur-balai dans le cadre**, profondeur donnée par le couloir clair. |
| 30,6 → 34,5 | Cuisine (**2ᵉ passage**) | Même cuisine que 7,5→13,5 s, angles obliques, caméra en transit. | **33,0 s** — mais **redondant**, voir §4. |
| 34,0 → 36,5 | Séjour (2ᵉ passage) | Baie et fenêtres, canapé cuir, plancher réfléchissant. **Station de musculation au centre du cadre sur tout le passage.** | 35,5 s — inutilisable en l'état. |
| 34,5 → 37,5 | Pied d'escalier | Premières marches en bas à droite, main courante bois clair, marches foncées, limon fermé. | **37,0 s** — volée entière + main courante lisibles, encore éclairées par le séjour. |

### L'escalier — le moment charnière

| Événement | Timecode |
|---|---|
| Première marche dans le cadre | 34,5 s |
| Caméra face à l'escalier, au pied | **37,0 s** |
| **Début de montée** (le point de vue s'élève) | **37,5 s** |
| Milieu de volée (zone la plus sombre) | 38,5 → 39,5 s |
| **Fin de montée** (dernière marche franchie) | **40,5 s** |
| Arrivée palier stabilisée | 41,0 s |

**Durée exploitable : ~3,0 s (37,5 → 40,5).** Geste net et continu, sans hésitation ni retour arrière — c'est un vrai plan de liaison N1→N2, exactement ce qu'il faut pour la bascule du plan axonométrique. **Mais la cage est franchement sous-exposée entre 38,0 et 40,0** (marches écrasées au noir) et le bougé vertical est maximal : un rebond par marche, ~un choc toutes les 0,4-0,5 s. **Utilisable uniquement après relevage des ombres + stabilisation** (§5).

### Étage

| Début → Fin | Pièce | Ce qu'on voit | **Meilleur arrêt** |
|---|---|---|---|
| 42,0 → 44,4 | Palier / couloir | Mur blanc nu, grande porte blanche 5 panneaux. **L'ombre portée du caméraman est projetée sur le mur (42,3 et 43,2 s), silhouette identifiable.** | — aucun. |
| 44,5 → 52,4 | **Chambre 2** | Lit double sur base chêne blond à tiroir, couverture vert forêt, 2 taies vert foncé, 2 coussins beige gaufré, jeté crème. **Une seule fenêtre** (store enrouleur gris, plinthe électrique dessous). Une commode 6 tiroirs chêne blond. Garde-robe à porte blanche. Plafonnier rond opale. Plancher flottant gris clair. **Plafond plat** (la courbure vue sur planche-contact est du fisheye). **Étagère métallique noire chargée de bacs, paniers à linge et sacs dans le coin.** | **47,8 s** — le seul plan vendeur : commode à gauche, fenêtre centrée, lit habillé à droite, **le fouillis hors champ ou réduit à un liseré**. |
| 52,5 → 54,4 | Palier haut d'escalier | Garde-corps plein (demi-mur blanc), thermopompe murale, thermostat, détecteur de fumée. | — trop sombre et flou. |
| 54,5 → 57,2 | Couloir mezzanine | Couloir bois franc longeant le garde-corps, porte de salle de bain en bois blond, ouverture au fond sur la chambre principale. **Chat visible à 57,7 s.** | **55,5 s** — le seul plan qui raconte le volume de l'étage. Sous-exposé, à remonter. |
| 58,3 → 66,0 | **Salle de bain complète + buanderie** | Vanité longue mélamine bois clair grisé, comptoir effet marbre brun veiné, vasque blanche rectangulaire, robinet chrome haut, grand miroir + armoire haute + colonne à lingerie. **Bain podium** encastré, habillage blanc, encadrement effet pierre brune. Toilette. Fenêtre à rideau noir, plinthe électrique. Tapis vert olive, plancher effet ardoise. **Laveuse + sécheuse blanches à chargement par le haut, côte à côte, sous 3 armoires hautes** (62,0 → 65,5 s). | **60,6 s** — bain + fenêtre + tapis + vanité + vasque + miroir + armoire dans un seul cadre, caméra stable. Pour l'argument buanderie : **63,0 s** (les 2 appareils + armoires au tiers gauche, cadrage frontal). |
| 66,0 → 68,3 | Mezzanine (retour) | Garde-corps arrondi, mur, thermopompe. **Dominante bleue extrême** (dérive de WB), flou de proximité. **Chat visible.** | — aucun. |
| 68,3 → 78,7 | **Chambre principale** | Chambre d'angle. Lit plateforme, douillette vert olive, 2 chevets blancs à pied métal noir, lampes. **Téléviseur grand format fixé au mur.** **Garde-robe à portes coulissantes pleine hauteur entièrement miroir (2 panneaux).** Coin bureau : étagère cubique, table verre + métal noir, 2 chaises, tapis. **Une grande fenêtre double battant + une fenêtre étroite** sur le mur adjacent, rideaux occultants noirs, plinthes sous chaque fenêtre. | **72,5 s** — le meilleur plan de tout le fichier : caméra stable, horizon droit, exposition équilibrée, la pièce se lit d'un seul regard. Garde-robe miroir : **71,0 s** (reflet propre, vérifié). Fenestration / coin bureau : **75,5 s** (extérieur encore lisible, pas cramé). |
| 78,7 → 80,28 | Sortie / corridor | Porte, corridor vide, mur nu, thermopompe. Plan bougé puis coupure sèche. | — aucun. **La vidéo ne se termine pas proprement.** |

---

## 4. À couper — sans discussion

### Bloquant (personne / animal / ombre)

| Timecode | Raison |
|---|---|
| **42,0 → 43,4 s** | **Ombre portée du caméraman** sur le mur blanc, silhouette humaine identifiable (bras levé). |
| **57,5 → 58,2 s** | **Chat** dans l'embrasure de la chambre principale. |
| **66,0 → 68,3 s** | **Chat** au sol + dominante bleue extrême + flou. |
| **77,4 → 79,2 s** | **Personne identifiable dans le reflet du garde-robe miroir** (78,0 et 78,5 s : cheveux bruns bouclés, t-shirt et short clairs, deux mains levées tenant un appareil) + **silhouette humaine dans le reflet du téléviseur éteint** (77,5 s) + **chat en mouvement** (78,0 / 78,5 / 79,0 s). Rien de récupérable. |

### Redondance

| Timecode | Raison |
|---|---|
| **30,6 → 36,5 s** | **Deuxième passage cuisine + séjour.** La caméra ne s'arrête jamais, les angles sont obliques, la lumière est identique au premier passage (7,5→13,5 s). N'apporte rien. **Bonus : ça supprime le seul autre plan où l'appareil de musculation est au centre du séjour.** |
| 74,5 → 76,5 s | Quatre cadrages quasi identiques du coin bureau. **Ne garder que 75,5 s.** |
| 70,5 / 72,0 s | Redondants avec 71,0 s (garde-robe miroir), cadrages moins aboutis. |
| 21,5 → 23,5 s | Cinq vignettes quasi identiques de la même terrasse, la caméra tourne sur son axe sans rien révéler. |
| 0,0 → 1,5 s | Quatre vignettes quasi identiques, la caméra ne bouge pratiquement pas. |

### Désordre / effets personnels

| Timecode | Objet |
|---|---|
| **2,5 → 4,5 s** et **34,0 → 36,5 s** | **Station de musculation, banc de développé, haltères** au milieu du salon. Le salon se lit comme un garage. |
| **10,0 → 14,5 s** | Linge à vaisselle, planche, emballages et **papiers / courrier** sur l'îlot (documents potentiellement identifiants) + roulis de caméra sévère 12,5→14,0 s. |
| **26,5 → 29,0 s** | **Aspirateur-balai noir** appuyé au mur de la salle d'eau + tapis rouge vif. |
| **43,5 → 46,8 s** et **51,0 → 52,4 s** | **Étagère métallique noire** débordant de bacs, paniers à linge, serviettes, sacs rouges et vêtements dans la chambre 2. C'est littéralement la pire introduction possible pour une chambre. |
| 62,0 → 65,5 s | Serviette grise sur la laveuse, produits de toilette sur le rebord du bain, pèse-personne au sol, poubelle, peignoir bleu marine suspendu au centre du cadre (64,0→65,5 s). |
| 73,0 → 74,2 s | **Câble d'alimentation de la TV qui pend le long du mur** + grand mur blanc vide. |
| 77,5 s | Commode : panier à linge, bouteilles, peluche. |

### Plans morts / techniques

`7,5 s` (mur blanc + divan coupé) · `14,0 → 14,5 s` (transition hésitante) · `19,0 → 19,5 s` (extérieur brûlé) · `23,5 → 24,8 s` (hésitation au seuil + traînée floue) · `28,0 → 30,6 s` (recul hésitant, mur blanc sur 60-70 % du cadre) · `38,0 → 40,0 s` (cage d'escalier bouchée au noir) · `49,3 → 50,9 s` (mur blanc vide, lit coupé) · `52,5 → 54,4 s` (flou de mouvement + sous-exposition) · `56,4 → 57,4 s` (caméra qui hésite + reprise de plâtre visible) · `68,3 → 69,5 s` (porte blanche sur 40 % du cadre) · `76,8 → 77,4 s` (horizon incliné ~10-12°) · `79,2 → 80,28 s` (fin bougée + corridor vide).

### Bilan honnête

**Sur 80,28 s de rushes, environ 33 s sont réellement exploitables.** C'est cohérent avec la cible de 40-60 s du brief (B1) — la source ne contient simplement pas plus de matière propre. Le montage proposé en §6 en retient **32,6 s**.

---

## 5. Problèmes techniques — et ce qu'il faut faire avant d'extraire

C'est le point le plus important du document. **La vidéo n'est pas exploitable telle quelle pour un scrub image par image.**

| Problème | Constat | Traitement |
|---|---|---|
| **Distorsion fisheye** | Sévère et constante. Les jonctions mur/plafond bombent, les verticales se couchent aux bords, les objets en amorce sont massivement étirés (le comptoir à 12,5 s, la table à 19,5 s paraissent deux fois plus grands). **Effet secondaire commercial : les pièces paraissent plus grandes qu'en réalité** — inacceptable sur un site où on annonce des superficies. | **Correction d'objectif obligatoire** (`lenscorrection` / `v360`). Coûte ~15-20 % du champ. À budgéter dans le recadrage. |
| **Bougé / marche** | Aucun stabilisateur mécanique. Oscillation verticale et roulis à chaque pas. Dans l'escalier : **un rebond par marche, ~un choc toutes les 0,4-0,5 s**. En scrub lent, ça se voit énormément. | **Stabilisation en 2 passes** (`vidstabdetect` + `vidstabtransform`), puis recadrage des bords. |
| **Pompage d'auto-exposition** | Le défaut n°1. La luminosité varie d'une image à l'autre pendant tous les panoramiques. Cas extrêmes : fenêtres cramées à blanc pur (4,5→7,0 s / 18,0→19,5 s / 46→50 s), cage d'escalier bouchée (38→40 s), pompe de ~1 s au retour de l'extérieur (24→25 s). | **`deflicker`** pour lisser la luminance + relevage local des ombres sur l'escalier. **Sans ça, le scrub scintille.** |
| **Dérive de balance des blancs** | Mesurée sur le **même mur** : R77/G137/B183 (bleu cyan) à 67,0 s vs R143/G133/B130 (neutre) à 80,0 s. Cuisine ambre (R207/G180/B152 à 63,0 s) vs escalier bleu-gris. | Correction **par run**, pas une LUT globale. Les runs conservés (§6) sont assez courts pour être traités individuellement. |
| **Netteté réelle** | 3840×2160 nominal, mais le piqué effectif est loin en dessous. **Mesuré depuis** : à 63,9 Mb/s pour du 4K à 60 im/s, chaque image reçoit ~1,1 Mo — quatre à six fois moins qu'une caméra qui résout vraiment le 4K. Un recadrage 1:1 du fichier natif, défishé et sans aucune réduction, montre déjà un comptoir pâteux. | La sortie a été portée à 2048 px en mouvement et 2560 px aux arrêts : au-delà, on n'agrandirait que du flou. **Au re-tournage : filmer à 30 im/s** (même débit, deux fois plus de données par image) **et verrouiller l'exposition** (le pompage force l'encodeur à redépenser son débit à chaque image). Ces deux réglages feront plus que toute la chaîne de post-traitement. |
| **Color shading** | Voile vert/magenta au plafond de la chambre 2 autour du plafonnier (46→48 s). Artefact d'objectif, très visible sur une grande surface blanche en arrêt sur image. | Correction locale ou éviter le cadrage. |

**Conclusion :** il faut une **passe de pré-traitement (defish → stabilisation → deflicker → étalonnage par run)** entre la source et l'extraction d'images. C'est un ajout au pipeline du brief §3, pas un remplacement. Sans elle, aucun réglage de `scrub` ou de `lerp` ne rattrapera le résultat.

---

## 6. Montage cible — 32,6 s, 326 images à 10 im/s

### Principe : toutes les coupes se font pendant un `hold`

Un montage aussi agressif implique des raccords non continus. **Réglage :** chaque jonction entre deux runs tombe à l'intérieur d'un segment `hold`, où l'image est fixe — un fondu de 300 ms y est invisible. Le scrub reste perceptuellement continu de bout en bout, sans jamais mentir sur la géométrie du logement.

### Les 11 runs à extraire

| Run | Source in → out | Durée | Images | Contenu |
|---|---|---|---|---|
| A | 4,6 → 9,6 | 5,0 s | 50 | Salon → révélation de l'aire ouverte → cuisine |
| B | 14,8 → 19,0 | 4,2 s | 42 | Salle à manger → porte-patio |
| C | 20,4 → 22,0 | 1,6 s | 16 | Vue de la terrasse |
| D | 25,0 → 27,0 | 2,0 s | 20 | Salle d'eau |
| E | 36,6 → 41,6 | 5,0 s | 50 | Pied d'escalier → montée → palier |
| F | 46,6 → 49,4 | 2,8 s | 28 | Chambre 2 |
| G | 54,8 → 56,4 | 1,6 s | 16 | Couloir mezzanine |
| H | 58,2 → 61,2 | 3,0 s | 30 | Salle de bain |
| I | 62,4 → 64,0 | 1,6 s | 16 | Laveuse-sécheuse |
| J | 69,4 → 73,2 | 3,8 s | 38 | Chambre principale (miroir + plan d'ensemble) |
| K | 74,6 → 76,6 | 2,0 s | 20 | Coin bureau / fenestration |
| | **Total** | **32,6 s** | **326** | |

Données machine : `analyse/runs.json`.

### Chapitrage — rythme variable (B4)

Index d'images sur la séquence montée (0 → 325).

| # | id | Type | Images | `scrollVh` | Intention |
|---|---|---|---|---|---|
| 00 | `ouverture` | hold | 14 | 110 | **Plan fixe salon, une seule ligne de texte, aucun prix.** Indice de scroll discret. |
| 01 | `revelation-aire-ouverte` | move | 14 → 44 | **150** | **Le moment wow.** Le cadre passe d'un mur blanc à la découverte simultanée de l'escalier, de l'îlot et du volume. Décélération à l'approche. |
| 02 | `cuisine` | hold | 44 | 130 | Pièce majeure. Îlot, électros, comptoirs. |
| 03 | `vers-salle-a-manger` | move | 44 → 62 | 80 | *(raccord A→B en fondu)* |
| 04 | `salle-a-manger` | hold | 62 | 110 | Pièce majeure. **C'est ici qu'apparaît le prix** (B2). |
| 05 | `vers-terrasse` | move | 62 → 98 | **150** | Révélation : contraste intérieur → plein ciel. *(raccord B→C)* |
| 06 | `terrasse` | hold | 98 | 90 | Vue de la terrasse **depuis la porte-patio** — formulation honnête. |
| 07 | `vers-salle-eau` | move | 98 → 118 | 70 | *(raccord C→D)* |
| 08 | `salle-eau` | hold | 118 | **60** | Utilitaire. Court, factuel. |
| 09 | `vers-escalier` | move | 118 → 132 | 70 | *(raccord D→E)* |
| 10 | `escalier` | move | 132 → 176 | **150** | **Charnière. Le plan axonométrique bascule N1 → N2.** |
| 11 | `palier` | hold | 176 | 60 | Court. |
| 12 | `vers-chambre-2` | move | 176 → 190 | 70 | *(raccord E→F)* |
| 13 | `chambre-2` | hold | 190 | 110 | Dimensions, garde-robe, orientation. |
| 14 | `mezzanine-vers-sdb` | move | 190 → 246 | 90 | *(raccords F→G, G→H)* |
| 15 | `salle-de-bain` | hold | 246 | 110 | Bain podium, vanité, finis. |
| 16 | `vers-buanderie` | move | 246 → 258 | 60 | *(raccord H→I)* |
| 17 | `laveuse-secheuse` | hold | 258 | 70 | **Laveuse-sécheuse incluse, installée dans la salle de bain** — dit tel quel. |
| 18 | `vers-chambre-principale` | move | 258 → 284 | 120 | *(raccord I→J)* |
| 19 | `garde-robe-miroir` | hold | 284 | 100 | Rangement. |
| 20 | `vers-plan-ensemble` | move | 284 → 299 | 70 | |
| 21 | `chambre-principale` | hold | 299 | **130** | Pièce majeure. Le meilleur plan du fichier. |
| 22 | `vers-bureau` | move | 299 → 315 | 70 | *(raccord J→K)* |
| 23 | `coin-bureau` | hold | 315 | 110 | Fenestration, télétravail. |
| 24 | `fiche` | statique | — | — | Fiche technique + plan des deux niveaux. |
| 25 | `rendez-vous` | statique | — | — | Formulaire. |

**Total scroll : 2 340 vh.** À valider au trackpad et à la molette à l'étape 3 — c'est le premier paramètre à régler, et probablement à réduire vers ~1 800 vh.

### Budget images

| | |
|---|---|
| Desktop 1600 px, WebP q70 | 326 × ~45 Ko = **~14,7 Mo** (budget : 25 Mo ✅) |
| Mobile 828 px, WebP q62 | 326 × ~15 Ko = **~4,9 Mo** ✅ |
| Chapitre 00-02 précaché (images 0→50) | 50 × 45 Ko = **~2,3 Mo** ⚠️ dépasse la cible de 1,5 Mo → précacher les images 0→30 et charger 30→50 pendant le premier `hold`. |

### Ce que ce montage change par rapport au brief §5

| Brief | Réalité |
|---|---|
| 00 Ouverture / façade | ❌ **Supprimé** — aucun plan extérieur dans la source. Ouverture sur le salon. |
| 01 Entrée | ❌ **Supprimé** — la porte mange le cadre, rien de vendeur. |
| 04 Salle à manger / balcon | ✅ Conservé, mais « vue de la terrasse depuis la porte-patio ». |
| 10 Rangement / stationnement / extérieur | ❌ **Supprimé** — absent de la source. |
| — | ➕ **Ajouté :** `laveuse-secheuse` (argument de location fort, absent du brief). |
| — | ➕ **Ajouté :** `garde-robe-miroir`, `coin-bureau` (chambre principale, matière disponible). |

---

## 7. Questions à trancher avant l'étape 2

**Bloquantes**

1. **Le logement est habité et encombré.** Station de musculation dans le salon, étagère à linge dans la chambre 2, buanderie apparente, effets personnels partout. Le montage §6 contourne l'essentiel en cadrant serré, mais **un re-tournage du logement vidé (ou au moins désencombré), au stabilisateur, ferait plus pour la qualité du site que toute la chaîne technique réunie**. Re-tourne-t-on, ou construit-on avec ce qu'on a ?
2. **Aucune donnée de la propriété n'existe.** Adresse, prix, superficies par pièce, hauteur sous plafond, orientation solaire, année, inclusions, frais. Le brief §9 exige que rien ne soit codé en dur — il faut donc remplir `fiche.json` et les panneaux de `chapters.json`. **Sans ces chiffres, les panneaux de `hold` seront vides.**
3. **Douche : à confirmer.** Aucune douche visible dans la vidéo. Le logement en a-t-il une hors champ, ou est-ce bain seulement ?
4. **Plan axonométrique des deux niveaux** (§6 du brief, l'élément signature) : existe-t-il un plan du logement, même sommaire ? Sinon je le reconstruis à la main d'après la vidéo — c'est faisable, mais approximatif, et un plan approximatif sur une page qui annonce des superficies est un risque.

**Non bloquantes (j'assume un défaut si pas de réponse)**

5. **Intégration :** le repo est le projet Next.js 14 « Résidences Boréal ». Par défaut je crée une nouvelle route `app/visite/[slug]/` autonome, sans toucher aux pages existantes, et je réutilise Lenis + GSAP déjà installés.
6. **Supabase :** aucune configuration Supabase dans le repo. Par défaut je code le formulaire contre une table `leads` et je laisse les clés en variables d'environnement, non branchées, jusqu'à ce qu'un projet soit fourni.
7. **Slug de la propriété :** par défaut `5-et-demi-deux-niveaux`.
8. **Pré-traitement vidéo (§5) :** par défaut je l'ajoute au pipeline (defish + stabilisation + deflicker). Ça coûte ~15-20 % du champ mais c'est ce qui rend le scrub tenable.

---

## 8. Fichiers produits par cette étape

```
analyse/
  decoupage.md          ← ce document
  runs.json             ← les 11 runs, en données, pour scripts/extract-frames.mjs
  contact_01..03.jpg    ← planches 1 im/s, timecode brûlé
  segA..D_*.jpg         ← planches 2 im/s par segment
  verif/                ← images pleine résolution des points litigieux
```
