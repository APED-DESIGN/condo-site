import Preloader from "@/components/Preloader";
import Hero from "@/components/sections/Hero";
import Manifesto from "@/components/sections/Manifesto";
import Projects from "@/components/sections/Projects";
import Services from "@/components/sections/Services";
import Process from "@/components/sections/Process";
import Studio from "@/components/sections/Studio";
import Trust from "@/components/sections/Trust";
import Testimonials from "@/components/sections/Testimonials";
import Contact from "@/components/sections/Contact";

export default function Home() {
  return (
    <>
      <Preloader />
      <main id="contenu">
        <Hero />
        <Manifesto />
        <Projects />
        <Services />
        <Process />
        <Studio />
        <Trust />
        <Testimonials />
        <Contact />
      </main>
    </>
  );
}
