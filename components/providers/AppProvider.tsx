"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";

type AppState = {
  /** Passe à true quand le preloader a terminé — déclenche les révélations du hero. */
  ready: boolean;
  setReady: (v: boolean) => void;
};

const AppContext = createContext<AppState>({ ready: false, setReady: () => {} });

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  return (
    <AppContext.Provider value={{ ready, setReady }}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
