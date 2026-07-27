"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Eyebrow from "@/components/ui/Eyebrow";
import { BLUR_DATA_URL } from "@/lib/images";

/**
 * Le cœur de l'accueil : deux approches, deux cartes.
 *
 * Les deux cartes sont volontairement IDENTIQUES en tout — même largeur (une
 * grille à deux colonnes égales), même format d'image, même hiérarchie de
 * texte, même délai d'apparition à 60 ms près. Aucune ne doit passer pour
 * l'option principale : le visiteur choisit, il ne se fait pas orienter.
 *
 * Rien de neuf côté style : mêmes tokens (`bone`/`ink`/`brass`/`umber`), même
 * `font-display`, même courbe d'animation que le reste du site.
 */

const OPTIONS = [
  {
    href: "/maison",
    option: "Option 1 · Visite 360°",
    titre: "La maison",
    texte: "L'acheteur se déplace librement de pièce en pièce.",
    image: "/photos/maison/maison-cover.jpg",
    alt: "Arrière d'une maison : revêtement noir, toit incurvé et piscine creusée",
  },
  {
    href: "/appartement",
    option: "Option 2 · Au défilement",
    titre: "L'appartement 5½",
    texte: "La visite avance au scroll et s'arrête pour expliquer chaque pièce.",
    image: "/frames/5-et-demi-deux-niveaux/arrets/cuisine.webp",
    alt: "Cuisine ouverte d'un appartement : îlot central et armoires blanches",
  },
];

export default function Choix() {
  return (
    <section id="choix" className="bg-bone py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <Eyebrow num="01" label="Deux approches" />
        <h2 className="font-display mt-6 max-w-2xl text-[clamp(2.2rem,4.5vw,3.8rem)] leading-[1.02] tracking-tight">
          Choisissez celle que vous voulez voir
        </h2>

        <ul className="mt-14 grid gap-6 md:grid-cols-2 md:gap-8">
          {OPTIONS.map((o, i) => (
            <motion.li
              key={o.href}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ duration: 0.8, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link
                href={o.href}
                data-cursor="Entrer"
                className="group flex h-full flex-col overflow-hidden rounded-[2rem] border border-ink/10 bg-ivory transition-colors duration-500 hover:border-brass/50"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={o.image}
                    alt={o.alt}
                    fill
                    sizes="(min-width: 768px) 45vw, 100vw"
                    className="object-cover transition-transform duration-[600ms] ease-out-expo group-hover:scale-[1.03]"
                    placeholder="blur"
                    blurDataURL={BLUR_DATA_URL}
                  />
                </div>

                <div className="flex flex-1 flex-col p-7 sm:p-9">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-umber">{o.option}</p>

                  <p className="font-display mt-5 text-[clamp(1.8rem,3vw,2.6rem)] leading-tight tracking-tight">
                    {o.titre}
                  </p>

                  <p className="mt-4 max-w-xs leading-relaxed text-umber">{o.texte}</p>

                  <span className="mt-auto inline-flex items-center gap-2 pt-8 text-[11px] uppercase tracking-[0.28em] text-ink">
                    Entrer
                    <ArrowRight
                      className="h-4 w-4 text-brass transition-transform duration-500 group-hover:translate-x-1.5"
                      aria-hidden
                    />
                  </span>
                </div>
              </Link>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
