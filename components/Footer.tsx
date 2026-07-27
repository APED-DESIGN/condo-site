"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUp, Phone } from "lucide-react";
import { scrollToTop } from "@/lib/scroll";
import { CONTACT } from "@/lib/contact";

const NAV = [
  { label: "Accueil", href: "/" },
  { label: "La maison — visite 360°", href: "/maison" },
  { label: "L'appartement — au défilement", href: "/appartement" },
];

/** Pages de propriété : elles montrent des données d'exemple, et le disent. */
const PAGES_PROPRIETE = ["/maison", "/appartement"];

export default function Footer() {
  const pathname = usePathname();
  const surPropriete = PAGES_PROPRIETE.includes(pathname ?? "");

  return (
    <footer className="relative overflow-hidden bg-ink text-bone">
      <div className="mx-auto max-w-7xl px-6 pb-8 pt-20 sm:px-10">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_auto]">
          <div>
            <p className="font-display text-2xl">
              Deux façons de faire visiter
              <span className="text-brass">.</span>
            </p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/50">
              Une visite 360° où l&apos;acheteur se déplace librement. Une visite
              au défilement où la caméra avance et s&apos;arrête pour expliquer.
            </p>
            <a
              href={`mailto:${CONTACT.courriel}`}
              className="link-underline mt-6 inline-block text-sm text-brass"
            >
              {CONTACT.courriel}
            </a>
          </div>

          <nav aria-label="Plan du site">
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/40">
              Explorer
            </p>
            <ul className="mt-5 space-y-3">
              {NAV.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="link-underline text-sm text-white/75 transition-colors hover:text-bone"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>

            <a
              href={CONTACT.telephoneHref}
              className="mt-8 inline-flex items-center gap-2.5 text-sm text-white/75 transition-colors hover:text-bone"
            >
              <Phone className="h-4 w-4 shrink-0 text-brass" aria-hidden />
              <span className="tabular-nums">{CONTACT.telephone}</span>
            </a>
          </nav>

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

        <div className="mt-14 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} — Tous droits réservés</p>
          {surPropriete ? (
            <p>Présentation de démonstration — données fournies à titre d&apos;exemple.</p>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
