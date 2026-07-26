"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import Counter from "@/components/ui/Counter";
import Marquee from "@/components/ui/Marquee";
import { BLUR_DATA_URL } from "@/lib/images";

const NEARBY = [
  "UQTR",
  "Cégep de Trois-Rivières",
  "Les Promenades",
  "District 55",
  "Piste cyclable",
  "Centre-ville",
];

/** Carte vitrée de confiance : stats animées + marquee du quartier. */
export default function Trust() {
  const reduced = useReducedMotion();

  return (
    <section
      className="relative overflow-hidden py-24 sm:py-32"
      aria-label="L'ensemble en chiffres"
    >
      {/* Photo d'arrière-plan — le verre a besoin de matière derrière lui */}
      <Image
        src="/photos/salle-a-manger.jpg"
        alt=""
        fill
        sizes="100vw"
        className="object-cover"
        placeholder="blur"
        blurDataURL={BLUR_DATA_URL}
        aria-hidden
      />
      <div className="absolute inset-0 bg-ink/35" aria-hidden />

      <div className="relative mx-auto max-w-4xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="glass rounded-[2rem] p-8 sm:p-12"
        >
          <div className="grid gap-10 sm:grid-cols-3">
            <div>
              <p className="font-display text-5xl tracking-tight sm:text-6xl">
                <Counter value={48} />
              </p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.25em] text-umber">
                Unités locatives
              </p>
            </div>
            <div>
              <p className="font-display text-5xl tracking-tight sm:text-6xl">
                <Counter value={24} suffix=" h" />
              </p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.25em] text-umber">
                Réponse entretien
              </p>
            </div>
            <div>
              <p className="font-display text-5xl tracking-tight sm:text-6xl">
                <Counter value={97} suffix="%" />
              </p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.25em] text-umber">
                Taux d&apos;occupation
              </p>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-ink/10">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: "97%" }}
                  viewport={{ once: true, margin: "-15% 0px" }}
                  transition={
                    reduced
                      ? { duration: 0 }
                      : { duration: 1.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }
                  }
                  className="h-full rounded-full bg-brass"
                />
              </div>
            </div>
          </div>

          <div className="mt-12 border-t border-ink/10 pt-8">
            <p className="text-center text-[11px] uppercase tracking-[0.3em] text-umber">
              À quelques minutes
            </p>
            <Marquee
              duration={28}
              className="mt-6"
              srLabel={NEARBY.join(", ")}
            >
              {NEARBY.map((name) => (
                <span
                  key={name}
                  className="font-display whitespace-nowrap px-8 text-xl italic text-ink/55 sm:text-2xl"
                >
                  {name}
                </span>
              ))}
            </Marquee>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
