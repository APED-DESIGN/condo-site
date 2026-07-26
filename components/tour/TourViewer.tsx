"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Map as MapIcon,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react";
import TourPlan from "./TourPlan";
import type { Tour, TourLink, TourLinkDir } from "@/lib/tours";

type Props = {
  tour: Tour;
  startNodeId: string;
  open: boolean;
  onClose: () => void;
};

const DIR_ICON: Record<TourLinkDir, typeof ChevronUp> = {
  forward: ChevronUp,
  back: ChevronDown,
  left: ChevronLeft,
  right: ChevronRight,
  up: ArrowUp,
  down: ArrowDown,
};

/** Amplitude du mouvement de caméra selon la direction empruntée. */
function variantsFor(dir: TourLinkDir, reduced: boolean) {
  if (reduced) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    };
  }
  const zoomIn = dir === "forward" || dir === "up" || dir === "left" || dir === "right";
  const shift = dir === "left" ? 40 : dir === "right" ? -40 : 0;
  return {
    initial: { opacity: 0, scale: zoomIn ? 0.94 : 1.1, x: shift },
    animate: { opacity: 1, scale: 1, x: 0 },
    exit: { opacity: 0, scale: zoomIn ? 1.1 : 0.94, x: -shift },
  };
}

/**
 * Visite immersive guidée : on se déplace de pièce en pièce en cliquant
 * les flèches posées dans la photo, avec mini-plan de position.
 * (Photos grand angle réelles de l'unité — navigation point-à-point guidée.)
 */
