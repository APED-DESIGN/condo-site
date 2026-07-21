"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const ITEMS = [
  {
    quote:
      "Norden a compris notre façon de vivre avant même que nous sachions l'expliquer. La maison est belle, mais surtout : elle est à nous.",
    name: "Marie-Ève L.",
    role: "Résidence Outremont",
  },
  {
    quote:
      "Un chantier suivi au millimètre, un budget respecté, zéro mauvaise surprise. Le résultat dépasse les rendus qu'on nous avait présentés.",
    name: "Jean-Philippe D.",
    role: "Loft Griffintown",
  },
  {
    quote:
      "Le chalet est devenu l'endroit où toute la famille veut se retrouver. On nous demande chaque semaine qui l'a conçu.",
    name: "Catherine & Marc B.",
    role: "Chalet Charlevoix",
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
          Ils en parlent
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
