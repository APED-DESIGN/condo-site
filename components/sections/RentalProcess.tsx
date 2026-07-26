"use client";

import { useRef } from "react";
import { motion, useScroll } from "framer-motion";
import Eyebrow from "@/components/ui/Eyebrow";

const STEPS = [
  {
    num: "01",
    title: "Visite immersive en ligne",
    desc: "Promenez-vous dans l'unité pièce par pièce, depuis votre salon. Prenez votre temps, revenez autant de fois que vous voulez.",
  },
  {
    num: "02",
    title: "Visite en personne (si vous voulez)",
    desc: "Un coup de cœur en ligne ? On vous ouvre les portes en vrai, à l'heure qui vous convient — soirs et fins de semaine inclus.",
  },
  {
    num: "03",
    title: "Demande de location",
    desc: "Un formulaire simple, les vérifications d'usage, une réponse rapide. Pas de frais de dossier surprises.",
  },
  {
    num: "04",
    title: "Signature du bail",
    desc: "Bail signé électroniquement, annexes claires, inclusions écrites noir sur blanc. Vous savez exactement ce que vous signez.",
  },
  {
    num: "05",
    title: "Remise des clés",
    desc: "Unité inspectée, nettoyée et prête. On vous remet les clés, le guide du locataire — et bienvenue chez vous.",
  },
];

export default function RentalProcess() {
  const listRef = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({
    target: listRef,
    offset: ["start 0.75", "end 0.55"],
  });

  return (
    <section id="louer" className="bg-ink py-24 text-bone sm:py-32">
      <div className="mx-auto grid max-w-6xl gap-16 px-6 sm:px-10 lg:grid-cols-[1fr_1.35fr] lg:gap-24">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <Eyebrow num="03" label="Comment louer" light />
          <h2 className="font-display mt-6 text-[clamp(2.2rem,4.5vw,3.8rem)] leading-[1.02] tracking-tight">
            De la visite en ligne à la remise des clés
          </h2>
          <p className="mt-6 max-w-md leading-relaxed text-white/55">
            Cinq étapes, un seul interlocuteur. Vous savez toujours où en est
            votre demande, ce qui s&apos;en vient et ce que ça coûte.
          </p>
        </div>

        <ol ref={listRef} className="relative space-y-14 pl-10">
          {/* Ligne de progression */}
          <div
            className="absolute bottom-2 left-0 top-2 w-px bg-white/12"
            aria-hidden
          />
          <motion.div
            style={{ scaleY: scrollYProgress }}
            className="absolute bottom-2 left-0 top-2 w-px origin-top bg-brass"
            aria-hidden
          />

          {STEPS.map((s, i) => (
            <motion.li
              key={s.num}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-12% 0px" }}
              transition={{
                duration: 0.75,
                delay: i * 0.04,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="relative"
            >
              <span
                className="absolute -left-10 top-2 h-2 w-2 -translate-x-1/2 rounded-full bg-brass"
                style={{ left: "-2.5rem" }}
                aria-hidden
              />
              <p className="font-display text-sm italic text-brass">{s.num}</p>
              <h3 className="font-display mt-2 text-2xl tracking-tight sm:text-3xl">
                {s.title}
              </h3>
              <p className="mt-3 max-w-lg leading-relaxed text-white/55">
                {s.desc}
              </p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
