"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Button from "@/components/Button";
import { apiClient } from "@/lib/api-client";
import type { ProjectDraft } from "./types";

type ReviewPaneProps = {
  draft: ProjectDraft;
  slugAvailable: boolean;
  onUpdatePublicName?: (value: string) => void;
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
  onUpdatePublicName,
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
  // Link público: estado e validação
  const [linkName, setLinkName] = useState<string>(() => draft?.base?.slug ?? "");
  const [linkStatus, setLinkStatus] = useState<"idle" | "checking" | "available" | "unavailable">(
    "idle"
  );
  const [linkMessage, setLinkMessage] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const NAME_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const validateLocally = useCallback((value: string) => {
    const v = value.trim().toLowerCase();
    if (v.length < 3 || v.length > 60 || !NAME_REGEX.test(v)) {
      setLinkStatus("unavailable");
      setLinkMessage("Nome inválido.");
      return false;
    }
    setLinkStatus("checking");
    setLinkMessage(null);
    return true;
  }, []);

  const triggerCheck = useCallback(
    (value: string) => {
      clearTimer();
      const ok = validateLocally(value);
      if (!ok) return;
      const normalized = value.trim().toLowerCase();
      timerRef.current = window.setTimeout(async () => {
        try {
          const res = await apiClient.checkProjectSlugAvailability(normalized);
          const available = Boolean(res.data?.available);
          setLinkStatus(available ? "available" : "unavailable");
          setLinkMessage(available ? null : "Indisponível.");
        } catch {
          setLinkStatus("unavailable");
          setLinkMessage("Falha ao validar.");
        }
      }, 400) as unknown as number;
    },
    [clearTimer, validateLocally]
  );

  useEffect(() => {
    setLinkName(draft?.base?.slug ?? "");
    if (draft?.base?.slug) triggerCheck(draft.base.slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const planLabel = plan?.planName ?? plan?.planId ?? "Plano desconhecido";
  const limitInfo = plan
    ? plan.limit === null
      ? "Sem limite definido"
      : `${plan.used}/${plan.limit} publicações no mês`
    : "Plano não carregado";
  const publishCtaLabel = hasPublishAccess ? "Publicar" : "Contratar plano";
  const baseValid = (() => {
    const title = draft?.base?.title?.trim?.() ?? "";
    const slug = draft?.base?.slug?.trim?.() ?? "";
    return title.length >= 3 && title.length <= 120 && slug.length >= 3;
  })();

  return (
    <section className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_50px_rgba(13,32,24,0.35)] backdrop-blur">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-white">Publicar</h2>
        <p className="text-xs text-white/50">Auto save local: {formatTimestamp(lastSavedAt)}</p>
      </header>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-4 text-sm">
        <p className="font-semibold text-white">Link do projeto</p>
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70">
            anoig.com/
          </span>
          <input
            type="text"
            aria-label="Nome do link público"
            value={linkName}
            onChange={(e) => {
              const v = e.target.value.toLowerCase();
              setLinkName(v);
              onUpdatePublicName?.(v);
              triggerCheck(v);
            }}
            placeholder="meu-projeto"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-[#e2b23b] focus:outline-none focus:ring-2 focus:ring-[#e2b23b]/40"
          />
        </div>
        <div className="text-xs">
          {linkStatus === "checking" ? (
            <span className="text-white/60">Validando…</span>
          ) : linkStatus === "available" ? (
            <span className="text-green-300">Disponível</span>
          ) : linkStatus === "unavailable" ? (
            <span className="text-red-300">{linkMessage ?? "Indisponível"}</span>
          ) : null}
        </div>
      </section>

      {/* Summary cards removed intentionally (Hero, Botoes, Conteudo) */}

      <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white/80">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-white">Status do plano</p>
            <p>{planLabel}</p>
            <p className="text-xs text-white/60">{limitInfo}</p>
          </div>
          <div className="text-right text-xs text-white/60">
            <p>Slug disponível: {slugAvailable ? "sim" : "não"}</p>
            <p>Plano ativo: {plan?.active ? "sim" : "não"}</p>
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
