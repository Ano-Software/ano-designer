"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { AuthLayout } from "@/components/auth/auth-layout";
import { FormAlert } from "@/components/auth/form-alert";
import { OAuthButtons, type OAuthProvider } from "@/components/auth/oauth-buttons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import SupabaseConfigWarning, {
  MISSING_SUPABASE_CONFIG_MESSAGE,
} from "@/components/SupabaseConfigWarning";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

const loginSchema = z.object({
  identifier: z
    .string({ required_error: "Informe seu e-mail ou usuário." })
    .min(1, "Informe seu e-mail ou usuário."),
  password: z.string({ required_error: "Informe sua senha." }).min(1, "Informe sua senha."),
});

type LoginValues = z.infer<typeof loginSchema>;
type FieldErrors = Partial<Record<keyof LoginValues, string>>;
type ResolveIdentifierResponse =
  | { data: { email: string }; error: null }
  | { data: null; error: { message?: string; code?: string } | null };

const DEFAULT_LOGIN_ERROR_MESSAGE =
  "Não foi possível acessar sua conta. Verifique os dados informados.";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? null;

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const supabaseUnavailable = supabase === null;

  const [values, setValues] = useState<LoginValues>({ identifier: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange =
    (field: keyof LoginValues) => (event: ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [field]: event.target.value }));
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
      setError(null);
      setSuccess(null);
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const result = loginSchema.safeParse(values);

    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const path = issue.path[0];
        if (typeof path === "string" && !errors[path as keyof LoginValues]) {
          errors[path as keyof LoginValues] = issue.message;
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
      const resolveResponse = await fetch("/api/auth/resolve-identifier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: result.data.identifier }),
      });

      let email: string | null = null;

      try {
        const payload = (await resolveResponse.json()) as ResolveIdentifierResponse;

        if (resolveResponse.ok && payload?.data?.email) {
          email = payload.data.email;
        } else {
          const code = payload?.error?.code;

          if (code === "IDENTIFIER_REQUIRED") {
            setFieldErrors((prev) => ({
              ...prev,
              identifier: "Informe seu e-mail ou usuário.",
            }));
          } else if (code === "USER_NOT_FOUND") {
            setError("Não encontramos nenhuma conta com esse identificador.");
          } else {
            setError(payload?.error?.message ?? DEFAULT_LOGIN_ERROR_MESSAGE);
          }

          return;
        }
      } catch {
        setError(DEFAULT_LOGIN_ERROR_MESSAGE);
        return;
      }

      if (!email) {
        setError(DEFAULT_LOGIN_ERROR_MESSAGE);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: result.data.password,
      });

      if (signInError) {
        throw signInError;
      }

      setFieldErrors({});
      setSuccess("Login realizado! Redirecionando para o painel...");
      setTimeout(() => {
        router.replace("/dashboard");
      }, 600);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : DEFAULT_LOGIN_ERROR_MESSAGE;
      setError(message || DEFAULT_LOGIN_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOAuthSignIn = useCallback(
    async (provider: OAuthProvider) => {
      if (!supabase) {
        setError(MISSING_SUPABASE_CONFIG_MESSAGE);
        return;
      }

      setError(null);
      setSuccess(null);

      try {
        const redirectTo = `${
          process.env.NEXT_PUBLIC_SITE_URL ||
          (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")
        }/auth/callback`;
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo,
          },
        });

        if (oauthError) {
          throw oauthError;
        }
      } catch (caught) {
        const message =
          caught instanceof Error
            ? caught.message
            : "Não foi possível iniciar o fluxo de autenticação social.";
        setError(message || "Não foi possível iniciar o fluxo de autenticação social.");
      }
    },
    [supabase]
  );

  return (
    <AuthLayout
      title="Entre na sua conta"
      description=""
      highlight="Acesso restrito"
      footer={
        <>
          <p>
            Esqueceu sua senha?{" "}
            <Link className="font-semibold text-[#e2b23b] hover:underline" href="/reset">
              Recuperar acesso
            </Link>
          </p>
          <p>
            Não possui uma conta?{" "}
            <Link className="font-semibold text-[#e2b23b] hover:underline" href="/signup">
              Criar conta
            </Link>
          </p>
        </>
      }
    >
      <div className="space-y-6" aria-live="polite">
        {supabaseUnavailable && <SupabaseConfigWarning />}

        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="login-identifier">E-mail ou usuário</Label>
            <Input
              id="login-identifier"
              type="text"
              autoComplete="username"
              placeholder={"nome@empresa.com\n ou seu_usuario"}
              value={values.identifier}
              onChange={handleInputChange("identifier")}
              error={fieldErrors.identifier}
              disabled={isSubmitting || supabaseUnavailable}
              aria-describedby={fieldErrors.identifier ? "login-identifier-error" : undefined}
              required
            />
            {fieldErrors.identifier ? (
              <p id="login-identifier-error" className="text-xs font-medium text-red-300">
                {fieldErrors.identifier}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password">Senha</Label>
              <Link className="text-xs font-semibold text-[#e2b23b] hover:underline" href="/reset">
                Esqueci minha senha
              </Link>
            </div>
            <PasswordInput
              id="login-password"
              autoComplete="current-password"
              placeholder="Digite sua senha"
              value={values.password}
              onChange={handleInputChange("password")}
              error={fieldErrors.password}
              disabled={isSubmitting || supabaseUnavailable}
              aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
              required
            />
            {fieldErrors.password ? (
              <p id="login-password-error" className="text-xs font-medium text-red-300">
                {fieldErrors.password}
              </p>
            ) : null}
          </div>

          {error ? <FormAlert variant="error">{error}</FormAlert> : null}
          {success ? <FormAlert variant="success">{success}</FormAlert> : null}

          <Button type="submit" isLoading={isSubmitting} disabled={supabaseUnavailable}>
            Entrar
          </Button>
        </form>

        <div className="space-y-4">
          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.35em] text-white/40">
            <span className="h-px flex-1 bg-white/15" aria-hidden />
            <span>ou acesse com</span>
            <span className="h-px flex-1 bg-white/15" aria-hidden />
          </div>
          <OAuthButtons
            onSignIn={handleOAuthSignIn}
            disabled={isSubmitting || supabaseUnavailable}
            providers={["google"]}
          />
        </div>
      </div>
    </AuthLayout>
  );
}
