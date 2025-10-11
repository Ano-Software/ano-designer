"use client";

import Button from "@/components/Button";
import type { ProjectDraft } from "./types";

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
  const planLabel = plan?.planName ?? plan?.planId ?? "Plano desconhecido";
  const limitInfo = plan
    ? plan.limit === null
      ? "Sem limite definido"
      : `${plan.used}/${plan.limit} publicacoes no mes`
    : "Plano nao carregado";
  const publishCtaLabel = hasPublishAccess ? "Publicar" : "Contratar plano";
  const baseValid = (() => {
    const title = draft.base.title.trim();
    const slug = draft.base.slug.trim();
    return title.length >= 3 && title.length <= 120 && slug.length >= 3;
  })();

  return (
    <section className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_50px_rgba(13,32,24,0.35)] backdrop-blur">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-white">Publicar</h2>
        <p className="text-xs text-white/50">Auto save local: {formatTimestamp(lastSavedAt)}</p>
      </header>

      {/* Summary cards removed intentionally (Hero, Botoes, Conteudo) */}

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
            disabled={
              hasPublishAccess ? publishing || limitExceeded || !slugAvailable || !baseValid : false
            }
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