export default function TourViewer({ tour, startNodeId, open, onClose }: Props) {
  const reduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const [currentId, setCurrentId] = useState(startNodeId);
  const [dir, setDir] = useState<TourLinkDir>("forward");
  const [firstLoaded, setFirstLoaded] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);

  const node = useMemo(
    () => tour.nodes.find((n) => n.id === currentId) ?? tour.nodes[0],
    [tour, currentId]
  );

  const goTo = useCallback(
    (id: string, direction: TourLinkDir = "forward") => {
      setDir(direction);
      setCurrentId(id);
    },
    []
  );

  /* Réinitialise la position à chaque ouverture. */
  useEffect(() => {
    if (open) {
      setCurrentId(startNodeId);
      setDir("forward");
      setFirstLoaded(false);
    }
  }, [open, startNodeId]);

  /* Verrouillage du défilement + focus initial. */
  useEffect(() => {
    if (!open) return;
    window.__lenis?.stop();
    document.documentElement.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.__lenis?.start();
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  /* Navigation clavier : flèches pour se déplacer, Échap pour fermer. */
  useEffect(() => {
    if (!open) return;
    const pick = (dirs: TourLinkDir[]) =>
      dirs
        .map((d) => node.links.find((l) => l.dir === d))
        .find((l): l is TourLink => !!l);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      const map: Record<string, TourLink | undefined> = {
        ArrowUp: pick(["forward", "up"]),
        ArrowDown: pick(["back", "down"]),
        ArrowLeft: pick(["left"]),
        ArrowRight: pick(["right"]),
      };
      const link = map[e.key];
      if (link) {
        e.preventDefault();
        goTo(link.to, link.dir);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, node, goTo, onClose]);

  /* Préchargement des pièces voisines pour des transitions sans attente. */
  useEffect(() => {
    if (!open) return;
    node.links.forEach((l) => {
      const target = tour.nodes.find((n) => n.id === l.to);
      if (target) {
        const im = new window.Image();
        im.src = target.image;
      }
    });
  }, [open, node, tour]);

  /* Plein écran natif quand le navigateur le permet. */
  useEffect(() => {
    setCanFullscreen(
      typeof document !== "undefined" &&
        !!document.documentElement.requestFullscreen
    );
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen().catch(() => undefined);
    }
  }, []);

  const enterVariants = variantsFor(dir, !!reduced);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={containerRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Visite immersive — ${tour.unitName}`}
          className="fixed inset-0 z-[96] overflow-hidden bg-ink"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Ambiance : la photo courante floutée remplit l'écran */}
          <AnimatePresence mode="sync">
            <motion.div
              key={`bg-${node.id}`}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              aria-hidden
            >
              <Image
                src={node.image}
                alt=""
                fill
                unoptimized
                sizes="100vw"
                className="scale-125 object-cover opacity-45 blur-2xl"
              />
            </motion.div>
          </AnimatePresence>
          <div className="absolute inset-0 bg-ink/30" aria-hidden />

          {/* Photo de la pièce + flèches de déplacement */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="relative aspect-[9/16] w-[min(100vw,calc(100svh*0.5625))]"
              style={{ maxHeight: "100svh" }}
            >
              <AnimatePresence mode="sync" initial={false}>
                <motion.div
                  key={node.id}
                  className="absolute inset-0"
                  initial={enterVariants.initial}
                  animate={enterVariants.animate}
                  exit={enterVariants.exit}
                  transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Image
                    src={node.image}
                    alt={node.caption ?? node.name}
                    fill
                    unoptimized
                    priority
                    sizes="(min-width: 1024px) 60vw, 100vw"
                    className="rounded-none object-contain"
                    onLoad={() => setFirstLoaded(true)}
                  />

                  {/* Flèches de navigation posées dans la photo */}
                  {node.links.map((link) => {
                    const target = tour.nodes.find((n) => n.id === link.to);
                    const Icon = DIR_ICON[link.dir];
                    return (
                      <span
                        key={`${node.id}-${link.to}`}
                        className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${link.x}%`, top: `${link.y}%` }}
                      >
                      <motion.button
                        type="button"
                        onClick={() => goTo(link.to, link.dir)}
                        aria-label={link.label ?? `Aller : ${target?.name}`}
                        data-cursor="Aller"
                        data-testid={`arrow-${node.id}-${link.to}`}
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          delay: reduced ? 0 : 0.45,
                          duration: 0.5,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        className="group flex flex-col items-center gap-1.5"
                      >
                        <span className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-white/25 text-bone shadow-lg backdrop-blur-md transition-all duration-300 ease-out-expo group-hover:scale-110 group-hover:bg-brass group-hover:text-ivory group-focus-visible:bg-brass sm:h-12 sm:w-12">
                          {!reduced && (
                            <motion.span
                              className="absolute inset-0 rounded-full border border-white/50"
                              animate={{ scale: [1, 1.45], opacity: [0.7, 0] }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeOut",
                              }}
                              aria-hidden
                            />
                          )}
                          <Icon className="h-5 w-5" aria-hidden />
                        </span>
                        <span className="whitespace-nowrap rounded-full bg-ink/70 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-bone backdrop-blur-sm transition-colors duration-300 group-hover:bg-ink/90">
                          {link.label ?? target?.name}
                        </span>
                      </motion.button>
                      </span>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Voile de chargement initial */}
          <AnimatePresence>
            {!firstLoaded && (
              <motion.div
                className="absolute inset-0 z-20 flex items-center justify-center bg-ink"
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                aria-hidden
              >
                <div className="glass-dark flex flex-col items-center gap-4 rounded-3xl px-10 py-8">
                  <motion.span
                    className="block h-8 w-8 rounded-full border-2 border-bone/20 border-t-brass"
                    animate={reduced ? undefined : { rotate: 360 }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                  />
                  <p className="text-[11px] uppercase tracking-[0.3em] text-bone/60">
                    Visite en préparation
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bandeau supérieur */}
          <div className="absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-ink/60 to-transparent pb-10">
            <div className="flex items-start justify-between gap-3 p-4 sm:p-5">
              <div className="glass-dark rounded-2xl px-4 py-2.5 sm:px-5">
                <p className="text-[9px] uppercase tracking-[0.25em] text-bone/50 sm:text-[10px]">
                  Visite immersive — {tour.unitName}
                </p>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={node.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.35 }}
                    className="font-display mt-0.5 text-lg leading-tight text-bone sm:text-xl"
                  >
                    {node.name}
                  </motion.p>
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPlanOpen((v) => !v)}
                  aria-label={planOpen ? "Masquer le plan" : "Afficher le plan"}
                  aria-pressed={planOpen}
                  className={`rounded-full border p-3 backdrop-blur-md transition-all duration-300 lg:hidden ${
                    planOpen
                      ? "border-brass bg-brass text-ivory"
                      : "border-white/30 bg-white/15 text-bone hover:border-brass hover:text-brass"
                  }`}
                >
                  <MapIcon className="h-4 w-4" aria-hidden />
                </button>
                {canFullscreen && (
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    aria-label={
                      isFullscreen ? "Quitter le plein écran" : "Plein écran"
                    }
                    className="hidden rounded-full border border-white/30 bg-white/15 p-3 text-bone backdrop-blur-md transition-all duration-300 hover:border-brass hover:text-brass sm:block"
                  >
                    {isFullscreen ? (
                      <Minimize2 className="h-4 w-4" aria-hidden />
                    ) : (
                      <Maximize2 className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                )}
                <button
                  ref={closeRef}
                  type="button"
                  onClick={onClose}
                  aria-label="Fermer la visite"
                  className="rounded-full border border-white/30 bg-white/15 p-3 text-bone backdrop-blur-md transition-all duration-300 hover:border-brass hover:bg-brass hover:text-ivory"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
          </div>

          {/* Légende de la pièce */}
          {node.caption && (
            <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 hidden justify-center px-4 sm:flex">
              <AnimatePresence mode="wait">
                <motion.p
                  key={node.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="glass-dark max-w-md rounded-full px-5 py-2 text-center text-xs text-bone/80"
                >
                  {node.caption}
                </motion.p>
              </AnimatePresence>
            </div>
          )}

          {/* Mini-plan : fixe sur desktop, panneau togglable sur mobile */}
          <div className="absolute bottom-4 right-4 z-30 hidden lg:block">
            <TourPlan tour={tour} currentId={node.id} onSelect={(id) => goTo(id)} />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center lg:hidden">
            <AnimatePresence>
              {planOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 24 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="pointer-events-auto"
                >
                  <TourPlan
                    tour={tour}
                    currentId={node.id}
                    onSelect={(id) => {
                      goTo(id);
                      setPlanOpen(false);
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
