import type { CSSProperties, ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Durée d'un cycle complet, en secondes. */
  duration?: number;
  reverse?: boolean;
  className?: string;
  /** Texte lu par les lecteurs d'écran à la place du contenu défilant. */
  srLabel?: string;
};

/** Bande défilante infinie (contenu dupliqué, translation -50 %). */
export default function Marquee({
  children,
  duration = 40,
  reverse = false,
  className = "",
  srLabel,
}: Props) {
  return (
    <div className={`marquee-mask overflow-hidden ${className}`}>
      {srLabel && <span className="sr-only">{srLabel}</span>}
      <div
        aria-hidden
        className="flex w-max animate-marquee"
        style={
          {
            "--marquee-duration": `${duration}s`,
            animationDirection: reverse ? "reverse" : undefined,
          } as CSSProperties
        }
      >
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center">{children}</div>
      </div>
    </div>
  );
}
