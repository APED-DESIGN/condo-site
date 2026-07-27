/**
 * Machine à états de caméra.
 *
 * Le visualiseur n'a pas deux visionneuses : il a une scène et une caméra qui
 * change d'état. Passer de la cartographie au plan, c'est monter, se redresser,
 * et laisser la projection glisser de la perspective vers l'orthographique —
 * pas remplacer un affichage par un autre.
 *
 * ── Comment la bascule de projection est faite, et pourquoi pas autrement ──
 *
 * On N'INTERPOLE PAS les deux matrices de projection terme à terme. C'est la
 * solution qui vient à l'esprit, et elle distord : perspective et orthographique
 * sont mathématiquement disjointes (w = z contre w = 1), et le mélange naïf
 * dégénère la carte de profondeur en cours de route (three.js #5197).
 *
 * On fait un DOLLY-ZOOM. À distance `d` du pivot, la demi-hauteur cadrée vaut
 * `h = d · tan(fov/2)`. On capture `h` au départ, on recule jusqu'à `d` grand,
 * et on résout le FOV à chaque image : `fov = 2·atan(h/d)`. Le cadrage au pivot
 * ne bouge donc jamais, et à FOV très petit l'image est indiscernable d'une
 * orthographique. À l'arrivée on échange contre une vraie caméra ortho de même
 * demi-hauteur : la couture est invisible.
 *
 * `near`/`far` suivent la distance, sinon le tampon de profondeur se dégrade
 * à mesure que le FOV se referme.
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EMPRISE, H_NIVEAU, altitude, type Niveau } from "@/data/tours/maison-01-plan";

export type ModeVue = "carto" | "plan";

/** Durée de la bascule carto ↔ plan. C'est le moment qui porte le produit. */
export const DUREE_BASCULE = 900;
/** Durée de la plongée vers un point de visite avant de passer à la visite. */
export const DUREE_PLONGEE = 700;

