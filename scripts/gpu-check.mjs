#!/usr/bin/env node
/**
 * Quel moteur de rendu chaque navigateur de test utilise-t-il réellement ?
 *
 * Sans cette vérification, un mauvais résultat de fluidité sur un moteur ne veut
 * rien dire : un navigateur rendu en logiciel ne peut pas compositer une
 * animation de transformation, quoi qu'on écrive dans la page.
 */
import { chromium, firefox, webkit } from "playwright";

for (const [nom, moteur] of [
  ["chromium", chromium],
  ["firefox", firefox],
  ["webkit", webkit],
]) {
  let b;
  try {
    b = await moteur.launch();
    const p = await b.newPage();
    const info = await p.evaluate(() => {
      const c = document.createElement("canvas");
      const gl = c.getContext("webgl2") ?? c.getContext("webgl");
      if (!gl) return { renderer: "aucun contexte WebGL", ua: navigator.userAgent };
      const d = gl.getExtension("WEBGL_debug_renderer_info");
      return {
        renderer: d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        vendor: d ? gl.getParameter(d.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
        ua: navigator.userAgent,
      };
    });
    console.log(`\n  ${nom}`);
    console.log(`    rendu : ${info.renderer}`);
    if (info.vendor) console.log(`    vendeur : ${info.vendor}`);
    console.log(`    ua : ${info.ua}`);
  } catch (e) {
    console.log(`\n  ${nom} : ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    await b?.close();
  }
}
console.log("");
