"use client";

import {
  ChangeEvent,
  CSSProperties,
  DragEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  type SyntheticEvent,
} from "react";
import Button from "@/components/Button";
import { cn } from "@/lib/cn";
import type { ButtonCanvasItem } from "./types";

type ButtonCanvasEditorProps = {
  items: ButtonCanvasItem[];
  onChange: (buttons: ButtonCanvasItem[]) => void;
};

type StyleOption = {
  id: ButtonCanvasItem["style"];
  label: string;
  description: string;
};

type IconOption = {
  id: string | null;
  label: string;
};

type PreviewTokens = {
  className: string;
  style: CSSProperties;
};

const styleOptions: StyleOption[] = [
  { id: "filled", label: "Sólido", description: "Botão sólido com cor de destaque." },
  { id: "gradient", label: "Gradiente", description: "Transição suave entre duas cores." },
  { id: "glass", label: "Vidro", description: "Efeito vidro com transparência." },
  { id: "outline", label: "Contorno", description: "Somente contorno com fundo transparente." },
  { id: "neumorphic", label: "Neumórfico", description: "Cartão com sombras suaves em relevo." },
];

const iconOptions: IconOption[] = [
  { id: null, label: "Sem ícone" },
  { id: "link", label: "Link" },
  { id: "phone", label: "Telefone" },
  { id: "chat", label: "Chat" },
  { id: "cart", label: "Carrinho" },
  { id: "star", label: "Estrela" },
];

const BUTTON_HEIGHT = { min: 32, max: 80, default: 56 } as const;

const stopDragPropagation = (event: SyntheticEvent) => {
  event.stopPropagation();
};

function hasNoDragAncestor(target: EventTarget | null) {
  return target instanceof HTMLElement && target.closest('[data-no-drag="true"]');
}

function generateId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `btn-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (!result) {
        reject(new Error("Arquivo inválido"));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Falha ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

function ensureHex(value: string, fallback: string) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : fallback;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  if (normalized.length === 3) {
    const r = normalized[0];
    const g = normalized[1];
    const b = normalized[2];
    return [parseInt(`${r}${r}`, 16), parseInt(`${g}${g}`, 16), parseInt(`${b}${b}`, 16)] as const;
  }
  if (normalized.length === 6) {
    return [
      parseInt(normalized.slice(0, 2), 16),
      parseInt(normalized.slice(2, 4), 16),
      parseInt(normalized.slice(4, 6), 16),
    ] as const;
  }
  return [255, 255, 255] as const;
}

function hexToRgba(hex: string, alpha: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function shadeHex(hex: string, factor: number) {
  const [r, g, b] = hexToRgb(hex);
  const clampChannel = (value: number) => Math.min(255, Math.max(0, Math.round(value)));
  const adjust = (channel: number) =>
    factor >= 0
      ? clampChannel(channel + (255 - channel) * factor)
      : clampChannel(channel - channel * Math.abs(factor));
  const nextR = adjust(r).toString(16).padStart(2, "0");
  const nextG = adjust(g).toString(16).padStart(2, "0");
  const nextB = adjust(b).toString(16).padStart(2, "0");
  return `#${nextR}${nextG}${nextB}`;
}

function normalizeAngle(value: number | undefined) {
  if (!Number.isFinite(value)) {
    return 45;
  }
  return Math.max(0, Math.min(360, Math.round(value as number)));
}

function normalizeButtonHeight(value: number | undefined) {
  if (!Number.isFinite(value)) {
    return BUTTON_HEIGHT.default;
  }
  const parsed = Math.round(value as number);
  if (parsed < BUTTON_HEIGHT.min) {
    return BUTTON_HEIGHT.min;
  }
  if (parsed > BUTTON_HEIGHT.max) {
    return BUTTON_HEIGHT.max;
  }
  return parsed;
}

