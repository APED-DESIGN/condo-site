"use client";

import { useRef } from "react";
import Image from "next/image";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import Button from "@/components/ui/Button";
import RevealText from "@/components/ui/RevealText";
import { useApp } from "@/components/providers/AppProvider";
import { scrollToId } from "@/lib/scroll";
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
        <Image
          src="/photos/cuisine-evier.jpg"
          alt="Cuisine à îlot d'un cottage Boréal, ouverte sur la salle à manger et la cour"
          fill
          priority
          sizes="100vw"
          className="object-cover"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-ink/50 via-ink/10 to-ink/25"
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
          <p className="inline-block rounded-full border border-ink/15 bg-white/40 px-4 py-1.5 text-[10px] uppercase tracking-[0.3em] text-umber sm:text-[11px]">
            Trois-Rivières — Condos locatifs
          </p>

          <h1 className="font-display mt-6 text-[clamp(2.5rem,6.5vw,5.2rem)] leading-[0.98] tracking-tight">
            <RevealText
              text="Visitez votre prochain chez-vous sans vous déplacer"
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
            Des condos locatifs haut de gamme, à visiter en ligne pièce par
            pièce — comme si vous y étiez — avant même de prendre rendez-vous.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={ready ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 1.05, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <Button onClick={() => scrollToId("unites")} arrow>
              Voir les unités
            </Button>
            <Button variant="glass" href="/unites/maison-panoramique?visite=1">
              Visite virtuelle 360°
            </Button>
          </motion.div>

          {/* Badge stat flottant */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={ready ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.7, delay: 1.3, ease: [0.16, 1, 0.3, 1] }}
            className="absolute -top-7 right-5 sm:-right-6"
          >
            <motion.div
              animate={reduced ? undefined : { y: [0, -8, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
              className="glass rounded-2xl px-5 py-3.5"
            >
              <p className="font-display text-2xl leading-none">3</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-umber">
                Unités disponibles
              </p>
            </motion.div>
          </motion.div>
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
