"use client";

import { motion } from "framer-motion";
import Marquee from "@/components/ui/Marquee";
import RevealText from "@/components/ui/RevealText";

const WORDS = ["Visiter", "Choisir", "Emménager"];

export default function Manifesto() {
  return (
    <section className="overflow-hidden bg-bone py-24 sm:py-32" aria-label="Manifeste">
      <Marquee
        duration={36}
        srLabel="Visiter, choisir, emménager."
        className="border-y border-ink/10 py-6"
      >
        {WORDS.map((w, i) => (
          <span key={i} className="flex items-center">
            <span className="font-display px-6 text-[clamp(2.8rem,7vw,6rem)] leading-none tracking-tight sm:px-10">
              {i % 2 === 1 ? <em className="font-light">{w}</em> : w}
            </span>
            <span className="text-2xl text-brass" aria-hidden>
              ✦
            </span>
          </span>
        ))}
      </Marquee>

      <div className="mx-auto mt-20 max-w-3xl px-6 sm:mt-24">
        <h2 className="font-display text-[clamp(1.5rem,3vw,2.2rem)] leading-snug tracking-tight">
          <RevealText
            by="word"
            text="Boréal est un ensemble de condos locatifs établi à Trois-Rivières. Des unités lumineuses, bien construites et bien tenues — et une visite immersive qui vous fait entrer dans chaque pièce avant de signer quoi que ce soit."
          />
        </h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 max-w-xl leading-relaxed text-umber"
        >
          Choisir un logement, c&apos;est un grand geste. On vous donne les
          moyens de le faire sans pression : de vraies photos, de vrais prix,
          une visite en ligne complète — puis, si le cœur y est, la visite en
          personne et le bail.
        </motion.p>
      </div>
    </section>
  );
}
