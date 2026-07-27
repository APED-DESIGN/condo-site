"use client";

import { useCallback, useEffect, useState } from "react";
import type { Arret } from "@/lib/visite/types";

export interface Vignette {
  id: string;
  titre: string;
  arret: Arret;
}

/**
 * Galerie — les images d'arrêt, en grand. Ce sont exactement celles de la
 * visite : même instant, 2200 px, choisies pour leur netteté mesurée. Rien
 * n'est ajouté ici qui ne soit dans la visite.
 */
export default function Galerie({ vignettes }: { vignettes: Vignette[] }) {
  const [ouvert, setOuvert] = useState<number | null>(null);

  const fermer = useCallback(() => setOuvert(null), []);

  useEffect(() => {
    if (ouvert === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer();
      if (e.key === "ArrowRight") setOuvert((i) => (i === null ? null : (i + 1) % vignettes.length));
      if (e.key === "ArrowLeft") setOuvert((i) => (i === null ? null : (i - 1 + vignettes.length) % vignettes.length));
    };
    window.addEventListener("keydown", onKey);
    window.__lenis?.stop();
    return () => {
      window.removeEventListener("keydown", onKey);
      window.__lenis?.start();
    };
  }, [ouvert, vignettes.length, fermer]);

  if (!vignettes.length) return null;

  return (
    <section id="galerie" className="bg-nuit text-chaux">
      <div className="mx-auto max-w-[1600px] px-6 py-24 md:px-10 md:py-32">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-brume">La galerie</p>
        <h2 className="mt-4 font-display text-[clamp(2.2rem,4.4vw,4rem)] font-light leading-[0.98] tracking-[-0.02em]">
          Les arrêts, en grand
        </h2>

        <ul className="mt-14 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {vignettes.map((v, i) => (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => setOuvert(i)}
                className="group relative block w-full overflow-hidden rounded-[3px] bg-ardoise"
                style={{ aspectRatio: `${v.arret.width} / ${v.arret.height}` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={v.arret.file}
                  alt={v.titre}
                  width={v.arret.width}
                  height={v.arret.height}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-700 ease-cadre group-hover:scale-[1.03]"
                />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-nuit/85 to-transparent p-4 text-left font-mono text-[10.5px] uppercase tracking-[0.18em] text-chaux/90">
                  {v.titre}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {ouvert !== null ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={vignettes[ouvert].titre}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-nuit/96 p-4 md:p-10"
          onClick={fermer}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={vignettes[ouvert].arret.file}
            alt={vignettes[ouvert].titre}
            width={vignettes[ouvert].arret.width}
            height={vignettes[ouvert].arret.height}
            className="max-h-full max-w-full rounded-[4px] object-contain"
          />
          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 font-mono text-[10.5px] uppercase tracking-[0.2em] text-brume">
            {vignettes[ouvert].titre} · {ouvert + 1} / {vignettes.length}
          </p>
          <button
            type="button"
            onClick={fermer}
            aria-label="Fermer"
            className="absolute right-5 top-5 h-10 w-10 rounded-full border border-chaux/25 font-mono text-chaux/80 transition-colors hover:border-chaux/60 hover:text-chaux"
          >
            ×
          </button>
        </div>
      ) : null}
    </section>
  );
}