function buildPreviewTokens(button: ButtonCanvasItem): PreviewTokens {
  const baseClass =
    "flex w-full items-center rounded-[28px] px-6 text-base font-semibold transition";
  const textColor = ensureHex(button.textColor, "#0f172a");
  const primary = ensureHex(button.backgroundColor, "#e2b23b");
  const secondary = ensureHex(button.secondaryColor ?? primary, primary);
  const angle = normalizeAngle(button.gradientAngle);
  const height = normalizeButtonHeight(button.buttonHeight);
  const padding = Math.max(8, Math.round((height - 32) / 2));
  const baseStyle: CSSProperties = {
    minHeight: height,
    paddingTop: padding,
    paddingBottom: padding,
    lineHeight: 1.2,
  };

  switch (button.style) {
    case "gradient":
      return {
        className: cn(baseClass, "shadow-[0_24px_60px_rgba(12,32,24,0.35)]"),
        style: {
          ...baseStyle,
          background: `linear-gradient(${angle}deg, ${primary}, ${secondary})`,
          color: textColor,
        },
      };
    case "glass":
      return {
        className: cn(baseClass, "border border-white/25 backdrop-blur"),
        style: {
          ...baseStyle,
          color: textColor,
          background: hexToRgba(primary, 0.18),
          boxShadow: `0 16px 40px ${hexToRgba(primary, 0.25)}`,
        },
      };
    case "outline":
      return {
        className: cn(baseClass, "border bg-transparent"),
        style: {
          ...baseStyle,
          color: textColor,
          borderColor: primary,
        },
      };
    case "neumorphic":
      return {
        className: cn(baseClass, "border border-transparent"),
        style: {
          ...baseStyle,
          color: textColor,
          background: primary,
          boxShadow: `${hexToRgba(shadeHex(primary, 0.35), 0.45)} 0 18px 35px inset, ${hexToRgba(
            shadeHex(primary, -0.4),
            0.45
          )} 0 28px 40px`,
        },
      };
    default:
      return {
        className: cn(baseClass, "shadow-[0_24px_60px_rgba(12,32,24,0.35)]"),
        style: {
          ...baseStyle,
          background: primary,
          color: textColor,
        },
      };
  }
}

function IconPreview({ id }: { id: string | null }) {
  const size = 24;
  const stroke = "currentColor";
  if (!id) {
    return null;
  }

  if (id === "link") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={stroke}
        strokeWidth="2"
      >
        <path d="M10.5 13.5a5 5 0 0 1 7.07 0l.93.93a5 5 0 0 1 0 7.07l-2 2" />
        <path d="M13.5 10.5a5 5 0 0 1-7.07 0l-.93-.93a5 5 0 0 1 0-7.07l2-2" />
        <path d="M8.5 15.5l7-7" />
      </svg>
    );
  }

  if (id === "phone") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={stroke}
        strokeWidth="2"
      >
        <path d="M22 16.92V21a1 1 0 0 1-1.09 1 19 19 0 0 1-8.26-3.11 18.8 18.8 0 0 1-5.8-5.8A19 19 0 0 1 3 3.09 1 1 0 0 1 4 2h4.09a1 1 0 0 1 1 .75 12.05 12.05 0 0 0 .65 2.27 1 1 0 0 1-.23 1L8.91 7.09a16 16 0 0 0 8 8l1.07-.62a1 1 0 0 1 1 .06 12.05 12.05 0 0 0 2.27.65 1 1 0 0 1 .75 1Z" />
      </svg>
    );
  }

  if (id === "chat") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={stroke}
        strokeWidth="2"
      >
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />
        <circle cx="9" cy="10" r="1" />
        <circle cx="12" cy="10" r="1" />
        <circle cx="15" cy="10" r="1" />
      </svg>
    );
  }

  if (id === "cart") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={stroke}
        strokeWidth="2"
      >
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
    );
  }

  if (id === "star") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={stroke}
        strokeWidth="2"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    );
  }

  return null;
}

const selectBaseClasses =
  "w-full rounded-xl border border-white/25 bg-[#1b2433] px-4 py-3 text-sm text-white/90 transition focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#facc15] hover:border-white/40";

const selectOptionStyle = { color: "#0f172a", backgroundColor: "#ffffff" } as const;

