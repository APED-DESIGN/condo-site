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
  metadataBase: new URL("https://studio-norden.example.com"),
  title: {
    default: "STUDIO NORDEN — Design intérieur à Québec",
    template: "%s — STUDIO NORDEN",
  },
  description:
    "Studio de design intérieur haut de gamme à Québec. Résidentiel et commercial, du concept à l'installation : des espaces calmes, précis et durables.",
  openGraph: {
    title: "STUDIO NORDEN — Design intérieur à Québec",
    description:
      "Studio de design intérieur haut de gamme à Québec. Des espaces calmes, précis et durables.",
    locale: "fr_CA",
    type: "website",
    images: [
      {
        url: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
        width: 1200,
        height: 630,
        alt: "Intérieur signé STUDIO NORDEN",
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
