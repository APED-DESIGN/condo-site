import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { AppProvider } from "@/components/providers/AppProvider";
import SmoothScroll from "@/components/providers/SmoothScroll";
import ChromeGate from "@/components/providers/ChromeGate";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CustomCursor from "@/components/CustomCursor";
import Grain from "@/components/Grain";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

const satoshi = localFont({
  src: "../public/fonts/Satoshi-Variable.woff2",
  variable: "--font-satoshi",
  weight: "300 900",
  display: "swap",
});

/* Aucun nom de client, d'agence ou de projet : ce site est montré à plusieurs
   prospects, le même lien doit servir à tout le monde. */
export const metadata: Metadata = {
  /* Aucun domaine n'est codé en dur : sur Vercel il vient de l'environnement,
     en local il retombe sur localhost. Sans cette base, Next avertit à chaque
     build qu'il ne peut pas résoudre les images de partage. */
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  ),
  title: {
    default: "Deux façons de faire visiter une propriété en ligne",
    template: "%s",
  },
  description:
    "Une visite 360° où l'acheteur se déplace librement de pièce en pièce, et une visite au défilement où la caméra avance au scroll et s'arrête pour expliquer chaque pièce.",
  openGraph: {
    title: "Deux façons de faire visiter une propriété en ligne",
    description:
      "Visite 360° ou visite au défilement — voyez les deux approches sur de vraies propriétés.",
    locale: "fr_CA",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${fraunces.variable} ${satoshi.variable}`}>
      <body>
        <AppProvider>
          <a
            href="#contenu"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[120] focus:rounded-full focus:bg-ink focus:px-5 focus:py-2.5 focus:text-sm focus:text-bone"
          >
            Aller au contenu
          </a>
          <ChromeGate>
            <SmoothScroll />
          </ChromeGate>
          <Navbar />
          {children}
          <Footer />
          <ChromeGate>
            <CustomCursor />
            <Grain />
          </ChromeGate>
        </AppProvider>
      </body>
    </html>
  );
}
