import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getUnit } from "@/lib/units";
import { tours360, validateTour } from "@/data/tours/maison-01";
import MaisonClient from "./MaisonClient";
import Contact from "@/components/sections/Contact";
import AutreApproche from "@/components/AutreApproche";

/* Le graphe de la visite 360° est validé au build : lien non réciproque,
   nœud inconnu ou étage invalide = échec de `next build`. */
Object.values(tours360).forEach(validateTour);

/** Une seule propriété est exposée : la page a une adresse fixe, pas un slug. */
const SLUG = "maison-panoramique";

export function generateMetadata(): Metadata {
  const unit = getUnit(SLUG);
  if (!unit) return {};
  return {
    title: `${unit.name} — visite 360°`,
    description: unit.excerpt,
    openGraph: {
      title: unit.name,
      description: unit.excerpt,
      locale: "fr_CA",
      type: "website",
      images: [{ url: unit.cover, width: 1200, height: 800, alt: unit.coverAlt }],
    },
  };
}

export default function MaisonPage() {
  const unit = getUnit(SLUG);
  if (!unit) notFound();

  return (
    <main id="contenu">
      <MaisonClient unit={unit} />

      <Contact source="maison" />

      <AutreApproche
        href="/appartement"
        surTitre="L'autre approche"
        titre="L'appartement, en visite au défilement"
        image="/frames/5-et-demi-deux-niveaux/arrets/cuisine.webp"
        imageAlt="Cuisine ouverte de l'appartement : îlot central et armoires blanches"
      />
    </main>
  );
}
