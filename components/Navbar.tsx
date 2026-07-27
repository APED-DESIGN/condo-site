"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Phone, X } from "lucide-react";
import { scrollToId, scrollToTop } from "@/lib/scroll";
import { CONTACT } from "@/lib/contact";

/**
 * Marque neutre. Ce site est montré à plusieurs prospects : aucun nom
 * d'agence, de client ou de projet ne doit y apparaître. Les deux carrés
 * évoquent les deux approches, rien de plus.
 */
function Marque() {
  return (
    <span aria-hidden className="flex items-center gap-1.5">
      <span className="block h-3.5 w-3.5 rounded-[3px] border border-ink/70" />
      <span className="block h-3.5 w-3.5 rounded-full bg-brass" />
    </span>
  );
}

const LINKS = [
  { label: "Accueil", href: "/" },
  { label: "La maison", href: "/maison" },
  { label: "L'appartement", href: "/appartement" },
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

  const fermer = () => setOpen(false);

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
            className="flex items-center"
          >
            <span className="sr-only">Retour à l&apos;accueil</span>
            <Marque />
          </Link>

          <nav aria-label="Navigation principale" className="hidden items-center gap-7 lg:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={pathname === l.href ? "page" : undefined}
                className={`link-underline text-sm transition-colors hover:text-ink ${
                  pathname === l.href ? "text-ink" : "text-ink/60"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {/* Cliquable en tout temps, sur les trois pages et à toutes les
                largeurs : sous 640 px il ne reste que l'icône, mais il reste. */}
            <a
              href={CONTACT.telephoneHref}
              aria-label={`Appeler le ${CONTACT.telephone}`}
              className="inline-flex items-center gap-2 rounded-full px-3 py-2.5 text-sm text-ink transition-colors hover:text-brass sm:px-4"
            >
              <Phone className="h-4 w-4 shrink-0 text-brass" aria-hidden />
              <span className="hidden tabular-nums sm:inline">{CONTACT.telephone}</span>
            </a>
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
              <span aria-hidden className="flex items-center gap-1.5">
                <span className="block h-3.5 w-3.5 rounded-[3px] border border-bone/70" />
                <span className="block h-3.5 w-3.5 rounded-full bg-brass" />
              </span>
              <button
                type="button"
                onClick={fermer}
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
                  key={l.href}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + i * 0.06, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link
                    href={l.href}
                    onClick={fermer}
                    className="font-display block py-2 text-4xl transition-colors hover:text-brass"
                  >
                    {l.label}
                  </Link>
                </motion.div>
              ))}
            </nav>

            <div className="mt-auto">
              <a
                href={CONTACT.telephoneHref}
                onClick={fermer}
                className="font-display flex items-center gap-3 text-3xl transition-colors hover:text-brass"
              >
                <Phone className="h-6 w-6 text-brass" aria-hidden />
                <span className="tabular-nums">{CONTACT.telephone}</span>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
