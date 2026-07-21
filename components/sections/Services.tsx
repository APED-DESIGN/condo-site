"use client";

import { motion } from "framer-motion";
import {
  Home,
  Building2,
  Ruler,
  LayoutGrid,
  Armchair,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import Eyebrow from "@/components/ui/Eyebrow";

const SERVICES = [
  {
    icon: Home,
    title: "Design résidentiel",
    desc: "Maisons, condos et chalets pensés pour votre quotidien réel.",
  },
  {
    icon: Building2,
    title: "Design commercial",
    desc: "Boutiques, bureaux et hôtellerie qui incarnent votre marque.",
  },
  {
    icon: Ruler,
    title: "Architecture d'intérieur",
    desc: "Réorganisation des volumes, plans techniques et suivi de chantier.",
  },
  {
    icon: LayoutGrid,
    title: "Aménagement & espace",
    desc: "Optimisation des circulations, de la lumière et du rangement.",
  },
  {
    icon: Armchair,
    title: "Sélection FF&E / mobilier",
    desc: "Mobilier, luminaires et matériaux choisis pièce par pièce.",
  },
  {
    icon: Sparkles,
    title: "Stylisme & mise en valeur",
    desc: "Derniers gestes : objets, textiles, art — et mise en marché.",
  },
];

export default function Services() {
  return (
    <section id="services" className="bg-bone py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <Eyebrow num="02" label="Services" />
        <h2 className="font-display mt-6 max-w-xl text-[clamp(2.2rem,4.5vw,3.8rem)] leading-[1.02] tracking-tight">
          Ce que nous faisons, du plan au dernier objet
        </h2>

        <ul className="mt-16 border-t border-ink/10">
          {SERVICES.map((s, i) => (
            <motion.li
              key={s.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-8% 0px" }}
              transition={{
                duration: 0.7,
                delay: i * 0.05,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="border-b border-ink/10"
            >
              <div className="group flex items-center gap-5 rounded-2xl px-2 py-6 transition-colors duration-300 hover:bg-ivory sm:gap-8 sm:px-4 sm:py-7">
                <span className="font-display w-7 shrink-0 text-sm italic text-brass">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <s.icon
                  className="h-5 w-5 shrink-0 text-umber transition-colors duration-300 group-hover:text-brass"
                  aria-hidden
                />
                <h3 className="font-display flex-1 text-xl tracking-tight sm:text-2xl md:text-3xl">
                  {s.title}
                </h3>
                <p className="hidden max-w-xs text-sm leading-relaxed text-umber md:block">
                  {s.desc}
                </p>
                <ArrowUpRight
                  className="h-5 w-5 shrink-0 -translate-x-1 translate-y-1 text-brass opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100"
                  aria-hidden
                />
              </div>
              <p className="px-2 pb-6 text-sm leading-relaxed text-umber md:hidden">
                {s.desc}
              </p>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
