/**
 * Décodeur d'images — sur un fil dédié quand c'est possible.
 *
 * Deux implémentations derrière la même interface :
 *   · `WorkerDecoder`  — fetch + createImageBitmap dans un pool de workers,
 *                        l'ImageBitmap revient en transfert (aucune copie) ;
 *   · `InlineDecoder`  — repli sur le fil principal si les workers ne sont pas
 *                        disponibles (contexte restreint, navigateur ancien).
 *
 * Le repli n'est pas théorique : il garde le moteur fonctionnel partout, au prix
 * du hoquet que le worker évite.
 */

export interface DecodedFrame {
  bitmap: ImageBitmap;
  bytes: number;
}

export interface Decoder {
  readonly kind: "worker" | "inline";
  readonly lanes: number;
  decode(id: number, url: string): Promise<DecodedFrame>;
  cancel(id: number): void;
  destroy(): void;
}

class AbortedError extends Error {
  constructor() {
    super("aborted");
    this.name = "AbortError";
  }
}

export const estAnnulation = (e: unknown) =>
  e instanceof DOMException ? e.name === "AbortError" : e instanceof Error && e.name === "AbortError";

/* ── fil dédié ──────────────────────────────────────────────────────────────── */

interface Attente {
  resolve: (f: DecodedFrame) => void;
  reject: (e: unknown) => void;
  worker: Worker;
}

class WorkerDecoder implements Decoder {
  readonly kind = "worker" as const;
  private workers: Worker[] = [];
  private pending = new Map<number, Attente>();
  private next = 0;

  constructor(lanes: number) {
    for (let i = 0; i < lanes; i++) {
      const w = new Worker(new URL("./decode.worker.js", import.meta.url));
      w.onmessage = (e: MessageEvent) => this.onMessage(e);
      this.workers.push(w);
    }
  }

  get lanes() {
    return this.workers.length;
  }

  private onMessage(e: MessageEvent) {
    const { id, bitmap, bytes, aborted, error } = e.data as {
      id: number;
      bitmap?: ImageBitmap;
      bytes?: number;
      aborted?: boolean;
      error?: string;
    };
    const att = this.pending.get(id);
    if (!att) {
      // Le demandeur a disparu entre-temps : ne pas garder le bitmap en vie.
      bitmap?.close();
      return;
    }
    this.pending.delete(id);
    if (aborted) att.reject(new AbortedError());
    else if (error || !bitmap) att.reject(new Error(error ?? "décodage sans image"));
    else att.resolve({ bitmap, bytes: bytes ?? 0 });
  }

  decode(id: number, url: string) {
    return new Promise<DecodedFrame>((resolve, reject) => {
      const worker = this.workers[this.next++ % this.workers.length];
      this.pending.set(id, { resolve, reject, worker });
      worker.postMessage({ id, url });
    });
  }

  cancel(id: number) {
    const att = this.pending.get(id);
    if (!att) return;
    this.pending.delete(id);
    att.worker.postMessage({ id, cancel: true });
    att.reject(new AbortedError());
  }

  destroy() {
    this.pending.forEach((a) => a.reject(new AbortedError()));
    this.pending.clear();
    this.workers.forEach((w) => w.terminate());
    this.workers = [];
  }
}

/* ── repli sur le fil principal ─────────────────────────────────────────────── */

class InlineDecoder implements Decoder {
  readonly kind = "inline" as const;
  readonly lanes = 1;
  private controllers = new Map<number, AbortController>();

  async decode(id: number, url: string): Promise<DecodedFrame> {
    const ac = new AbortController();
    this.controllers.set(id, ac);
    try {
      const res = await fetch(url, { signal: ac.signal, cache: "force-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const bitmap = await createImageBitmap(blob);
      if (ac.signal.aborted) {
        bitmap.close();
        throw new AbortedError();
      }
      return { bitmap, bytes: blob.size };
    } finally {
      this.controllers.delete(id);
    }
  }

  cancel(id: number) {
    this.controllers.get(id)?.abort();
    this.controllers.delete(id);
  }

  destroy() {
    this.controllers.forEach((ac) => ac.abort());
    this.controllers.clear();
  }
}

/**
 * Nombre de fils de décodage.
 *
 * Plafonné à 4 au premier jet, sur une séquence de 130 images. Avec les 803
 * images de la visite complète, un scroll rapide demande de décoder ~180
 * images par seconde et quatre fils n'y suffisent plus : mesuré, 2,3 % des
 * images dépassaient 33 ms, et 70 à 90 % de ces images longues tombaient
 * pendant un décodage. Plafond relevé à 8, toujours en laissant deux cœurs au
 * reste de la page.
 */
export function createDecoder(lanes?: number): Decoder {
  const n = lanes ?? Math.max(2, Math.min(8, (navigator.hardwareConcurrency || 4) - 2));
  try {
    if (typeof Worker !== "undefined" && typeof createImageBitmap !== "undefined") return new WorkerDecoder(n);
  } catch {
    /* contexte sans worker : on tombe sur le repli */
  }
  return new InlineDecoder();
}
