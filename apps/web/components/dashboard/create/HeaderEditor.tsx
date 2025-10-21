"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import Button from "@/components/Button";
import { cn } from "@/lib/cn";
import type { HeroImageAlignment, HeroSettings } from "./types";

type TopoMessages = {
  tabTitle: string;
  tabDescription: string;
  previewLabel: string;
  heightLabel: string;
  heightValue: string;
  heightHelp: string;
  backgroundSolid: string;
  backgroundGradient: string;
  gradientFrom: string;
  gradientTo: string;
  gradientAngle: string;
  titleLabel: string;
  titlePlaceholder: string;
  subtitleLabel: string;
  subtitlePlaceholder: string;
  titleColorLabel: string;
  subtitleColorLabel: string;
  alignmentLabel: string;
  alignmentLeft: string;
  alignmentCenter: string;
  alignmentRight: string;
  imageLabel: string;
  imageUploadHint: string;
  removeImage: string;
  imageAlignmentLabel: string;
  imageAlignmentLeft: string;
  imageAlignmentCenter: string;
  imageAlignmentRight: string;
  toggleRemoveBackground: string;
  toggleOptimizeImage: string;
  statusIdle: string;
  statusReading: string;
  statusRemoving: string;
  statusSuccess: string;
  statusError: string;
  invalidFile: string;
};

// Versão corrigida em UTF-8 dos textos padrão
const defaultMessagesFixed: TopoMessages = {
  tabTitle: "Topo",
  tabDescription: "Configure altura, fundo, textos e imagem do cabeçalho com prévia ao vivo.",
  previewLabel: "Prévia do cabeçalho",
  heightLabel: "Altura do cabeçalho",
  heightValue: "Altura atual: {value}px",
  heightHelp: "Ajuste apenas a borda inferior. O topo permanece fixo.",
  backgroundSolid: "Cor sólida",
  backgroundGradient: "Gradiente",
  gradientFrom: "Cor inicial",
  gradientTo: "Cor final",
  gradientAngle: "Ângulo",
  titleLabel: "Título",
  titlePlaceholder: "Nome forte para o destaque",
  subtitleLabel: "Subtítulo",
  subtitlePlaceholder: "Mensagem breve de apoio",
  titleColorLabel: "Cor do título",
  subtitleColorLabel: "Cor do subtítulo",
  alignmentLabel: "Alinhamento",
  alignmentLeft: "Esquerda",
  alignmentCenter: "Centro",
  alignmentRight: "Direita",
  imageLabel: "Foto de cabeçalho",
  imageUploadHint: "PNG, JPG ou WebP. A imagem ocupa 100% da altura configurada.",
  removeImage: "Remover imagem",
  imageAlignmentLabel: "Alinhamento da foto",
  imageAlignmentLeft: "Esquerda",
  imageAlignmentCenter: "Centro",
  imageAlignmentRight: "Direita",
  toggleRemoveBackground: "Remover fundo automaticamente",
  toggleOptimizeImage: "Otimizar imagem",
  statusIdle: "Nenhum upload em andamento.",
  statusReading: "Processando upload...",
  statusRemoving: "Removendo fundo no servidor...",
  statusSuccess: "Imagem pronta!",
  statusError: "Não foi possível processar a imagem.",
  invalidFile: "Selecione um arquivo de imagem válido.",
};

type TopoTabProps = {
  value: HeroSettings;
  onChange: (value: HeroSettings) => void;
  messages?: Partial<TopoMessages>;
};

type FundoControlsProps = {
  value: HeroSettings;
  onChange: (patch: Partial<HeroSettings>) => void;
  messages: TopoMessages;
};

type TituloSubtituloControlsProps = {
  value: HeroSettings;
  onChange: (patch: Partial<HeroSettings>) => void;
  messages: TopoMessages;
};

type HeaderImageControlsProps = {
  value: HeroSettings;
  onFileSelected: (file: File) => void;
  onRemoveImage: () => void;
  onPositionChange: (alignment: HeroImageAlignment) => void;
  messages: TopoMessages;
};

type AlignmentOption = {
  id: HeroSettings["alignment"];
  label: string;
  glyph: string;
};

type ImageAlignmentOption = {
  id: HeroImageAlignment;
  label: string;
};

type StatusState = {
  type: "idle" | "info" | "success" | "error";
  text: string | null;
};

