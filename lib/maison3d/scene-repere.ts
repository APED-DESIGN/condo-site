/**
 * Repère commun plan ↔ monde.
 *
 * Module minuscule et isolé pour une raison précise : `scene.ts` a besoin de
 * `projection.ts`, qui a besoin du repère. Le sortir ici évite l'import
 * circulaire.
 *
 * Le plan a x vers l'est et y vers le SUD (l'avant de la maison est en y
 * croissant). On envoie le y du plan sur le z du monde, sans miroir, et on
 * centre l'emprise bâtie sur l'origine pour que l'orbite tourne autour de la
 * maison et non autour d'un coin.
 */

import type { Pt } from "@/data/tours/maison-01-plan";

export const CENTRE_X = 53;
export const CENTRE_Y = 51;

export const versMonde = ([x, y]: Pt): [number, number] => [
  x - CENTRE_X,
  y - CENTRE_Y,
];
