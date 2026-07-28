"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { Box, Footprints, LayoutGrid, Map, X } from "lucide-react";
import TourMiniMap from "@/components/tour/TourMiniMap";
import { mention } from "@/lib/maison3d/mobilier-donnees";
import type { Niveau } from "@/data/tours/maison-01-plan";
import type { Node360, Tour360Data } from "@/data/tours/maison-01";
import type { Tour360Api } from "@/components/tour/Tour360";
import type { ScenePlanApi, SurvolInfo } from "./ScenePlan";

const ScenePlan = dynamic(() => import("./ScenePlan"), {
  ssr: false,
  loading: () => <Silhouette />,
});
const Tour360 = dynamic(() => import("@/components/tour/Tour360"), { ssr: false });

export type Mode = "carto" | "plan" | "visite";

const MODES: { id: Mode; libelle: string; touche: string; Icone: typeof Box }[] = [
  { id: "carto", libelle: "Cartographie", touche: "1", Icone: Box },
  { id: "plan", libelle: "Plan", touche: "2", Icone: LayoutGrid },
  { id: "visite", libelle: "Visite", touche: "3", Icone: Footprints },
];

const NIVEAUX: { id: Niveau | "tous"; libelle: string }[] = [
  { id: "tous", libelle: "Tout" },
  { id: "etage", libelle: "Étage" },
  { id: "rdc", libelle: "Rez-de-chaussée" },
];

/** Écran d'attente : jamais de noir, une silhouette du volume qui pulse. */
function Silhouette() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        <svg
          viewBox="0 0 120 90"
          className="h-24 w-32 animate-pulse text-brume/35"
          aria-hidden
        >
          <path
            d="M14 62 L60 34 L106 62 L106 78 L14 78 Z"
            fill="currentColor"
            opacity="0.5"
          />
          <path d="M14 62 L60 34 L106 62" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M38 78 L38 52 M82 78 L82 52" stroke="currentColor" strokeWidth="1.2" />
        </svg>
        <p className="text-[10px] uppercase tracking-[0.28em] text-bone/45">
          Construction du volume…
        </p>
      </div>
    </div>
  );
}

type Props = {
  tour: Tour360Data;
  ouvert: boolean;
  onFermer: () => void;
  /** Mode d'entrée. Le lien profond ?visite=1 ouvre directement la visite. */
  modeInitial?: Mode;
};

