"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import * as THREE from "three";
import { construireScene, versMonde, poserOpacite, TEINTES } from "@/lib/maison3d/scene";
import { creerPilote, type ModeVue, type Pilote } from "@/lib/maison3d/camera";
import {
  ESPACES,
  EXTERIEURS,
  altitude,
  centre,
  type Niveau,
} from "@/data/tours/maison-01-plan";

export type SurvolInfo = { nom: string; x: number; y: number } | null;

export type ScenePlanApi = {
  /** Plonge vers le nœud puis résout : le parent enchaîne sur la visite. */
  plongerVersNoeud: (noeudId: string) => Promise<void>;
  imagesParSeconde: () => number;
};

type Props = {
  actif: boolean;
  mode: ModeVue;
  niveau: Niveau | "tous";
  reduit: boolean;
  onSurvol: (info: SurvolInfo) => void;
  /** Clic sur un espace visitable ou un repère : le parent décide. */
  onEntrer: (noeudId: string) => void;
  onPret: () => void;
  apiRef: React.MutableRefObject<ScenePlanApi | null>;
};

/** Opacité d'un niveau selon celui qui est choisi. */
function opaciteNiveau(niveau: Niveau, choisi: Niveau | "tous"): number {
  if (choisi === "tous") return 1;
  if (niveau === choisi) return 1;
  /* « Les étages au-dessus s'estompent » — sans disparaître : on garde le
     sens du volume. Ce qui est dessous reste lisible en sourdine. */
  const rang = { rdc: 0, etage: 1 };
  return rang[niveau] > rang[choisi] ? 0.1 : 0.45;
}

/**
 * Étiquettes de pièces du mode plan.
 *
 * Positionnées impérativement depuis la boucle de rendu, jamais par l'état
 * React : une projection par image passée dans un `useState` provoquerait un
 * rendu React à 60 Hz.
 */
type Etiquette = { el: HTMLSpanElement; ancre: THREE.Vector3; niveau: Niveau };

function creerEtiquettes(conteneur: HTMLDivElement): Etiquette[] {
  /* Le conteneur est vidé d'abord : en dev, React StrictMode monte, démonte et
     remonte l'effet, et sans cela les étiquettes s'accumulent en double. */
  conteneur.replaceChildren();
  return ESPACES.filter((e) => !e.vide).map((e) => {
    const el = document.createElement("span");
    el.textContent = e.nom;
    el.dataset.testid = `etiquette-${e.id}`;
    /* Le centrage passe par le transform lui-même : la boucle écrit
       `style.transform`, qui écraserait des classes de translation.

       Pastille sombre translucide, et non du texte nu : depuis que les sols
       portent la photo réelle, aucune couleur de texte ne tient sur toutes les
       pièces à la fois — un plancher de bois, une tuile claire et un tapis
       sombre se suivent d'une pièce à l'autre. */
    el.className =
      "pointer-events-none absolute left-0 top-0 whitespace-nowrap rounded-full px-2 py-[3px] text-[9px] uppercase tracking-[0.16em] backdrop-blur-[2px] transition-opacity duration-300";
    const visitable = e.noeuds.length > 0;
    el.style.background = visitable ? "rgba(12,15,18,0.72)" : "rgba(12,15,18,0.5)";
    el.style.color = visitable ? "rgba(241,237,230,0.95)" : "rgba(152,161,168,0.75)";
    el.style.opacity = "0";
    conteneur.appendChild(el);
    const [cx, cy] = centre(e.contour);
    const [x, z] = versMonde([cx, cy]);
    return { el, ancre: new THREE.Vector3(x, altitude(e.niveau) + 0.4, z), niveau: e.niveau };
  });
}

