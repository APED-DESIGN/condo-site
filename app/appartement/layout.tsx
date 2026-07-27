import { IBM_Plex_Mono, Inter_Tight } from "next/font/google";

/*
 * Les fontes de la page de propriété sont chargées ici, pas dans le layout
 * racine : les deux autres pages gardent Satoshi, et ces deux familles ne sont
 * téléchargées que sur la page qui s'en sert.
 */
const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  weight: ["300", "400", "500"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500"],
  display: "swap",
});

export default function AppartementLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${interTight.variable} ${plexMono.variable} bg-nuit`}>{children}</div>;
}
