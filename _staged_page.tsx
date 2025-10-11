"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import { HeaderEditor } from "@/components/dashboard/create/HeaderEditor";
import { ButtonCanvasEditor } from "@/components/dashboard/create/ButtonCanvasEditor";
import { MobilePreview } from "@/components/dashboard/create/MobilePreview";
import { ReviewPane } from "@/components/dashboard/create/ReviewPane";
import {
  defaultProjectDraft,
  defaultHeroSettings,
  ButtonCanvasItem,
  HeroSettings,
  ProjectDraft,
} from "@/components/dashboard/create/types";
import { useDraft } from "@/hooks/useDraft";
import { useSlugAvailability } from "@/hooks/useSlugAvailability";
import { useLeaveGuard } from "@/hooks/useLeaveGuard";
import { removeBackground } from "@/lib/remove-background";
import { apiClient, ApiClientError } from "@/lib/api-client";
import type { BillingSubscriptionResource, ProjectPublicationLimitResource } from "@/types/api";
import { cn } from "@/lib/cn";

type StepKey = "base" | "style" | "content" | "review";

type StepConfig = {
  key: StepKey;
  title: string;
  subtitle: string;
};

type Feedback = {
  type: "success" | "error";
  message: string;
};

const steps: StepConfig[] = [
  { key: "base", title: "Base", subtitle: "Titulo e slug" },
  { key: "style", title: "Estilo", subtitle: "Hero e botoes" },
  { key: "content", title: "Conteudo", subtitle: "Dados do cliente" },
  { key: "review", title: "Revisao", subtitle: "Resumo e publico" },
];

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function cloneDraft(value: ProjectDraft): ProjectDraft {
  return JSON.parse(JSON.stringify(value)) as ProjectDraft;
}

function ensureDraftShape(input: ProjectDraft): ProjectDraft {
  return {
    ...cloneDraft(defaultProjectDraft),
    ...input,
    base: {
      ...defaultProjectDraft.base,
      ...(input.base ?? {}),
    },
    style: {
      hero: {
        ...defaultHeroSettings,
        ...(input.style?.hero ?? {}),
      },
      buttons: Array.isArray(input.style?.buttons) ? input.style.buttons : [],
    },
    content: {
      ...defaultProjectDraft.content,
      ...(input.content ?? {}),
    },
    publication: {
      ...defaultProjectDraft.publication,
      ...(input.publication ?? {}),
    },
    metadata: {
      ...defaultProjectDraft.metadata,
      ...(input.metadata ?? {}),
    },
  };
}

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function isValidSlug(slug: string) {
  return slugPattern.test(slug) && slug.length >= 3;
}

function isValidUrl(url: string) {
  if (!url) {
    return false;
  }
  try {
    const parsed = new URL(url);
    return Boolean(parsed.protocol && parsed.host);
  } catch {
    return false;
  }
}

function isValidPhone(phone: string) {
  if (!phone) {
    return true;
  }
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 14;
}

function formatPlanLimit(plan: ProjectPublicationLimitResource | null) {
  if (!plan) {
    return null;
  }
  if (plan.limit === null) {
    return null;
  }
  return { limit: plan.limit, used: plan.used, planName: plan.planName, planId: plan.planId };
}

function getPlanLimitFromProfile(profile: BillingSubscriptionResource["profile"] | null) {
  if (!profile?.planId) {
    return null;
  }
  const mapping: Record<string, number> = {
    A: 15,
    B: 100,
    C: 1000,
  };
  const planKey = profile.planId.toUpperCase();
  return mapping[planKey] ?? null;
}

