"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Floor360, Node360, Tour360Data } from "@/data/tours/maison-01";

type Props = {
  tour: Tour360Data;
  currentId: string;
  onSelect: (id: string) => void;
};

/**
 * Mini-plan « vous êtes ici » : plan schématique par zone (RDC / Étage /
 * Extérieur), point actif pulsant, voisins mis en évidence, téléportation
 * au clic. Plan d'orientation assumé, pas un plan d'architecte.
 */
export default function TourMiniMap({ tour, currentId, onSelect }: Props) {
  const current = tour.nodes.find((n) => n.id === currentId);
  const [floor, setFloor] = useState<Floor360>(current?.floor ?? "rdc");

  /* La zone affichée suit le visiteur quand il change d'étage. */
  useEffect(() => {
    if (current) setFloor(current.floor);
  }, [current]);

  const neighbors = new Set(current?.links.map((l) => l.to) ?? []);
  const visible = tour.nodes.filter((n) => n.floor === floor);

  return (
    <div className="glass w-[15.5rem] rounded-2xl p-3 sm:w-[17rem]">
      <p className="px-1 text-[9px] uppercase tracking-[0.24em] text-umber">
        Plan — vous êtes ici
      </p>

      {/* Sélecteur d'étage */}
      <div className="mt-2 flex gap-1" role="tablist" aria-label="Choix de la zone">
        {tour.floors.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={floor === f.id}
            onClick={() => setFloor(f.id)}
            className={`flex-1 rounded-full px-1 py-1.5 text-[9px] uppercase tracking-[0.14em] transition-colors duration-300 ${
              floor === f.id
                ? "bg-ink text-bone"
                : "bg-white/40 text-umber hover:bg-white/70"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Zone du plan */}
      <div className="relative mt-2 h-40 overflow-hidden rounded-xl border border-ink/10 bg-ivory/70">
        {visible.map((n) => {
          const isCurrent = n.id === currentId;
          const isNeighbor = neighbors.has(n.id);
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => onSelect(n.id)}
              aria-label={`Aller : ${n.name}`}
              aria-current={isCurrent ? "location" : undefined}
              data-testid={`map360-${n.id}`}
              className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 p-2"
              style={{ left: `${n.map.x}%`, top: `${n.map.y}%` }}
            >
              <span className="relative block">
                {isCurrent && (
                  <motion.span
                    className="absolute inset-0 rounded-full bg-brass/40"
                    animate={{ scale: [1, 2.4], opacity: [0.7, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                    aria-hidden
                  />
                )}
                <span
                  className={`block h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                    isCurrent
                      ? "scale-125 bg-brass"
                      : isNeighbor
                        ? "bg-umber ring-2 ring-brass/50 group-hover:bg-brass"
                        : "bg-greige group-hover:bg-umber"
                  }`}
                />
              </span>
              <span
                className={`pointer-events-none absolute left-1/2 top-full -translate-x-1/2 whitespace-nowrap rounded-full bg-ink/80 px-2 py-0.5 text-[8px] uppercase tracking-[0.12em] text-bone transition-opacity duration-200 ${
                  isCurrent ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                }`}
              >
                {n.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
