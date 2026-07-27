/**
 * FrameStore — fenêtre glissante d'ImageBitmap.
 *
 * Une séquence complète décodée en mémoire, c'est plusieurs centaines de Mo.
 * On ne garde donc qu'une fenêtre autour de l'image courante : [i-back, i+fwd].
 * Tout ce qui sort de la fenêtre est fermé explicitement (`ImageBitmap.close()`),
 * sinon la mémoire GPU/CPU n'est jamais rendue — c'est LA fuite de ce genre de page.
 */

import { createDecoder, estAnnulation, type Decoder } from "./decoder";

export interface FrameStoreOptions {
  basePath: string;
  frameCount: number;
  indexOffset: number;
  /** Images conservées derrière l'index courant (retour en arrière fluide). */
  back?: number;
  /** Images conservées devant l'index courant. */
  forward?: number;
  /** Requêtes réseau simultanées. */
  concurrency?: number;
  /** Espacement maximal des demandes en défilement rapide. 1 = jamais espacer. */
  strideMax?: number;
  /**
   * Plafond mémoire des images décodées, en Mo. Un ImageBitmap coûte
   * largeur × hauteur × 4 octets — 5,8 Mo pièce en 1600×900. C'est cette
   * enveloppe qui borne réellement la page, pas un nombre d'images : elle
   * s'adapte toute seule quand la variante ou la résolution change.
   */
  budgetMo?: number;
  /** Dimensions décodées d'une image, pour convertir le budget en nombre d'images. */
  frameSize?: { width: number; height: number };
  /** Injectable pour les tests ; par défaut un pool de workers, avec repli. */
  decoder?: Decoder;
}

export interface FrameStoreStats {
  held: number;
  inflight: number;
  bytesLoaded: number;
  framesFetched: number;
  failed: number;
  /** Plafond d'images décodées imposé par le budget mémoire. */
  maxBitmaps: number;
  /** Mo de pixels décodés actuellement retenus. */
  decodedMo: number;
}

export class FrameStore {
  private readonly basePath: string;
  private readonly frameCount: number;
  private readonly indexOffset: number;
  private readonly back: number;
  private readonly forward: number;
  private readonly concurrency: number;
  /** Nombre maximal d'images décodées gardées en mémoire (dérivé du budget). */
  readonly maxBitmaps: number;
  readonly frameMo: number;

  private readonly decoder: Decoder;
  private bitmaps = new Map<number, ImageBitmap>();
  private inflight = new Set<number>();
  private failed = new Set<number>();
  private queue: number[] = [];
  private active = 0;
  private center = -1;
  /** Moyenne glissante du déplacement d'index, en images par appel à setCenter. */
  private vitesse = 0;
  private readonly strideMax: number;
  /** Plage supplémentaire retenue hors fenêtre (préchargement du chapitre suivant). */
  private extra: { a: number; b: number } | null = null;
  /** Plage épinglée par `warmup`. Séparée d'`extra` : sinon le préchargement du
   *  chapitre suivant écrase la rétention du seuil et le seuil ne finit jamais. */
  private pinned: { a: number; b: number } | null = null;
  private destroyed = false;

  bytesLoaded = 0;
  framesFetched = 0;

  constructor(o: FrameStoreOptions) {
    this.basePath = o.basePath.replace(/\/$/, "");
    this.frameCount = o.frameCount;
    this.indexOffset = o.indexOffset;
    this.back = o.back ?? 15;
    this.forward = o.forward ?? 60;
    this.concurrency = o.concurrency ?? 6;
    this.strideMax = Math.max(1, o.strideMax ?? 4);

    const px = o.frameSize ? o.frameSize.width * o.frameSize.height : 1600 * 900;
    this.frameMo = (px * 4) / 1048576;
    // La fenêtre exprime une intention ; le budget est la borne dure. Quand la
    // fenêtre demandée coûterait plus que le budget, c'est le budget qui gagne
    // et on garde les images les plus proches de l'index courant.
    this.maxBitmaps = Math.max(16, Math.floor((o.budgetMo ?? 256) / this.frameMo));

    this.decoder = o.decoder ?? createDecoder();
  }

  /** « worker » = décodage hors du fil principal ; « inline » = repli. */
  get decodeKind() {
    return this.decoder.kind;
  }

  url(i: number) {
    return `${this.basePath}/${String(i + this.indexOffset).padStart(4, "0")}.webp`;
  }

  get(i: number) {
    return this.bitmaps.get(i);
  }

