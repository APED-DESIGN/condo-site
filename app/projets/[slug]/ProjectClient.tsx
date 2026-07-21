"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import RevealText from "@/components/ui/RevealText";
import { BLUR_DATA_URL } from "@/lib/images";
import type { Project } from "@/lib/projects";

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

export default function ProjectClient({
  project,
  next,
}: {
  project: Project;
  next: Project;
}) {
  const meta = [
    { label: "Client", value: project.client },
    { label: "Lieu", value: project.location },
    { label: "Année", value: project.year },
    { label: "Superficie", value: project.surface },
    { label: "Typologie", value: project.type },
  ];

  return (
    <article>
      {/* Hero plein écran */}
      <header className="relative h-[85svh] min-h-[520px] overflow-hidden">
        <Image
          src={project.cover}
          alt={project.coverAlt}
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
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="mb-4 inline-block rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-[11px] uppercase tracking-[0.3em] text-bone backdrop-blur-md"
          >
            {project.type} — {project.year}
          </motion.p>
          <h1 className="font-display max-w-4xl text-[clamp(2.6rem,7vw,5.5rem)] leading-[0.95] tracking-tight text-bone">
            <RevealText text={project.title} start delay={0.35} />
          </h1>
        </div>
      </header>

      {/* Bande d'informations */}
      <div className="border-b border-ink/10 bg-bone">
        <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
          <Link
            href="/#realisations"
            className="link-underline inline-flex items-center gap-2 text-sm text-umber transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Toutes les réalisations
          </Link>

          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
            {meta.map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.6,
                  delay: i * 0.06,
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

      {/* Récit */}
      <div className="mx-auto max-w-2xl px-6 py-20 sm:py-28">
        {project.story.map((paragraph, i) => (
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
      </div>

      {/* Galerie grand format */}
      <div className="mx-auto max-w-6xl space-y-6 px-4 pb-24 sm:space-y-8 sm:px-8">
        {project.images[0] && (
          <ParallaxImage
            src={project.images[0].src}
            alt={project.images[0].alt}
            className="aspect-[16/10] w-full"
          />
        )}
        <div className="grid gap-6 sm:grid-cols-2 sm:gap-8">
          {project.images.slice(1).map((img) => (
            <ParallaxImage
              key={img.src}
              src={img.src}
              alt={img.alt}
              className="aspect-[4/5]"
              sizes="(min-width: 640px) 45vw, 100vw"
            />
          ))}
        </div>
      </div>

      {/* Projet suivant */}
      <Link
        href={`/projets/${next.slug}`}
        data-cursor="Voir"
        className="group relative block h-[55vh] min-h-[380px] overflow-hidden bg-ink"
      >
        <Image
          src={next.cover}
          alt={next.coverAlt}
          fill
          sizes="100vw"
          className="object-cover opacity-40 transition-all duration-700 ease-out-expo group-hover:scale-105 group-hover:opacity-55"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-bone">
          <p className="text-[11px] uppercase tracking-[0.3em] text-bone/60">
            Projet suivant
          </p>
          <p className="font-display mt-4 text-[clamp(2.2rem,6vw,4.5rem)] leading-none tracking-tight">
            {next.title}
          </p>
          <ArrowRight
            className="mt-6 h-6 w-6 text-brass transition-transform duration-500 group-hover:translate-x-2"
            aria-hidden
          />
        </div>
      </Link>
    </article>
  );
}
