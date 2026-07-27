"use client";

import { useEffect, useRef } from "react";
import { Viewer } from "@photo-sphere-viewer/core";
import { VirtualTourPlugin } from "@photo-sphere-viewer/virtual-tour-plugin";
import { GalleryPlugin } from "@photo-sphere-viewer/gallery-plugin";
import { CompassPlugin } from "@photo-sphere-viewer/compass-plugin";
import { AutorotatePlugin } from "@photo-sphere-viewer/autorotate-plugin";
import { GyroscopePlugin } from "@photo-sphere-viewer/gyroscope-plugin";
import "@photo-sphere-viewer/core/index.css";
import "@photo-sphere-viewer/virtual-tour-plugin/index.css";
import "@photo-sphere-viewer/gallery-plugin/index.css";
import "@photo-sphere-viewer/compass-plugin/index.css";
import {
  panoHdUrl,
  panoUrl,
  thumbUrl,
  type Node360,
  type Tour360Data,
} from "@/data/tours/maison-01";

export type Tour360Api = {
  goTo: (nodeId: string) => void;
};

type Props = {
  tour: Tour360Data;
  startNodeId: string;
  /** Notifie le parent (nom de pièce, mini-plan). */
  onNodeChange: (node: Node360) => void;
  /** Remonte l'API (téléportation depuis le mini-plan). */
  onReady: (api: Tour360Api) => void;
  onWebglError: () => void;
};

/**
 * Visionneuse 360° — Photo Sphere Viewer + VirtualTour.
 * Client uniquement (importée via next/dynamic, ssr: false).
 */
export default function Tour360({
  tour,
  startNodeId,
  onNodeChange,
  onReady,
  onWebglError,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  /* Les callbacks vivent dans des refs : le viewer n'est créé qu'une fois. */
  const callbacksRef = useRef({ onNodeChange, onReady, onWebglError });
  callbacksRef.current = { onNodeChange, onReady, onWebglError };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let viewer: Viewer | undefined;

    /* Création différée d'un tick : en dev, React StrictMode monte/démonte/
       remonte l'effet — détruire un viewer PSV en pleine initialisation du
       VirtualTour laisse une promesse orpheline. Seul le montage survivant
       crée le viewer. */
    const timer = setTimeout(() => {
      viewer = createViewer(container);
    }, 50);

    const createViewer = (el: HTMLDivElement): Viewer | undefined => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const useHd = window.innerWidth >= 1200;
    const byId = new Map(tour.nodes.map((n) => [n.id, n]));

    let viewer: Viewer;
    try {
      viewer = new Viewer({
        container: el,
        loadingTxt: "Chargement de la visite…",
        defaultYaw: `${byId.get(startNodeId)?.defaultYaw ?? 0}deg`,
        minFov: 30,
        maxFov: 90,
        defaultZoomLvl: 50,
        keyboard: "always",
        touchmoveTwoFingers: false,
        navbar: ["zoom", "gallery", "caption", "gyroscope", "fullscreen"],
        lang: {
          zoom: "Zoom",
          zoomOut: "Dézoomer",
          zoomIn: "Zoomer",
          fullscreen: "Plein écran",
          loading: "Chargement…",
          menu: "Menu",
          close: "Fermer",
          twoFingers: "Utilisez deux doigts pour naviguer",
          ctrlZoom: "Utilisez ctrl + molette pour zoomer",
          loadError: "Le panorama n'a pas pu être chargé",
          webglError: "Votre navigateur ne supporte pas WebGL",
        },
        plugins: [
          /* La galerie doit être initialisée avant le VirtualTour pour que
             celui-ci la peuple avec les vignettes des pièces. */
          GalleryPlugin.withConfig({
            visibleOnLoad: false,
            thumbnailSize: { width: 120, height: 60 },
          }),
          VirtualTourPlugin.withConfig({
            positionMode: "manual",
            renderMode: "3d",
            preload: true,
            transitionOptions: {
              showLoader: false,
              speed: reduced ? "300rpm" : "20rpm",
              effect: "fade",
              rotation: false,
            },
            startNodeId,
            nodes: tour.nodes.map((n) => ({
              id: n.id,
              panorama: useHd ? panoHdUrl(tour, n) : panoUrl(tour, n),
              thumbnail: thumbUrl(tour, n),
              name: n.name,
              caption: n.caption ? `<b>${n.name}</b> — ${n.caption}` : n.name,
              links: n.links.map((l) => ({
                nodeId: l.to,
                position: { yaw: `${l.yaw}deg`, pitch: `${l.pitch ?? -12}deg` },
              })),
            })),
          }),
          CompassPlugin.withConfig({ size: "88px" }),
          /* Gyroscope mobile : bouton affiché seulement si l'appareil le
             supporte ; la permission iOS 13+ est demandée par le plugin
             au premier clic (touchmove requis par Apple). */
          GyroscopePlugin.withConfig({ touchmove: true, absolutePosition: false }),
          ...(reduced
            ? []
            : [
                AutorotatePlugin.withConfig({
                  autostartDelay: 12000,
                  autostartOnIdle: true,
                  autorotateSpeed: "0.6rpm",
                }),
              ]),
        ],
      });
    } catch {
      callbacksRef.current.onWebglError();
      return undefined;
    }

    const tourPlugin = viewer.getPlugin(VirtualTourPlugin) as VirtualTourPlugin;

    tourPlugin.addEventListener("node-changed", ({ node }) => {
      const data = byId.get(node.id);
      if (!data) return;
      /* Orientation d'arrivée soignée : chaque pièce a son point de vue. */
      viewer.rotate({ yaw: `${data.defaultYaw}deg`, pitch: "0deg" });
      callbacksRef.current.onNodeChange(data);
    });

    if (process.env.NODE_ENV !== "production") {
      /* Hook de calibration/tests (dev seulement). */
      (window as unknown as Record<string, unknown>).__tour360 = {
        viewer,
        tourPlugin,
        data: tour,
      };
    }

    viewer.addEventListener(
      "ready",
      () => {
        const start = byId.get(startNodeId);
        if (start) callbacksRef.current.onNodeChange(start);
        callbacksRef.current.onReady({
          goTo: (nodeId: string) => {
            tourPlugin.setCurrentNode(nodeId).catch(() => {});
          },
        });
      },
      { once: true }
    );

    return viewer;
    };

    return () => {
      clearTimeout(timer);
      viewer?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour, startNodeId]);

  return <div ref={containerRef} className="psv-theme h-full w-full" />;
}
