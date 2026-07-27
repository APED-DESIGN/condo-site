import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BLUR_DATA_URL } from "@/lib/images";

/**
 * Renvoi croisé d'une propriété vers l'autre, juste avant le pied de page.
 *
 * Sans lui, un prospect regarde une seule des deux approches et ferme l'onglet.
 * Reprend exactement le bloc « unité suivante » qui existait déjà : même
 * hauteur, même voile, même flèche, même animation au survol.
 */
export default function AutreApproche({
  href,
  surTitre,
  titre,
  image,
  imageAlt,
}: {
  href: string;
  surTitre: string;
  titre: string;
  image: string;
  imageAlt: string;
}) {
  return (
    <Link
      href={href}
      data-cursor="Voir"
      className="group relative block h-[55vh] min-h-[380px] overflow-hidden bg-ink"
    >
      <Image
        src={image}
        alt={imageAlt}
        fill
        sizes="100vw"
        className="object-cover opacity-40 transition-all duration-700 ease-out-expo group-hover:scale-105 group-hover:opacity-55"
        placeholder="blur"
        blurDataURL={BLUR_DATA_URL}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-bone">
        <p className="text-[11px] uppercase tracking-[0.3em] text-bone/60">{surTitre}</p>
        <p className="font-display mt-4 max-w-3xl text-[clamp(2.2rem,6vw,4.5rem)] leading-none tracking-tight">
          {titre}
        </p>
        <ArrowRight
          className="mt-6 h-6 w-6 text-brass transition-transform duration-500 group-hover:translate-x-2"
          aria-hidden
        />
      </div>
    </Link>
  );
}
