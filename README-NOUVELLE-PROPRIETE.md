# Ajouter une propriété

Une propriété = **un dossier de contenu, un dossier d'images, zéro ligne de code**.

```
content/proprietes/<slug>/
  runs.json       source vidéo, chaîne de réparation, zones de vie privée
  chapters.json   le parcours : arrêts, rythme, textes des panneaux
  fiche.json      les chiffres, les contacts, le quartier
  plan.svg        la géométrie des deux niveaux

public/frames/<slug>/
  desktop/  mobile/  arrets/  manifest.json      ← produits par le script
```

La page est servie sur `/visite/<slug>`. Le slug est le nom du dossier, rien d'autre.

---

## 1. Décrire la source — `runs.json`

**Aucune coupe.** Un seul run, couvrant toute la vidéo. Le script refuse d'extraire si le run
ne couvre pas `0 → sourceDuration` : le rythme se fait au scroll, jamais au ciseau.

```json
{
  "source": "public/video/ma-video.mp4",
  "sourceDuration": 80.28,
  "sourceSize": [3840, 2160],
  "fps": 10,
  "runs": [{ "id": "V", "in": 0, "out": 80.28, "label": "Visite intégrale" }]
}
```

### La chaîne de réparation

Activée par défaut : `defish → réduction → stabilisation → deflicker → étalonnage`.
Réglages dans `repair`. Pour itérer vite pendant le développement : `--repair=off`.

| Étape | À quoi ça sert | Quand la couper |
|---|---|---|
| `defish` | redresse les lignes d'un objectif grand-angle | tournage sans grand-angle |
| `stab` | deux passes vidstab ; supprime le rebond de marche | tournage au stabilisateur |
| `deflicker` | lisse le pompage d'auto-exposition | exposition verrouillée |
| `grade` | balance des blancs automatique par image | balance des blancs verrouillée |

Après un tournage propre, `--repair=off` et on gagne 30 minutes de traitement **et** 15 à 20 %
de champ.

### Les zones de vie privée

Elles se déclarent en données, jamais en code. Coordonnées en **fraction de l'image source**,
mesurées sur l'image la plus défavorable de la fenêtre, avec ~3 % de marge :

```json
"traitements": [
  { "id": "miroir", "t0": 77.75, "t1": 79.15,
    "zone": [0.0, 0.0, 0.30, 1.0],
    "type": "flou", "force": 55,
    "raison": "personne identifiable dans le reflet" }
]
```

`type` : `flou` · `eclaircir` · `noircir`. Si l'objet se déplace, découper en plusieurs
sous-fenêtres — un masque fixe ne suit pas un panoramique.

**Toujours documenter dans `analyse/traitements.md`** : ce qui a été trouvé, ce qui a été traité,
et ce qui ne l'a pas été *avec la raison*.

---

## 2. Écrire le parcours — `chapters.json`

Les chapitres pavent la source sans trou : la fin de l'un est le début du suivant. Le script
refuse d'extraire s'il trouve un trou.

**Le rythme, c'est la distance de scroll par seconde de vidéo** — pas la coupe.

| Type de segment | `vhParSeconde` | Effet |
|---|---|---|
| Couloir, redite, encombrement | 11–18 | on passe vite sans rien perdre |
| Déplacement normal | 24–32 | |
| Approche d'une révélation | 60–80 + `"ease": "decelerate"` | anticipation |
| Arrêt | `scrollVh` : 95–130 majeure · 70–80 secondaire · 50–60 utilitaire | l'explication |

`rythmeGlobal` multiplie tout d'un coup : c'est le premier réglage à faire, à la molette **et**
au trackpad.

### Un arrêt

```json
{ "id": "cuisine", "type": "hold", "at": { "t": 9.0 }, "scrollVh": 120,
  "panel": {
    "piece": "cuisine",
    "surTitre": "Les espaces de vie",
    "titre": ["Cuisine", "ouverte"],
    "faits": ["Îlot avec évier : on cuisine face à la pièce, pas face au mur."],
    "cote": "droite",
    "afficherPrix": true } }
```

- `titre` : deux lignes maximum, elles s'affichent en très gros.
- `faits` : **trois maximum**. Un fait, une conséquence concrète. Le vide fait le travail.
- **Aucun chiffre dans `faits`.** Les superficies viennent de `fiche.json` et s'affichent « — »
  tant qu'elles ne sont pas relevées.
- `cote` alterne d'un arrêt à l'autre : c'est ce qui donne son rythme visuel à la page.
- `afficherPrix` : le prix n'apparaît jamais avant la cuisine ou le salon.

### Le changement de niveau

Le segment d'escalier porte `"bascule": { "de": 1, "vers": 2 }`. Le plan bascule à mi-parcours.

---

## 3. Les chiffres — `fiche.json`

**Règle non négociable : aucun chiffre plausible inventé.**

```json
"superficiePi2": { "v": null, "status": "TODO", "src": "mesure" }
```

