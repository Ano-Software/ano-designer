"use client";

import Link from "next/link";
import { useState, type ChangeEvent, type FormEvent, useEffect } from "react";
import { z } from "zod";
import { AuthLayout } from "@/components/auth/auth-layout";
import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import SupabaseConfigWarning, {
  MISSING_SUPABASE_CONFIG_MESSAGE,
} from "@/components/SupabaseConfigWarning";
import { supabase } from "@/lib/supabase/browser";

const signupSchema = z
  .object({
    fullName: z
      .string({ required_error: "Informe seu nome completo." })
      .min(1, "Informe seu nome completo."),
    username: z
      .string({ required_error: "Informe um nome de usuário." })
      .regex(
        /^[a-z0-9._-]{3,20}$/i,
        "Use 3–20 caracteres: letras, números, ponto, traço ou underline."
      ),
    email: z
      .string({ required_error: "Informe seu e-mail corporativo." })
      .email("Informe um e-mail válido."),
    password: z
      .string({ required_error: "Crie uma senha." })
      .min(8, "A senha precisa ter pelo menos 8 caracteres."),
    confirmPassword: z.string({ required_error: "Confirme a senha." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não conferem.",
    path: ["confirmPassword"],
  });

type SignupValues = z.infer<typeof signupSchema>;
type FieldErrors = Partial<Record<keyof SignupValues, string>>;

export default function SignupPage() {
  const supabaseUnavailable = false;

  const [values, setValues] = useState<SignupValues>({
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownSec, setCooldownSec] = useState<number>(0);
  const [resendCooldownSec, setResendCooldownSec] = useState<number>(0);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState<boolean>(false);
  const [usernameMsg, setUsernameMsg] = useState<string | null>(null);

  useEffect(() => {
    if (cooldownSec <= 0) return;
    const t = setInterval(() => setCooldownSec((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldownSec]);

  useEffect(() => {
    if (resendCooldownSec <= 0) return;
    const t = setInterval(() => setResendCooldownSec((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [resendCooldownSec]);

  const checkUsername = async (u: string) => {
    const v = (u || "").trim();
    setUsernameMsg(null);
    setUsernameAvailable(null);
    if (!v || v.length < 3) return;
    setUsernameChecking(true);
    try {
      const res = await fetch(`/api/auth/username-available?u=${encodeURIComponent(v)}`);
      const data = (await res.json()) as { available?: boolean };
      if (data && typeof data.available === "boolean") {
        setUsernameAvailable(data.available);
        setUsernameMsg(data.available ? null : "Nome de usuário indisponível. Tente outro.");
      }
    } catch {}
    setUsernameChecking(false);
  };

  const handleInputChange =
    (field: keyof SignupValues) => (event: ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [field]: event.target.value }));
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
      setError(null);
      setSuccess(null);
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || cooldownSec > 0) return;
    setError(null);
    setSuccess(null);

    const result = signupSchema.safeParse(values);

    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const path = issue.path[0];
        if (typeof path === "string" && !errors[path as keyof SignupValues]) {
          errors[path as keyof SignupValues] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    if (!supabase) {
      setError(MISSING_SUPABASE_CONFIG_MESSAGE);
      return;
    }

    setIsSubmitting(true);

    try {
      const { fullName, username, email, password } = result.data;
      const isProd = process.env.NODE_ENV === "production";
      const base = isProd
        ? "https://app.anoig.com"
        : typeof window === "undefined"
          ? "http://localhost:3000"
          : window.location.origin;
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${base.replace(/\/$/, "")}/auth/callback`,
          data: { username, full_name: fullName },
        },
      });

      if (signUpError) {
        const msg = (signUpError.message || "").toLowerCase();
        if (msg.includes("already") || msg.includes("registered")) {
          setError("Este e-mail já está cadastrado.");
        } else if (
          msg.includes("rate limit") ||
          msg.includes("too many requests") ||
          msg.includes("over quota") ||
          msg.includes("temporarily unavailable")
        ) {
          setError("Muitas tentativas. Aguarde um pouco e tente novamente.");
        } else {
          setError("Não foi possível enviar o e-mail agora. Tente novamente em instantes.");
        }
        return;
      }

      setSuccess("Enviamos um e-mail de confirmação. Verifique sua caixa de entrada.");
      setValues({ fullName: "", username: "", email: "", password: "", confirmPassword: "" });
      setFieldErrors({});
      setCooldownSec(60);
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "Não foi possível concluir seu cadastro. Tente novamente em instantes.";
      setError(message || "Não foi possível concluir seu cadastro. Tente novamente em instantes.");
      setCooldownSec(60);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!values.email || resendCooldownSec > 0) return;
    const isProd = process.env.NODE_ENV === "production";
    const base = isProd
      ? "https://app.anoig.com"
      : typeof window === "undefined"
        ? "http://localhost:3000"
        : window.location.origin;
    try {
      const res = await fetch("/api/auth/signup/fallback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          redirectTo: `${base.replace(/\/$/, "")}/auth/callback`,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { link?: string };
        if (data?.link) {
          window.open(data.link, "_blank");
          setResendCooldownSec(60);
        }
      }
    } catch {}
  };

  return (
    <AuthLayout
      title="Crie sua conta"
      description=""
      highlight="Cadastre-se grátis"
      footer={
        <p>
          Já possui conta?{" "}
          <Link className="font-semibold text-[#e2b23b] hover:underline" href="/login">
            Fazer login
          </Link>
        </p>
      }
    >
      <div className="space-y-6" aria-live="polite">
        {supabaseUnavailable && <SupabaseConfigWarning />}

        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="signup-fullname">Nome completo</Label>
            <Input
              id="signup-fullname"
              autoComplete="name"
              placeholder="Seu nome completo"
              value={values.fullName}
              onChange={handleInputChange("fullName")}
              error={fieldErrors.fullName}
              disabled={isSubmitting || supabaseUnavailable}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-username">Nome de usuário</Label>
            <Input
              id="signup-username"
              autoComplete="username"
              placeholder="seunome"
              value={values.username}
              onChange={handleInputChange("username")}
              onBlur={() => checkUsername(values.username)}
              error={fieldErrors.username}
              disabled={isSubmitting || supabaseUnavailable}
              aria-describedby={
                fieldErrors.username ? "signup-username-error" : "signup-username-helper"
              }
              required
            />
            <p id="signup-username-helper" className="text-xs text-white/50">
              Use 3–20 caracteres: letras, números, ponto, traço ou underline.
            </p>
            {usernameMsg ? <p className="text-xs font-medium text-red-300">{usernameMsg}</p> : null}
            {fieldErrors.username ? (
              <p id="signup-username-error" className="text-xs font-medium text-red-300">
                {fieldErrors.username}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-email">E-mail</Label>
            <Input
              id="signup-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="voce@empresa.com"
              value={values.email}
              onChange={handleInputChange("email")}
              error={fieldErrors.email}
              disabled={isSubmitting || supabaseUnavailable}
              aria-describedby={fieldErrors.email ? "signup-email-error" : undefined}
              required
            />
            {fieldErrors.email ? (
              <p id="signup-email-error" className="text-xs font-medium text-red-300">
                {fieldErrors.email}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-password">Senha</Label>
            <PasswordInput
              id="signup-password"
              autoComplete="new-password"
              placeholder="Crie uma senha segura"
              value={values.password}
              onChange={handleInputChange("password")}
              error={fieldErrors.password}
              disabled={isSubmitting || supabaseUnavailable}
              aria-describedby={
                fieldErrors.password ? "signup-password-error" : "signup-password-helper"
              }
              required
            />
            <p id="signup-password-helper" className="text-xs text-white/50">
              Mínimo de 8 caracteres, combine letras, números e símbolos.
            </p>
            {fieldErrors.password ? (
              <p id="signup-password-error" className="text-xs font-medium text-red-300">
                {fieldErrors.password}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-confirm">Confirmar senha</Label>
            <PasswordInput
              id="signup-confirm"
              autoComplete="new-password"
              placeholder="Repita a senha"
              value={values.confirmPassword}
              onChange={handleInputChange("confirmPassword")}
              error={fieldErrors.confirmPassword}
              disabled={isSubmitting || supabaseUnavailable}
              aria-describedby={fieldErrors.confirmPassword ? "signup-confirm-error" : undefined}
              required
            />
            {fieldErrors.confirmPassword ? (
              <p id="signup-confirm-error" className="text-xs font-medium text-red-300">
                {fieldErrors.confirmPassword}
              </p>
            ) : null}
          </div>

          {error ? <FormAlert variant="error">{error}</FormAlert> : null}
          {success ? <FormAlert variant="success">{success}</FormAlert> : null}

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={supabaseUnavailable || cooldownSec > 0}
            >
              {cooldownSec > 0 ? `Espere ${cooldownSec}s` : "Criar conta"}
            </Button>
            <button
              type="button"
              onClick={handleResend}
              disabled={!values.email || resendCooldownSec > 0}
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-transparent px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10 disabled:opacity-60"
            >
              {resendCooldownSec > 0
                ? `Re-enviar confirmação (${resendCooldownSec}s)`
                : "Re-enviar confirmação"}
            </button>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}
