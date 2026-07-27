"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { ArrowLeft, Check, Orbit } from "lucide-react";
import RevealText from "@/components/ui/RevealText";
import Button from "@/components/ui/Button";
import TourModal from "@/components/tour/TourModal";
import { BLUR_DATA_URL } from "@/lib/images";
import { tours360 } from "@/data/tours/maison-01";
import { STATUS_LABEL, formatBathrooms, type Unit } from "@/lib/units";

function ParallaxImage({
  src,
  alt,
  className = "",
  sizes = "(min-width: 1024px) 80vw, 100vw",
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-7%", "7%"]);

  return (
    <div ref={ref} className={`relative overflow-hidden rounded-3xl ${className}`}>
      <motion.div
        style={reduced ? undefined : { y }}
        suppressHydrationWarning
        className="absolute inset-0 scale-[1.16]"
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          className="object-cover"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
        />
      </motion.div>
    </div>
  );
}

const STATUS_STYLE: Record<Unit["status"], string> = {
  disponible: "bg-brass text-ivory",
  bientôt: "bg-white/20 text-bone border border-white/40",
  loué: "bg-ink/60 text-bone/80 border border-white/20",
};

export default function MaisonClient({ unit }: { unit: Unit }) {
  const tour360 = unit.tour360 ? tours360[unit.tour360] : undefined;
  const [tour360Open, setTour360Open] = useState(false);

  /* Lien profond : /maison?visite=1 lance la visite 360° à l'arrivée. */
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("visite") !== "1") return;
    if (tour360) setTour360Open(true);
  }, [tour360]);

  const meta = [
    { label: "Loyer", value: unit.monthlyPrice },
    { label: "Type", value: unit.type },
    { label: "Superficie", value: unit.surface },
    { label: "Chambres", value: String(unit.bedrooms) },
    { label: "Salles de bain", value: formatBathrooms(unit.bathrooms) },
    { label: "Niveau", value: unit.floor },
    { label: "Meublé", value: unit.furnished ? "Oui" : "Non" },
    { label: "Disponibilité", value: unit.availableFrom },
  ];

  return (
    <article>
      {/* Hero plein écran */}
      <header className="relative h-[85svh] min-h-[520px] overflow-hidden">
        <Image
          src={unit.cover}
          alt={unit.coverAlt}
          fill
          priority
          sizes="100vw"
          className="object-cover"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/15 to-ink/30"
          aria-hidden
        />
        <div className="absolute inset-x-0 bottom-0 px-6 pb-14 sm:px-10 lg:px-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="mb-4 flex flex-wrap items-center gap-2.5"
          >
            <span className="inline-block rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-[11px] uppercase tracking-[0.3em] text-bone backdrop-blur-md">
              {unit.type} — {unit.monthlyPrice}
            </span>
            <span
              className={`inline-block rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.3em] backdrop-blur-md ${STATUS_STYLE[unit.status]}`}
            >
              {STATUS_LABEL[unit.status]}
            </span>
          </motion.div>
          <h1 className="font-display max-w-4xl text-[clamp(2.4rem,6.5vw,5.2rem)] leading-[0.95] tracking-tight text-bone">
            <RevealText text={unit.name} start delay={0.35} />
          </h1>

          {tour360 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="mt-7"
            >
              <Button onClick={() => setTour360Open(true)} arrow>
                <Orbit className="h-4 w-4" aria-hidden />
                Visite virtuelle 360°
              </Button>
            </motion.div>
          )}
        </div>
      </header>

      {/* Bande d'informations */}
      <div className="border-b border-ink/10 bg-bone">
        <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/"
              className="link-underline inline-flex items-center gap-2 text-sm text-umber transition-colors hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Retour à l&apos;accueil
            </Link>
            {tour360 ? (
              <button
                type="button"
                onClick={() => setTour360Open(true)}
                className="link-underline inline-flex items-center gap-2 text-sm text-brass"
              >
                <Orbit className="h-4 w-4" aria-hidden />
                Visitez la maison comme si vous y étiez
              </button>
            ) : null}
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
            {meta.map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.6,
                  delay: i * 0.05,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <dt className="text-[11px] uppercase tracking-[0.25em] text-greige">
                  {m.label}
                </dt>
                <dd className="font-display mt-2 text-lg">{m.value}</dd>
              </motion.div>
            ))}
          </dl>
        </div>
      </div>

      {/* Description */}
      <div className="mx-auto max-w-2xl px-6 py-20 sm:py-28">
        {unit.description.map((paragraph, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className={
              i === 0
                ? "font-display text-[clamp(1.4rem,2.6vw,1.9rem)] leading-snug tracking-tight"
                : "mt-7 leading-relaxed text-umber"
            }
          >
            {paragraph}
          </motion.p>
        ))}

        {/* Inclusions de l'unité */}
        <motion.ul
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 flex flex-wrap gap-2.5"
          aria-label="Inclusions de l'unité"
        >
          {unit.amenities.map((a) => (
            <li
              key={a}
              className="glass flex items-center gap-2 rounded-full px-4 py-2 text-sm"
            >
              <Check className="h-3.5 w-3.5 text-brass" aria-hidden />
              {a}
            </li>
          ))}
        </motion.ul>
      </div>

      {/* Galerie grand format */}
      <div className="mx-auto max-w-6xl space-y-6 px-4 pb-24 sm:space-y-8 sm:px-8">
        {unit.gallery[0] && (
          <ParallaxImage
            src={unit.gallery[0].src}
            alt={unit.gallery[0].alt}
            className="aspect-[16/10] w-full"
          />
        )}
        <div className="grid gap-6 sm:grid-cols-2 sm:gap-8">
          {unit.gallery.slice(1).map((img) => (
            <ParallaxImage
              key={img.src}
              src={img.src}
              alt={img.alt}
              className="aspect-[4/5]"
              sizes="(min-width: 640px) 45vw, 100vw"
            />
          ))}
        </div>

        {tour360 ? (
          <div className="flex justify-center pt-6">
            <Button onClick={() => setTour360Open(true)} variant="glass" arrow>
              Déplacez-vous de pièce en pièce, en 360°
            </Button>
          </div>
        ) : null}
      </div>

      {/* Visite virtuelle 360° (vrais panoramas) */}
      {tour360 && (
        <TourModal
          tour={tour360}
          open={tour360Open}
          onClose={() => setTour360Open(false)}
        />
      )}
    </article>
  );
}