  /** L'image exacte si elle est là, sinon la plus proche déjà décodée. Évite le canvas blanc. */
  getNearest(i: number, radius = 40): ImageBitmap | undefined {
    const exact = this.bitmaps.get(i);
    if (exact) return exact;
    for (let d = 1; d <= radius; d++) {
      const b = this.bitmaps.get(i - d);
      if (b) return b;
      const f = this.bitmaps.get(i + d);
      if (f) return f;
    }
    return undefined;
  }

  has(i: number) {
    return this.bitmaps.has(i);
  }

  /** Recentre la fenêtre. Sans effet si l'index n'a pas bougé — appelable à chaque image. */
  setCenter(i: number) {
    if (this.destroyed || i === this.center) return;
    // Moyenne glissante de la vitesse, en images par appel. Sert à espacer les
    // demandes quand ça défile vite (voir `stride`).
    const saut = this.center < 0 ? 1 : Math.abs(i - this.center);
    this.vitesse = this.vitesse * 0.7 + saut * 0.3;
    this.center = i;
    this.refresh();
  }

  /**
   * Pas d'échantillonnage des images demandées.
   *
   * En défilement lent on veut chaque image. En défilement rapide, la demande
   * dépasse ce que le décodage peut suivre : mesuré sur la visite complète, un
   * geste à 6 000 px/s réclame ~180 images par seconde, et 88 % des images de
   * plus de 33 ms tombaient alors pendant un décodage. Espacer les demandes
   * réduit la pression exactement là où elle se produit — et ne se voit pas,
   * puisqu'à cette vitesse une image sur deux n'est affichée qu'un seul
   * rafraîchissement. `getNearest` couvre les trous sans jamais laisser un
   * canvas vide.
   */
  private get stride() {
    /*
     * Seuil à 2 images par rafraîchissement, et pas moins : essayé à 1,2 avec
     * un pas égal à la vitesse, le résultat est nettement pire — 5 images
     * d'écart au 99ᵉ centile à vitesse d'usage, et l'escalier se met à se
     * replier. En dessous de deux images par rafraîchissement, le décodeur
     * suit : espacer les demandes ne fait que dégrader l'exactitude sans rien
     * gagner sur le débit.
     */
    if (this.vitesse <= 2) return 1;
    return Math.max(1, Math.min(this.strideMax, Math.round(this.vitesse / 2)));
  }

  /**
   * Retient une plage complète en plus de la fenêtre. Appelé à l'entrée d'un
   * `hold` pour charger le chapitre suivant : c'est le moment où l'utilisateur
   * lit et où la bande passante est libre.
   */
  preloadRange(a: number, b: number) {
    if (this.destroyed) return;
    const lo = Math.max(0, Math.min(a, b));
    const hi = Math.min(this.frameCount - 1, Math.max(a, b));
    if (this.extra && this.extra.a === lo && this.extra.b === hi) return;
    this.extra = { a: lo, b: hi };
    this.refresh();
  }

  clearPreload() {
    if (!this.extra) return;
    this.extra = null;
    this.refresh();
  }

  /** Libère la plage épinglée par `warmup`, une fois le seuil franchi. */
  unpin() {
    if (!this.pinned) return;
    this.pinned = null;
    this.refresh();
  }

  /** Charge une plage et résout quand tout est décodé — pour l'écran de seuil. */
  async warmup(a: number, b: number, onProgress?: (done: number, total: number) => void) {
    const lo = Math.max(0, a);
    const hi = Math.min(this.frameCount - 1, b);
    const wanted: number[] = [];
    for (let i = lo; i <= hi; i++) wanted.push(i);
    this.center = Math.round((lo + hi) / 2);
    this.pinned = { a: lo, b: hi };
    this.refresh();

    let done = 0;
    onProgress?.(0, wanted.length);
    while (!this.destroyed) {
      const now = wanted.filter((i) => this.bitmaps.has(i) || this.failed.has(i)).length;
      if (now !== done) {
        done = now;
        onProgress?.(done, wanted.length);
      }
      if (done >= wanted.length) return;
      await new Promise((r) => setTimeout(r, 40));
    }
  }

  stats(): FrameStoreStats {
    return {
      held: this.bitmaps.size,
      inflight: this.inflight.size,
      bytesLoaded: this.bytesLoaded,
      framesFetched: this.framesFetched,
      failed: this.failed.size,
      maxBitmaps: this.maxBitmaps,
      decodedMo: this.bitmaps.size * this.frameMo,
    };
  }

  destroy() {
    this.destroyed = true;
    Array.from(this.inflight).forEach((i) => this.decoder.cancel(i));
    this.inflight.clear();
    this.decoder.destroy();
    Array.from(this.bitmaps.values()).forEach((bmp) => bmp.close());
    this.bitmaps.clear();
    this.queue = [];
    this.active = 0;
    this.bytesLoaded = 0;
  }

