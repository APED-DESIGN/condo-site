"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { Map, X } from "lucide-react";
import TourMiniMap from "./TourMiniMap";
import type { Node360, Tour360Data } from "@/data/tours/maison-01";
import type { Tour360Api } from "./Tour360";

const Tour360 = dynamic(() => import("./Tour360"), {
  ssr: false,
  loading: () => <ViewerLoader />,
});

function ViewerLoader() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="glass-dark flex flex-col items-center gap-4 rounded-3xl px-10 py-8">
        <span className="relative flex h-10 w-10">
          <span className="absolute inset-0 animate-ping rounded-full bg-brass/30" />
          <span className="m-auto h-3 w-3 rounded-full bg-brass" />
        </span>
        <p className="text-[11px] uppercase tracking-[0.25em] text-bone/70">
          Préparation de la visite…
        </p>
      </div>
    </div>
  );
}

type Props = {
  tour: Tour360Data;
  open: boolean;
  onClose: () => void;
};

/** Modale plein écran de la visite virtuelle 360°. */
export default function TourModal({ tour, open, onClose }: Props) {
  const [node, setNode] = useState<Node360 | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [hintVisible, setHintVisible] = useState(true);
  const [webglError, setWebglError] = useState(false);
  const apiRef = useRef<Tour360Api | null>(null);

  /* Verrouillage du défilement + Échap. */
  useEffect(() => {
    if (!open) return;
    window.__lenis?.stop();
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.fullscreenElement) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.__lenis?.start();
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  /* L'indice de navigation disparaît à la première interaction. */
  useEffect(() => {
    if (!open) {
      setHintVisible(true);
      setNode(null);
      setWebglError(false);
      setPlanOpen(false);
      return;
    }
    const dismiss = () => setHintVisible(false);
    window.addEventListener("pointerdown", dismiss, { once: true, capture: true });
    return () => window.removeEventListener("pointerdown", dismiss, { capture: true });
  }, [open]);

  const handleReady = useCallback((api: Tour360Api) => {
    apiRef.current = api;
  }, []);
  const handleNodeChange = useCallback((n: Node360) => setNode(n), []);
  const handleWebglError = useCallback(() => setWebglError(true), []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[96] bg-ink"
          role="dialog"
          aria-modal="true"
          aria-label={`Visite virtuelle 360° — ${tour.title}`}
        >
          {webglError ? (
            <div className="flex h-full items-center justify-center px-6">
              <div className="glass-dark max-w-md rounded-3xl p-8 text-center">
                <p className="font-display text-2xl text-bone">
                  Visite 360° indisponible
                </p>
                <p className="mt-3 text-sm leading-relaxed text-bone/60">
                  Votre navigateur ne supporte pas WebGL. Consultez plutôt la
                  galerie photos de la fiche — ou réessayez avec un navigateur
                  récent.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="link-underline mt-6 text-sm text-brass"
                >
                  Retour à la fiche
                </button>
              </div>
            </div>
          ) : (
            <Tour360
              tour={tour}
              startNodeId={tour.startNodeId}
              onNodeChange={handleNodeChange}
              onReady={handleReady}
              onWebglError={handleWebglError}
            />
          )}

          {/* Nom de la pièce */}
          <div className="pointer-events-none absolute left-4 top-4 z-20 sm:left-5 sm:top-5">
            <div className="glass-dark rounded-2xl px-5 py-3.5">
              <p className="text-[9px] uppercase tracking-[0.28em] text-bone/50">
                Visite virtuelle 360° — {tour.title}
              </p>
              <AnimatePresence mode="wait">
                <motion.p
                  key={node?.id ?? "…"}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="font-display mt-0.5 text-xl text-bone"
                  data-testid="room360-name"
                >
                  {node?.name ?? "Chargement…"}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          {/* Commandes haut-droite */}
          <div className="absolute right-4 top-4 z-20 flex items-center gap-2 sm:right-5 sm:top-5">
            <button
              type="button"
              onClick={() => setPlanOpen((v) => !v)}
              aria-label={planOpen ? "Masquer le plan" : "Afficher le plan"}
              aria-pressed={planOpen}
              className={`rounded-full p-3 backdrop-blur-md transition-colors duration-300 lg:hidden ${
                planOpen ? "bg-brass text-ivory" : "bg-ink/60 text-bone hover:bg-ink/80"
              }`}
            >
              <Map className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer la visite"
              data-testid="close360"
              className="rounded-full border border-white/15 bg-ink/60 p-3 text-bone backdrop-blur-md transition-colors duration-300 hover:border-brass hover:text-brass"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          {/* Indice de première utilisation */}
          <AnimatePresence>
            {hintVisible && node && !webglError && (
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="pointer-events-none absolute inset-x-0 top-24 z-20 mx-auto w-max max-w-[90%] rounded-full bg-ink/70 px-5 py-2.5 text-center text-[11px] uppercase tracking-[0.18em] text-bone/85 backdrop-blur-md"
              >
                Glissez pour regarder autour • Cliquez les flèches pour avancer
              </motion.p>
            )}
          </AnimatePresence>

          {/* Mini-plan desktop (toujours visible) */}
          {node && !webglError && (
            <div className="absolute bottom-16 right-5 z-20 hidden lg:block">
              <TourMiniMap
                tour={tour}
                currentId={node.id}
                onSelect={(id) => apiRef.current?.goTo(id)}
              />
            </div>
          )}

          {/* Mini-plan mobile (replié par défaut) */}
          <div className="pointer-events-none absolute inset-x-0 bottom-16 z-20 flex justify-center lg:hidden">
            <AnimatePresence>
              {planOpen && node && !webglError && (
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 24 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="pointer-events-auto"
                >
                  <TourMiniMap
                    tour={tour}
                    currentId={node.id}
                    onSelect={(id) => {
                      apiRef.current?.goTo(id);
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
