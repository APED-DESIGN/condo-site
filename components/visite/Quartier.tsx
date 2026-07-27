import { champ } from "@/lib/visite/fiche";
import type { LieuQuartier } from "@/lib/visite/types";

/**
 * Le quartier, en distances de marche réelles.
 *
 * Tant que les relevés ne sont pas faits, chaque durée s'affiche « — » et la
 * section le dit franchement. On n'écrit pas « à deux pas de tout » : c'est
 * précisément le genre de phrase qu'un acheteur ne croit plus.
 */
export default function Quartier({ lieux }: { lieux: LieuQuartier[] }) {
  if (!lieux.length) return null;
  const connus = lieux.filter((l) => !champ(l.minutes).todo).length;

  return (
    <section id="quartier" className="bg-nuit text-chaux">
      <div className="mx-auto max-w-[1600px] px-6 py-24 md:px-10 md:py-32">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-brume">Le quartier</p>
        <h2 className="mt-4 font-display text-[clamp(2.2rem,4.4vw,4rem)] font-light leading-[0.98] tracking-[-0.02em]">
          À pied,
          <br />
          depuis la porte
        </h2>

        <ul className="mt-14 grid gap-px overflow-hidden rounded-[3px] bg-chaux/10 sm:grid-cols-2 lg:grid-cols-3">
          {lieux.map((l) => {
            const r = champ(l.minutes);
            return (
              <li key={l.id} className="flex items-baseline justify-between gap-6 bg-nuit px-6 py-7">
                <span className="font-tight text-[15px] font-light text-chaux/85">{l.nom}</span>
                <span
                  data-todo={r.todo || undefined}
                  className={`font-mono text-[13px] tabular-nums ${r.todo ? "text-yellow-400/80" : "text-chaux"}`}
                >
                  {r.todo ? r.texte : `${r.texte} min`}
                </span>
              </li>
            );
          })}
        </ul>

        {connus < lieux.length ? (
          <p className="mt-8 max-w-2xl border-l-2 border-yellow-500/70 pl-4 font-tight text-[13px] font-light leading-relaxed text-brume">
            Ces temps de marche n&apos;ont pas encore été relevés. Ils seront mesurés sur place,
            pas estimés depuis une carte.
          </p>
        ) : null}
      </div>
    </section>
  );
}
