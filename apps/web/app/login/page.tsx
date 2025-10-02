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
  email: z
    .string({ required_error: "Informe seu e-mail." })
    .min(1, "Informe seu e-mail.")
    .email("Informe um e-mail valido."),
  password: z.string({ required_error: "Informe sua senha." }).min(1, "Informe sua senha."),
});

type LoginValues = z.infer<typeof loginSchema>;
type FieldErrors = Partial<Record<keyof LoginValues, string>>;

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const supabaseUnavailable = supabase === null;

  const [values, setValues] = useState<LoginValues>({ email: "", password: "" });
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
      const { error: signInError } = await supabase.auth.signInWithPassword(result.data);

      if (signInError) {
        throw signInError;
      }

      setFieldErrors({});
      setSuccess("Login realizado! Redirecionando para o painel...");
      setTimeout(() => {
        router.replace("/dashboard");
      }, 600);
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "Nao foi possivel acessar sua conta. Verifique os dados informados.";
      setError(message || "Nao foi possivel acessar sua conta.");
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
        const redirectTo =
          typeof window === "undefined" ? undefined : `${window.location.origin}/auth/callback`;
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
            : "Nao foi possivel iniciar o fluxo de autenticacao social.";
        setError(message || "Nao foi possivel iniciar o fluxo de autenticacao social.");
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
            Nao possui uma conta?{" "}
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
            <Label htmlFor="login-email">E-mail</Label>
            <Input
              id="login-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="nome@empresa.com"
              value={values.email}
              onChange={handleInputChange("email")}
              error={fieldErrors.email}
              disabled={isSubmitting || supabaseUnavailable}
              aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
              required
            />
            {fieldErrors.email ? (
              <p id="login-email-error" className="text-xs font-medium text-red-300">
                {fieldErrors.email}
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
          />
        </div>
      </div>
    </AuthLayout>
  );
}
