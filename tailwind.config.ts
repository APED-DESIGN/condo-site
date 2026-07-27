import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bone: "#F4EFE7",
        ivory: "#FAF8F3",
        ink: "#1C1A17",
        greige: "#A79E90",
        umber: "#6B655C",
        brass: {
          DEFAULT: "#B08D57",
          dark: "#96754A",
        },

        /* Palette des pages de propriété. Distincte de celle du reste du site :
           les deux cohabitent, aucune n'écrase l'autre. */
        nuit: "#0C0F12",
        ardoise: "#171C21",
        chaux: "#F1EDE6",
        brume: "#98A1A8",
        patine: "#7C8C82",
        cuivre: {
          DEFAULT: "#B4713F",
          clair: "#C98A57",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-satoshi)", "system-ui", "sans-serif"],
        tight: ["var(--font-inter-tight)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        /* Rétraction du cadre de la visite. Même courbe des deux côtés. */
        cadre: "cubic-bezier(0.65, 0, 0.35, 1)",
      },
      keyframes: {
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
      },
      animation: {
        marquee: "marquee var(--marquee-duration, 40s) linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
