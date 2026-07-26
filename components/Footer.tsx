"use client";

import Link from "next/link";
import { ArrowUp } from "lucide-react";
import { scrollToTop } from "@/lib/scroll";

const NAV = [
  { label: "Unités", href: "/#unites" },
  { label: "Inclusions", href: "/#inclusions" },
  { label: "Louer", href: "/#louer" },
  { label: "L'ensemble", href: "/#immeuble" },
  { label: "Contact", href: "/#contact" },
];

const SOCIALS = [
  { label: "Instagram", href: "https://instagram.com" },
  { label: "Facebook", href: "https://facebook.com" },
  { label: "Marketplace", href: "https://facebook.com/marketplace" },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-ink text-bone">
      <div className="mx-auto max-w-7xl px-6 pb-8 pt-20 sm:px-10">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
          <div>
            <p className="font-display text-2xl">
              Boréal<span className="text-brass">.</span>
            </p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/50">
              Condos locatifs haut de gamme à Trois-Rivières. Visitez en ligne,
              choisissez sans pression, emménagez l&apos;esprit tranquille.
            </p>
            <a
              href="mailto:location@residencesboreal.ca"
              className="link-underline mt-6 inline-block text-sm text-brass"
            >
              location@residencesboreal.ca
            </a>
          </div>

          <nav aria-label="Plan du site">
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/40">
              Explorer
            </p>
            <ul className="mt-5 space-y-3">
              {NAV.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="link-underline text-sm text-white/75 transition-colors hover:text-bone"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/40">
              Suivez-nous
            </p>
            <ul className="mt-5 space-y-3">
              {SOCIALS.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-underline text-sm text-white/75 transition-colors hover:text-bone"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <button
              type="button"
              onClick={scrollToTop}
              aria-label="Retour en haut de page"
              className="group rounded-full border border-white/20 p-4 transition-all duration-300 hover:border-brass hover:bg-brass"
            >
              <ArrowUp
                className="h-5 w-5 transition-transform duration-300 group-hover:-translate-y-0.5"
                aria-hidden
              />
            </button>
          </div>
        </div>

        <p
          aria-hidden
          className="pointer-events-none mt-14 select-none whitespace-nowrap font-display text-[19vw] leading-[0.75] text-bone/[0.07] lg:text-[16vw]"
        >
          BORÉAL
        </p>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 RÉSIDENCES BORÉAL — Tous droits réservés</p>
          <p>Site démo — conçu et développé avec soin à Trois-Rivières</p>
        </div>
      </div>
    </footer>
  );
}
