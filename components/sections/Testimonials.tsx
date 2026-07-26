"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const ITEMS = [
  {
    quote:
      "On a visité notre condo en ligne un mardi soir, en pyjama. Le samedi, on signait le bail. Tout était exactement comme dans la visite — aucune mauvaise surprise.",
    name: "Laurence T.",
    role: "Locataire — Le 55",
  },
  {
    quote:
      "Premier appart à Trois-Rivières pour mes études à l'UQTR. Mes parents ont pu faire la visite immersive depuis Gaspé avant de m'aider avec le bail. Ça les a rassurés solide.",
    name: "William G.",
    role: "Locataire — Unité 201",
  },
  {
    quote:
      "Une poignée de porte brisée un dimanche : réparée le lundi midi. En huit ans de location, je n'avais jamais vu une gestion aussi vite sur ses patins.",
    name: "Karine & Steve M.",
    role: "Locataires — Unité 401",
  },
];

export default function Testimonials() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % ITEMS.length), 6500);
    return () => clearInterval(id);
  }, [reduced]);

  const item = ITEMS[index];

  return (
    <section className="bg-bone py-24 sm:py-32" aria-label="Témoignages">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <p className="text-[11px] uppercase tracking-[0.3em] text-umber">
          Nos locataires en parlent
        </p>

        <div className="relative mt-10 min-h-[16rem] sm:min-h-[14rem]">
          <AnimatePresence mode="wait">
            <motion.figure
              key={index}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <blockquote className="font-display text-[clamp(1.4rem,3vw,2.1rem)] leading-snug tracking-tight">
                <span className="text-brass" aria-hidden>
                  «&nbsp;
                </span>
                {item.quote}
                <span className="text-brass" aria-hidden>
                  &nbsp;»
                </span>
              </blockquote>
              <figcaption className="mt-7 text-sm text-umber">
                <span className="font-medium text-ink">{item.name}</span>
                {" — "}
                {item.role}
              </figcaption>
            </motion.figure>
          </AnimatePresence>
        </div>

        <div className="mt-10 flex justify-center gap-2.5">
          {ITEMS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Témoignage ${i + 1}`}
              aria-current={i === index}
              className={`h-2 rounded-full transition-all duration-400 ${
                i === index ? "w-8 bg-brass" : "w-2 bg-greige/50 hover:bg-greige"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
