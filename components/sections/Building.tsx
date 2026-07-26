"use client";

import { useRef } from "react";
import Image from "next/image";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import Eyebrow from "@/components/ui/Eyebrow";
import { BLUR_DATA_URL } from "@/lib/images";

const VALUES = ["Construction récente", "Écoénergétique", "Gestion sur place"];

export default function Building() {
  const reduced = useReducedMotion();
  const imgRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: imgRef,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-7%", "7%"]);

  return (
    <section id="immeuble" className="bg-ivory py-24 sm:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 sm:px-10 lg:grid-cols-2 lg:gap-20">
        <div
          ref={imgRef}
          className="relative aspect-[4/5] overflow-hidden rounded-3xl"
        >
          <motion.div
            style={reduced ? undefined : { y }}
            suppressHydrationWarning
            className="absolute inset-0 scale-[1.16]"
          >
            <Image
              src="/photos/salle-a-manger-suspension.jpg"
              alt="Salle à manger d'une unité Boréal, suspension noire et lumière naturelle"
              fill
              sizes="(min-width: 1024px) 45vw, 90vw"
              className="object-cover"
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
            />
          </motion.div>
        </div>

        <div>
          <Eyebrow num="04" label="L'ensemble" />
          <h2 className="font-display mt-6 text-[clamp(2.2rem,4.5vw,3.8rem)] leading-[1.02] tracking-tight">
            Un milieu de vie, pas juste des adresses
          </h2>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="mt-7 space-y-5 leading-relaxed text-umber"
          >
            <p>
              Les Résidences Boréal, ce sont 48 unités récentes dans le secteur
              des Rivières, à Trois-Rivières : des rues calmes, des cours
              vertes, et tout ce qu&apos;il faut à moins de dix minutes —
              écoles, épiceries, cégep, université, piste cyclable.
            </p>
            <p>
              L&apos;équipe de gestion habite le quartier. Les demandes
              d&apos;entretien passent par une vraie personne, les espaces
              communs sont entretenus à l&apos;année, et le déneigement est
              fait avant votre café du matin.
            </p>
          </motion.div>

          <motion.ul
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mt-9 flex flex-wrap gap-3"
          >
            {VALUES.map((v) => (
              <li
                key={v}
                className="glass flex items-center gap-2.5 rounded-full px-5 py-2.5 text-sm"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-brass" aria-hidden />
                {v}
              </li>
            ))}
          </motion.ul>
        </div>
      </div>
    </section>
  );
}
