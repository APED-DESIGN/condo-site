import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { AppProvider } from "@/components/providers/AppProvider";
import SmoothScroll from "@/components/providers/SmoothScroll";
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

export const metadata: Metadata = {
  metadataBase: new URL("https://residences-boreal.example.com"),
  title: {
    default: "RÉSIDENCES BORÉAL — Condos à louer à Trois-Rivières",
    template: "%s — RÉSIDENCES BORÉAL",
  },
  description:
    "Condos locatifs haut de gamme à Trois-Rivières. Visitez chaque unité en ligne, pièce par pièce, avant de réserver votre visite en personne. Du 3½ au cottage 5½.",
  openGraph: {
    title: "RÉSIDENCES BORÉAL — Condos à louer à Trois-Rivières",
    description:
      "Visitez votre prochain chez-vous sans vous déplacer : visite immersive pièce par pièce, vraies photos, vrais prix.",
    locale: "fr_CA",
    type: "website",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "Aire ouverte d'un cottage des Résidences Boréal",
      },
    ],
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
          <SmoothScroll />
          <Navbar />
          {children}
          <Footer />
          <CustomCursor />
          <Grain />
        </AppProvider>
      </body>
    </html>
  );
}
