"use client";

import { useEffect, useRef, useState } from "react";
import { champ } from "@/lib/visite/fiche";
import type { PieceFiche } from "@/lib/visite/types";

/**
 * Le plan des deux niveaux, en grand.
 *
 * ⚠️ Toute la géométrie vit dans content/proprietes/<slug>/plan.svg. Ce
 * composant ne contient aucune coordonnée : il lit `data-niveau` et
 * `data-piece`, et anime ce qu'il trouve. Redessiner le plan aux proportions
 * réelles = échanger le fichier.
 */
export default function PlanGrand({ svg, pieces }: { svg: string; pieces: PieceFiche[] }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [niveau, setNiveau] = useState(1);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const root = hostRef.current?.querySelector("svg");
    if (!root) return;

    root.querySelectorAll<SVGGElement>("[data-niveau]").forEach((g) => {
      g.setAttribute("data-visible", String(Number(g.dataset.niveau) === niveau));
    });
    root.querySelectorAll<SVGGElement>("[data-piece]").forEach((g) => {
      g.setAttribute("data-actif", String(g.dataset.piece === active));
    });

    const onPointer = (e: Event) => {
      const g = (e.target as Element).closest<SVGGElement>("[data-piece]");
      if (g?.dataset.piece) setActive(g.dataset.piece);
    };
    root.addEventListener("click", onPointer);
    root.addEventListener("mousemove", onPointer);
    return () => {
      root.removeEventListener("click", onPointer);
      root.removeEventListener("mousemove", onPointer);
    };
  }, [niveau, active, svg]);

  const piece = pieces.find((p) => p.id === active) ?? null;

  return (
    <section id="plan" className="bg-ardoise text-chaux">
      <div className="mx-auto max-w-[1600px] px-6 py-24 md:px-10 md:py-32">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-brume">Le plan</p>
        <h2 className="mt-4 font-display text-[clamp(2.2rem,4.4vw,4rem)] font-light leading-[0.98] tracking-[-0.02em]">
          Deux niveaux,
          <br />
          une circulation
        </h2>

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-center">
          <div>
            <div className="flex gap-2">
              {[1, 2].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNiveau(n)}
                  aria-pressed={niveau === n}
                  className={`h-9 rounded-sm px-5 font-mono text-[10.5px] uppercase tracking-[0.18em] transition-colors ${
                    niveau === n
                      ? "bg-cuivre text-chaux"
                      : "border border-chaux/20 text-brume hover:border-chaux/50 hover:text-chaux"
                  }`}
                >
                  Niveau {n}
                </button>
              ))}
            </div>

            <div
              ref={hostRef}
              className="mt-6 w-full text-brume [&_svg]:h-auto [&_svg]:w-full"
              dangerouslySetInnerHTML={{ __html: svg }}
            />

            <p className="mt-4 font-tight text-[12.5px] font-light text-brume">
              Plan provisoire — les proportions seront redessinées d&apos;après les relevés au ruban.
            </p>
          </div>

          <div className="min-h-[220px] border-l border-chaux/12 pl-8">
            {piece ? (
              <>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-brume">
                  Niveau {piece.niveau}
                </p>
                <h3 className="mt-3 font-display text-[clamp(1.6rem,2.6vw,2.4rem)] font-light leading-tight">
                  {piece.nom}
                </h3>
                <dl className="mt-6 space-y-2.5 font-mono text-[13px]">
                  {(
                    [
                      ["Superficie", champ(piece.superficiePi2)],
                      ["Dimensions", champ(piece.dimensionsM)],
                      ...(piece.orientation ? ([["Orientation", champ(piece.orientation)]] as const) : []),
                    ] as [string, ReturnType<typeof champ>][]
                  ).map(([label, r]) => (
                    <div key={label} className="flex items-baseline justify-between gap-4">
                      <dt className="text-brume">{label}</dt>
                      <dd data-todo={r.todo || undefined} className={r.todo ? "text-yellow-400/80" : "text-chaux"}>
                        {r.texte}
                      </dd>
                    </div>
                  ))}
                </dl>
                {piece.finis?.length ? (
                  <ul className="mt-6 space-y-2">
                    {piece.finis.map((f) => champ(f)).map((f) => (
                      <li key={f.texte} className="flex gap-3 font-tight text-[14px] font-light text-chaux/75">
                        <span aria-hidden="true" className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-patine" />
                        {f.texte}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : (
              <p className="font-tight text-[14px] font-light text-brume">
                Survolez une pièce du plan pour en voir les mesures.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