function Stepper({
  currentStep,
  onSelect,
}: {
  currentStep: StepKey;
  onSelect: (key: StepKey) => void;
}) {
  const currentIndex = steps.findIndex((step) => step.key === currentStep);
  return (
    <ol className="grid gap-3 md:grid-cols-4">
      {steps.map((step, index) => {
        const status =
          index === currentIndex ? "active" : index < currentIndex ? "done" : "pending";
        return (
          <li key={step.key}>
            <button
              type="button"
              onClick={() => onSelect(step.key)}
              className={cn(
                "flex w-full flex-col rounded-2xl border px-4 py-3 text-left transition",
                status === "active"
                  ? "border-[#e2b23b] bg-[#e2b23b]/20 text-[#e2b23b]"
                  : status === "done"
                    ? "border-white/15 bg-white/10 text-white"
                    : "border-white/10 bg-white/5 text-white/60 hover:border-white/20"
              )}
            >
              <span className="text-xs uppercase tracking-[0.3em]">{`0${index + 1}`}</span>
              <span className="text-sm font-semibold">{step.title}</span>
              <span className="text-xs text-white/60">{step.subtitle}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function LeaveGuardModal({
  open,
  onConfirmAndSave,
  onConfirmExit,
  onCancel,
}: {
  open: boolean;
  onConfirmAndSave: () => Promise<void> | void;
  onConfirmExit: () => void;
  onCancel: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0d1f18] p-6 text-white shadow-2xl">
        <h3 className="text-lg font-semibold">Deseja sair sem salvar?</h3>
        <p className="mt-2 text-sm text-white/70">
          Salve o rascunho antes de deixar a pagina ou continue sem salvar.
        </p>
        <div className="mt-6 space-y-2">
          <Button variant="secondary" onClick={onConfirmAndSave}>
            Salvar rascunho e sair
          </Button>
          <Button variant="outline" onClick={onConfirmExit}>
            Sair sem salvar
          </Button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-xl border border-white/15 bg-transparent px-4 py-2 text-sm text-white/60 hover:border-white/30"
          >
            Continuar editando
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CreateProjectPage() {
  const router = useRouter();

  const initialDraft = useMemo(() => {
    const seeded = cloneDraft(defaultProjectDraft);
    seeded.metadata.updatedAt = new Date().toISOString();
    return seeded;
  }, []);

  const {
    value: draftValue,
    setValue: setDraftValue,
    save: persistDraft,
    discard: discardDraft,
    dirty,
    hydrated,
    lastSavedAt,
  } = useDraft<ProjectDraft>({
    storageKey: "ano-designer:create",
    initialValue: initialDraft,
    autosaveInterval: 2000,
  });

  const {
    status: slugStatus,
    message: slugMessage,
    suggestion: slugSuggestion,
    isAvailable: slugAvailable,
    trigger: triggerSlugCheck,
    checkNow: checkSlugNow,
    reset: resetSlug,
  } = useSlugAvailability();

  const leaveGuard = useLeaveGuard(dirty);

  const [draft, setDraft] = useState<ProjectDraft>(() => ensureDraftShape(draftValue));
  const [currentStep, setCurrentStep] = useState<StepKey>("base");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [removeBgLoading, setRemoveBgLoading] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [contentErrors, setContentErrors] = useState<{
    clientPhone?: string | null;
    primaryLink?: string | null;
  }>({});
  const [baseErrors, setBaseErrors] = useState<{ title?: string | null; slug?: string | null }>({});
  const [subscription, setSubscription] = useState<BillingSubscriptionResource | null>(null);
  const [publicationLimit, setPublicationLimit] = useState<ProjectPublicationLimitResource | null>(
    null
  );
  const [planError, setPlanError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(ensureDraftShape(draftValue));
  }, [draftValue]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    setDraftValue((current) => ensureDraftShape(current));
  }, [hydrated, setDraftValue]);

  useEffect(() => {
    if (!draft.base.slug.trim()) {
      resetSlug();
      return;
    }

    if (!isValidSlug(draft.base.slug.trim())) {
      return;
    }

    triggerSlugCheck(draft.base.slug.trim());
  }, [draft.base.slug, resetSlug, triggerSlugCheck]);

  useEffect(() => {
    const loadPlan = async () => {
      try {
        const [subscriptionResponse, limitResponse] = await Promise.all([
          apiClient.getBillingSubscription(),
          apiClient.getProjectPublicationLimit(),
        ]);
        setSubscription(subscriptionResponse.data);
        setPublicationLimit(limitResponse.data);
        setPlanError(null);
      } catch (error) {
        const apiError =
          error instanceof ApiClientError
            ? error
            : new ApiClientError("Falha ao carregar plano", 500, null);
        setPlanError(apiError.message);
      }
    };

    loadPlan().catch(console.error);
  }, []);

  const updateDraft = useCallback(
    (updater: (draft: ProjectDraft) => ProjectDraft) => {
      setDraftValue((previous) => {
        const ensured = ensureDraftShape(previous);
        const next = updater(ensured);
        return {
          ...next,
          metadata: {
            ...next.metadata,
            updatedAt: new Date().toISOString(),
          },
        };
      });
    },
    [setDraftValue]
  );

  const handleTitleChange = useCallback(
    (value: string) => {
      updateDraft((current) => ({
        ...current,
        base: {
          ...current.base,
          title: value,
        },
      }));
    },
    [updateDraft]
  );

  const handleSlugChange = useCallback(
    (rawValue: string) => {
      const normalized = normalizeSlug(rawValue);
      updateDraft((current) => ({
        ...current,
        base: {
          ...current.base,
          slug: normalized,
        },
      }));
    },
    [updateDraft]
  );

  const handleHeroChange = useCallback(
    (value: HeroSettings) => {
      updateDraft((current) => ({
        ...current,
        style: {
          ...current.style,
          hero: value,
        },
      }));
    },
    [updateDraft]
  );

  const handleButtonsChange = useCallback(
    (buttons: ButtonCanvasItem[]) => {
      updateDraft((current) => ({
        ...current,
        style: {
          ...current.style,
          buttons,
        },
      }));
    },
    [updateDraft]
  );

  const handleContentChange = useCallback(
    (field: "clientName" | "clientPhone" | "primaryLink", value: string) => {
      updateDraft((current) => ({
        ...current,
        content: {
          ...current.content,
          [field]: value,
        },
      }));
    },
    [updateDraft]
  );

  const handleGenerateSlug = useCallback(() => {
    if (!draft.base.title.trim()) {
      return;
    }
    const candidate = normalizeSlug(draft.base.title);
    handleSlugChange(candidate);
    void checkSlugNow(candidate);
    setSlugTouched(true);
  }, [draft.base.title, handleSlugChange, checkSlugNow]);

  const handleRemoveBackground = useCallback(async (image: string) => {
    setRemoveBgLoading(true);
    try {
      return await removeBackground(image);
    } finally {
      setRemoveBgLoading(false);
    }
  }, []);

  const validateBaseStep = useCallback(() => {
    const errors: { title?: string | null; slug?: string | null } = {};
    if (!draft.base.title.trim()) {
      errors.title = "Informe um titulo.";
    }
    if (!draft.base.slug.trim()) {
      errors.slug = "Informe um slug.";
    } else if (!isValidSlug(draft.base.slug.trim())) {
      errors.slug = "Use letras, numeros e hifens (minimo 3).";
    } else if (!slugAvailable) {
      errors.slug = slugMessage ?? "Slug indisponivel.";
    }
    setBaseErrors(errors);
    return Object.values(errors).every((value) => !value);
  }, [draft.base.slug, draft.base.title, slugAvailable, slugMessage]);

  const validateContentStep = useCallback(() => {
    const errors: { clientPhone?: string | null; primaryLink?: string | null } = {};
    if (!draft.content.primaryLink.trim()) {
      errors.primaryLink = "Informe o link principal.";
    } else if (!isValidUrl(draft.content.primaryLink.trim())) {
      errors.primaryLink = "URL invalida.";
    }
    if (!isValidPhone(draft.content.clientPhone.trim())) {
      errors.clientPhone = "Telefone deve ter entre 9 e 14 digitos.";
    }
    setContentErrors(errors);
    return Object.values(errors).every((value) => !value);
  }, [draft.content.clientPhone, draft.content.primaryLink]);

  const goNext = useCallback(() => {
    const order: StepKey[] = steps.map((step) => step.key);
    const index = order.indexOf(currentStep);
    if (index === -1) {
      return;
    }
    const next = order[index + 1];
    if (!next) {
      return;
    }
    if (currentStep === "base" && !validateBaseStep()) {
      return;
    }
    if (currentStep === "content" && !validateContentStep()) {
      return;
    }
    setCurrentStep(next);
  }, [currentStep, validateBaseStep, validateContentStep]);

  const goPrevious = useCallback(() => {
    const order: StepKey[] = steps.map((step) => step.key);
    const index = order.indexOf(currentStep);
    const previous = order[index - 1];
    if (previous) {
      setCurrentStep(previous);
    }
  }, [currentStep]);

  const handleSaveDraft = useCallback(async () => {
    setFeedback(null);
    setSavingDraft(true);
    try {
      const payload = {
        name: draft.base.title || "Projeto sem titulo",
        description: JSON.stringify({ ...draft, publication: { status: "draft" } }),
      };
      await apiClient.createProject(payload as any);
      persistDraft();
      setFeedback({ type: "success", message: "Rascunho salvo." });
    } catch (error) {
      const apiError =
        error instanceof ApiClientError
          ? error
          : new ApiClientError("Falha ao salvar rascunho.", 500, null);
      setFeedback({ type: "error", message: apiError.message });
    } finally {
      setSavingDraft(false);
    }
  }, [draft, persistDraft]);

  const planProfile = subscription?.profile ?? null;
  const planLimit = formatPlanLimit(publicationLimit);
  const fallbackLimit = getPlanLimitFromProfile(planProfile);
  const computedLimit = planLimit?.limit ?? fallbackLimit ?? null;
  const usedCount = planLimit?.used ?? 0;
  const limitExceeded = computedLimit !== null && usedCount >= computedLimit;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiresAt = planProfile?.planExpiresAt ? new Date(planProfile.planExpiresAt) : null;
  const isExpired = expiresAt ? expiresAt < today : false;
  const hasPublishAccess = Boolean(planProfile?.active) && !isExpired;

  const handlePublish = useCallback(async () => {
    if (!hasPublishAccess || limitExceeded || !slugAvailable) {
      return;
    }
    setFeedback(null);
    setPublishing(true);
    try {
      const payload = {
        name: draft.base.title || "Projeto sem titulo",
        description: JSON.stringify({ ...draft, publication: { status: "published" } }),
      };
      await apiClient.createProject(payload as any);
      discardDraft();
      setFeedback({ type: "success", message: "Projeto publicado." });
      router.push("/projetos");
    } catch (error) {
      const apiError =
        error instanceof ApiClientError
          ? error
          : new ApiClientError("Falha ao publicar.", 500, null);
      setFeedback({ type: "error", message: apiError.message });
    } finally {
      setPublishing(false);
    }
  }, [discardDraft, draft, hasPublishAccess, limitExceeded, router, slugAvailable]);

  const handleUpgrade = useCallback(() => {
    leaveGuard.requestLeave(() => router.push("/plano"));
  }, [leaveGuard, router]);

  const handleDiscardDraft = useCallback(() => {
    discardDraft();
    setFeedback({ type: "success", message: "Rascunho descartado." });
  }, [discardDraft]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void handleSaveDraft();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSaveDraft]);

  let publishBlockedMessage: string | undefined;
  if (!planProfile?.active) {
    publishBlockedMessage = "Plano inativo. Ative para publicar.";
  } else if (isExpired) {
    publishBlockedMessage = "Plano expirado. Renove para publicar.";
  } else if (!slugAvailable) {
    publishBlockedMessage = slugStatus === "checking" ? "Validando slug..." : "Slug indisponivel.";
  }

  const limitMessage = limitExceeded
    ? `Limite mensal atingido (${computedLimit} publicacoes). Atualize seu plano para continuar.`
    : undefined;

  const baseStepInvalid =
    !draft.base.title.trim() || !draft.base.slug.trim() || !isValidSlug(draft.base.slug.trim());
  const contentStepInvalid =
    !draft.content.primaryLink.trim() ||
    !isValidUrl(draft.content.primaryLink.trim()) ||
    !isValidPhone(draft.content.clientPhone.trim());

  const mobilePreviewProps = useMemo(
    () => ({
      baseTitle: draft.base.title,
      hero: draft.style.hero,
      buttons: draft.style.buttons,
      content: draft.content,
    }),
    [draft.base.title, draft.content, draft.style.buttons, draft.style.hero]
  );

  const planDataForReview = planProfile
    ? {
        planId: planProfile.planId,
        active: Boolean(planProfile.active),
        planName: planProfile.planId,
        expiresAt: planProfile.planExpiresAt,
        limit: computedLimit,
        used: usedCount,
      }
    : null;

  const baseStepContent = (
    <section className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_50px_rgba(13,32,24,0.35)] backdrop-blur">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-white">Base do projeto</h2>
        <p className="text-sm text-white/70">Defina titulo e slug unico para o link.</p>
      </header>

      <div className="space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-white">Titulo</span>
          <input
            type="text"
            value={draft.base.title}
            onChange={(event) => handleTitleChange(event.target.value)}
            placeholder="Landing premium do cliente"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-[#e2b23b] focus:outline-none focus:ring-2 focus:ring-[#e2b23b]/40"
          />
          {baseErrors.title ? (
            <span className="text-xs text-red-300">{baseErrors.title}</span>
          ) : null}
        </label>

        <label className="block space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">Slug</span>
            <button
              type="button"
              onClick={handleGenerateSlug}
              className="text-xs text-[#e2b23b] hover:underline"
            >
              Gerar automaticamente
            </button>
          </div>
          <input
            type="text"
            value={draft.base.slug}
            onChange={(event) => handleSlugChange(event.target.value)}
            onBlur={() => setSlugTouched(true)}
            placeholder="landing-premium"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-[#e2b23b] focus:outline-none focus:ring-2 focus:ring-[#e2b23b]/40"
          />
          <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
            {slugStatus === "checking" ? <span>Validando disponiblidade...</span> : null}
            {slugStatus === "available" ? <span className="text-green-300">Disponivel</span> : null}
            {slugStatus === "unavailable" ? (
              <span className="text-red-300">Slug em uso</span>
            ) : null}
            {slugStatus === "error" ? <span className="text-red-300">{slugMessage}</span> : null}
            {slugSuggestion && slugStatus === "unavailable" ? (
              <button
                type="button"
                onClick={() => handleSlugChange(slugSuggestion ?? "")}
                className="text-[#e2b23b] hover:underline"
              >
                Usar sugestao: {slugSuggestion}
              </button>
            ) : null}
          </div>
          {baseErrors.slug && slugTouched ? (
            <span className="text-xs text-red-300">{baseErrors.slug}</span>
          ) : null}
        </label>
      </div>
    </section>
  );

  const styleStepContent = (
    <div className="space-y-6">
      <HeaderEditor
        value={draft.style.hero}
        onChange={handleHeroChange}
        onRequestRemoveBackground={handleRemoveBackground}
        removingBackground={removeBgLoading}
      />
      <ButtonCanvasEditor items={draft.style.buttons} onChange={handleButtonsChange} />
    </div>
  );

  const contentStepContent = (
    <section className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_50px_rgba(13,32,24,0.35)] backdrop-blur">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-white">Conteudo adicional</h2>
        <p className="text-sm text-white/70">
          Dados que serao usados nos CTAs e informacoes do projeto.
        </p>
      </header>

      <div className="space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-white">Nome do cliente</span>
          <input
            type="text"
            value={draft.content.clientName}
            onChange={(event) => handleContentChange("clientName", event.target.value)}
            placeholder="Cliente de exemplo"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-[#e2b23b] focus:outline-none focus:ring-2 focus:ring-[#e2b23b]/40"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-white">Telefone</span>
          <input
            type="tel"
            value={draft.content.clientPhone}
            onChange={(event) => handleContentChange("clientPhone", event.target.value)}
            placeholder="(11) 99999-9999"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-[#e2b23b] focus:outline-none focus:ring-2 focus:ring-[#e2b23b]/40"
          />
          {contentErrors.clientPhone ? (
            <span className="text-xs text-red-300">{contentErrors.clientPhone}</span>
          ) : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-white">Link do botao principal</span>
          <input
            type="url"
            value={draft.content.primaryLink}
            onChange={(event) => handleContentChange("primaryLink", event.target.value)}
            placeholder="https://"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-[#e2b23b] focus:outline-none focus:ring-2 focus:ring-[#e2b23b]/40"
          />
          {contentErrors.primaryLink ? (
            <span className="text-xs text-red-300">{contentErrors.primaryLink}</span>
          ) : (
            <span className="text-xs text-white/50">
              Obrigatorio. Esse link sera usado no CTA principal.
            </span>
          )}
        </label>
      </div>
    </section>
  );

  const reviewStepContent = (
    <ReviewPane
      draft={draft}
      slugAvailable={slugAvailable}
      plan={planDataForReview}
      onSaveDraft={handleSaveDraft}
      onPublish={handlePublish}
      onUpgrade={handleUpgrade}
      onDiscard={handleDiscardDraft}
      savingDraft={savingDraft}
      publishing={publishing}
      hasPublishAccess={hasPublishAccess}
      publishBlockedMessage={publishBlockedMessage}
      limitExceeded={limitExceeded}
      limitMessage={limitMessage}
      lastSavedAt={lastSavedAt}
    />
  );

  const currentPanel =
    currentStep === "base"
      ? baseStepContent
      : currentStep === "style"
        ? styleStepContent
        : currentStep === "content"
          ? contentStepContent
          : reviewStepContent;

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Criar projeto</h1>
          <p className="text-sm text-white/60">
            Siga as etapas para montar o layout antes de publicar.
          </p>
        </div>
        <button
          type="button"
          onClick={() => leaveGuard.requestLeave(() => router.push("/projetos"))}
          className="text-sm text-white/60 hover:text-white"
        >
          Voltar para projetos
        </button>
      </div>

      <Stepper currentStep={currentStep} onSelect={setCurrentStep} />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
        <div className="space-y-6">
          {currentPanel}

          {currentStep !== "review" ? (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={goPrevious}
                disabled={currentStep === "base"}
                className="rounded-xl border border-white/15 bg-transparent px-4 py-2 text-sm text-white/70 transition hover:border-white/30 disabled:cursor-not-allowed disabled:border-white/5 disabled:text-white/30"
              >
                Voltar
              </button>
              <Button
                type="button"
                onClick={goNext}
                variant="primary"
                disabled={
                  (currentStep === "base" && baseStepInvalid) ||
                  (currentStep === "content" && contentStepInvalid)
                }
              >
                Avancar
              </Button>
            </div>
          ) : null}

          {feedback ? (
            <div
              className={cn(
                "rounded-2xl border p-4 text-sm",
                feedback.type === "success"
                  ? "border-green-500/30 bg-green-500/10 text-green-200"
                  : "border-red-500/30 bg-red-500/10 text-red-200"
              )}
            >
              {feedback.message}
            </div>
          ) : null}

          {planError ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {planError}
            </div>
          ) : null}
        </div>

        <div className="xl:pl-4 xl:self-start xl:h-fit">
          <MobilePreview {...mobilePreviewProps} />
        </div>
      </div>

      <LeaveGuardModal
        open={leaveGuard.isDialogOpen}
        onConfirmAndSave={async () => {
          await handleSaveDraft();
          leaveGuard.confirmLeave();
        }}
        onConfirmExit={() => {
          leaveGuard.confirmLeave();
        }}
        onCancel={leaveGuard.cancelLeave}
      />
    </div>
  );
}