export default function ScenePlan({
  actif,
  mode,
  niveau,
  reduit,
  onSurvol,
  onEntrer,
  onPret,
  apiRef,
}: Props) {
  const hoteRef = useRef<HTMLDivElement>(null);
  const etiquettesRef = useRef<HTMLDivElement>(null);
  const [erreurWebgl, setErreurWebgl] = useState(false);

  /* Tout l'état three.js vit hors de React : aucun rendu React par frame. */
  const monde = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: ReturnType<typeof construireScene>;
    pilote: Pilote;
    raycaster: THREE.Raycaster;
    pointeur: THREE.Vector2;
    /** Opacités visées par niveau, atteintes en 350 ms. */
    cibleOpacite: Record<Niveau, number>;
    opaciteCourante: Record<Niveau, number>;
    survole: THREE.Mesh | null;
    fps: number;
    pointeurDansCanvas: boolean;
    etiquettes: Etiquette[];
    /** Le mode courant, lu par la boucle sans repasser par React. */
    modeRendu: ModeVue;
    niveauChoisi: Niveau | "tous";
  } | null>(null);

  const callbacks = useRef({ onSurvol, onEntrer, onPret });
  callbacks.current = { onSurvol, onEntrer, onPret };
  /* Le niveau courant est lu au moment d'une bascule de mode, mais un
     changement de niveau ne doit PAS relancer de bascule : il passe donc par
     une ref, pas par les dépendances de l'effet. */
  const niveauRef = useRef(niveau);
  niveauRef.current = niveau;

  /* ── Montage ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    const hote = hoteRef.current;
    /* Capturé ici, pas lu dans le nettoyage : au démontage la ref peut déjà
       pointer ailleurs (avertissement react-hooks/exhaustive-deps). */
    const hoteEtiquettes = etiquettesRef.current;
    if (!hote || !actif) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
    } catch {
      setErreurWebgl(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(hote.clientWidth, hote.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "none";
    hote.appendChild(renderer.domElement);

    const scene = construireScene();
    const pilote = creerPilote(renderer.domElement, reduit);
    pilote.redimensionner(hote.clientWidth, hote.clientHeight);

    monde.current = {
      renderer,
      scene,
      pilote,
      raycaster: new THREE.Raycaster(),
      pointeur: new THREE.Vector2(-2, -2),
      cibleOpacite: { rdc: 1, etage: 1 },
      opaciteCourante: { rdc: 1, etage: 1 },
      survole: null,
      fps: 0,
      pointeurDansCanvas: false,
      etiquettes: hoteEtiquettes ? creerEtiquettes(hoteEtiquettes) : [],
      modeRendu: mode === "plan" ? "plan" : "carto",
      niveauChoisi: niveau,
    };

    /* ── Redimensionnement ───────────────────────────────────────────── */
    const observateur = new ResizeObserver(() => {
      const m = monde.current;
      if (!m) return;
      const l = hote.clientWidth;
      const h = hote.clientHeight;
      if (l === 0 || h === 0) return;
      m.renderer.setSize(l, h);
      m.pilote.redimensionner(l, h);
    });
    observateur.observe(hote);

    /* ── Pointeur ────────────────────────────────────────────────────── */
    const surPointeur = (e: PointerEvent) => {
      const m = monde.current;
      if (!m) return;
      const r = renderer.domElement.getBoundingClientRect();
      m.pointeur.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        -((e.clientY - r.top) / r.height) * 2 + 1
      );
      m.pointeurDansCanvas = true;
    };
    const surSortie = () => {
      const m = monde.current;
      if (!m) return;
      m.pointeur.set(-2, -2);
      m.pointeurDansCanvas = false;
      callbacks.current.onSurvol(null);
    };
    renderer.domElement.addEventListener("pointermove", surPointeur);
    renderer.domElement.addEventListener("pointerleave", surSortie);

    /* Clic : on n'entre que si le pointeur n'a pas servi à tourner la vue. */
    let departClic: { x: number; y: number } | null = null;
    const surDown = (e: PointerEvent) => {
      departClic = { x: e.clientX, y: e.clientY };
    };
    const surUp = (e: PointerEvent) => {
      const m = monde.current;
      if (!m || !departClic) return;
      const bouge = Math.hypot(e.clientX - departClic.x, e.clientY - departClic.y);
      departClic = null;
      if (bouge > 6 || e.button !== 0) return;
      const touche = pointer(m);
      if (touche?.noeudId) callbacks.current.onEntrer(touche.noeudId);
    };
    renderer.domElement.addEventListener("pointerdown", surDown);
    renderer.domElement.addEventListener("pointerup", surUp);

    /* ── Boucle ──────────────────────────────────────────────────────── */
    let brut = 0;
    let dernier = performance.now();
    let lissage = 60;
    let compteur = 0;
    let fenetre = dernier;

    const boucle = () => {
      brut = requestAnimationFrame(boucle);
      const m = monde.current;
      if (!m) return;

      const maintenant = performance.now();
      const dt = Math.min(64, maintenant - dernier);
      dernier = maintenant;

      compteur++;
      if (maintenant - fenetre >= 500) {
        lissage = (compteur * 1000) / (maintenant - fenetre);
        m.fps = Math.round(lissage);
        compteur = 0;
        fenetre = maintenant;
      }

      m.pilote.majFrame(dt);
      fondu(m, dt);
      if (m.pointeurDansCanvas && !m.pilote.enTransition()) survol(m);

      m.renderer.render(m.scene.scene, m.pilote.cameraActive());
      placerEtiquettes(m);
    };
    brut = requestAnimationFrame(boucle);

    if (process.env.NODE_ENV !== "production") {
      (window as unknown as Record<string, unknown>).__maison3d = {
        fps: () => monde.current?.fps ?? 0,
        mode: () => monde.current?.pilote.mode(),
        enTransition: () => monde.current?.pilote.enTransition() ?? false,
        infoRendu: () => monde.current?.renderer.info.memory,
        /* État de la projection des panoramas, pièce par pièce. C'est la
           vérification exacte que la cartographie montre de la photo et non
           de la géométrie nue — plus fiable qu'une mesure de pixels. */
        projection: () => {
          const m = monde.current;
          if (!m) return [];
          const out: { espace: string; projete: boolean; texture: boolean }[] = [];
          for (const ng of m.scene.niveaux)
            for (const sol of ng.sols) {
              const mat = sol.material as THREE.ShaderMaterial;
              const u = mat.uniforms;
              out.push({
                espace: String(sol.userData.espaceId),
                projete: !!u?.panoA,
                texture: !!u?.panoA?.value?.image,
              });
            }
          return out;
        },
      };
    }

    /* On n'annonce « prêt » qu'une fois les panoramas projetés chargés :
       autrement l'utilisateur voit un volume noir avant de voir la maison. */
    scene.texturesPretes.then(() => {
      if (monde.current) callbacks.current.onPret();
    });

    return () => {
      cancelAnimationFrame(brut);
      observateur.disconnect();
      renderer.domElement.removeEventListener("pointermove", surPointeur);
      renderer.domElement.removeEventListener("pointerleave", surSortie);
      renderer.domElement.removeEventListener("pointerdown", surDown);
      renderer.domElement.removeEventListener("pointerup", surUp);

      hoteEtiquettes?.replaceChildren();
      const m = monde.current;
      monde.current = null;
      if (!m) return;
      m.pilote.detruire();
      /* Libération explicite : sans elle, vingt ouvertures font vingt scènes
         en mémoire GPU. C'est ce que vérifie le test de fuite. */
      for (const j of m.scene.jetables) j.dispose();
      m.scene.scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry?.dispose();
          const mat = mesh.material;
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
          else mat?.dispose();
        }
      });
      m.renderer.dispose();
      m.renderer.forceContextLoss();
      m.renderer.domElement.remove();
      if (process.env.NODE_ENV !== "production")
        delete (window as unknown as Record<string, unknown>).__maison3d;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actif, reduit]);

  /* ── Fondu des niveaux, 350 ms ───────────────────────────────────────── */
  function fondu(m: NonNullable<typeof monde.current>, dt: number) {
    const pas = dt / 350;
    let bouge = false;
    for (const ng of m.scene.niveaux) {
      const vise = m.cibleOpacite[ng.niveau];
      const cur = m.opaciteCourante[ng.niveau];
      if (Math.abs(vise - cur) < 0.002) {
        if (cur !== vise) m.opaciteCourante[ng.niveau] = vise;
        continue;
      }
      bouge = true;
      const suivant = cur + Math.sign(vise - cur) * Math.min(pas, Math.abs(vise - cur));
      m.opaciteCourante[ng.niveau] = suivant;
      for (const mat of ng.materiaux) poserOpacite(mat, suivant);
      ng.groupe.visible = suivant > 0.02;
      Array.from(m.scene.reperes.values()).forEach((repere) => {
        if (repere.parent !== ng.groupe) return;
        const mat = repere.material as THREE.MeshStandardMaterial;
        mat.opacity = suivant;
        repere.visible = suivant > 0.2;
      });
    }
    return bouge;
  }

  /* ── Étiquettes ──────────────────────────────────────────────────────── */
  function placerEtiquettes(m: NonNullable<typeof monde.current>) {
    /* Les noms ne servent qu'en plan : en volume ils se superposeraient aux
       murs et au relief, et le survol dit déjà où l'on est.
       Et seulement sur un niveau ISOLÉ : vus du dessus, deux niveaux empilés
       superposent leurs libellés au même endroit — « Aire ouverte » par-dessus
       « Corridor », illisible. */
    const visible =
      m.modeRendu === "plan" && m.niveauChoisi !== "tous" && !m.pilote.enTransition();
    const cam = m.pilote.cameraActive();
    const r = m.renderer.domElement;
    const l = r.clientWidth;
    const h = r.clientHeight;

    for (const et of m.etiquettes) {
      if (!visible || et.niveau !== m.niveauChoisi) {
        if (et.el.style.opacity !== "0") et.el.style.opacity = "0";
        continue;
      }
      const p = et.ancre.clone().project(cam);
      if (p.z > 1) {
        et.el.style.opacity = "0";
        continue;
      }
      const x = ((p.x + 1) / 2) * l;
      const y = ((-p.y + 1) / 2) * h;
      et.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      et.el.style.opacity = "1";
    }
  }

  /* ── Pointage ────────────────────────────────────────────────────────── */
  function pointer(m: NonNullable<typeof monde.current>) {
    m.raycaster.setFromCamera(m.pointeur, m.pilote.cameraActive());
    const cibles: THREE.Object3D[] = [];
    for (const ng of m.scene.niveaux)
      if (m.opaciteCourante[ng.niveau] > 0.5) cibles.push(...ng.sols);
    cibles.push(...m.scene.exterieur.children);
    Array.from(m.scene.reperes.values()).forEach((r) => {
      if (r.visible) cibles.push(r);
    });

    const touches = m.raycaster.intersectObjects(cibles, false);
    for (const t of touches) {
      const d = t.object.userData;
      if (d.repere) return { mesh: t.object as THREE.Mesh, noeudId: d.noeudId as string, nom: d.nom as string, point: t.point };
      if (d.visitable || d.exterieur) {
        const noeuds = (d.noeuds as string[] | undefined) ?? espaceExtNoeuds(d.espaceId as string);
        if (!noeuds?.length) continue;
        return { mesh: t.object as THREE.Mesh, noeudId: noeuds[0], nom: d.nom as string, point: t.point };
      }
    }
    return null;
  }

  function survol(m: NonNullable<typeof monde.current>) {
    const touche = pointer(m);
    const nouveau = touche?.mesh ?? null;
    if (nouveau !== m.survole) {
      if (m.survole) marquerSurvol(m.survole, false);
      if (nouveau) marquerSurvol(nouveau, true);
      m.survole = nouveau;
      m.renderer.domElement.style.cursor = nouveau ? "pointer" : "grab";
    }
    if (touche) {
      const p = touche.point.clone().project(m.pilote.cameraActive());
      const r = m.renderer.domElement.getBoundingClientRect();
      callbacks.current.onSurvol({
        nom: touche.nom,
        x: ((p.x + 1) / 2) * r.width,
        y: ((-p.y + 1) / 2) * r.height,
      });
    } else callbacks.current.onSurvol(null);
  }

  /* Le survol passe par l'uniforme `survol` sur les surfaces projetées, et par
     la couleur sur les matériaux standard (repères, espaces non visités). */
  function marquerSurvol(mesh: THREE.Mesh, actif: boolean) {
    const mat = mesh.material as THREE.Material;
    const shader = mat as THREE.ShaderMaterial;
    if (shader.uniforms?.survol) {
      shader.uniforms.survol.value = actif ? 1 : 0;
      return;
    }
    const std = mat as THREE.MeshStandardMaterial;
    if (mesh.userData.repere) {
      std.color.setHex(actif ? TEINTES.cuivreClair : TEINTES.cuivre);
      std.emissive?.setHex(actif ? 0x5a2f10 : 0x2a1405);
      return;
    }
    std.emissive?.setHex(actif ? 0x2a2620 : 0x000000);
  }

  /* ── Réactions aux props ─────────────────────────────────────────────── */
  useEffect(() => {
    const m = monde.current;
    if (!m) return;
    m.modeRendu = mode;
    const n = niveauRef.current;
    m.pilote.basculer(mode, n === "tous" ? null : n, false);
  }, [mode]);

  useEffect(() => {
    const m = monde.current;
    if (!m) return;
    m.niveauChoisi = niveau;
    m.cibleOpacite = {
      rdc: opaciteNiveau("rdc", niveau),
      etage: opaciteNiveau("etage", niveau),
    };
    /* Choisir un étage change ce qu'on montre, pas d'où on le regarde. */
    m.pilote.changerNiveau(niveau === "tous" ? null : niveau);
  }, [niveau]);

  /* ── API exposée au parent ───────────────────────────────────────────── */
  const plongerVersNoeud = useCallback(async (noeudId: string) => {
    const m = monde.current;
    if (!m) return;
    const repere = m.scene.reperes.get(noeudId);
    if (!repere) return;
    const position = new THREE.Vector3();
    repere.getWorldPosition(position);
    await m.pilote.plongerVers(position, false);
  }, []);

  useImperativeHandle(
    apiRef,
    (): ScenePlanApi => ({
      plongerVersNoeud,
      imagesParSeconde: () => monde.current?.fps ?? 0,
    }),
    [plongerVersNoeud]
  );

  if (erreurWebgl)
    return (
      <div className="flex h-full w-full items-center justify-center px-6">
        <p className="max-w-sm text-center text-sm leading-relaxed text-bone/60">
          Votre navigateur ne supporte pas WebGL : la cartographie et le plan ne
          peuvent pas s&apos;afficher.
        </p>
      </div>
    );

  return (
    <div className="relative h-full w-full">
      <div ref={hoteRef} className="h-full w-full" data-testid="scene-plan" />
      <div
        ref={etiquettesRef}
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      />
    </div>
  );
}

/** Nœuds d'un espace extérieur, retrouvés par son id. */
function espaceExtNoeuds(id: string): string[] {
  return [...(EXTERIEURS.find((e) => e.id === id)?.noeuds ?? [])];
}
