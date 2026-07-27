/** Dimensionnement et rendu « cover » du canvas plein écran. */

/** Le DPR n'est pas plafonné à 1 : sur un écran Retina l'image doit rester nette.
 *  Il est plafonné à 2 : au-delà on quadruple le coût de fill pour rien. */
export const MAX_DPR = 2;

export function sizeCanvas(canvas: HTMLCanvasElement): { w: number; h: number; dpr: number } {
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const pw = Math.max(1, Math.round(w * dpr));
  const ph = Math.max(1, Math.round(h * dpr));
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw;
    canvas.height = ph;
  }
  return { w: pw, h: ph, dpr };
}

/** Dessine l'image en remplissant le canvas, sans déformation, recadrée au centre. */
export function drawCover(ctx: CanvasRenderingContext2D, src: ImageBitmap, w: number, h: number) {
  const scale = Math.max(w / src.width, h / src.height);
  const dw = src.width * scale;
  const dh = src.height * scale;
  ctx.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh);
}
