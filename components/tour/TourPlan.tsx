"use client";

import { motion } from "framer-motion";
import type { Tour } from "@/lib/tours";

type Props = {
  tour: Tour;
  currentId: string;
  onSelect: (id: string) => void;
};

/**
 * Mini-plan schématique : un panneau par étage, un point par pièce.
 * Le point laiton pulsant marque la position du visiteur ; chaque point
 * est cliquable (téléportation directe vers la pièce).
 */
export default function TourPlan({ tour, currentId, onSelect }: Props) {
  const current = tour.nodes.find((n) => n.id === currentId);

  return (
    <div className="glass rounded-2xl p-3.5">
      <p className="px-1 text-[10px] uppercase tracking-[0.25em] text-umber">
        Plan — vous êtes ici
      </p>
      <div className="mt-2.5 flex gap-2.5">
        {tour.floors.map((floorName, floorIndex) => {
          const active = current?.plan.floor === floorIndex;
          return (
            <div key={floorName} className="w-[8.5rem]">
              <div
                className={`relative h-40 rounded-xl border transition-colors duration-300 ${
                  active
                    ? "border-brass/70 bg-white/45"
                    : "border-ink/10 bg-white/20"
                }`}
              >
                {tour.nodes
                  .filter((n) => n.plan.floor === floorIndex)
                  .map((n) => {
                    const isCurrent = n.id === currentId;
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => onSelect(n.id)}
                        aria-label={`Aller : ${n.name}`}
                        data-testid={`plan-${n.id}`}
                        aria-current={isCurrent ? "location" : undefined}
                        className="group absolute -translate-x-1/2 -translate-y-1/2 p-1.5"
                        style={{ left: `${n.plan.x}%`, top: `${n.plan.y}%` }}
                      >
                        <span className="relative block">
                          {isCurrent && (
                            <motion.span
                              className="absolute inset-0 -m-1.5 rounded-full bg-brass/40"
                              animate={{ scale: [1, 2.1], opacity: [0.6, 0] }}
                              transition={{
                                duration: 1.6,
                                repeat: Infinity,
                                ease: "easeOut",
                              }}
                              aria-hidden
                            />
                          )}
                          <span
                            className={`block h-2 w-2 rounded-full transition-all duration-300 ${
                              isCurrent
                                ? "scale-125 bg-brass"
                                : "bg-ink/35 group-hover:scale-125 group-hover:bg-brass"
                            }`}
                          />
                        </span>
                        <span
                          className={`pointer-events-none absolute left-1/2 top-full z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink/85 px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-bone transition-opacity duration-200 ${
                            isCurrent
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                          }`}
                        >
                          {n.name}
                        </span>
                      </button>
                    );
                  })}
              </div>
              <p
                className={`mt-1.5 text-center text-[9px] uppercase tracking-[0.2em] transition-colors duration-300 ${
                  active ? "text-brass" : "text-umber/70"
                }`}
              >
                {floorName}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
