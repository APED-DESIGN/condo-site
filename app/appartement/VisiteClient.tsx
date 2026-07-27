"use client";

import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { FrameStore } from "@/lib/visite/frameStore";
import { buildTimeline, type Timeline } from "@/lib/visite/timeline";
import { drawCover, sizeCanvas } from "@/lib/visite/canvas";
import { geometrie, styleCadre, zoneTexte } from "@/lib/visite/cadre";
import PlanAxono from "@/components/visite/PlanAxono";
import type { Manifest, VisiteHandle } from "@/lib/visite/types";

/**
 * La visite. Le scroll fait avancer la caméra ; aux arrêts, l'image se rétracte
 * en panneau contenu et le texte prend la colonne d'à côté.
 *
 * Ce n'est pas une vidéo avec des sous-titres : à l'arrêt, l'image ne touche
 * plus les bords, le fond de page apparaît tout autour, et le texte a sa propre
 * colonne. Jamais de texte en surimpression sur une image plein cadre.
 *
 * Réglages sans rebuild, pour tester molette / trackpad / doigt :
 *   ?scrub=0.6   amortissement ScrollTrigger
 *   ?lerp=0.09   inertie Lenis
 *   ?back=12 &forward=32 &budget=280 &conc=6 &stride=3
 *   ?debug=1     panneau de mesures
 */

const DEFAULT_SCRUB = 0.6;
const DEFAULT_LERP = 0.09;

/* Le brief demandait une fenêtre [i-15, i+60]. Mesuré : à 1600×900 un
   ImageBitmap pesait 5,8 Mo, donc 76 images = 440 Mo de pixels décodés, auxquels
   s'ajoutait le préchargement d'un chapitre entier — on montait à 500 Mo.
   Fenêtre resserrée après mesure. Le budget ci-dessous est la borne dure ;
   la fenêtre n'est qu'une intention.

   Révisé avec le passage des images de mouvement à 2048 px : un ImageBitmap
   coûte maintenant 9,4 Mo au lieu de 5,8. Fenêtre resserrée d'autant pour que
   l'empreinte reste du même ordre — c'est le prix de la netteté, et il est
   payé en profondeur de fenêtre, pas en mémoire. */
const DEFAULT_BACK = 10;
const DEFAULT_FORWARD = 26;
const DEFAULT_BUDGET_MO = 360;
const DEFAULT_CONCURRENCY = 6;
/** Espacement des demandes en défilement rapide. 1 = désactivé (pour mesurer). */
const DEFAULT_STRIDE_MAX = 3;
const IDLE_FRAMES = 20;

/** Rétraction : 550 ms, dans les deux sens. */
const RETRAIT_DUREE = 0.55;
const EASE_CADRE = "cubic-bezier(0.65, 0, 0.35, 1)";

/* Bande morte à l'entrée et à la sortie d'un arrêt : sans elle, un scrub rapide
   ferait clignoter la rétraction à chaque arrêt traversé. */
const ENTREE = 0.12;
const SORTIE = 0.94;

/*
 * Vitesse au-delà de laquelle on ne rétracte plus, en vh par rafraîchissement.
 *
 * Un arrêt fait environ 95 vh. À 4 vh par rafraîchissement on le traverse en
 * 0,2 s, soit trois fois moins que les 550 ms de l'animation : le panneau
 * n'aurait pas fini de s'ouvrir qu'il devrait déjà se refermer. C'est un défaut
 * d'usage — passer en trombe devant un arrêt ne doit pas faire clignoter le
 * cadre — et c'est aussi là que le débit s'effondre, puisqu'on animerait
 * pendant que le décodeur est déjà saturé.
 */
const VITESSE_MAX_RETRAIT = 4;

export interface PanneauTexte {
  id: string;
  surTitre?: string;
  titre: string[];
  faits: string[];
  cote: "droite" | "gauche";
  superficie: { texte: string; todo: boolean };
  prix: { texte: string; todo: boolean } | null;
}