Un champ TODO se rend « — », se marque `data-todo` et s'affiche en ambre. **Le build de
production échoue tant qu'il en reste un** (`lib/visite/fiche.ts`). Pour vérifier la compilation
malgré tout, et jamais en production : `VISITE_ALLOW_TODO=1 npm run build`.

`src` dit d'où viendra la valeur : `vendeur` · `mesure` · `boussole` · `image`.
Les faits qualitatifs vérifiables sur l'image peuvent être écrits tout de suite en `status: "OK"`,
`src: "image"`.

Blocs à remplir : `accueil` (textes), `propriete`, `contact` (le téléphone de l'en-tête),
`courtier` (nom, titre, **permis**, photo), `quartier` (temps de marche **relevés**, pas estimés),
`pieces`.

---

## 4. Le plan — `plan.svg`

Toute la géométrie vit dans le fichier. **Aucune coordonnée dans le JavaScript.**

```
<g data-niveau="1|2">                             un niveau
  <g class="piece" data-piece="<id de fiche.json>">  une pièce cliquable
<circle class="ancre" data-chapitre="<id de chapters.json>" cx cy>  position caméra
<circle id="camera">                              le point qui se déplace
```

Redessiner le plan aux vraies proportions = **échanger le fichier**. Aucun composant à réécrire.

---

## 5. Extraire

```bash
npm run extract -- --slug=<slug>
npm run extract -- --slug=<slug> --dry-run        # voir le plan et les commandes
npm run extract -- --slug=<slug> --repair=off     # itérer vite
npm run extract -- --slug=<slug> --force-repair   # ignorer le cache
```

Sous Windows, si ffmpeg n'est pas dans le PATH : `--ffmpeg="C:\chemin\vers\ffmpeg.exe"`.

Le script produit deux qualités :

| Usage | Résolution | Qualité |
|---|---|---|
| Images de mouvement | 1600 px (828 px mobile) | WebP q68 / q62 |
| Images d'arrêt | 2200 px | WebP q88 |

**Les images d'arrêt sont choisies par netteté mesurée**, pas au timecode : variance du laplacien
sur ±0,8 s, la plus nette gagne. Le score est écrit dans le manifest, et un arrêt sous le seuil est
**signalé** — on cherche alors un autre angle dans la même pièce plutôt que d'afficher une image
molle.

### Ce que la mesure sait faire, et ce qu'elle ne sait pas

Elle mesure la **quantité de détail**, pas la mise au point. Deux conséquences vérifiées sur
cette propriété :

- Un couloir aux murs blancs marque 96 en étant parfaitement net ; une terrasse pleine de
  feuillage marque 2 272. Le seuil d'alerte est donc bas (15ᵉ centile) : au-delà, on signalerait
  des pièces simplement unies. **Quand un arrêt est signalé, il faut le regarder** — l'alerte dit
  « vérifie », pas « c'est flou ».
- Sur une fenêtre large, elle part chercher le plan le plus chargé du voisinage. Au pied de
  l'escalier, elle préférait un plan du salon plein de meubles à l'escalier lui-même. Le remède
  est dans les données : `"fenetre": 0.3` sur l'arrêt concerné resserre la recherche.

```json
{ "id": "pied-escalier", "type": "hold", "at": { "t": 37.2 }, "fenetre": 0.3, "scrollVh": 70 }
```

La vidéo réparée est mise en cache dans `.cache/visite/<slug>/`. La première passe (analyse du
bougé) n'est refaite que si la géométrie change — pas si on retouche une zone de vie privée.

**Après chaque extraction :** ouvrir les images de `public/frames/<slug>/arrets/` une par une.
Ce sont les seules qu'on regarde dix secondes.

---

## 6. Vérifier

```bash
npm run dev
npm run test:visite -- --browser=chromium --trips=3
npm run test:visite -- --browser=firefox
npm run test:visite -- --browser=webkit
```

Le banc mesure : fluidité dans les deux sens, sauts d'image, stabilité des arrêts, l'escalier,
la rétraction du cadre, l'absence de redimensionnement du canvas, et la mémoire après plusieurs
allers-retours.

Réglages à la volée, sans rebuild :
`?scrub=0.6&lerp=0.09&back=12&forward=32&budget=280&debug=1`

---

## 7. Le formulaire

`/api/leads` écrit dans la table Supabase `leads`. Variables dans `.env.example`.
Sans configuration, la route répond 503 et le dit — une demande perdue en silence est pire
qu'une erreur affichée.

```sql
create table public.leads (
  id          bigint generated always as identity primary key,
  cree_le     timestamptz not null default now(),
  nom         text not null,
  telephone   text not null,
  courriel    text not null,
  message     text,
  -- ce que le visiteur est venu voir
  interet     text,
  -- page d'où part la demande : accueil, maison ou appartement
  source      text
);
alter table public.leads enable row level security;
-- Aucune policy publique : l'écriture passe par la clé de service, côté serveur.
```
