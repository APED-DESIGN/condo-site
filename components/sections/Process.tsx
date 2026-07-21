"use client";

import { useRef } from "react";
import { motion, useScroll } from "framer-motion";
import Eyebrow from "@/components/ui/Eyebrow";

const STEPS = [
  {
    num: "01",
    title: "Consultation",
    desc: "Nous visitons les lieux, écoutons vos besoins et cadrons le budget. Vous repartez avec une vision claire de ce qui est possible.",
  },
  {
    num: "02",
    title: "Concept",
    desc: "Direction artistique, planches d'ambiance, palette de matières : le projet prend forme et vous validez chaque intention.",
  },
  {
    num: "03",
    title: "Design & plans",
    desc: "Plans techniques, élévations, mobilier sur mesure et devis détaillés. Tout est dessiné avant le premier coup de marteau.",
  },
  {
    num: "04",
    title: "Réalisation",
    desc: "Nous coordonnons entrepreneurs et artisans, suivons le chantier et protégeons la qualité d'exécution à chaque étape.",
  },
  {
    num: "05",
    title: "Installation & remise",
    desc: "Mobilier, luminaires, objets, stylisme final : nous livrons un espace terminé, prêt à être vécu dès le premier soir.",
  },
];

export default function Process() {
  const listRef = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({
    target: listRef,
    offset: ["start 0.75", "end 0.55"],
  });

  return (
    <section id="processus" className="bg-ink py-24 text-bone sm:py-32">
      <div className="mx-auto grid max-w-6xl gap-16 px-6 sm:px-10 lg:grid-cols-[1fr_1.35fr] lg:gap-24">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <Eyebrow num="03" label="Méthode" light />
          <h2 className="font-display mt-6 text-[clamp(2.2rem,4.5vw,3.8rem)] leading-[1.02] tracking-tight">
            Un processus maîtrisé, de la première visite au dernier objet
          </h2>
          <p className="mt-6 max-w-md leading-relaxed text-white/55">
            Cinq étapes, un seul interlocuteur. Vous savez toujours où en est
            votre projet, ce qui s&apos;en vient et ce que ça coûte.
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
