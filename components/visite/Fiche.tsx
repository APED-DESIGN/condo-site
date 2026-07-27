import { champ } from "@/lib/visite/fiche";
import type { Fiche as FicheData } from "@/lib/visite/types";

/**
 * Fiche technique — fond clair, après une visite sombre. C'est la page qu'on
 * imprime, celle qu'on relit le soir.
 *
 * Tout champ inconnu se rend « — » et se marque `data-todo`. Aucune valeur
 * n'est estimée : une superficie fausse est un problème légal, pas un problème
 * de design.
 */

const ETIQUETTES: Record<string, string> = {
  transaction: "Transaction",
  adresse: "Adresse",
  ville: "Ville",
  prix: "Prix",
  type: "Type",
  niveaux: "Niveaux",
  chambres: "Chambres",
  sallesDeBain: "Salles de bain",
  sallesDEau: "Salles d'eau",
  annee: "Année de construction",
  fraisCopro: "Frais de copropriété",
  taxes: "Taxes",
  superficieTot: "Superficie habitable",
  plafond: "Hauteur sous plafond",
  orientation: "Orientation",
  stationnement: "Stationnement",
  inclusions: "Inclusions",
};

function Valeur({ c }: { c: ReturnType<typeof champ> }) {
  return (
    <span data-todo={c.todo || undefined} className={c.todo ? "text-amber-600" : "text-ink"}>
      {c.texte}
    </span>
  );
}

export default function Fiche({ fiche }: { fiche: FicheData }) {
  const entrees = Object.entries(fiche.propriete).filter(([k]) => !k.startsWith("_"));
  const manquants = entrees.filter(([, c]) => champ(c).todo).length;

  return (
    <section id="fiche" className="bg-chaux text-ink">
      <div className="mx-auto max-w-[1600px] px-6 py-24 md:px-10 md:py-32">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-umber">La fiche</p>
        <h2 className="mt-4 max-w-2xl font-display text-[clamp(2.2rem,4.4vw,4rem)] font-light leading-[0.98] tracking-[-0.02em]">
          Tout ce qu&apos;il faut savoir,
          <br />
          sans arrondir
        </h2>

        {/* `min-w-0` sur les deux colonnes : sans lui, la largeur minimale du
            tableau (520 px) élargit la colonne de grille au lieu de déclencher
            son propre défilement, et toute la page débordait sur mobile. */}
        <div className="mt-16 grid gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div className="min-w-0">
            <h3 className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-umber">La propriété</h3>
            <dl className="mt-6 border-t border-ink/12">
              {entrees.map(([k, c]) => {
                const r = champ(c);
                return (
                  <div key={k} className="flex items-baseline justify-between gap-6 border-b border-ink/10 py-3.5">
                    <dt className="font-tight text-[14px] font-light text-umber">{ETIQUETTES[k] ?? k}</dt>
                    <dd className="text-right font-mono text-[13px] tabular-nums">
                      <Valeur c={r} />
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>

          <div className="min-w-0">
            <h3 className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-umber">Pièce par pièce</h3>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-left">
                <thead>
                  <tr className="border-y border-ink/12">
                    <th className="py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-umber">Pièce</th>
                    <th className="py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-umber">Niveau</th>
                    <th className="py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-umber">Superficie</th>
                    <th className="py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-umber">Dimensions</th>
                  </tr>
                </thead>
                <tbody>
                  {fiche.pieces.map((p) => (
                    <tr key={p.id} className="border-b border-ink/10 align-top">
                      <td className="py-3.5 font-tight text-[14px] font-light">
                        {p.nom}
                        {p.finis?.length ? (
                          <span className="mt-1 block font-tight text-[12.5px] font-light leading-snug text-umber">
                            {p.finis
                              .map((f) => champ(f))
                              .filter((f) => !f.todo)
                              .map((f) => f.texte)
                              .join(" · ")}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3.5 font-mono text-[13px] text-umber">N{p.niveau}</td>
                      <td className="py-3.5 font-mono text-[13px] tabular-nums">
                        <Valeur c={champ(p.superficiePi2)} />
                      </td>
                      <td className="py-3.5 font-mono text-[13px] tabular-nums">
                        <Valeur c={champ(p.dimensionsM)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {manquants ? (
          <p className="mt-12 max-w-2xl border-l-2 border-amber-500 pl-4 font-tight text-[13px] font-light leading-relaxed text-umber">
            Les valeurs en ambre sont encore à relever. Aucune n&apos;est estimée : un champ inconnu
            affiche un tiret, jamais un chiffre plausible. La mise en ligne reste bloquée tant
            qu&apos;il en reste.
          </p>
        ) : null}
      </div>
    </section>
  );
}
