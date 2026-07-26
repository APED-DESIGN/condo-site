import Preloader from "@/components/Preloader";
import Hero from "@/components/sections/Hero";
import Manifesto from "@/components/sections/Manifesto";
import Units from "@/components/sections/Units";
import Amenities from "@/components/sections/Amenities";
import RentalProcess from "@/components/sections/RentalProcess";
import Building from "@/components/sections/Building";
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
        <Units />
        <Amenities />
        <RentalProcess />
        <Building />
        <Trust />
        <Testimonials />
        <Contact />
      </main>
    </>
  );
}
