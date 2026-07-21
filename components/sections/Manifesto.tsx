"use client";

import { motion } from "framer-motion";
import Marquee from "@/components/ui/Marquee";
import RevealText from "@/components/ui/RevealText";

const WORDS = ["Concevoir", "Aménager", "Sublimer"];

export default function Manifesto() {
  return (
    <section className="overflow-hidden bg-bone py-24 sm:py-32" aria-label="Manifeste">
      <Marquee
        duration={36}
        srLabel="Concevoir, aménager, sublimer."
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
            text="Norden est un studio de design intérieur établi à Québec. Nous concevons des lieux calmes, précis et durables — des espaces pensés pour la lumière du Nord et pour celles et ceux qui les habitent."
          />
        </h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 max-w-xl leading-relaxed text-umber"
        >
          Chaque projet commence par une écoute attentive et se termine par un
          espace qui vous appartient vraiment. Entre les deux : une méthode
          rigoureuse, un œil exigeant et un profond respect des matières.
        </motion.p>
      </div>
    </section>
  );
}