export function ButtonCanvasEditor({ items, onChange }: ButtonCanvasEditorProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const dragSourceId = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  useEffect(() => {
    if (items.length === 0) {
      setActiveId(null);
      return;
    }

    if (!activeId || !items.some((button) => button.id === activeId)) {
      setActiveId(items[0].id);
    }
  }, [items, activeId]);

  const setButtons = (next: ButtonCanvasItem[]) => {
    onChange(next.map((button) => ({ ...button })));
  };

  const updateButton = (id: string, partial: Partial<ButtonCanvasItem>) => {
    const next = items.map((button) => (button.id === id ? { ...button, ...partial } : button));
    setButtons(next);
  };

  const handleAddButton = () => {
    const baseColor = items.length % 2 === 0 ? "#e2b23b" : "#38bdf8";
    const newButton: ButtonCanvasItem = {
      id: generateId(),
      label: `Novo botão ${items.length + 1}`,
      url: "https://",
      style: "filled",
      textColor: "#03160f",
      backgroundColor: baseColor,
      secondaryColor: shadeHex(baseColor, -0.3),
      gradientAngle: 45,
      icon: null,
      image: null,
      buttonHeight: BUTTON_HEIGHT.default,
    };
    setButtons([...items, newButton]);
    setActiveId(newButton.id);
  };

  const handleDuplicate = (id: string) => {
    const original = items.find((button) => button.id === id);
    if (!original) {
      return;
    }

    const clone: ButtonCanvasItem = {
      ...original,
      id: generateId(),
      label: `${original.label} cópia`,
    };
    const index = items.findIndex((button) => button.id === id);
    const next = [...items];
    next.splice(index + 1, 0, clone);
    setButtons(next);
    setActiveId(clone.id);
  };

  const handleRemove = (id: string) => {
    const next = items.filter((button) => button.id !== id);
    setButtons(next);
    if (activeId === id) {
      setActiveId(next[0]?.id ?? null);
    }
  };

  const handleDragStart = (id: string, event: DragEvent<HTMLButtonElement>) => {
    if (hasNoDragAncestor(event.target)) {
      event.preventDefault();
      return;
    }

    dragSourceId.current = id;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", id);
    }
  };

  const handleDragEnter = (id: string) => {
    if (dragSourceId.current === id) {
      return;
    }
    setDragOverId(id);
  };

  const handleDragLeave = (id: string) => {
    if (dragOverId === id) {
      setDragOverId(null);
    }
  };

  const handleDrop = (id: string, event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const sourceId = dragSourceId.current;
    if (!sourceId || sourceId === id) {
      return;
    }

    const sourceIndex = items.findIndex((button) => button.id === sourceId);
    const targetIndex = items.findIndex((button) => button.id === id);
    if (sourceIndex === -1 || targetIndex === -1) {
      return;
    }

    const next = [...items];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    setButtons(next);
    setDragOverId(null);
    dragSourceId.current = null;
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDragEnd = () => {
    dragSourceId.current = null;
    setDragOverId(null);
  };

  const preview = useMemo(
    () => items.map((item) => ({ id: item.id, tokens: buildPreviewTokens(item) })),
    [items]
  );

  return (
    <section className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_50px_rgba(13,32,24,0.35)] backdrop-blur">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-white">Botões</h2>
        <p className="text-sm text-white/70">
          Gerencie, reordene e personalize o estilo dos botões.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr] lg:gap-8">
        <aside className="space-y-4">
          <Button type="button" variant="secondary" onClick={handleAddButton}>
            Adicionar novo botão
          </Button>

          <div className="space-y-2">
            {items.length === 0 ? (
              <p className="text-sm text-white/60">Nenhum botão adicionado ainda.</p>
            ) : (
              <ul className="space-y-2">
                {items.map((button) => {
                  const isActive = button.id === activeId;
                  return (
                    <li key={button.id}>
                      <button
                        type="button"
                        onClick={() => setActiveId(button.id)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition",
                          isActive
                            ? "border-[#e2b23b] bg-[#e2b23b]/25 text-[#e2b23b]"
                            : "border-white/10 bg-white/5 text-white/70 hover:border-white/25"
                        )}
                      >
                        <span className="truncate">{button.label || "Sem nome"}</span>
                        <span className="text-xs text-white/40">{button.style}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <div className="space-y-4">
          {items.map((button, index) => {
            const tokens =
              preview.find((entry) => entry.id === button.id)?.tokens ?? buildPreviewTokens(button);
            const normalizedHeight = normalizeButtonHeight(button.buttonHeight);
            const normalizedGradientAngle = normalizeAngle(button.gradientAngle);
            const isActive = button.id === activeId;
            const highlight = dragOverId === button.id;

            return (
              <article
                key={button.id}
                onDragOver={handleDragOver}
                onDragEnter={() => handleDragEnter(button.id)}
                onDragLeave={() => handleDragLeave(button.id)}
                onDrop={(event) => handleDrop(button.id, event)}
                className={cn(
                  "rounded-3xl border border-white/10 bg-white/5 p-5 transition",
                  highlight && "border-[#e2b23b]",
                  !isActive && "opacity-70"
                )}
              >
                <header className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label="Arrastar botão"
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white/70 transition hover:border-white/25 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e2b23b] cursor-grab"
                      draggable
                      onDragStart={(event) => handleDragStart(button.id, event)}
                      onDragEnd={handleDragEnd}
                    >
                      <span aria-hidden>⋮⋮</span>
                    </button>
                    <div>
                      <p className="text-sm font-semibold text-white">Botão {index + 1}</p>
                      <p className="text-xs text-white/50">ID: {button.id.slice(0, 8)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDuplicate(button.id)}
                      className="rounded-xl border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/70 transition hover:border-white/25"
                      data-no-drag="true"
                      draggable={false}
                      onPointerDown={stopDragPropagation}
                      onMouseDown={stopDragPropagation}
                      onTouchStart={stopDragPropagation}
                    >
                      Duplicar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(button.id)}
                      className="rounded-xl border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/70 transition hover:border-white/25"
                      data-no-drag="true"
                      draggable={false}
                      onPointerDown={stopDragPropagation}
                      onMouseDown={stopDragPropagation}
                      onTouchStart={stopDragPropagation}
                    >
                      Remover
                    </button>
                  </div>
                </header>

                <div className="grid gap-4 md:grid-cols-2">
                  <label
                    className="space-y-2"
                    data-no-drag="true"
                    draggable={false}
                    onPointerDown={stopDragPropagation}
                    onMouseDown={stopDragPropagation}
                    onTouchStart={stopDragPropagation}
                  >
                    <span className="text-xs font-medium uppercase tracking-wide text-white/60">
                      Nome
                    </span>
                    <input
                      type="text"
                      value={button.label}
                      onChange={(event) => updateButton(button.id, { label: event.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-[#111827]/80 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-[#e2b23b] focus:outline-none focus:ring-2 focus:ring-[#e2b23b]/40"
                      placeholder="Nome exibido no botão"
                      draggable={false}
                    />
                  </label>
                  <label
                    className="space-y-2"
                    data-no-drag="true"
                    draggable={false}
                    onPointerDown={stopDragPropagation}
                    onMouseDown={stopDragPropagation}
                    onTouchStart={stopDragPropagation}
                  >
                    <span className="text-xs font-medium uppercase tracking-wide text-white/60">
                      URL
                    </span>
                    <input
                      type="url"
                      value={button.url}
                      onChange={(event) => updateButton(button.id, { url: event.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-[#111827]/80 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-[#e2b23b] focus:outline-none focus:ring-2 focus:ring-[#e2b23b]/40"
                      placeholder="https://"
                      draggable={false}
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label
                    className="space-y-2"
                    data-no-drag="true"
                    draggable={false}
                    onPointerDown={stopDragPropagation}
                    onMouseDown={stopDragPropagation}
                    onTouchStart={stopDragPropagation}
                  >
                    <span className="text-xs font-medium uppercase tracking-wide text-white/60">
                      Estilo
                    </span>
                    <select
                      value={button.style}
                      onChange={(event) =>
                        updateButton(button.id, {
                          style: event.target.value as ButtonCanvasItem["style"],
                        })
                      }
                      className={selectBaseClasses}
                      draggable={false}
                    >
                      {styleOptions.map((option) => (
                        <option key={option.id} value={option.id} style={selectOptionStyle}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-white/50">
                      {styleOptions.find((option) => option.id === button.style)?.description}
                    </p>
                  </label>
                  <label
                    className="space-y-2"
                    data-no-drag="true"
                    draggable={false}
                    onPointerDown={stopDragPropagation}
                    onMouseDown={stopDragPropagation}
                    onTouchStart={stopDragPropagation}
                  >
                    <span className="text-xs font-medium uppercase tracking-wide text-white/60">
                      Altura do botão ({normalizedHeight}px)
                    </span>
                    <input
                      type="range"
                      min={BUTTON_HEIGHT.min}
                      max={BUTTON_HEIGHT.max}
                      step={1}
                      value={normalizedHeight}
                      onChange={(event) =>
                        updateButton(button.id, {
                          buttonHeight: Number.parseInt(event.target.value, 10),
                        })
                      }
                      onPointerDown={stopDragPropagation}
                      onMouseDown={stopDragPropagation}
                      onTouchStart={stopDragPropagation}
                      className="w-full"
                      draggable={false}
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label
                    className="space-y-2"
                    data-no-drag="true"
                    draggable={false}
                    onPointerDown={stopDragPropagation}
                    onMouseDown={stopDragPropagation}
                    onTouchStart={stopDragPropagation}
                  >
                    <span className="text-xs font-medium uppercase tracking-wide text-white/60">
                      Cor primária
                    </span>
                    <input
                      type="color"
                      value={button.backgroundColor}
                      onChange={(event) =>
                        updateButton(button.id, {
                          backgroundColor: event.target.value,
                          secondaryColor:
                            button.style === "gradient"
                              ? shadeHex(event.target.value, -0.3)
                              : button.secondaryColor,
                        })
                      }
                      className="h-12 w-full cursor-pointer rounded-xl border border-white/10 bg-white/5"
                      draggable={false}
                    />
                  </label>
                  <label
                    className="space-y-2"
                    data-no-drag="true"
                    draggable={false}
                    onPointerDown={stopDragPropagation}
                    onMouseDown={stopDragPropagation}
                    onTouchStart={stopDragPropagation}
                  >
                    <span className="text-xs font-medium uppercase tracking-wide text-white/60">
                      Cor do texto
                    </span>
                    <input
                      type="color"
                      value={button.textColor}
                      onChange={(event) =>
                        updateButton(button.id, { textColor: event.target.value })
                      }
                      className="h-12 w-full cursor-pointer rounded-xl border border-white/10 bg-white/5"
                      draggable={false}
                    />
                  </label>
                </div>

                {button.style === "gradient" ? (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label
                      className="space-y-2"
                      data-no-drag="true"
                      draggable={false}
                      onPointerDown={stopDragPropagation}
                      onMouseDown={stopDragPropagation}
                      onTouchStart={stopDragPropagation}
                    >
                      <span className="text-xs font-medium uppercase tracking-wide text-white/60">
                        Cor secundária
                      </span>
                      <input
                        type="color"
                        value={button.secondaryColor ?? button.backgroundColor}
                        onChange={(event) =>
                          updateButton(button.id, { secondaryColor: event.target.value })
                        }
                        className="h-12 w-full cursor-pointer rounded-xl border border-white/10 bg-white/5"
                        draggable={false}
                      />
                    </label>
                    <label
                      className="space-y-2"
                      data-no-drag="true"
                      draggable={false}
                      onPointerDown={stopDragPropagation}
                      onMouseDown={stopDragPropagation}
                      onTouchStart={stopDragPropagation}
                    >
                      <span className="text-xs font-medium uppercase tracking-wide text-white/60">
                        Ângulo {normalizedGradientAngle}°
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={360}
                        step={1}
                        value={normalizedGradientAngle}
                        onChange={(event) =>
                          updateButton(button.id, {
                            gradientAngle: Number.parseInt(event.target.value, 10),
                          })
                        }
                        onPointerDown={stopDragPropagation}
                        onMouseDown={stopDragPropagation}
                        onTouchStart={stopDragPropagation}
                        className="w-full"
                        draggable={false}
                      />
                    </label>
                  </div>
                ) : null}

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label
                    className="space-y-2"
                    data-no-drag="true"
                    draggable={false}
                    onPointerDown={stopDragPropagation}
                    onMouseDown={stopDragPropagation}
                    onTouchStart={stopDragPropagation}
                  >
                    <span className="text-xs font-medium uppercase tracking-wide text-white/60">
                      Ícone
                    </span>
                    <select
                      value={button.icon ?? ""}
                      onChange={(event) =>
                        updateButton(button.id, { icon: event.target.value || null })
                      }
                      className={selectBaseClasses}
                      draggable={false}
                    >
                      {iconOptions.map((option) => (
                        <option
                          key={option.id ?? "none"}
                          value={option.id ?? ""}
                          style={selectOptionStyle}
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div
                    className="space-y-2"
                    data-no-drag="true"
                    draggable={false}
                    onPointerDown={stopDragPropagation}
                    onMouseDown={stopDragPropagation}
                    onTouchStart={stopDragPropagation}
                  >
                    <span className="text-xs font-medium uppercase tracking-wide text-white/60">
                      Imagem opcional
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => handleImageUpload(button.id, event)}
                      className="block w-full text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-white/20 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-white/30"
                      draggable={false}
                    />
                    {button.image ? (
                      <div className="flex items-center gap-3">
                        <img
                          src={button.image}
                          alt="Miniatura do botão"
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => updateButton(button.id, { image: null })}
                          className="rounded-xl border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/70 transition hover:border-white/25"
                          data-no-drag="true"
                          draggable={false}
                          onPointerDown={stopDragPropagation}
                          onMouseDown={stopDragPropagation}
                          onTouchStart={stopDragPropagation}
                        >
                          Remover imagem
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-white/50">
                        Opcional. Ideal para selos ou miniaturas.
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5 space-y-2" data-no-drag="true" draggable={false}>
                  <span className="text-xs font-medium uppercase tracking-wide text-white/60">
                    Prévia
                  </span>
                  <div className={tokens.className} style={tokens.style}>
                    <div className="flex w-full items-center gap-4">
                      {button.image ? (
                        <img
                          src={button.image}
                          alt="Imagem do botão"
                          className="h-14 w-14 rounded-2xl object-cover"
                        />
                      ) : null}
                      {button.icon ? <IconPreview id={button.icon} /> : null}
                      <span className="flex-1 truncate text-left">
                        {button.label || "Texto do botão"}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export type { PreviewTokens };
export { buildPreviewTokens, IconPreview };
