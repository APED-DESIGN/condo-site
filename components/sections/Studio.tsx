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
import { BLUR_DATA_URL, unsplash } from "@/lib/images";

const VALUES = ["Design intègre", "Sur mesure", "Durable"];

export default function Studio() {
  const reduced = useReducedMotion();
  const imgRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: imgRef,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-7%", "7%"]);

  return (
    <section id="studio" className="bg-ivory py-24 sm:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 sm:px-10 lg:grid-cols-2 lg:gap-20">
        <div
          ref={imgRef}
          className="relative aspect-[4/5] overflow-hidden rounded-3xl"
        >
          <motion.div
            style={reduced ? undefined : { y }}
            className="absolute inset-0 scale-[1.16]"
          >
            <Image
              src={unsplash("photo-1497366811353-6870744d04b2", 1400)}
              alt="L'atelier du studio : grande table de travail, échantillons de matières et lumière naturelle"
              fill
              sizes="(min-width: 1024px) 45vw, 90vw"
              className="object-cover"
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
            />
          </motion.div>
        </div>

        <div>
          <Eyebrow num="04" label="Studio" />
          <h2 className="font-display mt-6 text-[clamp(2.2rem,4.5vw,3.8rem)] leading-[1.02] tracking-tight">
            Un atelier, une conviction
          </h2>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="mt-7 space-y-5 leading-relaxed text-umber"
          >
            <p>
              Fondé à Québec il y a dix ans, Norden réunit designers,
              architectes d&apos;intérieur et stylistes autour d&apos;une même
              conviction : un bel espace n&apos;est pas un décor, c&apos;est un
              lieu qui vous rend la vie plus douce.
            </p>
            <p>
              Nous travaillons en petit comité, sur un nombre limité de projets
              à la fois. Chaque client a un interlocuteur unique, chaque
              matière est choisie en atelier, chaque détail est dessiné —
              jamais laissé au hasard.
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
