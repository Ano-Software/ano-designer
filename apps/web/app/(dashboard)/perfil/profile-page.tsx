"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SupabaseConfigWarning from "@/components/SupabaseConfigWarning";
import { cn } from "@/lib/cn";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { applyTheme, getInitialTheme, saveTheme, type ThemePreference } from "@/lib/theme";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

function formatDaysRemaining(planExpiresAt: string | null) {
  if (!planExpiresAt) {
    return null;
  }

  const now = new Date();
  const expires = new Date(planExpiresAt);
  const diff = expires.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (Number.isNaN(days)) {
    return null;
  }

  if (days < 0) {
    return "Plano vencido";
  }

  if (days === 0) {
    return "Vence hoje";
  }

  return `${days} dia${days === 1 ? "" : "s"} restantes`;
}

function formatDate(date: string | null) {
  if (!date) {
    return "Sem data";
  }

  try {
    const parsed = new Date(date);
    return parsed.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch (error) {
    return "Sem data";
  }
}

type ProfilePageProps = {
  profile: {
    id: string;
    email: string | null;
    fullName: string | null;
    avatarUrl: string | null;
    theme: ThemePreference;
    planExpiresAt: string | null;
    active: boolean | null;
  };
};

type PasswordFlowState =
  | { state: "idle" }
  | { state: "updating" }
  | { state: "error"; message: string }
  | { state: "success"; message: string };

export function ProfilePage({ profile }: ProfilePageProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [fullName, setFullName] = useState(profile.fullName ?? "");
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameFeedback, setNameFeedback] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemePreference>(profile.theme ?? "light");
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatarUrl ?? null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordState, setPasswordState] = useState<PasswordFlowState>({ state: "idle" });

  useEffect(() => {
    const initial = getInitialTheme(profile.theme ?? "light");
    setTheme(initial);
    applyTheme(initial);
    saveTheme(initial);
  }, [profile.theme]);

  useEffect(
    () => () => {
      if (avatarPreview && avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    },
    [avatarPreview]
  );

  const handleThemeToggle = async () => {
    if (!supabase) {
      return;
    }

    const nextTheme: ThemePreference = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
    saveTheme(nextTheme);
    setIsSavingTheme(true);

    try {
      const { error } = await supabase.from("profiles").upsert({
        id: profile.id,
        theme: nextTheme,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      const fallback = theme;
      setTheme(fallback);
      applyTheme(fallback);
      saveTheme(fallback);
    } finally {
      setIsSavingTheme(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!supabase) {
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setAvatarError("Formato de imagem nao suportado.");
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      setAvatarError("Arquivo muito grande (maximo 5MB).");
      return;
    }

    setAvatarError(null);
    setIsUploadingAvatar(true);
    const tempUrl = URL.createObjectURL(file);
    setAvatarPreview(tempUrl);

    try {
      const filePath = `${profile.id}/${Date.now()}-${file.name}`;
      const { error: storageError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (storageError) {
        throw storageError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .upsert({ id: profile.id, avatar_url: publicUrl })
        .select("avatar_url")
        .single();

      if (updateError) {
        throw updateError;
      }

      setAvatarPreview(publicUrl);
    } catch (error) {
      setAvatarError("Nao foi possivel atualizar o avatar. Tente novamente.");
      setAvatarPreview(profile.avatarUrl ?? null);
    } finally {
      setIsUploadingAvatar(false);
      if (tempUrl.startsWith("blob:")) {
        URL.revokeObjectURL(tempUrl);
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    void handleAvatarUpload(file);
    event.target.value = "";
  };

  const handleNameSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase) {
      return;
    }

    const value = fullName.trim();

    if (value.length === 0) {
      setNameFeedback("Informe um nome valido.");
      return;
    }

    setIsSavingName(true);
    setNameFeedback(null);

    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: profile.id,
          full_name: value,
        })
        .select("full_name")
        .single();

      if (error) {
        throw error;
      }

      setNameFeedback("Nome atualizado com sucesso.");
    } catch (error) {
      setNameFeedback("Nao foi possivel salvar o nome.");
    } finally {
      setIsSavingName(false);
    }
  };

  const handlePasswordModalClose = () => {
    setIsPasswordModalOpen(false);
    setPassword("");
    setConfirmPassword("");
    setPasswordState({ state: "idle" });
  };

  const triggerPasswordReset = useCallback(async () => {
    if (!supabase || !profile.email) {
      setPasswordState({ state: "error", message: "Nao foi possivel iniciar o reset de senha." });
      return;
    }

    try {
      const redirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/reset/update` : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
        redirectTo,
      });

      if (error) {
        throw error;
      }

      setPasswordState({
        state: "success",
        message: "Enviamos um email com instrucoes para redefinir sua senha.",
      });
    } catch (error) {
      setPasswordState({
        state: "error",
        message: "Nao foi possivel enviar o email de redefinicao.",
      });
    }
  }, [profile.email, supabase]);

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase) {
      return;
    }

    if (password.length < 8) {
      setPasswordState({ state: "error", message: "A senha precisa ter pelo menos 8 caracteres." });
      return;
    }

    if (password !== confirmPassword) {
      setPasswordState({ state: "error", message: "As senhas nao conferem." });
      return;
    }

    setPasswordState({ state: "updating" });

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        throw error;
      }

      setPasswordState({ state: "success", message: "Senha atualizada com sucesso." });
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      await triggerPasswordReset();
    }
  };

  if (!supabase) {
    return (
      <div className="space-y-6">
        <SupabaseConfigWarning />
      </div>
    );
  }

  const statusLabel = profile.active ? "Ativo" : "Inativo";
  const statusClass = profile.active
    ? "bg-emerald-500/15 text-emerald-200"
    : "bg-rose-500/10 text-rose-200";
  const daysRemaining = formatDaysRemaining(profile.planExpiresAt);

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-white/50">Conta</p>
          <h1 className="text-3xl font-semibold text-white">Perfil e preferencias</h1>
        </div>
        <button
          type="button"
          onClick={handleThemeToggle}
          className={cn(
            "flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-semibold transition",
            theme === "dark" ? "bg-white/10 text-white" : "bg-white text-[#0c2016]",
            isSavingTheme ? "opacity-75" : "hover:opacity-90"
          )}
          aria-pressed={theme === "dark"}
        >
          <span
            className={cn(
              "flex h-5 w-10 items-center rounded-full bg-white/20 p-0.5 transition",
              theme === "dark" ? "justify-end" : "justify-start"
            )}
            aria-hidden
          >
            <span className="h-4 w-4 rounded-full bg-[#e2b23b]"></span>
          </span>
          <span>{theme === "dark" ? "Modo escuro" : "Modo claro"}</span>
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-white/10 bg-white/5 px-6 py-8 shadow-sm backdrop-blur lg:col-span-2">
          <h2 className="text-lg font-semibold text-white">Informacoes do perfil</h2>
          <p className="mt-1 text-sm text-white/60">
            Atualize seu nome, foto e preferencias de acesso.
          </p>

          <div className="mt-6 flex flex-col gap-6 md:flex-row">
            <div className="flex w-full max-w-xs flex-col items-center gap-4">
              <div className="relative h-24 w-24">
                {avatarPreview ? (
                  <Image
                    src={avatarPreview}
                    alt="Avatar do usuario"
                    fill
                    sizes="96px"
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-white/10 text-2xl font-bold text-white">
                    {(profile.fullName ?? profile.email ?? "").slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_IMAGE_TYPES.join(",")}
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                  disabled={isUploadingAvatar}
                >
                  {isUploadingAvatar ? "Enviando..." : "Trocar foto"}
                </button>
                {avatarError ? (
                  <p className="text-xs text-rose-300" role="alert">
                    {avatarError}
                  </p>
                ) : null}
              </div>
            </div>

            <form className="flex-1 space-y-5" onSubmit={handleNameSubmit}>
              <div className="space-y-2">
                <label htmlFor="fullName" className="text-sm font-medium text-white">
                  Nome completo
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-[#e2b23b] focus:outline-none focus:ring-2 focus:ring-[#e2b23b]/40"
                  placeholder="Digite seu nome"
                  maxLength={120}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  value={profile.email ?? ""}
                  readOnly
                  className="w-full cursor-not-allowed rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className="rounded-full bg-[#e2b23b] px-6 py-2 text-sm font-semibold text-[#0c2016] transition hover:bg-[#f0c761] disabled:opacity-60"
                  disabled={isSavingName}
                >
                  {isSavingName ? "Salvando..." : "Salvar alteracoes"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="rounded-full border border-white/10 px-6 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Alterar senha
                </button>
              </div>

              {nameFeedback ? <p className="text-sm text-white/70">{nameFeedback}</p> : null}
            </form>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 px-6 py-8 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Plano e status</h2>
              <p className="mt-1 text-sm text-white/60">
                Acompanhe seu acesso e gerencie pagamentos.
              </p>
            </div>
            <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", statusClass)}>
              {statusLabel}
            </span>
          </div>

          <div className="mt-6 space-y-3 text-sm text-white/70">
            <div className="flex items-center justify-between">
              <span>Vencimento</span>
              <span className="font-semibold text-white">{formatDate(profile.planExpiresAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Tempo restante</span>
              <span className="font-semibold text-white">{daysRemaining ?? "Sem informacao"}</span>
            </div>
          </div>

          <Link
            href="/planos"
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-white py-3 text-sm font-semibold text-[#0c2016] transition hover:bg-[#f0c761]"
          >
            Gerenciar plano
          </Link>
        </section>
      </div>

      {isPasswordModalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
        >
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#10261b] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Alterar senha</h2>
              <button
                type="button"
                onClick={handlePasswordModalClose}
                className="rounded-full border border-white/10 px-2 py-1 text-sm text-white/70 hover:text-white"
              >
                Fechar
              </button>
            </div>

            <form className="mt-4 space-y-4" onSubmit={handlePasswordSubmit}>
              <div className="space-y-2">
                <label htmlFor="new-password" className="text-sm font-medium text-white">
                  Nova senha
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-[#e2b23b] focus:outline-none focus:ring-2 focus:ring-[#e2b23b]/40"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="confirm-password" className="text-sm font-medium text-white">
                  Confirmar senha
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={8}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-[#e2b23b] focus:outline-none focus:ring-2 focus:ring-[#e2b23b]/40"
                />
              </div>

              {passwordState.state === "error" ? (
                <p className="text-sm text-rose-300" role="alert">
                  {passwordState.message}
                </p>
              ) : null}
              {passwordState.state === "success" ? (
                <p className="text-sm text-emerald-200">{passwordState.message}</p>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className="rounded-full bg-[#e2b23b] px-6 py-2 text-sm font-semibold text-[#0c2016] transition hover:bg-[#f0c761] disabled:opacity-60"
                  disabled={passwordState.state === "updating"}
                >
                  {passwordState.state === "updating" ? "Atualizando..." : "Salvar nova senha"}
                </button>
                <button
                  type="button"
                  onClick={triggerPasswordReset}
                  className="rounded-full border border-white/10 px-6 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                  disabled={passwordState.state === "updating"}
                >
                  Redefinir por email
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
