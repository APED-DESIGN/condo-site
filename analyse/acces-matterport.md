# Accès à la visite Matterport de référence — vérification

**Date :** 27 juillet 2026
**Modèle vérifié :** `my.matterport.com/show/?m=NEZP4hRcr76`
**Méthode :** interrogation de l'API publique du lecteur
(`GET https://my.matterport.com/api/v1/player/models/NEZP4hRcr76/`), qui répond sans
authentification. Aucun contournement de protection, aucune extraction d'asset.

---

## Verdict

> # ❌ La voie 1 est fermée.
>
> Et pas pour la raison attendue. Le problème n'est pas qu'il nous manque une licence :
> **ce modèle n'est pas notre maison.**

---

## Ce que dit la fiche du modèle

| Champ | Valeur |
|---|---|
| `sid` | `NEZP4hRcr76` |
| `name` | **« Présentation »** |
| `status` | `viewable` |
| `is_public` | `true` |
| `has_public_access_password` | `false` |
| **`created`** | **`2018-01-27T22:38:05Z`** |
| `modified` | `2025-11-14T22:07:20Z` |
| **`contact_email`** | **`info@pinthree.com`** |
| `contact_phone` | `+1 855 788-2079` |
| **`owner`** | `{ user_sid: "B2a48hjiCPD", group_sid: "e9Amt7yAYsH" }` |
| `presented_by` | *(vide)* |
| `unit_type` | `imperial` |
| Nombre de points de capture | **48** |
| Image d'entête | `01.29.2018_12.23.39.jpg`, 5664 × 3186 |

---

## Trois faits qui tranchent

### 1. Le modèle a huit ans de plus que nos prises de vue

Créé le **27 janvier 2018**. Les panoramas de la maison de `/maison` ont été captés le
**24 juillet 2026** à l'Insta360 X4 Air (`NOTES_DEV.md:30`). Un modèle ne peut pas être la
numérisation d'une maison photographiée huit ans plus tard.

### 2. Il appartient à un tiers identifié

Le contact du modèle est **`info@pinthree.com`**, avec un numéro sans frais nord-américain. Le
propriétaire est un compte (`user_sid`) et un groupe (`group_sid`) qui ne correspondent à aucune
identité de ce projet — le dépôt ne contient d'ailleurs **aucune** trace Matterport : ni clé, ni
SDK, ni `.env`, ni mention (voir [inventaire-3d.md](./inventaire-3d.md) §3).

### 3. Ce n'est pas le même bâtiment

Les cinq captures de `public/video/exemple/` montrent un cottage à plancher de bois franc foncé,
foyer encastré dans un parement de pierre empilée, mur de chambre rose framboise, neige aux
fenêtres, cafetière rouge et tableau pop-art.

Notre maison, d'après ses propres panoramas : revêtement extérieur noir, piscine creusée, plafond
cathédrale, îlot de cuisine **arrondi** à suspensions dorées, mur d'accent **vert forêt**, tuile à
motifs au vestibule, escalier de bois blond à contremarches noires.

**Ce sont deux propriétés différentes.** Le modèle porte le nom générique « Présentation » : c'est
une démonstration commerciale d'agence, pas le bien que nous présentons.

---

## Conséquence

Même en achetant demain un abonnement Matterport **et** une *Developer Tools License*, on n'aurait
toujours pas le droit d'afficher ce modèle, et surtout **cela n'aurait aucun intérêt** : il montre
la maison de quelqu'un d'autre.

Ce lien est ce que l'énoncé initial disait qu'il était — **une référence visuelle**. Il fixe le
niveau de qualité à atteindre. Il ne fournit aucune donnée réutilisable.

> ⚠️ Les outils qui extraient les fichiers `.dam` d'un modèle Matterport public vers `.obj`
> circulent librement. Ils violent les conditions d'utilisation, et ici ils voleraient en plus le
> travail d'une agence tierce sur la maison d'un tiers. **Non utilisés, et à ne pas utiliser.**

---

## Ce qui reste

- **Voie 2 — produire notre propre maillage texturé.** C'est la seule façon d'atteindre la qualité
  de la référence. Elle exige une nouvelle capture sur place, au LiDAR. Impossible depuis ce dépôt :
  aucun accès au bien. → méthode détaillée dans
  [recommandation-capture.md](./recommandation-capture.md).
- **Voie 3 — projeter les panoramas existants sur la géométrie.** Réalisable immédiatement avec ce
  que nous possédons. C'est ce qui est implémenté.
