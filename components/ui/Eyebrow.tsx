"use client";

import { motion } from "framer-motion";

type Props = {
  num?: string;
  label: string;
  light?: boolean;
};

/** Surtitre de chapitre : `01 — Réalisations`. */
export default function Eyebrow({ num, label, light = false }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={`flex items-center gap-4 text-[11px] uppercase tracking-[0.28em] ${
        light ? "text-bone/60" : "text-umber"
      }`}
    >
      {num && <span className="font-display text-sm italic text-brass">{num}</span>}
      <span className={`h-px w-10 ${light ? "bg-bone/25" : "bg-greige/60"}`} aria-hidden />
      <span>{label}</span>
    </motion.div>
  );
}
