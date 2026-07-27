"use client";

import { champ } from "@/lib/visite/fiche";
import type { Accueil as AccueilTextes, Arret, Champ } from "@/lib/visite/types";

/**
 * Page d'accueil — la première chose qu'on voit. On n'entre pas dans la visite
 * par accident : on décide d'y entrer.
 *
 * L'image de fond est l'IMAGE 0 DE LA SÉQUENCE, en haute définition, servie en
 * <img fetchpriority="high">. C'est le LCP, et c'est aussi ce qui rend le
 * passage accueil → canvas invisible : quand le canvas prend le relais il
 * dessine exactement la même image. Aucun calage à faire.
 *
 * Aucun prix ici — il apparaît après la cuisine.
 */
export default function Accueil({
  textes,
  image,
  ville,
}: {
  textes: AccueilTextes;
  image: Arret | null;
  ville: Champ | undefined;
}) {
  const v = champ(ville);
  const surTitre = v.todo ? textes.surTitre : `${textes.surTitre} · ${v.texte}`;

  const aller = (e: React.MouseEvent<HTMLAnchorElement>, sel: string) => {
    const cible = document.querySelector(sel);
    if (!cible) return;
    e.preventDefault();
    const y = cible.getBoundingClientRect().top + window.scrollY;
    if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.4 });
    else window.scrollTo({ top: y, behavior: "smooth" });
  };

  return (
    <section id="accueil" className="relative h-[100dvh] w-full overflow-hidden bg-nuit">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image.file}
          alt=""
          aria-hidden="true"
          width={image.width}
          height={image.height}
          fetchPriority="high"
          decoding="sync"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}

      {/* Voile : le texte doit tenir sans dépendre de ce qu'il y a dans l'image.
          Deux couches — une verticale pour l'en-tête et le bas de page, une
          latérale qui assombrit le côté du titre. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(12,15,18,.78) 0%, rgba(12,15,18,.32) 34%, rgba(12,15,18,.58) 72%, rgba(12,15,18,.94) 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(96deg, rgba(12,15,18,.80) 0%, rgba(12,15,18,.52) 34%, rgba(12,15,18,.12) 62%, rgba(12,15,18,.10) 100%)",
        }}
      />

      <div className="relative flex h-full items-center">
        <div className="mx-auto w-full max-w-[1600px] px-6 md:px-10">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-brume">{surTitre}</p>

          <h1 className="mt-5 font-display text-[clamp(3rem,8.5vw,7.5rem)] font-light leading-[0.95] tracking-[-0.02em] text-chaux">
            {textes.titre.map((l) => (
              <span key={l} className="block">
                {l}
              </span>
            ))}
          </h1>

          <p className="mt-7 max-w-xl font-tight text-[clamp(1rem,1.5vw,1.25rem)] font-light leading-relaxed text-chaux/80">
            {textes.ligne}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <a
              href="#visite"
              onClick={(e) => aller(e, "#visite")}
              className="inline-flex h-12 items-center rounded-sm bg-cuivre px-7 font-mono text-[11px] uppercase tracking-[0.18em] text-chaux transition-colors hover:bg-cuivre-clair"
            >
              {textes.ctaPrimaire}
            </a>
            <a
              href="#fiche"
              onClick={(e) => aller(e, "#fiche")}
              className="inline-flex h-12 items-center rounded-sm border border-chaux/25 px-7 font-mono text-[11px] uppercase tracking-[0.18em] text-chaux/80 transition-colors hover:border-chaux/60 hover:text-chaux"
            >
              {textes.ctaSecondaire}
            </a>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-7 flex flex-col items-center gap-2">
        <span className="h-8 w-px bg-chaux/25" />
        <span className="font-mono text-[9.5px] uppercase tracking-[0.24em] text-brume">défiler</span>
      </div>
    </section>
  );
}
