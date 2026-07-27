/**
 * Fil de décodage.
 *
 * Mesuré sur Firefox : 89 à 97 % des images à plus de 33 ms coïncidaient avec un
 * `createImageBitmap` en cours. Chromium déporte ce décodage tout seul, Firefox
 * le fait sur le fil principal — d'où le hoquet en scroll rapide.
 *
 * On fait donc le `fetch` ET le décodage ici, et on renvoie l'ImageBitmap en
 * transfert (il est Transferable : aucune copie).
 */

const controllers = new Map();

self.onmessage = async (e) => {
  const { id, url, cancel } = e.data;

  if (cancel) {
    const ac = controllers.get(id);
    if (ac) {
      ac.abort();
      controllers.delete(id);
    }
    return;
  }

  const ac = new AbortController();
  controllers.set(id, ac);

  try {
    const res = await fetch(url, { signal: ac.signal, cache: "force-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);
    if (ac.signal.aborted) {
      bitmap.close();
      self.postMessage({ id, aborted: true });
      return;
    }
    self.postMessage({ id, bitmap, bytes: blob.size }, [bitmap]);
  } catch (err) {
    const aborted = err && (err.name === "AbortError" || ac.signal.aborted);
    self.postMessage({ id, aborted: !!aborted, error: aborted ? undefined : String(err) });
  } finally {
    controllers.delete(id);
  }
};
