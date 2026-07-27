"use client";

import { useRef } from "react";
import Image from "next/image";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import RevealText from "@/components/ui/RevealText";
import { useApp } from "@/components/providers/AppProvider";
import { BLUR_DATA_URL } from "@/lib/images";

export default function Hero() {
  const { ready } = useApp();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);

  return (
    <section
      ref={ref}
      id="accueil"
      className="relative h-[100svh] min-h-[640px] overflow-hidden"
    >
      {/* Photo plein écran, parallax doux */}
      <motion.div
        style={reduced ? undefined : { y }}
        suppressHydrationWarning
        className="absolute inset-0 scale-[1.08]"
      >
        {/* Image d'ambiance, volontairement neutre : l'accueil n'annonce aucune
            propriété, il fait choisir entre deux approches. Une photo de la
            maison ou de l'appartement y aurait fait croire qu'on présente ce
            bien-là. Servie en local — pas de dépendance à un hébergeur tiers. */}
        <Image
          src="/photos/accueil-hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
        />
        {/* Le bas est plus appuyé que dans la version d'origine : cette image a
            un plancher clair, et l'indice « défiler » s'y perdait. */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-ink/25"
          aria-hidden
        />
      </motion.div>

      {/* Carte vitrée */}
      <div className="absolute inset-0 flex items-end px-4 pb-24 sm:px-8 lg:items-center lg:px-16 lg:pb-0">
        <motion.div
          initial={{ opacity: 0, y: 48 }}
          animate={ready ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          className="glass relative w-full max-w-3xl rounded-[2rem] p-7 sm:p-10 lg:p-12"
        >
          <h1 className="font-display text-[clamp(2.5rem,6.5vw,5.2rem)] leading-[0.98] tracking-tight">
            <RevealText
              text="Deux façons de faire visiter une propriété en ligne."
              start={ready}
              delay={0.35}
            />
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={ready ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 max-w-md leading-relaxed text-umber"
          >
            La même propriété se raconte autrement selon qu&apos;on la traverse
            librement ou qu&apos;on se laisse guider. Voyez les deux, puis
            choisissez.
          </motion.p>
        </motion.div>
      </div>

      {/* Indicateur de défilement */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={ready ? { opacity: 1 } : {}}
        transition={{ delay: 1.6, duration: 0.8 }}
        className="absolute bottom-7 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-bone"
        aria-hidden
      >
        <span className="text-[10px] uppercase tracking-[0.3em]">Défiler</span>
        <span className="relative h-10 w-px overflow-hidden bg-white/25">
          <motion.span
            className="absolute left-0 top-0 h-4 w-px bg-bone"
            animate={reduced ? undefined : { y: [-16, 40] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </span>
      </motion.div>
    </section>
  );
}
