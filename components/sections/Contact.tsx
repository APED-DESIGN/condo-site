"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Mail, Phone } from "lucide-react";
import Eyebrow from "@/components/ui/Eyebrow";
import RevealText from "@/components/ui/RevealText";
import Button from "@/components/ui/Button";
import { CONTACT } from "@/lib/contact";

type Errors = {
  nom?: string;
  courriel?: string;
  telephone?: string;
  interet?: string;
};

const INPUT_CLASS =
  "w-full rounded-xl border bg-white/5 px-4 py-3.5 text-bone placeholder:text-white/30 transition-colors duration-300 focus:outline-none";

/** Ce que le visiteur vient voir — remplace la liste d'unités, qui n'existe plus. */
const INTERETS = [
  { value: "maison-360", label: "La visite 360° (la maison)" },
  { value: "appartement-defilement", label: "La visite au défilement (l'appartement)" },
  { value: "les-deux", label: "Les deux approches" },
];

export default function Contact({ source = "accueil" }: { source?: string }) {
  const [values, setValues] = useState({
    nom: "",
    courriel: "",
    telephone: "",
    interet: "",
    message: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [echec, setEchec] = useState<string | null>(null);

  const set = (field: keyof typeof values) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    setErrors((err) => ({ ...err, [field]: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (envoi) return;
    const next: Errors = {};
    if (!values.nom.trim()) next.nom = "Votre nom est requis.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.courriel))
      next.courriel = "Entrez une adresse courriel valide.";
    if (values.telephone.replace(/\D/g, "").length < 10)
      next.telephone = "Entrez un numéro de téléphone à 10 chiffres.";
    if (!values.interet) next.interet = "Dites-nous ce qui vous intéresse.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setEnvoi(true);
    setEchec(null);
    try {
      // `source` dit de quelle page vient la demande — accueil, maison ou appartement.
      const r = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, source }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(json.erreur || `Erreur ${r.status}`);
      setSent(true);
    } catch (err) {
      setEchec(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setEnvoi(false);
    }
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
              Une de ces deux approches conviendrait à vos propriétés ?
              Laissez-nous vos coordonnées : on vous répond en{" "}
              {CONTACT.delai} pour en parler — par téléphone ou en appel vidéo.
            </p>

            <ul className="mt-10 space-y-5 text-sm">
              <li className="flex items-center gap-4">
                <Phone className="h-4 w-4 shrink-0 text-brass" aria-hidden />
                <a
                  href={CONTACT.telephoneHref}
                  className="link-underline text-white/75 hover:text-bone"
                >
                  {CONTACT.telephone}
                </a>
              </li>
              <li className="flex items-center gap-4">
                <Mail className="h-4 w-4 shrink-0 text-brass" aria-hidden />
                <a
                  href={`mailto:${CONTACT.courriel}`}
                  className="link-underline text-white/75 hover:text-bone"
                >
                  {CONTACT.courriel}
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
                  Merci. On vous rappelle en {CONTACT.delai} pour la suite.
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

                <div className="mt-5">
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

                <div className="mt-5">
                  <label htmlFor="interet" className={labelClass}>
                    Ce qui vous intéresse
                  </label>
                  <select
                    id="interet"
                    name="interet"
                    value={values.interet}
                    onChange={set("interet")}
                    aria-invalid={!!errors.interet}
                    className={`${fieldClass(!!errors.interet)} appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%228%22%3E%3Cpath%20d%3D%22M1%201l5%205%205-5%22%20stroke%3D%22%23F4EFE7%22%20stroke-width%3D%221.5%22%20fill%3D%22none%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_1rem_center] bg-no-repeat pr-10 ${
                      values.interet ? "" : "text-white/30"
                    }`}
                  >
                    <option value="" disabled className="text-ink">
                      Choisir…
                    </option>
                    {INTERETS.map((i) => (
                      <option key={i.value} value={i.value} className="text-ink">
                        {i.label}
                      </option>
                    ))}
                  </select>
                  {errors.interet && (
                    <p className="mt-2 text-xs text-[#d9a08b]" role="alert">
                      {errors.interet}
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
                  {envoi ? "Envoi…" : "Envoyer ma demande"}
                </Button>

                {echec && (
                  <p role="alert" className="mt-4 text-xs leading-relaxed text-[#d9a08b]">
                    L&apos;envoi a échoué : {echec}. Appelez-nous, c&apos;est plus rapide —{" "}
                    <a href={CONTACT.telephoneHref} className="link-underline">
                      {CONTACT.telephone}
                    </a>
                    .
                  </p>
                )}
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
