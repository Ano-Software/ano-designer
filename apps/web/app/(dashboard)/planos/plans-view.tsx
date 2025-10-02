"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SupabaseConfigWarning from "@/components/SupabaseConfigWarning";
import { cn } from "@/lib/cn";
import { applyTheme, saveTheme, type ThemePreference } from "@/lib/theme";
import { useBilling } from "@/hooks/useBilling";

const plans = [
  {
    id: "plan_a",
    name: "Plano A",
    monthlyPrice: "R$ 69,90",
    recurringPrice: "R$ 49,90",
    limit: "15 projetos/mes",
    revenue: "ate R$ 1.500/mes",
  },
  {
    id: "plan_b",
    name: "Plano B",
    monthlyPrice: "R$ 99,90",
    recurringPrice: "R$ 69,90",
    limit: "100 projetos/mes",
    revenue: "ate R$ 10.000/mes",
    recommended: true,
  },
  {
    id: "plan_c",
    name: "Plano C (Pro Agency)",
    monthlyPrice: "R$ 199,90",
    recurringPrice: "R$ 169,90",
    limit: "1.000 projetos/mes",
    revenue: "ate R$ 100.000/mes",
  },
] as const;

type PlansViewProps = {
  configError?: boolean;
  profile?: {
    id: string;
    planId: string | null;
    active: boolean | null;
    planExpiresAt: string | null;
    theme: ThemePreference | null;
  } | null;
  subscription?: {
    planId: string;
    mode: "monthly" | "recurring";
    status: string;
    manageUrl: string | null;
  } | null;
};

type PixDisplay = {
  planId: string;
  copyCode: string;
  qrCodeImageUrl?: string;
  expiresAt?: string;
};

