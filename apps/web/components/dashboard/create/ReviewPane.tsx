"use client";

import Button from "@/components/Button";
import { cn } from "@/lib/cn";
import type { ButtonCanvasItem, HeroSettings, ProjectDraft } from "./types";

type ReviewPaneProps = {
  draft: ProjectDraft;
  slugAvailable: boolean;
  plan: {
    planId: string | null;
    active: boolean;
    planName: string | null;
    expiresAt: string | null;
    limit: number | null;
    used: number;
  } | null;
  onSaveDraft: () => Promise<void> | void;
  onPublish: () => Promise<void> | void;
  onUpgrade: () => void;
  onDiscard: () => void;
  savingDraft: boolean;
  publishing: boolean;
  hasPublishAccess: boolean;
  publishBlockedMessage?: string;
  limitExceeded: boolean;
  limitMessage?: string;
  lastSavedAt: number | null;
};

function formatTimestamp(timestamp: number | null) {
  if (!timestamp) {
    return "Nunca salvo";
  }

  const formatter = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return formatter.format(new Date(timestamp));
}

function SummarySection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm text-white/70">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2">
            <span aria-hidden className="mt-1 inline-block h-2 w-2 rounded-full bg-[#e2b23b]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function describeHero(hero: HeroSettings, baseTitle: string) {
  const heading = hero.heading.trim() || baseTitle || "Sem titulo";
  const parts: string[] = [`Titulo: ${heading}`];
  const headerHeight = Math.round(hero.headerHeight ?? 320);
  const gradientAngle = Math.round(hero.gradientAngle ?? 45);
  const hasSubheading = hero.subheading.trim().length > 0;

  if (hasSubheading) {
    parts.push(`Subtitulo: ${hero.subheading.trim()}`);
  }

  parts.push(`Altura: ${headerHeight}px`);

  if (hero.backgroundKind === "color") {
    parts.push(`Fundo cor: ${hero.backgroundColor}`);
  } else {
    parts.push(`Fundo gradiente: ${hero.gradientFrom} -> ${hero.gradientTo} (${gradientAngle}deg)`);
  }

  parts.push(`Alinhamento: ${hero.alignment}`);
  parts.push(`Cor titulo: ${hero.titleColor}`);

  if (hasSubheading) {
    parts.push(`Cor subtitulo: ${hero.subtitleColor}`);
  }

  parts.push(`Fontes: titulo ${hero.titleFont}, subtitulo ${hero.subtitleFont}`);
  parts.push(`Auto remover fundo: ${hero.autoRemoveBackground ? "sim" : "nao"}`);
  parts.push(`Otimizar imagem: ${hero.autoOptimizeImage ? "sim" : "nao"}`);

  if (hero.coverImage) {
    const alignment =
      hero.coverImagePosition === "left"
        ? "esquerda"
        : hero.coverImagePosition === "right"
          ? "direita"
          : "centro";
    const status = hero.coverImage.backgroundRemoved ? "fundo limpo" : "original";
    parts.push(`Imagem (${status}) alinhada a ${alignment}`);
  }

  return parts;
}
function describeButtons(buttons: ButtonCanvasItem[]) {
  if (buttons.length === 0) {
    return ["Nenhum botao configurado."];
  }

  return buttons.map((button, index) => {
    const extras = [] as string[];
    extras.push(`estilo ${button.style}`);
    extras.push(`texto ${button.textColor}`);
    extras.push(`fundo ${button.backgroundColor}`);
    if (button.style === "gradient" && button.secondaryColor) {
      extras.push(`gradiente ate ${button.secondaryColor}`);
    }
    if (button.icon) {
      extras.push(`icone ${button.icon}`);
    }
    if (button.image) {
      extras.push("imagem anexa");
    }
    return `Botao ${index + 1}: ${button.label || "sem label"} (${extras.join(", ")})`;
  });
}

function describeContent(draft: ProjectDraft) {
  const items: string[] = [];
  items.push(`Titulo base: ${draft.base.title || "sem titulo"}`);
  items.push(`Slug: ${draft.base.slug || "sem slug"}`);
  if (draft.content.clientName) {
    items.push(`Cliente: ${draft.content.clientName}`);
  }
  if (draft.content.clientPhone) {
    items.push(`Telefone: ${draft.content.clientPhone}`);
  }
  if (draft.content.primaryLink) {
    items.push(`Link principal: ${draft.content.primaryLink}`);
  }
  return items;
}

export function ReviewPane({
  draft,
  slugAvailable,
  plan,
  onSaveDraft,
  onPublish,
  onUpgrade,
  onDiscard,
  savingDraft,
  publishing,
  hasPublishAccess,
  publishBlockedMessage,
  limitExceeded,
  limitMessage,
  lastSavedAt,
}: ReviewPaneProps) {
  const heroSummary = describeHero(draft.style.hero, draft.base.title);
  const buttonSummary = describeButtons(draft.style.buttons);
  const contentSummary = describeContent(draft);

  const planLabel = plan?.planName ?? plan?.planId ?? "Plano desconhecido";
  const limitInfo = plan
    ? plan.limit === null
      ? "Sem limite definido"
      : `${plan.used}/${plan.limit} publicacoes no mes`
    : "Plano nao carregado";
  const publishCtaLabel = hasPublishAccess ? "Publicar" : "Contratar plano";

  return (
    <section className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_50px_rgba(13,32,24,0.35)] backdrop-blur">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-white">Revisao final</h2>
        <p className="text-sm text-white/70">Confirme dados, plano e limites antes de publicar.</p>
        <p className="text-xs text-white/50">Auto save local: {formatTimestamp(lastSavedAt)}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <SummarySection title="Hero" items={heroSummary} />
        <SummarySection title="Botoes" items={buttonSummary} />
        <SummarySection title="Conteudo" items={contentSummary} />
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white/80">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-white">Status do plano</p>
            <p>{planLabel}</p>
            <p className="text-xs text-white/60">{limitInfo}</p>
          </div>
          <div className="text-right text-xs text-white/60">
            <p>Slug disponivel: {slugAvailable ? "sim" : "nao"}</p>
            <p>Plano ativo: {plan?.active ? "sim" : "nao"}</p>
          </div>
        </div>

        {limitExceeded && limitMessage ? (
          <div className="mt-3 rounded-xl border border-[#e2b23b]/40 bg-[#e2b23b]/15 p-3 text-xs text-[#e2b23b]">
            {limitMessage}
          </div>
        ) : null}

        {publishBlockedMessage ? (
          <div className="mt-3 rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-xs text-red-200">
            {publishBlockedMessage}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-1 flex-col gap-3 md:flex-row">
          <Button type="button" variant="secondary" onClick={onSaveDraft} isLoading={savingDraft}>
            Salvar rascunho
          </Button>
          <Button
            type="button"
            onClick={hasPublishAccess ? onPublish : onUpgrade}
            isLoading={publishing && hasPublishAccess}
            variant={hasPublishAccess ? "primary" : "outline"}
            disabled={hasPublishAccess ? publishing || limitExceeded || !slugAvailable : false}
          >
            {publishCtaLabel}
          </Button>
        </div>
        <button
          type="button"
          onClick={onDiscard}
          className="rounded-xl border border-white/15 bg-transparent px-4 py-2 text-sm text-white/60 hover:border-white/30"
        >
          Descartar rascunho
        </button>
      </div>

      <p className="text-xs text-white/50">Atalho: pressione Ctrl+S para salvar rapidamente.</p>
    </section>
  );
}
