"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Orbit, Play } from "lucide-react";
import Eyebrow from "@/components/ui/Eyebrow";
import Button from "@/components/ui/Button";
import { STATUS_LABEL, units } from "@/lib/units";
import { BLUR_DATA_URL } from "@/lib/images";
import { gsap } from "@/lib/gsap";
import { scrollToId } from "@/lib/scroll";

/**
 * Collection d'unités : scroll horizontal épinglé (GSAP) sur desktop,
 * mosaïque verticale décalée sur mobile.
 */
export default function Units() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add(
      "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
      () => {
        const track = trackRef.current;
        const section = sectionRef.current;
        if (!track || !section) return;

        const amount = () => track.scrollWidth - window.innerWidth;
        const tween = gsap.to(track, {
          x: () => -amount(),
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () => `+=${amount()}`,
            scrub: 1,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        return () => {
          tween.scrollTrigger?.kill();
          tween.kill();
        };
      }
    );
    return () => mm.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="unites"
      className="relative overflow-hidden bg-ivory"
    >
      <div className="flex flex-col py-20 lg:h-screen lg:justify-center lg:py-0">
        <div
          ref={trackRef}
          className="flex flex-col gap-14 px-5 sm:px-8 lg:w-max lg:flex-row lg:items-center lg:gap-[4vw] lg:px-[7vw]"
        >
          {/* Panneau d'introduction */}
          <div className="max-w-md shrink-0 lg:w-[30vw]">
            <Eyebrow num="01" label="Unités" />
            <h2 className="font-display mt-6 text-[clamp(2.2rem,4.5vw,3.8rem)] leading-[1.02] tracking-tight">
              Des condos pensés pour la vraie vie
            </h2>
            <p className="mt-6 max-w-sm leading-relaxed text-umber">
              Du 3½ au cottage sur deux niveaux : chaque unité est présentée
              avec de vraies photos — et l&apos;unité vedette se visite en
              ligne, pièce par pièce.
            </p>
            <p
              className="mt-10 hidden text-[11px] uppercase tracking-[0.3em] text-greige lg:block"
              aria-hidden
            >
              ( Défilez )
            </p>
          </div>

          {/* Cartes unités */}
          {units.map((u, i) => (
            <motion.div
              key={u.slug}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-8% 0px" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className={`shrink-0 lg:w-[34vw] ${
                i % 2 === 1 ? "w-[88%] self-end lg:self-auto" : "w-full"
              }`}
            >
              <Link
                href={`/unites/${u.slug}`}
                data-cursor="Voir"
                className="group block"
              >
                <span className="mb-3 flex items-baseline justify-between text-[11px] uppercase tracking-[0.25em] text-umber">
                  <span>
                    <span className="font-display mr-2 italic text-brass">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {u.type}
                  </span>
                  <span>{u.monthlyPrice}</span>
                </span>

                <span className="relative block aspect-[3/4] overflow-hidden rounded-3xl lg:h-[62vh] lg:aspect-auto">
                  <Image
                    src={u.cover}
                    alt={u.coverAlt}
                    fill
                    sizes="(min-width: 1024px) 34vw, 90vw"
                    className="object-cover transition-transform duration-700 ease-out-expo group-hover:scale-105"
                    placeholder="blur"
                    blurDataURL={BLUR_DATA_URL}
                  />

                  {/* Pastilles statut + visite */}
                  <span className="absolute left-4 top-4 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3.5 py-1.5 text-[10px] uppercase tracking-[0.2em] backdrop-blur-md ${
                        u.status === "disponible"
                          ? "bg-brass text-ivory"
                          : u.status === "bientôt"
                            ? "border border-white/50 bg-white/20 text-bone"
                            : "bg-ink/55 text-bone/85"
                      }`}
                    >
                      {STATUS_LABEL[u.status]}
                    </span>
                    {u.tour360 ? (
                      <span className="flex items-center gap-1.5 rounded-full border border-white/50 bg-white/20 px-3.5 py-1.5 text-[10px] uppercase tracking-[0.2em] text-bone backdrop-blur-md">
                        <Orbit className="h-3 w-3 text-brass" aria-hidden />
                        Visite 360°
                      </span>
                    ) : u.tour.enabled ? (
                      <span className="flex items-center gap-1.5 rounded-full border border-white/50 bg-white/20 px-3.5 py-1.5 text-[10px] uppercase tracking-[0.2em] text-bone backdrop-blur-md">
                        <Play className="h-3 w-3 text-brass" aria-hidden />
                        Visite immersive
                      </span>
                    ) : null}
                  </span>

                  {/* Overlay vitré */}
                  <span className="glass absolute inset-x-4 bottom-4 flex items-center justify-between rounded-2xl px-5 py-4 transition-all duration-500 ease-out-expo lg:translate-y-3 lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100">
                    <span>
                      <span className="font-display block text-lg leading-tight">
                        {u.name}
                      </span>
                      <span className="mt-0.5 block text-xs text-umber">
                        {u.bedrooms} ch. — {u.surface} — {u.location}
                      </span>
                    </span>
                    <span
                      className="text-brass transition-transform duration-500 group-hover:translate-x-1"
                      aria-hidden
                    >
                      →
                    </span>
                  </span>
                </span>
              </Link>
            </motion.div>
          ))}

          {/* Panneau final */}
          <div className="max-w-md shrink-0 py-6 lg:w-[30vw]">
            <p className="font-display text-[clamp(1.8rem,3vw,2.6rem)] leading-tight tracking-tight">
              Votre prochain chez-vous est peut-être déjà ici.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button onClick={() => scrollToId("contact")} arrow>
                Réserver une visite
              </Button>
              <Button variant="glass" href="/unites/maison-panoramique?visite=1">
                Essayer la visite 360°
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