function formatDate(date: string | null) {
  if (!date) {
    return "Sem data";
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return "Sem data";
  }

  return parsed.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDays(planExpiresAt: string | null) {
  if (!planExpiresAt) {
    return "Sem informacao";
  }

  const now = new Date();
  const expires = new Date(planExpiresAt);
  const diff = expires.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (Number.isNaN(days)) {
    return "Sem informacao";
  }

  if (days < 0) {
    return "Plano vencido";
  }

  if (days === 0) {
    return "Vence hoje";
  }

  return `${days} dia${days === 1 ? "" : "s"} restantes`;
}

export function PlansView({ configError, profile, subscription }: PlansViewProps) {
  const router = useRouter();
  const initialData = useMemo(() => {
    if (!profile) {
      return null;
    }

    return {
      profile: {
        planId: profile.planId,
        active: profile.active,
        planExpiresAt: profile.planExpiresAt,
        theme: profile.theme,
      },
      subscription: subscription
        ? {
            planId: subscription.planId,
            mode: subscription.mode,
            status: subscription.status,
            manageUrl: subscription.manageUrl,
          }
        : null,
    };
  }, [profile, subscription]);

  const { data, loading, error, toast, setToast, checkoutState, refresh, createCheckout } =
    useBilling({
      initialData,
    });

  const [pixData, setPixData] = useState<PixDisplay | null>(null);

  useEffect(() => {
    const preferred = data?.profile.theme ?? profile?.theme ?? null;
    if (preferred) {
      applyTheme(preferred);
      saveTheme(preferred);
    }
  }, [data?.profile.theme, profile?.theme]);

  if (configError) {
    return (
      <div className="space-y-6">
        <SupabaseConfigWarning />
      </div>
    );
  }

  const currentPlanId = data?.profile.planId ?? profile?.planId ?? null;
  const currentMode = data?.subscription?.mode ?? subscription?.mode ?? null;
  const isActive = data?.profile.active ?? profile?.active ?? null;
  const planExpiresAt = data?.profile.planExpiresAt ?? profile?.planExpiresAt ?? null;
  const manageUrl = data?.subscription?.manageUrl ?? subscription?.manageUrl ?? null;

  const showSkeleton = loading && !data;

  const handleCheckout = async (planId: string, mode: "monthly" | "recurring") => {
    try {
      const result = await createCheckout({ planId, mode });
      if (!result) {
        return;
      }

      if (result.checkoutUrl) {
        if (typeof window !== "undefined") {
          window.location.href = result.checkoutUrl;
        }
        return;
      }

      if (result.pix) {
        setPixData({
          planId,
          copyCode: result.pix.copyPasteCode,
          qrCodeImageUrl: result.pix.qrCodeImageUrl,
          expiresAt: result.pix.expiresAt,
        });
        setToast?.({ type: "success", message: "Geramos um QR Code PIX para sua assinatura." });
      }
    } catch (unknownError) {
      if (!(unknownError instanceof Error)) {
        return;
      }
      setToast?.({ type: "error", message: unknownError.message });
    }
  };

  const handleManageSubscription = () => {
    if (manageUrl) {
      if (typeof window !== "undefined") {
        window.open(manageUrl, "_blank", "noopener");
      }
    } else {
      router.push("/pagamentos");
    }
  };

  const handleCopyPix = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setToast?.({ type: "success", message: "Codigo copiado." });
    } catch (error) {
      setToast?.({ type: "error", message: "Nao foi possivel copiar o codigo." });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-white/50">
            Planos & precos
          </p>
          <h1 className="text-3xl font-semibold text-white">
            Escolha o plano ideal para o seu studio
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-white/60">
            Compare limites, valores e o potencial de faturamento previsto em cada assinatura.
          </p>
        </div>
      </div>

      {toast ? (
        <div
          className="fixed right-4 top-24 z-50 max-w-sm rounded-2xl border border-white/10 bg-[#10261b] px-4 py-3 shadow-xl"
          role="status"
          aria-live="assertive"
        >
          <div
            className={cn(
              "text-sm font-medium",
              toast.type === "error" ? "text-rose-200" : "text-emerald-200"
            )}
          >
            {toast.message}
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="mt-2 text-xs font-semibold text-white/60 hover:text-white/80"
          >
            Fechar
          </button>
        </div>
      ) : null}

      {showSkeleton ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm animate-pulse"
              aria-hidden
            >
              <div className="h-6 w-32 rounded bg-white/10" />
              <div className="mt-4 space-y-2">
                <div className="h-4 w-24 rounded bg-white/10" />
                <div className="h-4 w-28 rounded bg-white/10" />
                <div className="h-4 w-36 rounded bg-white/10" />
              </div>
              <div className="mt-6 h-10 w-full rounded-full bg-white/10" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = currentPlanId === plan.id;
            const isMonthly = isCurrent && currentMode === "monthly";
            const isRecurring = isCurrent && currentMode === "recurring";
            const showMonthlyCta = !isCurrent || (!isRecurring && !isMonthly);
            const showRecurringCta = !isCurrent || isMonthly;

            return (
              <section
                key={plan.id}
                className={cn(
                  "flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-white/5 px-6 py-8 shadow-sm backdrop-blur",
                  plan.recommended ? "ring-2 ring-[#e2b23b]/50" : ""
                )}
              >
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white">{plan.name}</h2>
                    <p className="text-sm text-white/60">Limite: {plan.limit}</p>
                  </div>

                  <div className="space-y-3 text-sm text-white/70">
                    <div className="rounded-xl border border-white/5 bg-white/10 px-4 py-4 text-white">
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
                            Mensal
                          </span>
                          <p className="text-[clamp(16px,4vw,22px)] font-extrabold leading-none whitespace-nowrap">
                            {plan.monthlyPrice}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
                            Recorrente
                          </span>
                          <p className="text-[clamp(16px,4vw,22px)] font-extrabold leading-none whitespace-nowrap text-emerald-200">
                            {plan.recurringPrice}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-white/10 px-4 py-4 text-center text-white">
                      <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
                        Potencial de faturamento:
                      </p>
                      <p className="text-lg font-semibold">{plan.revenue}</p>
                    </div>
                  </div>

                  {plan.recommended ? (
                    <span className="inline-flex items-center rounded-full bg-[#e2b23b]/20 px-2 py-1.5 text-xs font-bold text-[#e2b23b]">
                      Recomendado
                    </span>
                  ) : null}

                  {isCurrent ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-1.5 text-xs font-semibold text-emerald-200">
                      Seu plano atual
                    </span>
                  ) : null}
                </div>

                <div className="mt-6 space-y-3">
                  {showMonthlyCta ? (
                    <button
                      type="button"
                      onClick={() => handleCheckout(plan.id, "monthly")}
                      className="w-full rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
                      disabled={
                        checkoutState?.planId === plan.id && checkoutState?.mode === "monthly"
                      }
                    >
                      {checkoutState?.planId === plan.id && checkoutState?.mode === "monthly"
                        ? "Processando..."
                        : "Assinar Mensal"}
                    </button>
                  ) : null}

                  {showRecurringCta ? (
                    <button
                      type="button"
                      onClick={() => handleCheckout(plan.id, "recurring")}
                      className={cn(
                        "w-full rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-60",
                        plan.recommended
                          ? "bg-[#e2b23b] text-[#0c2016] hover:bg-[#f0c761]"
                          : "border border-[#e2b23b]/20 bg-[#e2b23b]/10 text-[#e2b23b] hover:bg-[#e2b23b]/20"
                      )}
                      disabled={
                        checkoutState?.planId === plan.id && checkoutState?.mode === "recurring"
                      }
                    >
                      {isMonthly
                        ? checkoutState?.planId === plan.id && checkoutState?.mode === "recurring"
                          ? "Processando..."
                          : "Upgrade para Recorrente"
                        : checkoutState?.planId === plan.id && checkoutState?.mode === "recurring"
                          ? "Processando..."
                          : "Assinar Recorrente"}
                    </button>
                  ) : null}

                  {isRecurring ? (
                    <button
                      type="button"
                      onClick={handleManageSubscription}
                      className="w-full rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                      Gerenciar assinatura
                    </button>
                  ) : null}

                  {pixData && pixData.planId === plan.id ? (
                    <div className="rounded-2xl border border-white/10 bg-[#10261b] px-4 py-3 text-sm text-white/80">
                      <p className="font-semibold text-white">Pagamento via PIX</p>
                      <p className="mt-1 text-xs text-white/60">
                        Use o QR Code ou copie o codigo abaixo.
                      </p>
                      {pixData.qrCodeImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={pixData.qrCodeImageUrl}
                          alt="QR Code PIX"
                          className="mt-3 h-36 w-36 rounded-lg border border-white/10 bg-white"
                        />
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleCopyPix(pixData.copyCode)}
                        className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
                      >
                        Copiar codigo PIX
                      </button>
                      <p className="mt-2 break-all rounded-xl bg-white/10 px-3 py-2 text-xs text-white/70">
                        {pixData.copyCode}
                      </p>
                      {pixData.expiresAt ? (
                        <p className="mt-2 text-xs text-white/40">
                          Expira em {formatDate(pixData.expiresAt)}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <article className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-white shadow-sm backdrop-blur">
        <h3 className="text-lg font-semibold">Entenda a diferenca entre Mensal e Recorrente</h3>
        <div className="mt-4 space-y-4 text-sm text-white/80">
          <p>
            <strong className="text-white">Mensal:</strong> voce faz o pagamento manualmente todo
            mes. E mais flexivel, mas tem um valor um pouco mais alto. Ideal para quem quer testar a
            plataforma sem compromisso.
          </p>
          <p>
            <strong className="text-white">Recorrente:</strong> o pagamento e feito automaticamente
            no cartao de credito. Alem da praticidade de nao precisar lembrar todo mes, o valor e
            reduzido. E a opcao mais vantajosa para quem ja decidiu usar o sistema no dia a dia.
          </p>
          <p className="text-white">
            {"\u{1F449}"} Escolha o plano que faz mais sentido para o seu momento. Se comecar pelo
            Mensal, voce podera fazer o upgrade para Recorrente a qualquer momento.
          </p>
        </div>
      </article>
      <section className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 px-6 py-6 shadow-sm backdrop-blur sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.35em] text-white/50">
            Status
          </h3>
          <p className="mt-2 text-lg font-semibold text-white">
            {isActive ? "Plano ativo" : "Plano inativo"}
          </p>
          <p className="text-sm text-white/60">{formatDays(planExpiresAt)}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.35em] text-white/50">
            Plano atual
          </h3>
          <p className="mt-2 text-lg font-semibold text-white">
            {currentPlanId
              ? (plans.find((plan) => plan.id === currentPlanId)?.name ?? "Plano personalizado")
              : "Nenhum plano"}
          </p>
          <p className="text-sm text-white/60">
            {currentMode === "recurring"
              ? "Modo recorrente"
              : currentMode === "monthly"
                ? "Modo mensal"
                : "Sem assinatura em vigor"}
          </p>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          <p>Erro ao carregar informacoes de billing.</p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="mt-2 rounded-full border border-rose-100/40 px-3 py-1 text-xs font-semibold text-rose-100 transition hover:bg-rose-100/10"
          >
            Tentar novamente
          </button>
        </div>
      ) : null}
    </div>
  );
}
