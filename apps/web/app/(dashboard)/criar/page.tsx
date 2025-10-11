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
// removeBackground logic/UI removed from Estilo per requirements
import { apiClient, ApiClientError } from "@/lib/api-client";
import type { BillingSubscriptionResource, ProjectPublicationLimitResource } from "@/types/api";
import { cn } from "@/lib/cn";

type StepKey = "project" | "style" | "publish";

type StepConfig = {
  key: StepKey;
  title: string;
};

type Feedback = {
  type: "success" | "error";
  message: string;
};

const steps: StepConfig[] = [
  { key: "project", title: "Projeto" },
  { key: "style", title: "Estilo" },
  { key: "publish", title: "Publicar" },
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

function maskPhoneBR(input: string) {
  const digits = input.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.replace(/(\d{0,2})/, "($1");
  if (digits.length <= 7) return digits.replace(/(\d{2})(\d{0,5})/, "($1) $2");
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
}

function toE164BR(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) {
    return "+55" + digits;
  }
  return null;
}

function isValidEmail(email: string) {
  if (!email) return true;
  return /.+@.+\..+/.test(email);
}

function formatDateInput(iso: string | null | undefined) {
  try {
    if (!iso) return "";
    const d = new Date(iso);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    return "";
  }
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
    <ol className="grid gap-3 md:grid-cols-3">
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
              {step.key !== "project" ? (
                <span className="text-xs uppercase tracking-[0.3em]">{`0${index + 1}`}</span>
              ) : null}
              <span className="text-sm font-semibold">{step.title}</span>
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
  const [currentStep, setCurrentStep] = useState<StepKey>("project");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [baseErrors, setBaseErrors] = useState<{
    title?: string | null;
    slug?: string | null;
    clientEmail?: string | null;
    dueDate?: string | null;
    amountPaid?: string | null;
    paymentMethod?: string | null;
    clientName?: string | null;
    clientType?: string | null;
  }>({});
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

  // Content step removed; any content edits occur elsewhere if needed.

  const handleGenerateSlug = useCallback(() => {
    if (!draft.base.title.trim()) {
      return;
    }
    const candidate = normalizeSlug(draft.base.title);
    handleSlugChange(candidate);
    void checkSlugNow(candidate);
    setSlugTouched(true);
  }, [draft.base.title, handleSlugChange, checkSlugNow]);

  // autosave local draft (debounce ~600ms)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      persistDraft();
    }, 600);
    return () => window.clearTimeout(timer);
  }, [persistDraft, draft.base]);

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
    if (currentStep === "project" && !validateBaseStep()) {
      return;
    }
    // autosave on step advance
    persistDraft();
    setCurrentStep(next);
  }, [currentStep, validateBaseStep, persistDraft]);

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
      // validate slug availability server-side
      const check = await apiClient.checkProjectSlugAvailability(draft.base.slug);
      if (!check.data?.available) {
        throw new ApiClientError("Slug indisponivel.", 400, null);
      }
      const payload = {
        name: draft.base.title || "Projeto sem titulo",
        description: JSON.stringify({
          ...draft,
          publication: { status: "published", publicPath: draft.base.slug },
        }),
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

  const baseStepInvalid = (() => {
    const title = draft.base.title.trim();
    if (title.length < 3 || title.length > 120) return true;
    if (!draft.base.clientName.trim()) return true;
    if (!draft.base.clientType) return true;
    // due date must be >= createdAt
    if (draft.base.dueDate) {
      const created = new Date(draft.base.createdAt);
      const due = new Date(draft.base.dueDate);
      if (due < new Date(created.getFullYear(), created.getMonth(), created.getDate())) return true;
    }
    if (draft.base.clientEmail && !isValidEmail(draft.base.clientEmail)) return true;
    if (draft.base.paid) {
      if (draft.base.amountPaid == null || isNaN(draft.base.amountPaid)) return true;
      if ((draft.base.amountPaid as number) < 0) return true;
      if (!draft.base.paymentMethod) return true;
    }
    return !draft.base.slug.trim() || !isValidSlug(draft.base.slug.trim());
  })();

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

  const projectStepContent = (
    <section className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_50px_rgba(13,32,24,0.35)] backdrop-blur">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-white">Projeto</h2>
        <p className="text-sm text-white/70">Preencha os dados do projeto.</p>
      </header>

      <div className="space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-white">Nome do projeto</span>
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
          <span className="text-sm font-medium text-white">Projeto pago?</span>
          <select
            aria-label="Projeto pago?"
            value={draft.base.paid ? "sim" : "nao"}
            onChange={(e) =>
              updateDraft((current) => ({
                ...current,
                base: { ...current.base, paid: e.target.value === "sim" },
              }))
            }
            className="w-full rounded-xl border border-white/25 bg-[#1b2433] px-4 py-3 text-sm text-white/90 transition focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#facc15] hover:border-white/40"
          >
            <option value="nao" style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>
              NÃ£o
            </option>
            <option value="sim" style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>
              Sim
            </option>
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-white">Data de criaÃ§Ã£o</span>
          <input
            type="date"
            value={formatDateInput(draft.base.createdAt)}
            readOnly
            disabled
            className="w-full cursor-not-allowed rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-white">Data de entrega</span>
          <input
            type="date"
            value={draft.base.dueDate ?? ""}
            onChange={(e) =>
              updateDraft((current) => ({
                ...current,
                base: { ...current.base, dueDate: e.target.value || null },
              }))
            }
            min={formatDateInput(draft.base.createdAt)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-[#e2b23b] focus:outline-none focus:ring-2 focus:ring-[#e2b23b]/40"
          />
          {baseErrors.dueDate ? (
            <span className="text-xs text-red-300">{baseErrors.dueDate}</span>
          ) : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-white">Nome do cliente</span>
          <input
            type="text"
            value={draft.base.clientName}
            onChange={(e) =>
              updateDraft((current) => ({
                ...current,
                base: { ...current.base, clientName: e.target.value },
              }))
            }
            placeholder="Cliente de exemplo"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-[#e2b23b] focus:outline-none focus:ring-2 focus:ring-[#e2b23b]/40"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-white">Empresa</span>
          <input
            type="text"
            value={draft.base.companyName}
            onChange={(e) =>
              updateDraft((current) => ({
                ...current,
                base: { ...current.base, companyName: e.target.value },
              }))
            }
            placeholder="RazÃ£o social"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-[#e2b23b] focus:outline-none focus:ring-2 focus:ring-[#e2b23b]/40"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-white">Telefone</span>
          <input
            type="tel"
            value={maskPhoneBR(draft.base.clientPhone)}
            onChange={(e) =>
              updateDraft((current) => ({
                ...current,
                base: { ...current.base, clientPhone: e.target.value },
              }))
            }
            placeholder="(11) 99999-9999"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-[#e2b23b] focus:outline-none focus:ring-2 focus:ring-[#e2b23b]/40"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-white">WhatsApp</span>
          <input
            type="tel"
            value={maskPhoneBR(draft.base.clientWhatsapp)}
            onChange={(e) =>
              updateDraft((current) => ({
                ...current,
                base: { ...current.base, clientWhatsapp: e.target.value },
              }))
            }
            placeholder="(11) 99999-9999"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-[#e2b23b] focus:outline-none focus:ring-2 focus:ring-[#e2b23b]/40"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-white">E-mail</span>
          <input
            type="email"
            value={draft.base.clientEmail}
            onChange={(e) =>
              updateDraft((current) => ({
                ...current,
                base: { ...current.base, clientEmail: e.target.value },
              }))
            }
            placeholder="cliente@dominio.com"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-[#e2b23b] focus:outline-none focus:ring-2 focus:ring-[#e2b23b]/40"
          />
          {baseErrors.clientEmail ? (
            <span className="text-xs text-red-300">{baseErrors.clientEmail}</span>
          ) : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-white">Tipo de cliente</span>
          <select
            aria-label="Tipo de cliente"
            value={draft.base.clientType}
            onChange={(e) =>
              updateDraft((current) => ({
                ...current,
                base: { ...current.base, clientType: e.target.value as any },
              }))
            }
            className="w-full rounded-xl border border-white/25 bg-[#1b2433] px-4 py-3 text-sm text-white/90 transition focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#facc15] hover:border-white/40"
          >
            <option value="" style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>
              Selecione
            </option>
            <option value="pf" style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>
              Pessoa FÃ­sica
            </option>
            <option value="pj" style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>
              Empresa
            </option>
          </select>
          {baseErrors.clientType ? (
            <span className="text-xs text-red-300">{baseErrors.clientType}</span>
          ) : null}
        </label>

        {draft.base.paid ? (
          <>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-white">Valor pago (R$)</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={0.01}
                value={draft.base.amountPaid ?? 0}
                onChange={(e) =>
                  updateDraft((current) => ({
                    ...current,
                    base: { ...current.base, amountPaid: Number(e.target.value) },
                  }))
                }
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-[#e2b23b] focus:outline-none focus:ring-2 focus:ring-[#e2b23b]/40"
              />
              {baseErrors.amountPaid ? (
                <span className="text-xs text-red-300">{baseErrors.amountPaid}</span>
              ) : null}
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-white">Forma de pagamento</span>
              <select
                aria-label="Forma de pagamento"
                value={draft.base.paymentMethod ?? ""}
                onChange={(e) =>
                  updateDraft((current) => ({
                    ...current,
                    base: { ...current.base, paymentMethod: (e.target.value || null) as any },
                  }))
                }
                className="w-full rounded-xl border border-white/25 bg-[#1b2433] px-4 py-3 text-sm text-white/90 transition focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#facc15] hover:border-white/40"
              >
                <option value="" style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>
                  Selecione
                </option>
                <option value="pix" style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>
                  Pix
                </option>
                <option value="cartao" style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>
                  CartÃ£o
                </option>
                <option value="boleto" style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>
                  Boleto
                </option>
                <option value="outro" style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>
                  Outro
                </option>
              </select>
              {baseErrors.paymentMethod ? (
                <span className="text-xs text-red-300">{baseErrors.paymentMethod}</span>
              ) : null}
            </label>
          </>
        ) : null}
      </div>
    </section>
  );

  const styleStepContent = (
    <div className="space-y-6">
      <HeaderEditor value={draft.style.hero} onChange={handleHeroChange} />
      <ButtonCanvasEditor items={draft.style.buttons} onChange={handleButtonsChange} />
    </div>
  );

  // Content step removed per 3-steps flow

  const publishStepContent = (
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
    currentStep === "project"
      ? projectStepContent
      : currentStep === "style"
        ? styleStepContent
        : publishStepContent;

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

          {currentStep !== "publish" ? (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={goPrevious}
                disabled={currentStep === "project"}
                className="rounded-xl border border-white/15 bg-transparent px-4 py-2 text-sm text-white/70 transition hover:border-white/30 disabled:cursor-not-allowed disabled:border-white/5 disabled:text-white/30"
              >
                Voltar
              </button>
              <Button
                type="button"
                onClick={goNext}
                variant="primary"
                disabled={currentStep === "project" && baseStepInvalid}
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