const HEADER_HEIGHT_RANGE = { min: 150, max: 420, default: 320 } as const;
const TITLE_SIZE = { min: 24, max: 72, default: 40 } as const;
const SUBTITLE_SIZE = { min: 14, max: 48, default: 18 } as const;

const defaultMessages: TopoMessages = {
  tabTitle: "Topo",
  tabDescription: "Configure altura, fundo, textos e imagem do cabeçalho com previsão ao vivo.",
  previewLabel: "Prévia do cabeçalho",
  heightLabel: "Altura do cabeçalho",
  heightValue: "Altura atual: {value}px",
  heightHelp: "Ajuste apenas a borda inferior. O topo permanece fixo.",
  backgroundSolid: "Cor sólida",
  backgroundGradient: "Gradiente",
  gradientFrom: "Cor inicial",
  gradientTo: "Cor final",
  gradientAngle: "Ângulo",
  titleLabel: "Título",
  titlePlaceholder: "Nome forte para o destaque",
  subtitleLabel: "Subtítulo",
  subtitlePlaceholder: "Mensagem breve de apoio",
  titleColorLabel: "Cor do titulo",
  subtitleColorLabel: "Cor do subtitulo",
  alignmentLabel: "Alinhamento",
  alignmentLeft: "Esquerda",
  alignmentCenter: "Centro",
  alignmentRight: "Direita",
  imageLabel: "Foto de cabeçalho",
  imageUploadHint: "PNG, JPG ou WebP. A imagem ocupa 100% da altura configurada.",
  removeImage: "Remover imagem",
  imageAlignmentLabel: "Alinhamento da foto",
  imageAlignmentLeft: "Esquerda",
  imageAlignmentCenter: "Centro",
  imageAlignmentRight: "Direita",
  toggleRemoveBackground: "Remover fundo automaticamente",
  toggleOptimizeImage: "Otimizar imagem",
  statusIdle: "Nenhum upload em andamento.",
  statusReading: "Processando upload...",
  statusRemoving: "Removendo fundo no servidor...",
  statusSuccess: "Imagem pronta!",
  statusError: "Não foi possível processar a imagem.",
  invalidFile: "Selecione um arquivo de imagem válido.",
};

const alignmentGlyphs: Record<HeroSettings["alignment"], string> = {
  left: "<",
  center: "|",
  right: ">",
};

const imageObjectPosition: Record<HeroImageAlignment, string> = {
  left: "left center",
  center: "center center",
  right: "right center",
};

function formatWithValue(template: string, value: number) {
  return template.replace("{value}", `${value}`);
}

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

function normalizeAngle(value: number) {
  if (!Number.isFinite(value)) {
    return 45;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 360) {
    return 360;
  }
  return Math.round(value);
}

function gradientPreviewStyle(value: HeroSettings) {
  if (value.backgroundKind === "color") {
    return { background: value.backgroundColor };
  }

  const angle = Number.isFinite(value.gradientAngle) ? value.gradientAngle : 45;
  return {
    background: `linear-gradient(${angle}deg, ${value.gradientFrom}, ${value.gradientTo})`,
  };
}

function fontClass(font: HeroSettings["titleFont"]) {
  switch (font) {
    case "serif":
      return "font-serif";
    case "mono":
      return "font-mono";
    case "display":
      return "font-semibold tracking-wide";
    default:
      return "font-sans";
  }
}

function readFileAsDataUrl(file: File, onProgress?: (progress: number) => void) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (!result) {
        reject(new Error("Arquivo invalido"));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Falha ao ler arquivo"));
    reader.onprogress = (event) => {
      if (!onProgress) {
        return;
      }
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };
    reader.readAsDataURL(file);
  });
}

