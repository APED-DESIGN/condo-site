import Preloader from "@/components/Preloader";
import Hero from "@/components/sections/Hero";
import Choix from "@/components/sections/Choix";
import Contact from "@/components/sections/Contact";

/**
 * L'accueil a un seul rôle : faire choisir entre les deux approches.
 *
 * Trois blocs, pas un de plus — le titre plein écran, le choix, le contact.
 * Tout ce qui allongeait la page allongeait aussi le temps qu'il faut pour
 * comprendre où on est.
 */
export default function Home() {
  return (
    <>
      <Preloader />
      <main id="contenu">
        <Hero />
        <Choix />
        <Contact source="accueil" />
      </main>
    </>
  );
}