export default function VisiteClient({
  manifest,
  panneaux,
  planSvg,
}: {
  manifest: Manifest;
  panneaux: PanneauTexte[];
  planSvg?: string;
}) {
  const spacerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cadreRef = useRef<HTMLDivElement>(null);
  const ombreRef = useRef<HTMLDivElement>(null);
  const textesRef = useRef<HTMLDivElement>(null);

  const dbg = {
    frame: useRef<HTMLSpanElement>(null),
    seg: useRef<HTMLSpanElement>(null),
    fps: useRef<HTMLSpanElement>(null),
    held: useRef<HTMLSpanElement>(null),
    net: useRef<HTMLSpanElement>(null),
    prog: useRef<HTMLSpanElement>(null),
  };

  const [ready, setReady] = useState(false);
  const [loadPct, setLoadPct] = useState(0);
  const [variant, setVariant] = useState<string>("desktop");
  const [showDebug, setShowDebug] = useState(false);
  const [decodeKind, setDecodeKind] = useState<string>("—");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scrub = Number(params.get("scrub") ?? DEFAULT_SCRUB);
    const lerp = Number(params.get("lerp") ?? DEFAULT_LERP);
    setShowDebug(params.get("debug") === "1");

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const v = window.innerWidth < 768 && manifest.variants.mobile ? "mobile" : "desktop";
    const info = manifest.variants[v] ?? Object.values(manifest.variants)[0];
    setVariant(v);

    const timeline: Timeline = buildTimeline(manifest);
    const store = new FrameStore({
      basePath: info.path,
      frameCount: manifest.frameCount,
      indexOffset: manifest.indexOffset,
      back: Number(params.get("back") ?? DEFAULT_BACK),
      forward: Number(params.get("forward") ?? DEFAULT_FORWARD),
      budgetMo: Number(params.get("budget") ?? DEFAULT_BUDGET_MO),
      concurrency: Number(params.get("conc") ?? DEFAULT_CONCURRENCY),
      strideMax: Number(params.get("stride") ?? DEFAULT_STRIDE_MAX),
      frameSize: { width: info.width, height: info.height },
    });
    setDecodeKind(store.decodeKind);

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d", { alpha: false })!;
    const cadre = cadreRef.current!;
    const ombre = ombreRef.current!;
    const textes = textesRef.current!;
    const articles = Array.from(textes.querySelectorAll<HTMLElement>("[data-panneau]"));
    const plan = textes.querySelector<HTMLElement>("[data-plan]");

    let destroyed = false;
    let started = false;
    let raf = 0;
    let running = false;
    let lastDrawn = -1;
    let lastDrawnHi = false;
    let dirty = true;
    let idle = 0;
    let lastP = -1;
    /** Moyenne glissante de la vitesse de défilement, en vh par rafraîchissement. */
    let vitesseVh = 0;
    let lastCenter = -1;
    let lastSegIndex = -1;
    let cibleCourante = -1;
    let arretActif = "";
    let lastGeoKey = "";
    let lastClip = "";
    let lastRayon = -1;
    let frameTimes: number[] = [];
    let prevT = 0;
    let resizes = 0;

    const proxy = { p: 0 };
    /** 0 = plein écran, 1 = panneau contenu. Animé dans le temps, pas au scroll. */
    const cadreState = { r: 0 };
    let coteCourant: "droite" | "gauche" = panneaux[0]?.cote ?? "droite";

    let dims = sizeCanvas(canvas);
    resizes++;

    /* ── colonne de texte : géométrie calculée, jamais dupliquée en CSS ────── */

    function placerTextes() {
      const w = window.innerWidth;
      for (const cote of ["droite", "gauche"] as const) {
        const z = zoneTexte(w, cote);
        textes.style.setProperty(`--tx-${cote}`, `${z.left}%`);
        textes.style.setProperty(`--tw-${cote}`, `${z.width}%`);
        textes.style.setProperty(`--tt-${cote}`, `${z.top}%`);
        textes.style.setProperty(`--th-${cote}`, `${z.height}%`);
      }
    }
    placerTextes();

    /* ── images d'arrêt en haute définition ──────────────────────────────────
       Même instant, même cadrage, deux fois plus de pixels : le contenu est
       identique, la substitution ne produit donc aucun saut — juste une image
       qui devient nette au moment où on la regarde. */

    const hiRes = new Map<number, ImageBitmap>();
    const enCours = new Set<string>();

    function chargerArret(id: string) {
      const a = manifest.arrets?.[id];
      if (!a || hiRes.has(a.frame) || enCours.has(id)) return;
      enCours.add(id);
      fetch(a.file)
        .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
        .then((b) => createImageBitmap(b))
        .then((bmp) => {
          if (destroyed) return bmp.close();
          hiRes.set(a.frame, bmp);
          dirty = true;
          wake();
        })
        .catch(() => undefined)
        .finally(() => enCours.delete(id));
    }

    /* ── rendu ───────────────────────────────────────────────────────────── */

    function draw(i: number) {
      const hi = cadreState.r > 0.35 ? hiRes.get(i) : undefined;
      const bmp = hi ?? store.getNearest(i);
      if (!bmp) return false;
      drawCover(ctx, bmp, dims.w, dims.h);
      lastDrawnHi = !!hi;
      return true;
    }

    /**
     * Écrit la rétraction. Deux propriétés composités par le GPU, sur deux
     * éléments qui n'ont pas de contenu à recalculer. Le canvas n'est pas touché.
     */
    function appliquerCadre() {
      const g = geometrie(cadreState.r, window.innerWidth, window.innerHeight, coteCourant);
      const s = styleCadre(g);
      const key = s.transform + s.clipPath;
      if (key === lastGeoKey) return;
      lastGeoKey = key;
      cadre.style.transform = s.transform;
      // N'écrire le clip que s'il a VRAIMENT changé : sur bureau il est constant,
      // et une écriture même identique suffit à faire repeindre certaines couches.
      if (s.clipPath !== lastClip) {
        cadre.style.clipPath = s.clipPath;
        lastClip = s.clipPath;
      }
      ombre.style.transform = s.transform;
      const rayonOmbre = g.radiusFixe ? g.radius / 0.54 : g.radius / g.scale;
      if (rayonOmbre !== lastRayon) {
        ombre.style.borderRadius = `${rayonOmbre.toFixed(2)}px`;
        lastRayon = rayonOmbre;
      }
      ombre.style.opacity = cadreState.r > 0.02 ? "1" : "0";
    }

    function setText(ref: React.RefObject<HTMLElement>, s: string) {
      if (ref.current && ref.current.textContent !== s) ref.current.textContent = s;
    }

    function tick(t: number) {
      if (destroyed) return;

      if (prevT) {
        frameTimes.push(t - prevT);
        if (frameTimes.length > 40) frameTimes.shift();
      }
      prevT = t;

      const p = proxy.p;
      const i = timeline.frameAt(p);

      if (i !== lastCenter) {
        store.setCenter(i);
        lastCenter = i;
      }

      const seg = timeline.segmentAt(p);
      if (seg.index !== lastSegIndex) {
        lastSegIndex = seg.index;
        const next = timeline.segments[seg.index + 1];
        if (seg.type === "hold" && next) store.preloadRange(next.frameFrom, next.frameTo);
        if (seg.type === "hold") chargerArret(seg.id);
        const prochain = timeline.segments.slice(seg.index + 1).find((s) => s.type === "hold");
        if (prochain) chargerArret(prochain.id);
        setText(dbg.seg, `${seg.id} (${seg.type})`);
      }

      /* Rétraction : cible binaire, transition temporelle de 550 ms, et seulement
         si le défilement est assez lent pour qu'on ait le temps de la voir. */
      const span = seg.vhEnd - seg.vhStart;
      const local = span > 0 ? (p * timeline.totalVh - seg.vhStart) / span : 1;
      if (lastP >= 0) vitesseVh = vitesseVh * 0.8 + Math.abs(p - lastP) * timeline.totalVh * 0.2;
      const lent = vitesseVh < VITESSE_MAX_RETRAIT;
      const cible = seg.type === "hold" && local > ENTREE && local < SORTIE && lent ? 1 : 0;

      // On compare l'ARRÊT visé, pas seulement la cible : deux arrêts adjacents
      // laisseraient la cible à 1 et le panneau ne changerait jamais.
      const vise = cible === 1 ? seg.id : "";
      if (vise !== arretActif) {
        arretActif = vise;
        if (vise) {
          const pan = panneaux.find((x) => x.id === vise);
          if (pan && pan.cote !== coteCourant) {
            coteCourant = pan.cote;
            lastGeoKey = "";
          }
          // Le plan suit le côté du texte (voir .visite-plan dans globals.css).
          textes.dataset.cote = coteCourant;
        }
        for (const a of articles) a.dataset.actif = String(a.dataset.panneau === arretActif);
        if (plan) plan.style.opacity = arretActif ? "1" : "0";
      }
      if (cible !== cibleCourante) {
        cibleCourante = cible;
        gsap.to(cadreState, {
          r: cible,
          duration: RETRAIT_DUREE,
          ease: EASE_CADRE,
          overwrite: true,
          onUpdate: wake,
        });
      }
      appliquerCadre();

      const veutHi = cadreState.r > 0.35 && hiRes.has(i);
      if (i !== lastDrawn || dirty || veutHi !== lastDrawnHi) {
        if (draw(i)) {
          lastDrawn = i;
          dirty = false;
        }
      }

      if (frameTimes.length > 8) {
        const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
        setText(dbg.fps, `${(1000 / avg).toFixed(0)} im/s`);
      }
      const st2 = store.stats();
      setText(dbg.frame, `${i} / ${manifest.frameCount - 1}${lastDrawnHi ? " · HD" : ""}`);
      setText(
        dbg.held,
        `${st2.held}/${st2.maxBitmaps} img · ${st2.decodedMo.toFixed(0)} Mo · ${st2.inflight} en vol${st2.failed ? ` · ${st2.failed} échecs` : ""}`
      );
      setText(dbg.net, `${(st2.bytesLoaded / 1048576).toFixed(1)} Mo · ${st2.framesFetched} requêtes`);
      setText(dbg.prog, `${(p * 100).toFixed(1)} % · retrait ${cadreState.r.toFixed(2)} · ${resizes} resize`);

      const stable =
        Math.abs(p - lastP) < 1e-5 && i === lastDrawn && Math.abs(cadreState.r - cibleCourante) < 1e-3;
      idle = stable ? idle + 1 : 0;
      lastP = p;

      if (idle > IDLE_FRAMES) {
        running = false;
        frameTimes = [];
        prevT = 0;
        setText(dbg.fps, "repos");
        return;
      }
      raf = requestAnimationFrame(tick);
    }

    function wake() {
      if (destroyed || running || !started) return;
      running = true;
      idle = 0;
      prevT = 0;
      raf = requestAnimationFrame(tick);
    }

    /* ── défilement ──────────────────────────────────────────────────────── */

    let lenis: Lenis | null = null;
    let tickerFn: ((time: number) => void) | null = null;

    if (!reduced) {
      lenis = new Lenis({ lerp, wheelMultiplier: 1, touchMultiplier: 1.4 });
      window.__lenis = lenis;
      lenis.on("scroll", ScrollTrigger.update);
      tickerFn = (time: number) => lenis!.raf(time * 1000);
      gsap.ticker.add(tickerFn);
      gsap.ticker.lagSmoothing(0);
    }

    const tween = gsap.to(proxy, {
      p: 1,
      ease: "none",
      scrollTrigger: {
        trigger: spacerRef.current!,
        start: "top top",
        end: "bottom bottom",
        scrub: reduced ? true : scrub,
        invalidateOnRefresh: true,
        onUpdate: wake,
        onRefresh: () => {
          dirty = true;
          lastGeoKey = "";
          wake();
        },
      },
    });
    const st = tween.scrollTrigger!;

    /* ── redimensionnement ───────────────────────────────────────────────────
       Le canvas n'est retaillé QUE sur un vrai redimensionnement de fenêtre —
       jamais pendant la rétraction. `canvasResizes()` le prouve au test. */

    const onResize = () => {
      dims = sizeCanvas(canvas);
      resizes++;
      dirty = true;
      lastGeoKey = "";
      lastClip = "";
      lastRayon = -1;
      placerTextes();
      ScrollTrigger.refresh();
      wake();
    };
    window.addEventListener("resize", onResize);

    /* ── clavier : un chapitre par touche, seulement dans la visite ───────── */

    const scrollToSegment = (index: number) => {
      const clamped = Math.max(0, Math.min(timeline.segments.length - 1, index));
      const y = st.start + timeline.progressAtSegment(clamped) * (st.end - st.start);
      if (lenis) lenis.scrollTo(y, { duration: 0.9 });
      else window.scrollTo({ top: y, behavior: "smooth" });
    };
    const onKey = (e: KeyboardEvent) => {
      if (window.scrollY < st.start - 4 || window.scrollY > st.end + 4) return;
      const cur = timeline.segmentAt(proxy.p).index;
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        scrollToSegment(cur + 1);
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        scrollToSegment(cur - 1);
      }
    };
    window.addEventListener("keydown", onKey);

    /* ── point d'accroche pour scripts/test-visite.mjs ────────────────────── */

    const handle: VisiteHandle = {
      ready: false,
      decodeKind: store.decodeKind,
      frameCount: manifest.frameCount,
      totalVh: timeline.totalVh,
      segments: timeline.segments.map((s) => ({
        id: s.id,
        type: s.type,
        vhStart: s.vhStart,
        vhEnd: s.vhEnd,
        frameFrom: s.frameFrom,
        frameTo: s.frameTo,
        piece: s.chapter.type === "hold" ? s.chapter.panel?.piece : undefined,
        bascule: s.chapter.type === "move" ? s.chapter.bascule : undefined,
      })),
      progress: () => proxy.p,
      frame: () => timeline.frameAt(proxy.p),
      drawn: () => lastDrawn,
      retrait: () => cadreState.r,
      canvasResizes: () => resizes,
      stats: () => store.stats(),
      scrollRange: () => [st.start, st.end],
    };
    window.__visite = handle;

    const first = timeline.segments[0];
    const firstEnd = Math.max(first?.frameTo ?? 0, manifest.preloadFrames - 1);
    store
      .warmup(0, firstEnd, (done, total) => setLoadPct(Math.round((done / total) * 100)))
      .then(() => {
        if (destroyed) return;
        store.unpin();
        started = true;
        setReady(true);
        dirty = true;
        appliquerCadre();
        wake();
        handle.ready = true;
      });

    return () => {
      destroyed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
      gsap.killTweensOf(cadreState);
      st.kill();
      tween.kill();
      if (tickerFn) gsap.ticker.remove(tickerFn);
      if (lenis) {
        lenis.destroy();
        window.__lenis = undefined;
      }
      hiRes.forEach((b) => b.close());
      hiRes.clear();
      store.destroy();
      window.__visite = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manifest, panneaux]);

  const info = manifest.variants[variant] ?? Object.values(manifest.variants)[0];

  return (
    <section
      id="visite"
      ref={spacerRef}
      style={{ height: `${manifest.totalScrollVh}dvh` }}
      className="relative bg-nuit"
    >
      <div className="sticky top-0 h-[100dvh] w-full overflow-hidden bg-nuit">
        {/* Ombre portée du panneau : même transform que le cadre, mais non
            clippée — un élément qui se clippe ne peut pas porter son ombre.
            Ombre volontairement courte : un flou de 120 px sur une couche plein
            écran doit être re-rasterisé à chaque palier d'échelle, et Firefox y
            passait 50 ms au 95ᵉ centile pendant la rétraction. */}
        <div
          ref={ombreRef}
          aria-hidden="true"
          className="visite-ombre absolute inset-0 opacity-0 will-change-transform"
          style={{ boxShadow: "0 14px 34px -14px rgba(0,0,0,.9), 0 0 0 1px rgba(241,237,230,.08)" }}
        />

        {/* Le cadre. Seuls `transform` et `clip-path` changent. */}
        <div ref={cadreRef} className="absolute inset-0 will-change-transform">
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
        </div>

        {/* Colonne de texte — rendue côté serveur, donc lisible et indexable. */}
        <div ref={textesRef} className="visite-textes pointer-events-none absolute inset-0 z-10">
          {panneaux.map((p) => (
            <article key={p.id} data-panneau={p.id} data-cote={p.cote} data-actif="false">
              {p.surTitre ? (
                <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-brume">{p.surTitre}</p>
              ) : null}

              <h2 className="mt-4 font-display text-[clamp(2.2rem,4.4vw,4.4rem)] font-light leading-[0.95] tracking-[-0.02em] text-chaux">
                {p.titre.map((l) => (
                  <span key={l} className="block">
                    {l}
                  </span>
                ))}
              </h2>

              {p.faits.length ? (
                <ul className="mt-7 space-y-2.5">
                  {p.faits.map((f) => (
                    <li key={f} className="flex gap-3 font-tight text-[15px] font-light leading-snug text-chaux/75">
                      <span aria-hidden="true" className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-patine" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              <p className="mt-7 flex flex-wrap items-baseline gap-x-5 gap-y-1 font-mono text-[12px] tracking-[0.06em]">
                <span
                  data-todo={p.superficie.todo || undefined}
                  className={p.superficie.todo ? "text-yellow-400/80" : "text-chaux"}
                >
                  {p.superficie.texte}
                </span>
                {p.prix ? (
                  <span
                    data-todo={p.prix.todo || undefined}
                    className={p.prix.todo ? "text-yellow-400/80" : "text-cuivre-clair"}
                  >
                    {p.prix.texte}
                  </span>
                ) : null}
              </p>
            </article>
          ))}

          {planSvg ? (
            <div data-plan className="visite-plan">
              <PlanAxono svg={planSvg} />
            </div>
          ) : null}
        </div>

        {!ready ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-nuit text-chaux">
            <div className="h-px w-56 bg-chaux/20">
              <div className="h-full bg-cuivre transition-[width] duration-150" style={{ width: `${loadPct}%` }} />
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-brume">chargement {loadPct} %</p>
          </div>
        ) : null}

        {showDebug ? (
          <div className="absolute right-3 top-20 z-30 w-72 rounded bg-black/80 p-3 font-mono text-[11px] leading-relaxed text-lime-300">
            <div>
              image <span ref={dbg.frame}>—</span>
            </div>
            <div>
              chapitre <span ref={dbg.seg}>—</span>
            </div>
            <div>
              débit <span ref={dbg.fps}>—</span>
            </div>
            <div>
              <span ref={dbg.held}>—</span>
            </div>
            <div>
              réseau <span ref={dbg.net}>—</span>
            </div>
            <div>
              scroll <span ref={dbg.prog}>—</span>
            </div>
            <div className="mt-2 border-t border-lime-300/25 pt-2 opacity-60">
              {variant} {info?.width}×{info?.height} · {manifest.frameCount} img · {manifest.fps} im/s
              <br />
              décodage : {decodeKind === "worker" ? "fil dédié" : "fil principal (repli)"}
              <br />
              réparation : {Array.isArray(manifest.repair) ? manifest.repair.join(",") : manifest.repair}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