  /* ── interne ─────────────────────────────────────────────────────────────── */

  private keep(i: number) {
    if (i < 0 || i >= this.frameCount) return false;
    const lo = this.center - this.back;
    const hi = this.center + this.forward;
    if (i >= lo && i <= hi) return true;
    if (this.pinned && i >= this.pinned.a && i <= this.pinned.b) return true;
    return !!this.extra && i >= this.extra.a && i <= this.extra.b;
  }

  private refresh() {
    // 1. Libérer ce qui est sorti de la fenêtre. C'est ici que la fuite se joue.
    Array.from(this.bitmaps.keys()).forEach((i) => {
      if (this.keep(i)) return;
      this.bitmaps.get(i)!.close();
      this.bitmaps.delete(i);
    });
    Array.from(this.inflight).forEach((i) => {
      if (this.keep(i)) return;
      this.decoder.cancel(i);
      this.inflight.delete(i);
    });

    // 2. Reconstruire la file, du plus proche de l'index courant au plus loin :
    //    ce qu'on va afficher dans 2 images compte plus que le reste.
    const wanted: number[] = [];
    const lo = Math.max(0, this.center - this.back);
    const hi = Math.min(this.frameCount - 1, this.center + this.forward);
    const pas = this.stride;
    for (let i = lo; i <= hi; i++) {
      // L'image courante est toujours demandée, quelle que soit la vitesse.
      if (i === this.center || (i - this.center) % pas === 0) wanted.push(i);
    }
    for (const r of [this.pinned, this.extra]) {
      if (!r) continue;
      for (let i = r.a; i <= r.b; i++) if (i < lo || i > hi) wanted.push(i);
    }

    // 3. Appliquer le budget : on ne demande jamais plus d'images que ce que la
    //    mémoire autorise, et on garde les plus proches de l'index courant.
    const byDistance = (a: number, b: number) => Math.abs(a - this.center) - Math.abs(b - this.center);
    const budgeted = new Set(
      wanted
        .filter((i) => !this.isPinned(i))
        .sort(byDistance)
        .slice(0, Math.max(0, this.maxBitmaps - this.pinnedCount()))
    );

    Array.from(this.bitmaps.keys()).forEach((i) => {
      if (this.isPinned(i) || budgeted.has(i)) return;
      this.bitmaps.get(i)!.close();
      this.bitmaps.delete(i);
    });
    Array.from(this.inflight).forEach((i) => {
      if (this.isPinned(i) || budgeted.has(i)) return;
      this.decoder.cancel(i);
      this.inflight.delete(i);
    });

    this.queue = wanted
      .filter((i) => (this.isPinned(i) || budgeted.has(i)) && !this.bitmaps.has(i) && !this.inflight.has(i) && !this.failed.has(i))
      .sort(byDistance);

    this.enforceCap();
    this.pump();
  }

  /** Dernier rempart : une image décodée peut arriver après un déplacement de
   *  fenêtre et faire dépasser le budget. On lâche alors les plus lointaines. */
  private enforceCap() {
    let over = this.bitmaps.size - this.maxBitmaps;
    if (over <= 0) return;
    const candidats = Array.from(this.bitmaps.keys())
      .filter((i) => !this.isPinned(i))
      .sort((a, b) => Math.abs(b - this.center) - Math.abs(a - this.center));
    for (const k of candidats) {
      if (over-- <= 0) break;
      this.bitmaps.get(k)!.close();
      this.bitmaps.delete(k);
    }
  }

  private isPinned(i: number) {
    return !!this.pinned && i >= this.pinned.a && i <= this.pinned.b;
  }

  private pinnedCount() {
    return this.pinned ? this.pinned.b - this.pinned.a + 1 : 0;
  }

  private pump() {
    while (!this.destroyed && this.active < this.concurrency && this.queue.length) {
      const i = this.queue.shift()!;
      if (this.bitmaps.has(i) || this.inflight.has(i) || !this.keep(i)) continue;
      void this.load(i);
    }
  }

  private async load(i: number) {
    this.inflight.add(i);
    this.active++;
    try {
      const { bitmap, bytes } = await this.decoder.decode(i, this.url(i));
      if (this.destroyed || !this.keep(i)) {
        // La fenêtre a bougé pendant le décodage : on jette immédiatement.
        bitmap.close();
        return;
      }
      this.bitmaps.set(i, bitmap);
      this.bytesLoaded += bytes;
      this.framesFetched++;
      this.enforceCap();
    } catch (e) {
      if (!estAnnulation(e)) this.failed.add(i);
    } finally {
      this.inflight.delete(i);
      this.active--;
      if (!this.destroyed) this.pump();
    }
  }
}
