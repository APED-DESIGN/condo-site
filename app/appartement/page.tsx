import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import VisiteClient, { type PanneauTexte } from "./VisiteClient";
import Accueil from "@/components/visite/Accueil";
import Fiche from "@/components/visite/Fiche";
import Galerie, { type Vignette } from "@/components/visite/Galerie";
import PlanGrand from "@/components/visite/PlanGrand";
import Quartier from "@/components/visite/Quartier";
import AutreApproche from "@/components/AutreApproche";
import Contact from "@/components/sections/Contact";
import { assertPublishable, champ } from "@/lib/visite/fiche";
import type { Fiche as FicheData, Manifest, Panel } from "@/lib/visite/types";

/** Une seule propriété est exposée : la page a une adresse fixe, pas un slug. */
const SLUG = "5-et-demi-deux-niveaux";

const CONTENT = path.join(process.cwd(), "content", "proprietes", SLUG);
const FRAMES = path.join(process.cwd(), "public", "frames", SLUG);

/**
 * Le manifest fournit la GÉOMÉTRIE (index d'images, distances de scroll,
 * images d'arrêt), `chapters.json` fournit le TEXTE.
 *
 * C'est délibéré : les panneaux étaient d'abord lus depuis le manifest, ce qui
 * obligeait à relancer une extraction ffmpeg de plusieurs minutes pour corriger
 * une phrase. Le texte est maintenant relu à chaque rendu.
 */
function load() {
  const m = path.join(FRAMES, "manifest.json");
  const f = path.join(CONTENT, "fiche.json");
  const c = path.join(CONTENT, "chapters.json");
  const p = path.join(CONTENT, "plan.svg");
  if (!fs.existsSync(m) || !fs.existsSync(f)) return null;

  const textes = new Map<string, Panel>();
  if (fs.existsSync(c)) {
    const doc = JSON.parse(fs.readFileSync(c, "utf8")) as { chapters: { id: string; panel?: Panel }[] };
    for (const ch of doc.chapters) if (ch.panel) textes.set(ch.id, ch.panel);
  }

  return {
    manifest: JSON.parse(fs.readFileSync(m, "utf8")) as Manifest,
    fiche: JSON.parse(fs.readFileSync(f, "utf8")) as FicheData,
    textes,
    // Lu depuis content/ : remplacer le fichier suffit à changer le plan.
    planSvg: fs.existsSync(p) ? fs.readFileSync(p, "utf8") : undefined,
  };
}

export function generateMetadata(): Metadata {
  const data = load();
  if (!data) return {};
  const { fiche, manifest } = data;
  return {
    title: `${fiche.accueil.titre.join(" ")} — visite au défilement`,
    description: fiche.accueil.ligne,
    openGraph: {
      title: fiche.accueil.titre.join(" "),
      description: fiche.accueil.ligne,
      locale: "fr_CA",
      type: "website",
      images: manifest.accueil
        ? [{ url: manifest.accueil.file, width: manifest.accueil.width, height: manifest.accueil.height }]
        : [],
    },
  };
}

/** Superficie lisible. Reste « — » tant que le relevé n'est pas fait. */
function superficie(fiche: FicheData, pieceId?: string) {
  const p = fiche.pieces.find((x) => x.id === pieceId);
  const r = champ(p?.superficiePi2);
  return r.todo ? r : { texte: `${r.texte} pi²`, todo: false };
}

export default function AppartementPage() {
  const data = load();
  if (!data) notFound();
  const { manifest, fiche, textes, planSvg } = data;

  assertPublishable(fiche);

  const prix = champ(fiche.propriete.prix);

  const panneaux: PanneauTexte[] = manifest.chapters
    .filter((c): c is Extract<typeof c, { type: "hold" }> => c.type === "hold")
    .map((c) => ({ c, p: textes.get(c.id) ?? c.panel }))
    .filter((x): x is { c: Extract<Manifest["chapters"][number], { type: "hold" }>; p: Panel } => !!x.p)
    .map(({ c, p }) => {
      const titre = Array.isArray(p.titre) ? p.titre : p.titre ? [p.titre] : [];
      return {
        id: c.id,
        surTitre: p.surTitre,
        titre,
        faits: p.faits ?? [],
        cote: p.cote ?? "droite",
        superficie: superficie(fiche, p.piece),
        prix: p.afficherPrix ? prix : null,
      };
    });

  const vignettes: Vignette[] = panneaux
    .map((p) => {
      const a = manifest.arrets?.[p.id];
      return a ? { id: p.id, titre: p.titre.join(" "), arret: a } : null;
    })
    .filter((v): v is Vignette => v !== null);

  return (
    <main id="contenu" className="bg-nuit">
      <Accueil
        textes={fiche.accueil}
        image={(fiche.accueil.image && manifest.arrets?.[fiche.accueil.image]) || manifest.accueil || null}
        ville={fiche.propriete.ville}
      />

      <VisiteClient manifest={manifest} panneaux={panneaux} planSvg={planSvg} />

      {/* Sans JavaScript, la visite reste lisible : images d'arrêt et textes. */}
      <noscript>
        <ul>
          {panneaux.map((p) => {
            const a = manifest.arrets?.[p.id];
            return (
              <li key={p.id}>
                {a ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.file} alt={p.titre.join(" ")} width={a.width} height={a.height} />
                ) : null}
                <h2>{p.titre.join(" ")}</h2>
                {p.faits.map((f) => (
                  <p key={f}>{f}</p>
                ))}
              </li>
            );
          })}
        </ul>
      </noscript>

      <Fiche fiche={fiche} />
      <Galerie vignettes={vignettes} />
      {planSvg ? <PlanGrand svg={planSvg} pieces={fiche.pieces} /> : null}
      <Quartier lieux={fiche.quartier?.lieux ?? []} />

      <Contact source="appartement" />

      <AutreApproche
        href="/maison"
        surTitre="L'autre approche"
        titre="La maison, en visite 360°"
        image="/photos/maison/maison-cover.jpg"
        imageAlt="Arrière de la maison : revêtement noir, toit incurvé et piscine creusée"
      />
    </main>
  );
}
