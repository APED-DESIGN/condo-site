import type { Champ, Fiche } from "./types";

/**
 * Rendu de la fiche technique — avec une seule règle, non négociable :
 * **aucun chiffre plausible inventé.**
 *
 * Une valeur inconnue vaut `null` / `status: "TODO"`. Elle se rend « — », jamais
 * une estimation. Une page qui annonce des superficies fausses, c'est un problème
 * légal, pas un problème de design.
 */

export interface Rendu {
  texte: string;
  todo: boolean;
}

export const TIRET = "—";

export function champ(c: Champ | undefined): Rendu {
  if (!c || c.status === "TODO" || c.v === null || c.v === undefined) return { texte: TIRET, todo: true };
  if (Array.isArray(c.v)) {
    if (c.v.length === 0) return { texte: TIRET, todo: true };
    return { texte: c.v.join(", "), todo: false };
  }
  const brut = typeof c.v === "number" ? formatNombre(c.v) : String(c.v);
  return { texte: c.unite ? `${brut} ${c.unite}` : brut, todo: false };
}

/** Espace insécable fine comme séparateur de milliers — convention québécoise. */
function formatNombre(n: number) {
  return n.toLocaleString("fr-CA").replace(/ /g, " ");
}

export function champsTodo(fiche: Fiche): string[] {
  const manquants: string[] = [];
  const bloc = (nom: string, obj: Record<string, Champ> | undefined) => {
    for (const [k, c] of Object.entries(obj ?? {})) {
      if (k.startsWith("_")) continue;
      if (champ(c).todo) manquants.push(`${nom}.${k}`);
    }
  };
  bloc("propriete", fiche.propriete);
  bloc("contact", fiche.contact);
  bloc("courtier", fiche.courtier);
  for (const l of fiche.quartier?.lieux ?? []) if (champ(l.minutes).todo) manquants.push(`quartier.${l.id}`);
  for (const p of fiche.pieces) {
    for (const [k, c] of Object.entries(p)) {
      if (k === "id" || k === "nom" || k === "niveau" || k === "finis" || k.startsWith("_")) continue;
      if (champ(c as Champ).todo) manquants.push(`${p.id}.${k}`);
    }
  }
  return manquants;
}

/** Numéro tel qu'on l'appelle. Rend `null` tant qu'il n'est pas renseigné — jamais un faux numéro. */
export function telHref(c: Champ | undefined): string | null {
  const r = champ(c);
  if (r.todo) return null;
  const chiffres = r.texte.replace(/[^\d+]/g, "");
  return chiffres.length >= 10 ? `tel:${chiffres}` : null;
}

/**
 * Garde-fou de publication. Un build de production échoue tant qu'il reste un
 * champ TODO — on ne doit jamais pouvoir mettre en ligne un chiffre inventé ni
 * une fiche à trous.
 *
 * Échappatoire explicite, à n'utiliser que pour vérifier la compilation :
 *   VISITE_ALLOW_TODO=1 npm run build
 */
export function assertPublishable(fiche: Fiche) {
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.VISITE_ALLOW_TODO === "1") return;
  const manquants = champsTodo(fiche);
  if (!manquants.length) return;
  throw new Error(
    `Fiche « ${fiche.slug} » incomplète : ${manquants.length} champ(s) encore en TODO.\n` +
      manquants.map((m) => `  · ${m}`).join("\n") +
      `\n\nRemplis content/proprietes/${fiche.slug}/fiche.json avant de publier.` +
      `\nPour vérifier la compilation malgré tout : VISITE_ALLOW_TODO=1 npm run build`
  );
}
