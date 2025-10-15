import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

import "./header-hero.css";

type HeaderHeroAlignment = "left" | "center" | "right";

type HeaderHeroProps = {
  photoUrl?: string | null;
  title: string;
  subtitle?: string | null;
  align?: HeaderHeroAlignment;
  bgFrom?: string;
  bgTo?: string;
  textColor?: string;
  titleClassName?: string;
  subtitleClassName?: string;
};

type HeaderTheme = {
  bgFrom?: string;
  bgTo?: string;
  textColor?: string;
};

type HeaderHeroStyle = CSSProperties & {
  "--hh-from"?: string;
  "--hh-to"?: string;
  "--hh-text"?: string;
};

const ALIGN_CLASSES: Record<HeaderHeroAlignment, string> = {
  left: "items-start text-left",
  center: "items-center text-center",
  right: "items-end text-right",
};

export function applyHeaderTheme(theme: HeaderTheme = {}): HeaderHeroStyle {
  const style: HeaderHeroStyle = {};

  if (theme.bgFrom) {
    style["--hh-from"] = theme.bgFrom;
  }
  if (theme.bgTo) {
    style["--hh-to"] = theme.bgTo;
  }
  if (theme.textColor) {
    style["--hh-text"] = theme.textColor;
  }

  return style;
}

export function HeaderHero({
  photoUrl,
  title,
  subtitle,
  align = "center",
  bgFrom = "#7c3aed",
  bgTo = "#22c55e",
  textColor = "#ffffff",
  titleClassName,
  subtitleClassName,
}: HeaderHeroProps) {
  const alignmentClass = ALIGN_CLASSES[align] ?? ALIGN_CLASSES.center;
  const style: HeaderHeroStyle = {
    "--hh-from": bgFrom,
    "--hh-to": bgTo,
    "--hh-text": textColor,
  };

  return (
    <div
      className="header-hero relative w-full rounded-3xl overflow-hidden shadow-xl p-8 sm:p-12"
      style={style}
    >
      <div className={cn("relative z-10 flex flex-col gap-2", alignmentClass)}>
        <h1 className={cn("title font-extrabold leading-tight tracking-tight", titleClassName)}>
          {title}
        </h1>
        {subtitle ? (
          <p className={cn("subtitle opacity-90", subtitleClassName)}>{subtitle}</p>
        ) : null}
      </div>
      {photoUrl ? (
        <img
          src={photoUrl}
          alt=""
          className="photo absolute right-4 bottom-0 h-[70%] max-h-[420px] object-contain pointer-events-none select-none"
        />
      ) : null}
    </div>
  );
}
