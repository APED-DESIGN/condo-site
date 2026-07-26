"use client";

import { motion } from "framer-motion";
import {
  AirVent,
  ArrowUpRight,
  Car,
  PawPrint,
  Trees,
  WashingMachine,
  Wrench,
} from "lucide-react";
import Eyebrow from "@/components/ui/Eyebrow";

const AMENITIES = [
  {
    icon: Car,
    title: "Stationnement inclus",
    desc: "Une place privée par unité, déneigée l'hiver. Deuxième place disponible.",
  },
  {
    icon: AirVent,
    title: "Thermopompe murale",
    desc: "Climatisation l'été, chauffage d'appoint efficace l'hiver, dans chaque unité.",
  },
  {
    icon: WashingMachine,
    title: "Buanderie dans l'unité",
    desc: "Entrées laveuse-sécheuse pleine grandeur — fini les rouleaux de pièces.",
  },
  {
    icon: Trees,
    title: "Cour et terrasse",
    desc: "Cours clôturées au rez-de-chaussée, balcons et terrasses aux étages.",
  },
  {
    icon: PawPrint,
    title: "Animaux bienvenus",
    desc: "Chats et chiens acceptés dans la plupart des unités, sans supplément caché.",
  },
  {
    icon: Wrench,
    title: "Entretien réactif",
    desc: "Gestion sur place : une demande, une réponse en moins de 24 heures.",
  },
];

export default function Amenities() {
  return (
    <section id="inclusions" className="bg-bone py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <Eyebrow num="02" label="Inclusions" />
        <h2 className="font-display mt-6 max-w-xl text-[clamp(2.2rem,4.5vw,3.8rem)] leading-[1.02] tracking-tight">
          Tout ce qui vient avec vos clés
        </h2>

        <ul className="mt-16 border-t border-ink/10">
          {AMENITIES.map((s, i) => (
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