function PreviewPane({ value, messages }: { value: HeroSettings; messages: TopoMessages }) {
  const previewStyle = useMemo(() => gradientPreviewStyle(value), [value]);
  const height = clamp(
    value.headerHeight,
    HEADER_HEIGHT_RANGE.min,
    HEADER_HEIGHT_RANGE.max,
    HEADER_HEIGHT_RANGE.default
  );
  const titleSize = clamp(value.titleSize, TITLE_SIZE.min, TITLE_SIZE.max, TITLE_SIZE.default);
  const subtitleSize = clamp(
    value.subtitleSize,
    SUBTITLE_SIZE.min,
    SUBTITLE_SIZE.max,
    SUBTITLE_SIZE.default
  );

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-white">{messages.previewLabel}</p>
      <div className="overflow-hidden rounded-xl border border-white/10 bg-black/80">
        <div className="relative w-full" style={{ minHeight: `${height}px`, ...previewStyle }}>
          {value.coverImage ? (
            <img
              src={value.coverImage.assetUrl ?? value.coverImage.dataUrl}
              alt="Pré-visualização do cabeçalho"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: imageObjectPosition[value.coverImagePosition] }}
            />
          ) : null}
          <div className="absolute inset-0 bg-black/30" aria-hidden />
          <div
            className={cn(
              "relative flex h-full w-full flex-col justify-end gap-3 p-6",
              value.alignment === "left" && "items-start text-left",
              value.alignment === "center" && "items-center text-center",
              value.alignment === "right" && "items-end text-right"
            )}
            style={{ color: value.titleColor }}
          >
            <div className="space-y-2">
              <h3
                className={cn("font-semibold", fontClass(value.titleFont))}
                style={{ fontSize: `${titleSize}px`, lineHeight: 1.1, color: value.titleColor }}
              >
                {value.heading || "Título de exemplo"}
              </h3>
              {value.subheading ? (
                <p
                  className={cn("text-white/85", fontClass(value.subtitleFont))}
                  style={{
                    fontSize: `${subtitleSize}px`,
                    lineHeight: 1.3,
                    color: value.subtitleColor,
                  }}
                >
                  {value.subheading}
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <p className="px-4 pb-4 pt-2 text-xs text-white/60">{messages.heightHelp}</p>
      </div>
    </div>
  );
}

function FundoControls({ value, onChange, messages }: FundoControlsProps) {
  const height = clamp(
    value.headerHeight,
    HEADER_HEIGHT_RANGE.min,
    HEADER_HEIGHT_RANGE.max,
    HEADER_HEIGHT_RANGE.default
  );
  const angle = normalizeAngle(value.gradientAngle);

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <label className="flex flex-col gap-2 text-sm text-white">
          <span className="font-medium">{messages.heightLabel}</span>
          <input
            type="range"
            min={HEADER_HEIGHT_RANGE.min}
            max={HEADER_HEIGHT_RANGE.max}
            step={1}
            value={height}
            onChange={(event) =>
              onChange({
                headerHeight:
                  Number.parseInt(event.target.value, 10) || HEADER_HEIGHT_RANGE.default,
              })
            }
            aria-valuemin={HEADER_HEIGHT_RANGE.min}
            aria-valuemax={HEADER_HEIGHT_RANGE.max}
            aria-valuenow={height}
          />
          <span className="text-xs text-white/60">
            {formatWithValue(messages.heightValue, height)}
          </span>
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-white">
            <input
              type="radio"
              name="hero-background"
              checked={value.backgroundKind === "color"}
              onChange={() => onChange({ backgroundKind: "color" })}
              className="h-4 w-4"
            />
            {messages.backgroundSolid}
          </label>
          <label className="flex items-center gap-2 text-sm text-white">
            <input
              type="radio"
              name="hero-background"
              checked={value.backgroundKind === "gradient"}
              onChange={() => onChange({ backgroundKind: "gradient" })}
              className="h-4 w-4"
            />
            {messages.backgroundGradient}
          </label>
        </div>

        {value.backgroundKind === "color" ? (
          <input
            type="color"
            value={value.backgroundColor}
            onChange={(event) => onChange({ backgroundColor: event.target.value })}
            className="h-14 w-full cursor-pointer rounded-xl border border-white/10 bg-white/5"
            aria-label={messages.backgroundSolid}
          />
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-white">
                <span>{messages.gradientFrom}</span>
                <input
                  type="color"
                  value={value.gradientFrom}
                  onChange={(event) => onChange({ gradientFrom: event.target.value })}
                  className="h-12 w-full cursor-pointer rounded-xl border border-white/10 bg-white/5"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-white">
                <span>{messages.gradientTo}</span>
                <input
                  type="color"
                  value={value.gradientTo}
                  onChange={(event) => onChange({ gradientTo: event.target.value })}
                  className="h-12 w-full cursor-pointer rounded-xl border border-white/10 bg-white/5"
                />
              </label>
            </div>
            <label className="flex flex-col gap-2 text-sm text-white">
              <span>
                {messages.gradientAngle} {angle}deg
              </span>
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={angle}
                onChange={(event) =>
                  onChange({ gradientAngle: Number.parseInt(event.target.value, 10) })
                }
              />
            </label>
          </div>
        )}
      </div>
    </section>
  );
}