/** Adoucissement : démarrage franc, arrivée longue. */
export function adoucir(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/* Cadrage du plan : le bâti et ses abords immédiats, pas tout le terrain.
   Cadrer sur EMPRISE entière rendrait la maison minuscule au milieu de la
   pelouse avant. */
const LARGEUR = EMPRISE.xMax - EMPRISE.xMin;
const PROFONDEUR = 118;
/** Distance de recul à l'arrivée en plan : assez loin pour que 2·atan(h/d) soit minuscule. */
const D_PLAN = 900;
const FOV_CARTO = 38;

/** Cible d'orbite : centre de l'emprise, à mi-hauteur du niveau visé. */
function cible(niveau: Niveau | null): THREE.Vector3 {
  const y = niveau ? altitude(niveau) + H_NIVEAU / 2 : H_NIVEAU;
  return new THREE.Vector3(0, y, 0);
}

/**
 * Contrôle du mode plan : déplacement et zoom, pas de rotation.
 *
 * On n'utilise PAS OrbitControls ici, et c'est délibéré. Une vue plan est à la
 * verticale exacte, avec un `up` horizontal pour orienter la feuille. Or
 * OrbitControls dérive sa position d'un repère sphérique construit sur
 * `camera.up` : `up` horizontal + décalage vertical, c'est le cas dégénéré, et
 * son `update()` renvoie la caméra n'importe où. La vue plan sortait noire.
 */
class ControlePlan {
  enabled = false;
  readonly target = new THREE.Vector3();
  private glisse: { x: number; y: number } | null = null;
  private readonly surDown: (e: PointerEvent) => void;
  private readonly surMove: (e: PointerEvent) => void;
  private readonly surUp: () => void;
  private readonly surWheel: (e: WheelEvent) => void;
  /** Distance entre deux doigts, pour le pincement. */
  private pince = 0;
  private readonly pointeurs = new Map<number, { x: number; y: number }>();

  constructor(
    private readonly cam: THREE.OrthographicCamera,
    private readonly dom: HTMLElement,
    private readonly onChange: () => void
  ) {
    this.surDown = (e) => {
      if (!this.enabled) return;
      this.pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointeurs.size === 1) this.glisse = { x: e.clientX, y: e.clientY };
      else if (this.pointeurs.size === 2) this.pince = this.ecart();
    };
    this.surMove = (e) => {
      if (!this.enabled) return;
      if (!this.pointeurs.has(e.pointerId)) return;
      this.pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (this.pointeurs.size >= 2) {
        const ecart = this.ecart();
        if (this.pince > 0 && ecart > 0) this.zoomer(ecart / this.pince);
        this.pince = ecart;
        return;
      }
      if (!this.glisse) return;
      const dx = e.clientX - this.glisse.x;
      const dy = e.clientY - this.glisse.y;
      this.glisse = { x: e.clientX, y: e.clientY };
      this.deplacer(dx, dy);
    };
    this.surUp = () => {
      this.pointeurs.clear();
      this.glisse = null;
      this.pince = 0;
    };
    this.surWheel = (e) => {
      if (!this.enabled) return;
      e.preventDefault();
      this.zoomer(e.deltaY < 0 ? 1.12 : 1 / 1.12);
    };

    dom.addEventListener("pointerdown", this.surDown);
    dom.addEventListener("pointermove", this.surMove);
    dom.addEventListener("pointerup", this.surUp);
    dom.addEventListener("pointercancel", this.surUp);
    dom.addEventListener("pointerleave", this.surUp);
    dom.addEventListener("wheel", this.surWheel, { passive: false });
  }

  private ecart(): number {
    const p = Array.from(this.pointeurs.values());
    return p.length < 2 ? 0 : Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
  }

  private zoomer(facteur: number) {
    this.cam.zoom = THREE.MathUtils.clamp(this.cam.zoom * facteur, 0.5, 5);
    this.cam.updateProjectionMatrix();
    this.onChange();
  }

  /** Déplace caméra et cible dans le plan de l'écran. */
  private deplacer(dx: number, dy: number) {
    const hauteurMonde = (this.cam.top - this.cam.bottom) / this.cam.zoom;
    const parPixel = hauteurMonde / this.dom.clientHeight;
    const droite = new THREE.Vector3().setFromMatrixColumn(this.cam.matrix, 0);
    const haut = new THREE.Vector3().setFromMatrixColumn(this.cam.matrix, 1);
    const delta = droite
      .multiplyScalar(-dx * parPixel)
      .add(haut.multiplyScalar(dy * parPixel));
    this.cam.position.add(delta);
    this.target.add(delta);
    this.onChange();
  }

  update() {
    /* Rien à amortir : le déplacement est direct, il suit le doigt. */
  }

  dispose() {
    this.dom.removeEventListener("pointerdown", this.surDown);
    this.dom.removeEventListener("pointermove", this.surMove);
    this.dom.removeEventListener("pointerup", this.surUp);
    this.dom.removeEventListener("pointercancel", this.surUp);
    this.dom.removeEventListener("pointerleave", this.surUp);
    this.dom.removeEventListener("wheel", this.surWheel);
  }
}

export type Pilote = {
  camPersp: THREE.PerspectiveCamera;
  camOrtho: THREE.OrthographicCamera;
  ctrlCarto: OrbitControls;
  ctrlPlan: ControlePlan;
  cameraActive: () => THREE.Camera;
  mode: () => ModeVue;
  enTransition: () => boolean;
  avancement: () => number;

  redimensionner: (largeur: number, hauteur: number) => void;
  majFrame: (dtMs: number) => void;
  basculer: (vers: ModeVue, niveau: Niveau | null, instantane: boolean) => void;
  /** Change le niveau de référence SANS déplacer la caméra. */
  changerNiveau: (niveau: Niveau | null) => void;
  plongerVers: (position: THREE.Vector3, instantane: boolean) => Promise<void>;
  detruire: () => void;
};

