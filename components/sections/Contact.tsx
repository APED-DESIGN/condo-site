"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Mail, MapPin, Phone } from "lucide-react";
import Eyebrow from "@/components/ui/Eyebrow";
import RevealText from "@/components/ui/RevealText";
import Button from "@/components/ui/Button";

type Errors = { nom?: string; courriel?: string; message?: string };

const INPUT_CLASS =
  "w-full rounded-xl border bg-white/5 px-4 py-3.5 text-bone placeholder:text-white/30 transition-colors duration-300 focus:outline-none";

export default function Contact() {
  const [values, setValues] = useState({ nom: "", courriel: "", message: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);

  const set = (field: keyof typeof values) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    setErrors((err) => ({ ...err, [field]: undefined }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (!values.nom.trim()) next.nom = "Votre nom est requis.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.courriel))
      next.courriel = "Entrez une adresse courriel valide.";
    if (values.message.trim().length < 10)
      next.message = "Décrivez votre projet en quelques mots (10 caractères minimum).";
    setErrors(next);
    if (Object.keys(next).length === 0) setSent(true);
  };

  const fieldClass = (invalid: boolean) =>
    `${INPUT_CLASS} ${
      invalid
        ? "border-[#d9a08b] focus:border-[#d9a08b]"
        : "border-white/15 focus:border-brass"
    }`;

  return (
    <section id="contact" className="bg-ink py-24 text-bone sm:py-32">
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <Eyebrow num="05" label="Contact" light />
        <h2 className="font-display mt-6 max-w-3xl text-[clamp(2.4rem,6vw,4.8rem)] leading-[0.98] tracking-tight">
          <RevealText text="Parlons de votre projet" />
        </h2>

        <div className="mt-16 grid gap-14 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
          <div>
            <p className="max-w-md leading-relaxed text-white/55">
              Une maison à repenser, un commerce à ouvrir, un chalet à
              transformer ? Écrivez-nous : nous répondons à chaque message
              sous 48 heures, avec une première lecture honnête de votre
              projet.
            </p>

            <ul className="mt-10 space-y-5 text-sm">
              <li className="flex items-center gap-4">
                <MapPin className="h-4 w-4 shrink-0 text-brass" aria-hidden />
                <span className="text-white/75">
                  400, rue Saint-Paul Est, Québec (QC) G1K 3W9
                </span>
              </li>
              <li className="flex items-center gap-4">
                <Mail className="h-4 w-4 shrink-0 text-brass" aria-hidden />
                <a
                  href="mailto:bonjour@studionorden.ca"
                  className="link-underline text-white/75 hover:text-bone"
                >
                  bonjour@studionorden.ca
                </a>
              </li>
              <li className="flex items-center gap-4">
                <Phone className="h-4 w-4 shrink-0 text-brass" aria-hidden />
                <a
                  href="tel:+14185550192"
                  className="link-underline text-white/75 hover:text-bone"
                >
                  418 555-0192
                </a>
              </li>
            </ul>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
            className="glass-dark rounded-[2rem] p-7 sm:p-10"
          >
            {sent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="flex min-h-[22rem] flex-col items-center justify-center text-center"
              >
                <CheckCircle2 className="h-10 w-10 text-brass" aria-hidden />
                <p className="font-display mt-5 text-2xl">Message envoyé</p>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/55">
                  Merci ! Nous revenons vers vous sous 48 heures.
                </p>
                <p className="mt-6 text-[11px] uppercase tracking-[0.2em] text-white/30">
                  Démo — aucun envoi réel
                </p>
              </motion.div>
            ) : (
              <form onSubmit={submit} noValidate>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="nom" className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/50">
                      Nom
                    </label>
                    <input
                      id="nom"
                      name="nom"
                      type="text"
                      autoComplete="name"
                      placeholder="Votre nom"
                      value={values.nom}
                      onChange={set("nom")}
                      aria-invalid={!!errors.nom}
                      className={fieldClass(!!errors.nom)}
                    />
                    {errors.nom && (
                      <p className="mt-2 text-xs text-[#d9a08b]" role="alert">
                        {errors.nom}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="courriel" className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/50">
                      Courriel
                    </label>
                    <input
                      id="courriel"
                      name="courriel"
                      type="email"
                      autoComplete="email"
                      placeholder="vous@exemple.com"
                      value={values.courriel}
                      onChange={set("courriel")}
                      aria-invalid={!!errors.courriel}
                      className={fieldClass(!!errors.courriel)}
                    />
                    {errors.courriel && (
                      <p className="mt-2 text-xs text-[#d9a08b]" role="alert">
                        {errors.courriel}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5">
                  <label htmlFor="message" className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/50">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    placeholder="Parlez-nous de votre espace, de vos envies, de votre échéancier…"
                    value={values.message}
                    onChange={set("message")}
                    aria-invalid={!!errors.message}
                    className={`${fieldClass(!!errors.message)} resize-none`}
                  />
                  {errors.message && (
                    <p className="mt-2 text-xs text-[#d9a08b]" role="alert">
                      {errors.message}
                    </p>
                  )}
                </div>

                <Button type="submit" arrow className="mt-8 w-full">
                  Envoyer le message
                </Button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
