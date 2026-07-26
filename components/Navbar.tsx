"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import Button from "./ui/Button";
import { scrollToId, scrollToTop } from "@/lib/scroll";

const LINKS = [
  { label: "Unités", id: "unites" },
  { label: "Inclusions", id: "inclusions" },
  { label: "Louer", id: "louer" },
  { label: "L'ensemble", id: "immeuble" },
  { label: "Contact", id: "contact" },
];

export default function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (open) {
      window.__lenis?.stop();
      document.documentElement.style.overflow = "hidden";
    } else {
      window.__lenis?.start();
      document.documentElement.style.overflow = "";
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  const go = (id: string) => (e: React.MouseEvent) => {
    setOpen(false);
    if (isHome) {
      e.preventDefault();
      scrollToId(id);
    }
  };

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-[80] flex justify-center px-4 pt-4">
        <div
          className={`glass pointer-events-auto flex w-full max-w-5xl items-center justify-between gap-6 rounded-full pl-6 pr-2.5 transition-all duration-500 ease-out-expo ${
            scrolled ? "max-w-4xl py-1.5 shadow-xl" : "py-2.5"
          }`}
        >
          <Link
            href="/"
            onClick={(e) => {
              if (isHome) {
                e.preventDefault();
                scrollToTop();
              }
            }}
            className="font-display text-xl tracking-tight"
          >
            <span className="sr-only">
              Résidences Boréal — retour à l&apos;accueil
            </span>
            <span aria-hidden>
              Boréal<span className="text-brass">.</span>
            </span>
          </Link>

          <nav aria-label="Navigation principale" className="hidden items-center gap-7 lg:flex">
            {LINKS.map((l) => (
              <Link
                key={l.id}
                href={`/#${l.id}`}
                onClick={go(l.id)}
                className="link-underline text-sm text-ink/80 transition-colors hover:text-ink"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button
              href="/#contact"
              onClick={go("contact")}
              className="hidden !px-5 !py-2.5 sm:inline-flex"
            >
              Réserver une visite
            </Button>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Ouvrir le menu"
              className="rounded-full p-2.5 transition-colors hover:bg-white/60 lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[90] flex flex-col bg-ink px-6 pb-10 pt-6 text-bone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-xl">
                Boréal<span className="text-brass">.</span>
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer le menu"
                className="rounded-full border border-white/20 p-2.5 transition-colors hover:border-brass hover:text-brass"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <nav
              aria-label="Navigation mobile"
              className="mt-16 flex flex-col gap-2"
            >
              {LINKS.map((l, i) => (
                <motion.div
                  key={l.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + i * 0.06, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link
                    href={`/#${l.id}`}
                    onClick={go(l.id)}
                    className="font-display block py-2 text-4xl transition-colors hover:text-brass"
                  >
                    {l.label}
                  </Link>
                </motion.div>
              ))}
            </nav>

            <div className="mt-auto">
              <Button href="/#contact" onClick={go("contact")} arrow className="w-full">
                Réserver une visite
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