export function creerPilote(dom: HTMLElement, reduit: boolean): Pilote {
  const camPersp = new THREE.PerspectiveCamera(FOV_CARTO, 1, 1, 400);
  const camOrtho = new THREE.OrthographicCamera(-1, 1, 1, -1, -600, 1600);

  /* Départ : trois quarts en plongée, la FAÇADE vers nous — le y du plan croît
     vers l'avant, donc l'avant est en +z monde. C'est le point de vue d'arrivée
     de la visite, dont le nœud de départ est justement « Façade avant ». */
  camPersp.position.set(-78, 92, 150);

  const ctrlCarto = new OrbitControls(camPersp, dom);
  ctrlCarto.enableDamping = true;
  ctrlCarto.dampingFactor = 0.075;
  ctrlCarto.rotateSpeed = 0.62;
  ctrlCarto.zoomSpeed = 0.9;
  ctrlCarto.panSpeed = 0.7;
  /* Jamais sous le plancher, jamais tout à fait au zénith : au zénith on est
     en mode plan, et l'orbite n'a plus de sens. */
  ctrlCarto.minPolarAngle = 0.14;
  ctrlCarto.maxPolarAngle = 1.44;
  ctrlCarto.minDistance = 55;
  ctrlCarto.maxDistance = 300;
  ctrlCarto.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN,
  };
  ctrlCarto.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

  const ctrlPlan = new ControlePlan(camOrtho, dom, () => {});

  let mode: ModeVue = "carto";
  let niveauRef: Niveau | null = null;
  let largeur = 1;
  let hauteur = 1;

  /** Demi-hauteur cadrée au pivot : l'invariant du dolly-zoom. */
  let demiHauteur = 60;

  type Transition = {
    vers: ModeVue;
    duree: number;
    ecoule: number;
    pivot: THREE.Vector3;
    dirDepart: THREE.Vector3;
    dirArrivee: THREE.Vector3;
    dDepart: number;
    dArrivee: number;
    /** Plongée : on vise un point et non le pivot, avec sa propre orientation. */
    plongee?: { posArrivee: THREE.Vector3; visee: THREE.Vector3; quatDepart: THREE.Quaternion };
    resoudre?: () => void;
  };
  let transition: Transition | null = null;

  function demiHauteurCadree(cam: THREE.PerspectiveCamera, pivot: THREE.Vector3) {
    const d = cam.position.distanceTo(pivot);
    return Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * d;
  }

  function majOrtho() {
    const aspect = largeur / hauteur;
    camOrtho.left = -demiHauteur * aspect;
    camOrtho.right = demiHauteur * aspect;
    camOrtho.top = demiHauteur;
    camOrtho.bottom = -demiHauteur;
    camOrtho.updateProjectionMatrix();
  }

  function majPerspective() {
    camPersp.aspect = largeur / hauteur;
    camPersp.updateProjectionMatrix();
  }

  /** Demi-hauteur qui fait tenir toute l'emprise dans le cadre. */
  function demiHauteurDeCadrage() {
    const aspect = largeur / hauteur;
    const marge = 1.1;
    return Math.max((PROFONDEUR / 2) * marge, ((LARGEUR / 2) * marge) / aspect);
  }

  function poserCarto(pivot: THREE.Vector3, dir: THREE.Vector3, d: number) {
    camPersp.fov = FOV_CARTO;
    camPersp.near = Math.max(0.5, d - 220);
    camPersp.far = d + 320;
    camPersp.position.copy(pivot).addScaledVector(dir, d);
    camPersp.up.set(0, 1, 0);
    camPersp.lookAt(pivot);
    majPerspective();
    ctrlCarto.target.copy(pivot);
    ctrlCarto.update();
  }

  function poserPlan(pivot: THREE.Vector3) {
    /* Au zénith. On garde l'azimut courant pour que le plan arrive dans
       l'orientation où l'on regardait le volume, pas dans une autre. */
    const offset = camPersp.position.clone().sub(pivot);
    const azimut = Math.atan2(offset.x, offset.z);
    camOrtho.position.set(pivot.x, pivot.y + 400, pivot.z);
    /* `up` négatif, et c'est ce qui redresse le plan. Vu du dessus depuis +y
       avec l'écran orienté vers +z, l'axe +x du monde part à GAUCHE : le plan
       sort en miroir. En orientant l'écran vers −z on retrouve la convention
       d'un plan d'étage — l'entrée en bas, l'est à droite. */
    camOrtho.up.set(-Math.sin(azimut), 0, -Math.cos(azimut));
    camOrtho.lookAt(pivot);
    camOrtho.zoom = 1;
    majOrtho();
    ctrlPlan.target.copy(pivot);
    ctrlPlan.update();
  }

  function lancer(vers: ModeVue, duree: number, plongee?: Transition["plongee"]): Promise<void> {
    const pivot = cible(niveauRef);
    ctrlCarto.enabled = false;
    ctrlPlan.enabled = false;

    /* On travaille toujours en perspective pendant la transition : c'est elle
       qui porte le dolly-zoom. Venant du plan, on repart d'une perspective à
       FOV minuscule et très reculée, qui cadre exactement comme l'ortho. */
    if (mode === "plan" && !transition) {
      demiHauteur = camOrtho.top / camOrtho.zoom;
      camPersp.position.copy(camOrtho.position);
      camPersp.quaternion.copy(camOrtho.quaternion);
      camPersp.up.copy(camOrtho.up);
      const d = camPersp.position.distanceTo(pivot);
      camPersp.fov = 2 * THREE.MathUtils.radToDeg(Math.atan(demiHauteur / d));
      camPersp.near = Math.max(0.5, d - 220);
      camPersp.far = d + 320;
      majPerspective();
    } else if (!transition) {
      demiHauteur = demiHauteurCadree(camPersp, pivot);
    }

    const dirDepart = camPersp.position.clone().sub(pivot).normalize();
    const dDepart = camPersp.position.distanceTo(pivot);

    let dirArrivee: THREE.Vector3;
    let dArrivee: number;
    if (plongee) {
      dirArrivee = dirDepart.clone();
      dArrivee = dDepart;
    } else if (vers === "plan") {
      dirArrivee = new THREE.Vector3(0, 1, 0);
      dArrivee = D_PLAN;
      /* La demi-hauteur visée est celle qui cadre l'emprise : le dolly-zoom
         part du cadrage courant et l'amène à celui-là. */
      demiHauteur = demiHauteurDeCadrage();
    } else {
      /* Retour en carto : on repique vers une orbite de trois quarts, en
         conservant l'azimut. */
      const azimut = Math.atan2(dirDepart.x, dirDepart.z);
      const phi = 1.02;
      dirArrivee = new THREE.Vector3(
        Math.sin(phi) * Math.sin(azimut),
        Math.cos(phi),
        Math.sin(phi) * Math.cos(azimut)
      ).normalize();
      dArrivee = 168;
      demiHauteur = Math.tan(THREE.MathUtils.degToRad(FOV_CARTO / 2)) * dArrivee;
    }

    if (duree <= 0) {
      arriver(vers, pivot, dirArrivee, dArrivee, plongee);
      return Promise.resolve();
    }
    return new Promise<void>((resoudre) => {
      transition = {
        vers,
        duree,
        ecoule: 0,
        pivot,
        dirDepart,
        dirArrivee,
        dDepart,
        dArrivee,
        plongee: plongee
          ? { ...plongee, quatDepart: camPersp.quaternion.clone() }
          : undefined,
        resoudre,
      };
    });
  }

  function arriver(
    vers: ModeVue,
    pivot: THREE.Vector3,
    dir: THREE.Vector3,
    d: number,
    plongee?: Transition["plongee"]
  ) {
    mode = vers;
    if (plongee) {
      camPersp.fov = 62;
      camPersp.near = 0.5;
      camPersp.far = 400;
      camPersp.position.copy(plongee.posArrivee);
      camPersp.up.set(0, 1, 0);
      camPersp.lookAt(plongee.visee);
      majPerspective();
      ctrlCarto.target.copy(plongee.visee);
      ctrlCarto.update();
      ctrlCarto.enabled = true;
      ctrlPlan.enabled = false;
      return;
    }
    if (vers === "carto") {
      poserCarto(pivot, dir, d);
      ctrlCarto.enabled = true;
      ctrlPlan.enabled = false;
    } else {
      poserPlan(pivot);
      ctrlCarto.enabled = false;
      ctrlPlan.enabled = true;
    }
  }

  const pilote: Pilote = {
    camPersp,
    camOrtho,
    ctrlCarto,
    ctrlPlan,

    /* Pendant toute la transition c'est la perspective qui rend : elle porte
       le dolly-zoom. L'ortho ne prend la main qu'une fois arrivée. */
    cameraActive: () => (transition || mode === "carto" ? camPersp : camOrtho),
    mode: () => (transition ? transition.vers : mode),
    enTransition: () => transition !== null,
    avancement: () => (transition ? transition.ecoule / transition.duree : 1),

    redimensionner(l, h) {
      largeur = Math.max(1, l);
      hauteur = Math.max(1, h);
      majPerspective();
      majOrtho();
    },

    majFrame(dtMs) {
      if (transition) {
        const tr = transition;
        tr.ecoule = Math.min(tr.duree, tr.ecoule + dtMs);
        const t = adoucir(tr.ecoule / tr.duree);

        if (tr.plongee) {
          camPersp.position.lerpVectors(
            tr.pivot.clone().addScaledVector(tr.dirDepart, tr.dDepart),
            tr.plongee.posArrivee,
            t
          );
          const quatFin = new THREE.Quaternion().setFromRotationMatrix(
            new THREE.Matrix4().lookAt(
              tr.plongee.posArrivee,
              tr.plongee.visee,
              new THREE.Vector3(0, 1, 0)
            )
          );
          camPersp.quaternion.slerpQuaternions(tr.plongee.quatDepart, quatFin, t);
          camPersp.fov = THREE.MathUtils.lerp(camPersp.fov, 62, t * 0.25);
          majPerspective();
        } else {
          /* Direction : arc court entre les deux orientations. Distance :
             interpolation simple. Le FOV se déduit de l'invariant. */
          const dir = tr.dirDepart.clone().lerp(tr.dirArrivee, t).normalize();
          const d = THREE.MathUtils.lerp(tr.dDepart, tr.dArrivee, t);
          camPersp.position.copy(tr.pivot).addScaledVector(dir, d);
          camPersp.up.set(0, 1, 0);
          camPersp.lookAt(tr.pivot);

          const fov = 2 * THREE.MathUtils.radToDeg(Math.atan(demiHauteur / d));
          camPersp.fov = THREE.MathUtils.clamp(fov, 0.6, 90);
          camPersp.near = Math.max(0.5, d - 220);
          camPersp.far = d + 320;
          majPerspective();
        }

        if (tr.ecoule >= tr.duree) {
          transition = null;
          arriver(tr.vers, tr.pivot, tr.dirArrivee, tr.dArrivee, tr.plongee);
          tr.resoudre?.();
        }
        return;
      }
      if (mode === "carto") ctrlCarto.update();
      else ctrlPlan.update();
    },

    basculer(vers, niveau, instantane) {
      niveauRef = niveau;
      if (mode === vers && !transition) return;
      void lancer(vers, instantane || reduit ? 0 : DUREE_BASCULE);
    },

    /* Sémantique de la référence : choisir un étage change ce qu'on montre,
       pas d'où on le regarde. La caméra ne bouge pas. */
    changerNiveau(niveau) {
      niveauRef = niveau;
    },

    plongerVers(position, instantane) {
      const visee = position.clone().add(new THREE.Vector3(0, 4.6, 0));
      const posArrivee = position.clone().add(new THREE.Vector3(0, 5.4, 15));
      return lancer("carto", instantane || reduit ? 0 : DUREE_PLONGEE, {
        posArrivee,
        visee,
        quatDepart: camPersp.quaternion.clone(),
      });
    },

    detruire() {
      ctrlCarto.dispose();
      ctrlPlan.dispose();
    },
  };

  majPerspective();
  majOrtho();
  arriver("carto", cible(null), camPersp.position.clone().normalize(), 168);
  return pilote;
}
