import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getNextUnit, getUnit, units } from "@/lib/units";
import { tours360, validateTour } from "@/data/tours/maison-01";
import UnitClient from "./UnitClient";

/* Le graphe des visites 360° est validé au build : lien non réciproque,
   nœud inconnu ou étage invalide = échec de `next build`. */
Object.values(tours360).forEach(validateTour);

export function generateStaticParams() {
  return units.map((u) => ({ slug: u.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const unit = getUnit(params.slug);
  if (!unit) return {};
  return {
    title: `${unit.name} — ${unit.monthlyPrice}`,
    description: unit.excerpt,
    openGraph: {
      title: `${unit.name} — RÉSIDENCES BORÉAL`,
      description: unit.excerpt,
      images: [{ url: unit.cover, width: 1200, height: 800, alt: unit.coverAlt }],
    },
  };
}

export default function UnitPage({ params }: { params: { slug: string } }) {
  const unit = getUnit(params.slug);
  if (!unit) notFound();
  const next = getNextUnit(params.slug);

  return (
    <main id="contenu">
      <UnitClient unit={unit} next={next} />
    </main>
  );
}
