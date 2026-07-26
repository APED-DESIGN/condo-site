"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Mail, MapPin, Phone } from "lucide-react";
import Eyebrow from "@/components/ui/Eyebrow";
import RevealText from "@/components/ui/RevealText";
import Button from "@/components/ui/Button";
import { STATUS_LABEL, units } from "@/lib/units";

type Errors = {
  nom?: string;
  courriel?: string;
  telephone?: string;
  unite?: string;
};

const INPUT_CLASS =
  "w-full rounded-xl border bg-white/5 px-4 py-3.5 text-bone placeholder:text-white/30 transition-colors duration-300 focus:outline-none";

const CHOICES = units.filter((u) => u.status !== "loué");

export default function Contact() {
  const [values, setValues] = useState({
    nom: "",
    courriel: "",
    telephone: "",
    unite: "",
    date: "",
    message: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);

  const set = (field: keyof typeof values) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
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
    if (values.telephone.replace(/\D/g, "").length < 10)
      next.telephone = "Entrez un numéro de téléphone à 10 chiffres.";
    if (!values.unite) next.unite = "Choisissez une unité (ou « Peu importe »).";
    setErrors(next);
    if (Object.keys(next).length === 0) setSent(true);
  };

  const fieldClass = (invalid: boolean) =>
    `${INPUT_CLASS} ${
      invalid
        ? "border-[#d9a08b] focus:border-[#d9a08b]"
        : "border-white/15 focus:border-brass"
    }`;

  const labelClass =
    "mb-2 block text-xs uppercase tracking-[0.2em] text-white/50";

  return (
    <section id="contact" className="bg-ink py-24 text-bone sm:py-32">
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <Eyebrow num="05" label="Réserver une visite" light />
        <h2 className="font-display mt-6 max-w-3xl text-[clamp(2.4rem,6vw,4.8rem)] leading-[0.98] tracking-tight">
          <RevealText text="On vous ouvre les portes" />
        </h2>

        <div className="mt-16 grid gap-14 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
          <div>
            <p className="max-w-md leading-relaxed text-white/55">
              Une unité vous fait de l&apos;œil ? Laissez-nous vos
              coordonnées : on vous répond en moins de 24 heures pour planifier
              une visite — en personne ou en appel vidéo — ou démarrer votre
              demande de location.
            </p>

            <ul className="mt-10 space-y-5 text-sm">
              <li className="flex items-center gap-4">
                <MapPin className="h-4 w-4 shrink-0 text-brass" aria-hidden />
                <span className="text-white/75">
                  5500, boulevard Boréal, Trois-Rivières (QC) G8Y 4T2
                </span>
              </li>
              <li className="flex items-center gap-4">
                <Mail className="h-4 w-4 shrink-0 text-brass" aria-hidden />
                <a
                  href="mailto:location@residencesboreal.ca"
                  className="link-underline text-white/75 hover:text-bone"
                >
                  location@residencesboreal.ca
                </a>
              </li>
              <li className="flex items-center gap-4">
                <Phone className="h-4 w-4 shrink-0 text-brass" aria-hidden />
                <a
                  href="tel:+18195550155"
                  className="link-underline text-white/75 hover:text-bone"
                >
                  819 555-0155
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
                <p className="font-display mt-5 text-2xl">Demande reçue</p>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/55">
                  Merci ! On vous rappelle en moins de 24 heures pour la suite.
                </p>
                <p className="mt-6 text-[11px] uppercase tracking-[0.2em] text-white/30">
                  Démo — aucun envoi réel
                </p>
              </motion.div>
            ) : (
              <form onSubmit={submit} noValidate>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="nom" className={labelClass}>
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
                    <label htmlFor="courriel" className={labelClass}>
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

                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="telephone" className={labelClass}>
                      Téléphone
                    </label>
                    <input
                      id="telephone"
                      name="telephone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="819 555-0123"
                      value={values.telephone}
                      onChange={set("telephone")}
                      aria-invalid={!!errors.telephone}
                      className={fieldClass(!!errors.telephone)}
                    />
                    {errors.telephone && (
                      <p className="mt-2 text-xs text-[#d9a08b]" role="alert">
                        {errors.telephone}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="date" className={labelClass}>
                      Emménagement souhaité
                    </label>
                    <input
                      id="date"
                      name="date"
                      type="month"
                      value={values.date}
                      onChange={set("date")}
                      className={`${fieldClass(false)} [color-scheme:dark]`}
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <label htmlFor="unite" className={labelClass}>
                    Unité visée
                  </label>
                  <select
                    id="unite"
                    name="unite"
                    value={values.unite}
                    onChange={set("unite")}
                    aria-invalid={!!errors.unite}
                    className={`${fieldClass(!!errors.unite)} appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%228%22%3E%3Cpath%20d%3D%22M1%201l5%205%205-5%22%20stroke%3D%22%23F4EFE7%22%20stroke-width%3D%221.5%22%20fill%3D%22none%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_1rem_center] bg-no-repeat pr-10 ${
                      values.unite ? "" : "text-white/30"
                    }`}
                  >
                    <option value="" disabled className="text-ink">
                      Choisir une unité…
                    </option>
                    {CHOICES.map((u) => (
                      <option key={u.slug} value={u.slug} className="text-ink">
                        {u.name} — {u.monthlyPrice} ({STATUS_LABEL[u.status]})
                      </option>
                    ))}
                    <option value="peu-importe" className="text-ink">
                      Peu importe — conseillez-moi
                    </option>
                  </select>
                  {errors.unite && (
                    <p className="mt-2 text-xs text-[#d9a08b]" role="alert">
                      {errors.unite}
                    </p>
                  )}
                </div>

                <div className="mt-5">
                  <label htmlFor="message" className={labelClass}>
                    Message (facultatif)
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={3}
                    placeholder="Animaux, colocation, questions — dites-nous tout…"
                    value={values.message}
                    onChange={set("message")}
                    className={`${fieldClass(false)} resize-none`}
                  />
                </div>

                <Button type="submit" arrow className="mt-8 w-full">
                  Envoyer ma demande
                </Button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
