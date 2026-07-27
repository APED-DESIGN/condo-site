import { NextResponse } from "next/server";

/**
 * Réception d'une demande de visite.
 *
 * Écrit dans la table Supabase `leads`, puis notifie par courriel si une clé
 * est configurée. Rien n'est codé en dur : sans variables d'environnement, la
 * route répond franchement qu'elle n'est pas branchée plutôt que d'avaler la
 * demande en silence — perdre un acheteur sans le savoir est pire que l'erreur.
 *
 * Variables attendues (voir .env.example) :
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   LEADS_NOTIFY_TO, RESEND_API_KEY, RESEND_FROM   (notification, facultatif)
 */

export const runtime = "nodejs";

interface Corps {
  nom?: string;
  telephone?: string;
  courriel?: string;
  message?: string;
  /** Ce que le visiteur est venu voir. */
  interet?: string;
  /** Page d'où part la demande : accueil, maison ou appartement. */
  source?: string;
}

const MAX = 2000;
const propre = (s: unknown) => (typeof s === "string" ? s.trim().slice(0, MAX) : "");

export async function POST(req: Request) {
  let corps: Corps;
  try {
    corps = (await req.json()) as Corps;
  } catch {
    return NextResponse.json({ erreur: "corps illisible" }, { status: 400 });
  }

  const lead = {
    nom: propre(corps.nom),
    telephone: propre(corps.telephone),
    courriel: propre(corps.courriel),
    message: propre(corps.message),
    interet: propre(corps.interet),
    source: propre(corps.source) || "inconnue",
  };

  if (!lead.nom || !lead.telephone || !lead.courriel)
    return NextResponse.json({ erreur: "nom, téléphone et courriel sont requis" }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lead.courriel))
    return NextResponse.json({ erreur: "courriel invalide" }, { status: 400 });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("[leads] Supabase non configuré — demande NON enregistrée :", lead);
    return NextResponse.json(
      { erreur: "le formulaire n’est pas encore branché" },
      { status: 503 }
    );
  }

  const r = await fetch(`${url.replace(/\/$/, "")}/rest/v1/leads`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify([lead]),
  });

  if (!r.ok) {
    const detail = await r.text().catch(() => "");
    console.error("[leads] Supabase a refusé l’écriture :", r.status, detail);
    return NextResponse.json({ erreur: "enregistrement impossible" }, { status: 502 });
  }

  await notifier(lead);
  return NextResponse.json({ ok: true });
}

/** Notification courriel. Silencieuse si non configurée — la demande est déjà sauvée. */
async function notifier(lead: Record<string, string>) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.LEADS_NOTIFY_TO;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !to || !from) return;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        subject: `Nouvelle demande — page ${lead.source}`,
        text: [
          `Nom       : ${lead.nom}`,
          `Téléphone : ${lead.telephone}`,
          `Courriel  : ${lead.courriel}`,
          `Intérêt   : ${lead.interet || "(non précisé)"}`,
          `Page      : ${lead.source}`,
          "",
          lead.message || "(aucun message)",
        ].join("\n"),
      }),
    });
  } catch (e) {
    console.error("[leads] notification courriel échouée (la demande est enregistrée) :", e);
  }
}
