"use client";

import { usePathname } from "next/navigation";

/**
 * L'en-tête, le pied de page et la section contact sont les MÊMES sur les trois
 * pages — c'est ce qui fait qu'elles ont l'air de sortir du même site.
 *
 * Ce filtre ne masque donc plus l'habillage : il ne retire, sur la page de
 * visite au défilement, que ce qui entrerait en conflit avec son moteur —
 * le défilement fluide partagé (elle crée sa propre instance Lenis), le
 * curseur personnalisé et le grain animé, tous deux proscrits pendant un scrub
 * image par image.
 */
const SANS_EFFETS = ["/appartement"];

export default function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (SANS_EFFETS.includes(pathname ?? "")) return null;
  return <>{children}</>;
}
