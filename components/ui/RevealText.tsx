"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

type Props = {
  text: string;
  className?: string;
  /** Découpage : par caractère (hero) ou par mot (paragraphes). */
  by?: "char" | "word";
  delay?: number;
  /**
   * Contrôle du déclenchement : booléen (ex. fin du preloader)
   * ou undefined pour un déclenchement à l'entrée dans le viewport.
   */
  start?: boolean;
};

const child: Variants = {
  hidden: { y: "115%" },
  visible: (i: number) => ({
    y: "0%",
    transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1], delay: i },
  }),
};

export default function RevealText({
  text,
  className = "",
  by = "char",
  delay = 0,
  start,
}: Props) {
  const reduced = useReducedMotion();
  /* Le rendu réduit n'est appliqué qu'après l'hydratation : le premier rendu
     client doit rester identique au HTML serveur (sinon avertissement React). */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (reduced && mounted) {
    return <span className={className}>{text}</span>;
  }

  const words = text.split(" ");
  const stagger = by === "char" ? 0.022 : 0.055;
  let index = 0;

  const control =
    start === undefined
      ? {
          whileInView: "visible" as const,
          viewport: { once: true, margin: "-10% 0px" },
        }
      : { animate: start ? ("visible" as const) : ("hidden" as const) };

  return (
    <motion.span
      className={className}
      initial="hidden"
      aria-label={text}
      role="text"
      {...control}
    >
      {words.map((word, wi) => {
        const units = by === "char" ? word.split("") : [word];
        return (
          <span key={wi} aria-hidden>
            <span className="inline-block whitespace-nowrap">
              <span className="inline-block overflow-hidden pb-[0.1em] align-top">
                {units.map((unit, ui) => {
                  const i = delay + index++ * stagger;
                  return (
                    <motion.span
                      key={ui}
                      className="inline-block will-change-transform"
                      variants={child}
                      custom={i}
                    >
                      {unit}
                    </motion.span>
                  );
                })}
              </span>
            </span>
            {wi < words.length - 1 ? " " : ""}
          </span>
        );
      })}
    </motion.span>
  );
}
