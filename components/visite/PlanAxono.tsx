"use client";

import { useEffect, useRef } from "react";

/**
 * Plan axonométrique des deux niveaux.
 *
 * ⚠️ La géométrie vit ENTIÈREMENT dans `content/proprietes/<slug>/plan.svg`.
 * Ce composant ne contient aucune coordonnée : il lit les attributs du SVG
 * (`data-niveau`, `data-piece`, `data-chapitre`) et anime ce qu'il y trouve.
 * Remplacer le plan par sa version aux proportions réelles = échanger le
 * fichier, sans toucher à ce code.
 *
 * Le plan actuel est marqué PLAN PROVISOIRE : proportions fausses, assumées.
 */
export default function PlanAxono({ svg }: { svg: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const root = host.querySelector("svg");
    if (!root) return;

    const pieces = Array.from(root.querySelectorAll<SVGGElement>("[data-piece]"));
    const niveaux = Array.from(root.querySelectorAll<SVGGElement>("[data-niveau]"));
    const ancres = new Map<string, SVGCircleElement>();
    root.querySelectorAll<SVGCircleElement>(".ancre[data-chapitre]").forEach((a) => {
      const id = a.dataset.chapitre;
      if (id) ancres.set(id, a);
    });
    const camera = root.querySelector<SVGCircleElement>("#camera");

    /** Niveau d'une pièce : celui du groupe qui la contient. */
    const niveauDe = (piece: string) =>
      Number(pieces.find((p) => p.dataset.piece === piece)?.closest<SVGGElement>("[data-niveau]")?.dataset.niveau ?? 1);

    let dernierChapitre = "";
    let dernierNiveau = 1;

    const sync = () => {
      const v = window.__visite;
      if (!v) return;

      const vh = v.progress() * v.totalVh;
      const seg = v.segments.find((s) => vh < s.vhEnd) ?? v.segments[v.segments.length - 1];
      if (!seg) return;

      // Niveau courant : la bascule se joue à mi-parcours du segment d'escalier.
      if (seg.bascule) {
        const local = (vh - seg.vhStart) / Math.max(1e-6, seg.vhEnd - seg.vhStart);
        dernierNiveau = local > 0.5 ? seg.bascule.vers : seg.bascule.de;
      } else if (seg.piece) {
        dernierNiveau = niveauDe(seg.piece);
      }

      if (seg.id === dernierChapitre) return;
      dernierChapitre = seg.id;

      pieces.forEach((p) => p.setAttribute("data-actif", String(p.dataset.piece === seg.piece)));
      niveaux.forEach((n) => n.setAttribute("data-visible", String(Number(n.dataset.niveau) === dernierNiveau)));

      const ancre = ancres.get(seg.id);
      if (ancre && camera) {
        camera.setAttribute("cx", ancre.getAttribute("cx") ?? "0");
        camera.setAttribute("cy", ancre.getAttribute("cy") ?? "0");
      }
    };

    const timer = window.setInterval(sync, 100);
    sync();

    /* ── zones cliquables : chaque pièce saute à son chapitre ─────────────── */

    const onClick = (e: Event) => {
      const g = (e.target as Element).closest<SVGGElement>("[data-piece]");
      const piece = g?.dataset.piece;
      const v = window.__visite;
      if (!piece || !v) return;
      const cible = v.segments.find((s) => s.piece === piece);
      if (!cible) return;
      const [start, end] = v.scrollRange();
      const y = start + (cible.vhStart / v.totalVh) * (end - start);
      if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.1 });
      else window.scrollTo({ top: y, behavior: "smooth" });
    };
    root.addEventListener("click", onClick);

    return () => {
      window.clearInterval(timer);
      root.removeEventListener("click", onClick);
    };
  }, [svg]);

  /* Aucun positionnement ici : le parent décide où va le plan. Ce composant ne
     s'occupe que de ce qui se passe à l'intérieur du SVG. */
  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className="pointer-events-auto w-full [&_svg]:h-auto [&_svg]:w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