function TituloSubtituloControls({ value, onChange, messages }: TituloSubtituloControlsProps) {
  const titleSize = clamp(value.titleSize, TITLE_SIZE.min, TITLE_SIZE.max, TITLE_SIZE.default);
  const subtitleSize = clamp(
    value.subtitleSize,
    SUBTITLE_SIZE.min,
    SUBTITLE_SIZE.max,
    SUBTITLE_SIZE.default
  );

  const alignmentOptions: AlignmentOption[] = [
    { id: "left", label: messages.alignmentLeft, glyph: alignmentGlyphs.left },
    { id: "center", label: messages.alignmentCenter, glyph: alignmentGlyphs.center },
    { id: "right", label: messages.alignmentRight, glyph: alignmentGlyphs.right },
  ];

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-white">{messages.titleLabel}</span>
          <input
            type="text"
            value={value.heading}
            onChange={(event) => onChange({ heading: event.target.value })}
            placeholder={messages.titlePlaceholder}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-[#e2b23b] focus:outline-none focus:ring-2 focus:ring-[#e2b23b]/40"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-white">{messages.subtitleLabel}</span>
          <input
            type="text"
            value={value.subheading}
            onChange={(event) => onChange({ subheading: event.target.value })}
            placeholder={messages.subtitlePlaceholder}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-[#e2b23b] focus:outline-none focus:ring-2 focus:ring-[#e2b23b]/40"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-white">{messages.titleColorLabel}</span>
          <input
            type="color"
            value={value.titleColor}
            onChange={(event) => onChange({ titleColor: event.target.value })}
            className="h-12 w-full cursor-pointer rounded-xl border border-white/10 bg-white/5"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-white">{messages.subtitleColorLabel}</span>
          <input
            type="color"
            value={value.subtitleColor}
            onChange={(event) => onChange({ subtitleColor: event.target.value })}
            className="h-12 w-full cursor-pointer rounded-xl border border-white/10 bg-white/5"
          />
        </label>
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium text-white">{messages.alignmentLabel}</span>
        <div className="flex gap-2">
          {alignmentOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange({ alignment: option.id })}
              className={cn(
                "flex h-10 flex-1 items-center justify-center rounded-xl border text-sm",
                value.alignment === option.id
                  ? "border-[#e2b23b] bg-[#e2b23b]/20 text-[#e2b23b]"
                  : "border-white/10 bg-white/5 text-white/70 hover:border-white/20"
              )}
            >
              <span aria-hidden className="text-lg leading-none">
                {option.glyph}
              </span>
              <span className="sr-only">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-white">
          <span>Tamanho do titulo ({titleSize}px)</span>
          <input
            type="range"
            min={TITLE_SIZE.min}
            max={TITLE_SIZE.max}
            step={1}
            value={titleSize}
            onChange={(event) => onChange({ titleSize: Number.parseInt(event.target.value, 10) })}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-white">
          <span>Tamanho do subtitulo ({subtitleSize}px)</span>
          <input
            type="range"
            min={SUBTITLE_SIZE.min}
            max={SUBTITLE_SIZE.max}
            step={1}
            value={subtitleSize}
            onChange={(event) =>
              onChange({ subtitleSize: Number.parseInt(event.target.value, 10) })
            }
          />
        </label>
      </div>
    </section>
  );
}

function HeaderImageControls({
  value,
  onFileSelected,
  onRemoveImage,
  onPositionChange,
  messages,
}: HeaderImageControlsProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const imageAlignmentOptions: ImageAlignmentOption[] = [
    { id: "left", label: messages.imageAlignmentLeft },
    { id: "center", label: messages.imageAlignmentCenter },
    { id: "right", label: messages.imageAlignmentRight },
  ];

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelected(file);
      event.target.value = "";
    }
  };

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-white" htmlFor="hero-image-upload">
          {messages.imageLabel}
        </label>
        <input
          ref={fileInputRef}
          id="hero-image-upload"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          className="block w-full text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-white/20 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-white/30"
        />
        <p className="text-xs text-white/50">{messages.imageUploadHint}</p>
        {/* removed background/optimization progress/status UI */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onRemoveImage}
            disabled={!value.coverImage}
          >
            {messages.removeImage}
          </Button>
        </div>
      </div>

      {/* removed background/optimize toggles block */}

      <fieldset className="space-y-2">
        <span className="text-sm font-medium text-white">{messages.imageAlignmentLabel}</span>
        <div className="flex gap-2">
          {imageAlignmentOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onPositionChange(option.id)}
              className={cn(
                "flex-1 rounded-xl border px-3 py-2 text-xs font-medium",
                value.coverImagePosition === option.id
                  ? "border-[#e2b23b] bg-[#e2b23b]/20 text-[#e2b23b]"
                  : "border-white/10 bg-white/5 text-white/70 hover:border-white/20"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>
    </section>
  );
}

