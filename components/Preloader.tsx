"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "./providers/AppProvider";
import { gsap } from "@/lib/gsap";

/**
 * Écran d'introduction : compteur 0 → 100 puis rideau qui se lève.
 * Rejoué une seule fois par session (sessionStorage).
 */
export default function Preloader() {
  const { setReady } = useApp();
  const [count, setCount] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const visited = sessionStorage.getItem("deja-visite");

    if (visited || reduced) {
      setVisible(false);
      setReady(true);
      return;
    }

    document.documentElement.style.overflow = "hidden";
    const state = { v: 0 };
    const tween = gsap.to(state, {
      v: 100,
      duration: 2.1,
      ease: "power2.inOut",
      onUpdate: () => setCount(Math.round(state.v)),
      onComplete: () => {
        sessionStorage.setItem("deja-visite", "1");
        document.documentElement.style.overflow = "";
        setVisible(false);
        setReady(true);
      },
    });

    return () => {
      tween.kill();
      document.documentElement.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          aria-hidden
          className="fixed inset-0 z-[100] flex flex-col justify-between bg-ink px-6 pb-10 pt-8 sm:px-10"
          exit={{ y: "-100%" }}
          transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
        >
          <p className="text-[11px] uppercase tracking-[0.3em] text-bone/40">
            Deux approches de visite en ligne
          </p>

          <div className="flex items-end justify-between gap-6">
            {/* Marque neutre : aucun nom de client ni d'agence sur ce site. */}
            <span aria-hidden className="flex items-center gap-2">
              <span className="block h-5 w-5 rounded-[4px] border border-bone/70 sm:h-7 sm:w-7" />
              <span className="block h-5 w-5 rounded-full bg-brass sm:h-7 sm:w-7" />
            </span>
            <p className="font-display text-7xl leading-none text-bone tabular-nums sm:text-9xl">
              {count}
              <span className="text-brass">%</span>
            </p>
          </div>

          <div
            className="absolute bottom-0 left-0 h-0.5 bg-brass transition-[width] duration-150 ease-linear"
            style={{ width: `${count}%` }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
