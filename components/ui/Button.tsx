"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode, MouseEventHandler } from "react";

type Props = {
  children: ReactNode;
  variant?: "solid" | "glass" | "dark";
  href?: string;
  onClick?: MouseEventHandler;
  arrow?: boolean;
  className?: string;
  type?: "button" | "submit";
};

const base =
  "group inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium tracking-wide transition-all duration-300 ease-out-expo hover:scale-[1.03] active:scale-[0.98]";

const variants = {
  solid: "bg-brass text-ivory hover:bg-brass-dark",
  glass: "glass text-ink hover:bg-white/75",
  dark: "bg-ink text-bone hover:bg-black",
};

export default function Button({
  children,
  variant = "solid",
  href,
  onClick,
  arrow = false,
  className = "",
  type = "button",
}: Props) {
  const cls = `${base} ${variants[variant]} ${className}`;
  const content = (
    <>
      {children}
      {arrow && (
        <ArrowRight
          className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
          aria-hidden
        />
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} onClick={onClick} className={cls}>
        {content}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} className={cls}>
      {content}
    </button>
  );
}