export default function VisualiseurMaison({
  tour,
  ouvert,
  onFermer,
  modeInitial = "carto",
}: Props) {
  const [mode, setMode] = useState<Mode>(modeInitial);
  const [niveau, setNiveau] = useState<Niveau | "tous">("tous");
  const [survol, setSurvol] = useState<SurvolInfo>(null);
  const [noeudVisite, setNoeudVisite] = useState<string>(tour.startNodeId);
  /* La visite n'est montée qu'au premier passage, puis gardée : revenir doit
     être instantané, et remonter PSV coûte un contexte WebGL. */
  const [visiteMontee, setVisiteMontee] = useState(modeInitial === "visite");
  const [planOuvert, setPlanOuvert] = useState(false);
  const [noeudCourant, setNoeudCourant] = useState<Node360 | null>(null);
  const [webglError, setWebglError] = useState(false);
  const [reduit, setReduit] = useState(false);

  const sceneApi = useRef<ScenePlanApi | null>(null);
  const tourApi = useRef<Tour360Api | null>(null);

  useEffect(() => {
    setReduit(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  /* Verrouillage du défilement pendant que le visualiseur est ouvert. */
  useEffect(() => {
    if (!ouvert) return;
    window.__lenis?.stop();
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.__lenis?.start();
      document.documentElement.style.overflow = "";
    };
  }, [ouvert]);

  /* Remise à zéro à la fermeture. */
  /* Le mode d'entrée s'applique à l'OUVERTURE, pas au montage : le composant
     est monté dès le rendu de la page, bien avant que le lien profond ne soit
     lu, donc un `useState(modeInitial)` resterait bloqué sur « carto ».
     Les dépendances excluent `mode` : rouvrir réinitialise, changer de mode
     en cours de route ne doit rien réinitialiser. */
  useEffect(() => {
    setMode(modeInitial);
    setVisiteMontee(modeInitial === "visite");
    setNiveau("tous");
    setSurvol(null);
    setNoeudCourant(null);
    setWebglError(false);
    setPlanOuvert(false);
  }, [ouvert, modeInitial]);

  /** Entrer dans la visite depuis la carto ou le plan, via le nœud visé. */
  const entrerDansLaVisite = useCallback(
    async (noeudId: string) => {
      setNoeudVisite(noeudId);
      /* La caméra plonge d'abord vers le point : c'est ce mouvement qui
         raccorde le volume à la visite. Puis on fond vers le panorama. */
      await sceneApi.current?.plongerVersNoeud(noeudId).catch(() => {});
      setVisiteMontee(true);
      setMode("visite");
      tourApi.current?.goTo(noeudId);
    },
    []
  );

  const allerAuMode = useCallback(
    (cible: Mode) => {
      if (cible === mode) return;
      if (cible === "visite") {
        const depart = noeudCourant?.id ?? noeudVisite;
        void entrerDansLaVisite(depart);
        return;
      }
      setSurvol(null);
      setMode(cible);
    },
    [mode, noeudCourant, noeudVisite, entrerDansLaVisite]
  );

  /* ── Clavier ──────────────────────────────────────────────────────────
     1/2/3 pour les modes, Échap pour remonter d'un cran puis fermer. Les
     flèches sont laissées aux contrôles de chaque mode (orbite en carto,
     rotation du panorama en visite). */
  useEffect(() => {
    if (!ouvert) return;
    const surTouche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null;
      if (cible && /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName)) return;

      if (e.key === "1") return allerAuMode("carto");
      if (e.key === "2") return allerAuMode("plan");
      if (e.key === "3") return allerAuMode("visite");
      if (e.key === "Escape") {
        if (document.fullscreenElement) return;
        if (mode === "visite") return setMode("plan");
        if (mode === "plan") return setMode("carto");
        return onFermer();
      }
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [ouvert, mode, allerAuMode, onFermer]);

  const enVolume = mode === "carto" || mode === "plan";

  return (
    <AnimatePresence>
      {ouvert && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduit ? 0 : 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[96] bg-nuit"
          role="dialog"
          aria-modal="true"
          aria-label={`Visualiseur — ${tour.title}`}
          data-testid="visualiseur"
          data-mode={mode}
          data-niveau={niveau}
        >
          {/* ── Couche volume (modes 1 et 2) ─────────────────────────── */}
          <div
            className="absolute inset-0 transition-opacity duration-500 ease-out-expo"
            style={{
              opacity: enVolume ? 1 : 0,
              pointerEvents: enVolume ? "auto" : "none",
            }}
            aria-hidden={!enVolume}
          >
            <ScenePlan
              actif={ouvert}
              mode={mode === "plan" ? "plan" : "carto"}
              niveau={niveau}
              reduit={reduit}
              onSurvol={setSurvol}
              onEntrer={entrerDansLaVisite}
              onPret={() => {}}
              apiRef={sceneApi}
            />
          </div>

          {/* ── Couche visite (mode 3, l'existant réutilisé tel quel) ── */}
          {visiteMontee && !webglError && (
            <div
              className="absolute inset-0 transition-opacity duration-500 ease-out-expo"
              style={{
                opacity: mode === "visite" ? 1 : 0,
                pointerEvents: mode === "visite" ? "auto" : "none",
              }}
              aria-hidden={mode !== "visite"}
            >
              <Tour360
                tour={tour}
                startNodeId={noeudVisite}
                onNodeChange={setNoeudCourant}
                onReady={(api) => {
                  tourApi.current = api;
                  api.goTo(noeudVisite);
                }}
                onWebglError={() => setWebglError(true)}
              />
            </div>
          )}

          {/* ── Étiquette de survol ──────────────────────────────────── */}
          {enVolume && survol && (
            <div
              className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-[150%] whitespace-nowrap rounded-full bg-nuit/85 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-chaux backdrop-blur-md"
              style={{ left: survol.x, top: survol.y }}
            >
              {survol.nom}
            </div>
          )}

          {/* ── Titre et pièce courante ──────────────────────────────────
              En visite, on s'écarte de la boussole de Photo Sphere Viewer, qui
              occupe le coin haut-gauche. */}
          <div
            className={`pointer-events-none absolute top-4 z-20 sm:top-5 ${
              mode === "visite" ? "left-4 sm:left-28" : "left-4 sm:left-5"
            }`}
          >
            <div className="glass-dark rounded-2xl px-5 py-3.5">
              <p className="text-[9px] uppercase tracking-[0.28em] text-chaux/50">
                {tour.title}
              </p>
              <p
                className="font-display mt-0.5 text-xl text-chaux"
                data-testid="visualiseur-titre"
              >
                {mode === "visite"
                  ? (noeudCourant?.name ?? "Chargement…")
                  : (MODES.find((m) => m.id === mode)?.libelle ?? "")}
              </p>
              {/* Le nom de la pièce garde son propre repère de test : c'est le
                  contrat que suit déjà scripts/test-360.mjs. */}
              {mode === "visite" && (
                <span className="sr-only" data-testid="room360-name">
                  {noeudCourant?.name ?? "Chargement…"}
                </span>
              )}
            </div>
          </div>

          {/* ── Commandes haut-droite ────────────────────────────────── */}
          <div className="absolute right-4 top-4 z-30 flex items-center gap-2 sm:right-5 sm:top-5">
            {mode === "visite" && (
              <button
                type="button"
                onClick={() => setPlanOuvert((v) => !v)}
                aria-label={planOuvert ? "Masquer le plan" : "Afficher le plan"}
                aria-pressed={planOuvert}
                className={`rounded-full p-3 backdrop-blur-md transition-colors duration-300 lg:hidden ${
                  planOuvert ? "bg-cuivre text-nuit" : "bg-nuit/60 text-chaux hover:bg-nuit/80"
                }`}
              >
                <Map className="h-5 w-5" aria-hidden />
              </button>
            )}
            <button
              type="button"
              onClick={onFermer}
              aria-label="Fermer le visualiseur"
              data-testid="fermer-visualiseur"
              className="rounded-full border border-white/15 bg-nuit/60 p-3 text-chaux backdrop-blur-md transition-colors duration-300 hover:border-cuivre hover:text-cuivre"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          {/* ── Mini-plan « vous êtes ici », en visite ────────────────
              Repris tel quel de la visite existante : suivi de position,
              sélecteur de zone et téléportation au clic. */}
          {mode === "visite" && noeudCourant && !webglError && (
            <>
              <div className="absolute bottom-16 right-5 z-20 hidden lg:block">
                <TourMiniMap
                  tour={tour}
                  currentId={noeudCourant.id}
                  onSelect={(id) => tourApi.current?.goTo(id)}
                />
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-16 z-20 flex justify-center lg:hidden">
                <AnimatePresence>
                  {planOuvert && (
                    <motion.div
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 24 }}
                      transition={{ duration: reduit ? 0 : 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="pointer-events-auto"
                    >
                      <TourMiniMap
                        tour={tour}
                        currentId={noeudCourant.id}
                        onSelect={(id) => {
                          tourApi.current?.goTo(id);
                          setPlanOuvert(false);
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}

          {/* ── Sélecteur de niveau — colonne à droite ────────────────
              Volontairement à l'opposé de la barre de modes, et en colonne :
              deux commandes de nature différente ne se rangent pas ensemble. */}
          {enVolume && (
            <div
              className="absolute right-4 top-1/2 z-30 -translate-y-1/2 sm:right-5"
              role="radiogroup"
              aria-label="Niveau affiché"
            >
              <div className="glass-dark flex flex-col gap-1 rounded-2xl p-1.5">
                {NIVEAUX.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    role="radio"
                    aria-checked={niveau === n.id}
                    data-testid={`niveau-${n.id}`}
                    onClick={() => setNiveau(n.id)}
                    className={`rounded-xl px-3 py-2 text-[9px] uppercase tracking-[0.16em] transition-colors duration-300 ${
                      niveau === n.id
                        ? "bg-cuivre text-nuit"
                        : "text-chaux/60 hover:bg-white/10 hover:text-chaux"
                    }`}
                  >
                    {n.libelle}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Barre de modes — colonne en bas à gauche, avec libellés ─
              Trois entrées, pas quatre : le mode « mesures » n'existe pas,
              faute d'échelle métrique (voir analyse/inventaire-3d.md §7). */}
          <nav
            className={`absolute left-4 z-30 sm:left-5 ${
              /* En visite, la barre d'outils de PSV occupe le bas de l'écran. */
              mode === "visite" ? "bottom-16" : "bottom-4 sm:bottom-5"
            }`}
            aria-label="Mode d'affichage"
          >
            <div className="glass-dark flex flex-col gap-1 rounded-2xl p-1.5">
              {MODES.map(({ id, libelle, touche, Icone }) => {
                const actif = mode === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => allerAuMode(id)}
                    aria-pressed={actif}
                    aria-keyshortcuts={touche}
                    data-testid={`mode-${id}`}
                    className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-300 ${
                      actif ? "bg-cuivre text-nuit" : "text-chaux/70 hover:bg-white/10 hover:text-chaux"
                    }`}
                  >
                    <Icone className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="text-[10px] uppercase tracking-[0.18em]">{libelle}</span>
                    <span
                      className={`ml-auto hidden rounded px-1.5 py-0.5 font-mono text-[9px] sm:block ${
                        actif ? "bg-nuit/25 text-nuit" : "bg-white/10 text-chaux/50"
                      }`}
                      aria-hidden
                    >
                      {touche}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* ── Mention d'honnêteté, toujours visible en volume ─────────
              Elle n'est pas écrite en dur : elle compte les volumes mesurés
              contre les volumes estimés. Quand les relevés arriveront, elle
              changera d'elle-même — elle ne peut mentir dans aucun sens. */}
          {enVolume && (
            <p
              className="pointer-events-none absolute bottom-5 left-1/2 z-20 hidden -translate-x-1/2 text-center text-[9px] uppercase tracking-[0.2em] text-chaux/35 md:block"
              data-testid="mention-echelle"
            >
              {mention()}
            </p>
          )}

          {webglError && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-nuit px-6">
              <div className="glass-dark max-w-md rounded-3xl p-8 text-center">
                <p className="font-display text-2xl text-chaux">Visite indisponible</p>
                <p className="mt-3 text-sm leading-relaxed text-chaux/60">
                  Votre navigateur ne supporte pas WebGL. Consultez plutôt la galerie
                  photos de la fiche — ou réessayez avec un navigateur récent.
                </p>
                <button
                  type="button"
                  onClick={onFermer}
                  className="link-underline mt-6 text-sm text-cuivre"
                >
                  Retour à la fiche
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