// removed ToggleThumb helper

export function TopoTab({ value, onChange, messages }: TopoTabProps) {
  const copy = useMemo(() => ({ ...defaultMessagesFixed, ...messages }), [messages]);
  const [localError, setLocalError] = useState<string | null>(null);

  const update = (patch: Partial<HeroSettings>) => {
    onChange({ ...value, ...patch });
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setLocalError(copy.invalidFile);
      return;
    }

    setLocalError(null);

    try {
      const dataUrl = await readFileAsDataUrl(file);

      const processedUrl = dataUrl;
      const backgroundRemoved = false;
      update({
        coverImage: {
          dataUrl: processedUrl,
          fileName: file.name,
          backgroundRemoved,
          assetUrl: processedUrl,
        },
      });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : copy.statusError;
      setLocalError(message);
    }
  };

  const handleRemoveImage = () => {
    update({ coverImage: null });
    setLocalError(null);
  };

  return (
    <section className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_50px_rgba(13,32,24,0.35)] backdrop-blur">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-white">{copy.tabTitle}</h2>
        <p className="text-sm text-white/70">{copy.tabDescription}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr] lg:gap-8">
        <div className="space-y-5">
          <HeaderImageControls
            value={value}
            onFileSelected={handleImageUpload}
            onRemoveImage={handleRemoveImage}
            onPositionChange={(position) => update({ coverImagePosition: position })}
            messages={copy}
          />
          {localError ? <p className="text-sm text-red-300">{localError}</p> : null}
        </div>

        <div className="space-y-6">
          <TituloSubtituloControls value={value} onChange={update} messages={copy} />
          <FundoControls value={value} onChange={update} messages={copy} />
        </div>
      </div>
    </section>
  );
}

export function HeaderEditor(props: TopoTabProps) {
  const ptBRMessages: TopoMessages = {
    tabTitle: "Topo",
    tabDescription: "Configure altura, fundo, textos e imagem do cabeçalho com prévia ao vivo.",
    previewLabel: "Prévia do cabeçalho",
    heightLabel: "Altura do cabeçalho",
    heightValue: "Altura atual: {value}px",
    heightHelp: "Ajuste apenas a borda inferior. O topo permanece fixo.",
    backgroundSolid: "Cor sólida",
    backgroundGradient: "Gradiente",
    gradientFrom: "Cor inicial",
    gradientTo: "Cor final",
    gradientAngle: "Ângulo",
    titleLabel: "Título",
    titlePlaceholder: "Nome forte para o destaque",
    subtitleLabel: "Subtítulo",
    subtitlePlaceholder: "Mensagem breve de apoio",
    titleColorLabel: "Cor do título",
    subtitleColorLabel: "Cor do subtítulo",
    alignmentLabel: "Alinhamento",
    alignmentLeft: "Esquerda",
    alignmentCenter: "Centro",
    alignmentRight: "Direita",
    imageLabel: "Foto de cabeçalho",
    imageUploadHint: "PNG, JPG ou WebP. A imagem ocupa 100% da altura configurada.",
    removeImage: "Remover imagem",
    imageAlignmentLabel: "Alinhamento da foto",
    imageAlignmentLeft: "Esquerda",
    imageAlignmentCenter: "Centro",
    imageAlignmentRight: "Direita",
    toggleRemoveBackground: "Remover fundo automaticamente",
    toggleOptimizeImage: "Otimizar imagem",
    statusIdle: "Nenhum upload em andamento.",
    statusReading: "Processando upload...",
    statusRemoving: "Removendo fundo no servidor...",
    statusSuccess: "Imagem pronta!",
    statusError: "Não foi possível processar a imagem.",
    invalidFile: "Selecione um arquivo de imagem válido.",
  };
  return <TopoTab {...props} messages={{ ...ptBRMessages, ...(props.messages ?? {}) }} />;
}

export const headerTypographyPreviewClass = (
  heading: HeroSettings["titleFont"],
  subheading: HeroSettings["subtitleFont"]
) => ({
  heading: fontClass(heading),
  subheading: fontClass(subheading),
});
