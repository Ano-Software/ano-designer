"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { ButtonCanvasItem, HeroSettings } from "./types";
import { buildPreviewTokens, IconPreview } from "./ButtonCanvasEditor";
import { headerTypographyPreviewClass } from "./HeaderEditor";

const imageObjectPosition: Record<HeroSettings["coverImagePosition"], string> = {
  left: "left center",
  center: "center center",
  right: "right center",
};

const DEFAULT_TITLE_SIZE = 40;
const DEFAULT_SUBTITLE_SIZE = 18;
const DEFAULT_HEADER_HEIGHT = 150;
const HEADER_HEIGHT_MIN = 150;
const HEADER_HEIGHT_MAX = 420;
const TITLE_COLOR_FALLBACK = "#ffffff";
const SUBTITLE_COLOR_FALLBACK = "#f1f5f9";
const STICKY_TOP = 84;
const BOTTOM_MARGIN = 32;
const SCALE_PADDING = 0.98;
const MIN_SCALE = 0.65;
const MAX_SCALE = 1;
const FALLBACK_DEVICE_WIDTH = 380;
const FALLBACK_DEVICE_HEIGHT = 824;
const RESUME_TIMEOUT = 700;

function clamp(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

type MobilePreviewProps = {
  baseTitle: string;
  hero: HeroSettings;
  buttons: ButtonCanvasItem[];
  content: {
    clientName: string;
    clientPhone: string;
    primaryLink: string;
  };
};

function resolveBackground(hero: HeroSettings) {
  if (hero.backgroundKind === "color") {
    return { background: hero.backgroundColor };
  }

  const angle = Number.isFinite(hero.gradientAngle) ? hero.gradientAngle : 45;
  return {
    background: `linear-gradient(${angle}deg, ${hero.gradientFrom}, ${hero.gradientTo})`,
  };
}

function resolveAlignment(hero: HeroSettings) {
  switch (hero.alignment) {
    case "left":
      return "items-start text-left";
    case "right":
      return "items-end text-right";
    default:
      return "items-center text-center";
  }
}

function HeroSection({ baseTitle, hero }: { baseTitle: string; hero: HeroSettings }) {
  const heading = hero.heading.trim() || baseTitle || "Nome do projeto";
  const subheading = hero.subheading.trim();
  const typography = headerTypographyPreviewClass(hero.titleFont, hero.subtitleFont);
  const backgroundStyle = resolveBackground(hero);
  const alignment = resolveAlignment(hero);
  const coverSource = hero.coverImage?.assetUrl ?? hero.coverImage?.dataUrl ?? null;

  const titleSize = clamp(hero.titleSize ?? DEFAULT_TITLE_SIZE, 20, 72, DEFAULT_TITLE_SIZE);
  const subtitleSize = clamp(
    hero.subtitleSize ?? DEFAULT_SUBTITLE_SIZE,
    12,
    48,
    DEFAULT_SUBTITLE_SIZE
  );
  const headerHeight = clamp(
    hero.headerHeight ?? DEFAULT_HEADER_HEIGHT,
    HEADER_HEIGHT_MIN,
    HEADER_HEIGHT_MAX,
    DEFAULT_HEADER_HEIGHT
  );
  const titleColor = hero.titleColor || TITLE_COLOR_FALLBACK;
  const subtitleColor = hero.subtitleColor || SUBTITLE_COLOR_FALLBACK;

  return (
    <div className="relative w-full overflow-hidden" style={backgroundStyle}>
      {coverSource ? (
        <img
          src={coverSource}
          alt="Imagem do cabecalho"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: imageObjectPosition[hero.coverImagePosition] }}
        />
      ) : null}
      <div className="absolute inset-0 bg-black/30" aria-hidden />
      <div
        className={cn(
          "relative flex w-full flex-col justify-end gap-4 px-8 pb-12 pt-16",
          alignment
        )}
        style={{ height: `${headerHeight}px` }}
      >
        <div className="space-y-3">
          <h2
            className={cn("font-semibold", typography.heading)}
            style={{ fontSize: `${titleSize}px`, lineHeight: 1.1, color: titleColor }}
          >
            {heading}
          </h2>
          {subheading ? (
            <p
              className={cn("text-white/85", typography.subheading)}
              style={{ fontSize: `${subtitleSize}px`, lineHeight: 1.3, color: subtitleColor }}
            >
              {subheading}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ButtonsList({ buttons }: { buttons: ButtonCanvasItem[] }) {
  if (buttons.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-black/10 bg-black/5 p-6 text-center text-sm text-black/40">
        Nenhum botao configurado ainda.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {buttons.map((button) => {
        const tokens = buildPreviewTokens(button);
        return (
          <div key={button.id} className={tokens.className} style={tokens.style}>
            <div className="flex w-full items-center gap-4">
              {button.image ? (
                <img
                  src={button.image}
                  alt="Imagem do botao"
                  className="h-14 w-14 rounded-2xl object-cover"
                />
              ) : null}
              {button.icon ? <IconPreview id={button.icon} /> : null}
              <span className="flex-1 truncate text-left text-lg font-semibold">
                {button.label || "Texto do botao"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ContactSummary(content: MobilePreviewProps["content"]) {
  const hasClient = content.clientName.trim().length > 0;
  const hasPhone = content.clientPhone.trim().length > 0;
  const hasLink = content.primaryLink.trim().length > 0;

  if (!hasClient && !hasPhone && !hasLink) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-black/10 bg-black/5 p-5 text-left text-xs text-black/60">
      {hasClient ? (
        <p>
          <span className="font-semibold text-black/80">Cliente:</span> {content.clientName}
        </p>
      ) : null}
      {hasPhone ? (
        <p>
          <span className="font-semibold text-black/80">Telefone:</span> {content.clientPhone}
        </p>
      ) : null}
      {hasLink ? (
        <p>
          <span className="font-semibold text-black/80">Link principal:</span> {content.primaryLink}
        </p>
      ) : null}
    </div>
  );
}

function Screen({ baseTitle, hero, buttons, content }: MobilePreviewProps) {
  const memoButtons = useMemo(() => buttons, [buttons]);

  return (
    <div className="flex h-full flex-col gap-6 bg-[#f7f8fb]">
      <HeroSection baseTitle={baseTitle} hero={hero} />
      <div className="px-6">
        <ButtonsList buttons={memoButtons} />
      </div>
      <div className="px-6 pb-8">
        <ContactSummary {...content} />
      </div>
    </div>
  );
}

export function MobilePreview(props: MobilePreviewProps) {
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.matchMedia("(min-width: 1024px)").matches;
  });
  const [scale, setScale] = useState(1);
  const [deviceSize, setDeviceSize] = useState({
    width: FALLBACK_DEVICE_WIDTH,
    height: FALLBACK_DEVICE_HEIGHT,
  });

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const deviceRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const userOverrideRef = useRef(false);
  const resumeTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const media = window.matchMedia("(min-width: 1024px)");
    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
    };
    setIsDesktop(media.matches);
    if (media.addEventListener) {
      media.addEventListener("change", handleChange);
    } else {
      media.addListener(handleChange);
    }
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener("change", handleChange);
      } else {
        media.removeListener(handleChange);
      }
    };
  }, []);

  useEffect(() => {
    const element = deviceRef.current;
    if (!element) {
      return;
    }
    const updateSize = () => {
      const nextWidth = element.offsetWidth;
      const nextHeight = element.offsetHeight;
      setDeviceSize((current) => {
        if (Math.abs(current.width - nextWidth) < 1 && Math.abs(current.height - nextHeight) < 1) {
          return current;
        }
        return { width: nextWidth, height: nextHeight };
      });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  const computeScale = useCallback(() => {
    if (!isDesktop) {
      setScale(1);
      return;
    }
    const wrapper = wrapperRef.current;
    if (!wrapper || typeof window === "undefined") {
      setScale(1);
      return;
    }
    const deviceWidth = deviceSize.width || FALLBACK_DEVICE_WIDTH;
    const deviceHeight = deviceSize.height || FALLBACK_DEVICE_HEIGHT;
    const availableWidth = wrapper.clientWidth;
    const availableHeight = Math.max(200, window.innerHeight - STICKY_TOP - BOTTOM_MARGIN);
    const rawScale =
      Math.min(availableWidth / deviceWidth, availableHeight / deviceHeight) * SCALE_PADDING;
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, rawScale));
    setScale(Number.isFinite(clamped) ? clamped : 1);
  }, [deviceSize.height, deviceSize.width, isDesktop]);

  useEffect(() => {
    if (!isDesktop) {
      setScale(1);
      return;
    }
    computeScale();
    if (typeof window === "undefined") {
      return;
    }
    let resizeFrame: number | null = null;
    const handleResize = () => {
      if (resizeFrame !== null) {
        cancelAnimationFrame(resizeFrame);
      }
      resizeFrame = requestAnimationFrame(() => {
        computeScale();
      });
    };
    window.addEventListener("resize", handleResize, { passive: true });
    const wrapper = wrapperRef.current;
    const observer = wrapper ? new ResizeObserver(() => computeScale()) : null;
    if (wrapper && observer) {
      observer.observe(wrapper);
    }
    return () => {
      if (resizeFrame !== null) {
        cancelAnimationFrame(resizeFrame);
      }
      window.removeEventListener("resize", handleResize);
      if (observer && wrapper) {
        observer.unobserve(wrapper);
        observer.disconnect();
      }
    };
  }, [computeScale, isDesktop]);

  const updateScrollSync = useCallback(() => {
    if (!isDesktop || typeof window === "undefined") {
      return;
    }
    const container = scrollContainerRef.current;
    if (!container || userOverrideRef.current) {
      return;
    }
    const doc = document.documentElement;
    const totalScrollable = Math.max(1, doc.scrollHeight - window.innerHeight);
    const progress = Math.min(1, Math.max(0, window.scrollY / totalScrollable));
    const maxScroll = container.scrollHeight - container.clientHeight;
    if (maxScroll <= 0) {
      container.scrollTop = 0;
      return;
    }
    container.scrollTop = progress * maxScroll;
  }, [isDesktop]);

  const scheduleScrollSync = useCallback(() => {
    if (!isDesktop) {
      return;
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      updateScrollSync();
    });
  }, [isDesktop, updateScrollSync]);

  const markManualInteraction = useCallback(() => {
    if (!isDesktop) {
      return;
    }
    userOverrideRef.current = true;
    if (resumeTimerRef.current !== null) {
      window.clearTimeout(resumeTimerRef.current);
    }
    resumeTimerRef.current = window.setTimeout(() => {
      userOverrideRef.current = false;
      scheduleScrollSync();
    }, RESUME_TIMEOUT);
  }, [isDesktop, scheduleScrollSync]);

  useEffect(() => {
    if (!isDesktop) {
      const container = scrollContainerRef.current;
      if (container) {
        container.scrollTop = 0;
      }
      return;
    }
    scheduleScrollSync();
  }, [isDesktop, scheduleScrollSync, deviceSize, scale]);

  useEffect(() => {
    if (!isDesktop || typeof window === "undefined") {
      return;
    }
    const handleScroll = () => {
      scheduleScrollSync();
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isDesktop, scheduleScrollSync]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !isDesktop) {
      return;
    }
    const handleWheel = () => markManualInteraction();
    const handlePointerDown = () => markManualInteraction();
    const handleTouchStart = () => markManualInteraction();
    const handleScroll = () => markManualInteraction();

    container.addEventListener("wheel", handleWheel, { passive: true });
    container.addEventListener("pointerdown", handlePointerDown);
    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("pointerdown", handlePointerDown);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("scroll", handleScroll);
    };
  }, [isDesktop, markManualInteraction]);

  useEffect(
    () => () => {
      if (resumeTimerRef.current !== null) {
        window.clearTimeout(resumeTimerRef.current);
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    },
    []
  );

  const effectiveScale = isDesktop ? scale : 1;
  const deviceWidth = deviceSize.width || FALLBACK_DEVICE_WIDTH;
  const deviceHeight = deviceSize.height || FALLBACK_DEVICE_HEIGHT;

  const wrapperStyle = isDesktop
    ? {
        width: deviceWidth,
        height: deviceHeight * effectiveScale,
        overflow: "visible" as const,
      }
    : undefined;

  const deviceStyle = isDesktop
    ? {
        transform: `scale(${effectiveScale})`,
        transformOrigin: "top center" as const,
        willChange: "transform" as const,
      }
    : undefined;

  return (
    <aside className="space-y-6">
      <div className="hidden lg:block">
        <div className="sticky" style={{ top: `${STICKY_TOP}px` }}>
          <div ref={wrapperRef} className="flex w-full justify-center">
            <div className="relative" style={wrapperStyle}>
              <div
                ref={deviceRef}
                className="relative mx-auto aspect-[9/19.5] w-full max-w-[380px] rounded-[3rem] border border-black/20 bg-black/90 p-2 shadow-2xl"
                style={deviceStyle}
              >
                <div className="absolute left-1/2 top-2 h-6 w-36 -translate-x-1/2 rounded-b-2xl bg-black/80" />
                <div className="relative h-full w-full overflow-hidden rounded-[2.6rem] bg-white">
                  <div ref={scrollContainerRef} className="h-full w-full overflow-y-auto">
                    <Screen {...props} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:hidden">
        <div className="rounded-[2.2rem] border border-black/15 shadow-xl">
          <Screen {...props} />
        </div>
      </div>
    </aside>
  );
}
