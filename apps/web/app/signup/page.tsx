"use client";

import Link from "next/link";
import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
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
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

const signupSchema = z
  .object({
    username: z
      .string({ required_error: "Informe um nome de usuário." })
      .min(3, "Mínimo de 3 caracteres.")
      .regex(/^[a-z0-9_.-]+$/i, "Use apenas letras, números ou . _ -"),
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
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const supabaseUnavailable = supabase === null;

  const [values, setValues] = useState<SignupValues>({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange =
    (field: keyof SignupValues) => (event: ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [field]: event.target.value }));
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
      setError(null);
      setSuccess(null);
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
      const { username, email, password } = result.data;
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            typeof window === "undefined" ? undefined : `${window.location.origin}/auth/callback`,
          data: {
            username,
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      setSuccess("Cadastro realizado! Enviamos um e-mail de confirmação para você continuar.");
      setValues({ username: "", email: "", password: "", confirmPassword: "" });
      setFieldErrors({});
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "Não foi possível concluir seu cadastro. Tente novamente em instantes.";
      setError(message || "Não foi possível concluir seu cadastro.");
    } finally {
      setIsSubmitting(false);
    }
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
            <Label htmlFor="signup-username">Nome de usuário</Label>
            <Input
              id="signup-username"
              autoComplete="username"
              placeholder="seunome"
              value={values.username}
              onChange={handleInputChange("username")}
              error={fieldErrors.username}
              disabled={isSubmitting || supabaseUnavailable}
              aria-describedby={
                fieldErrors.username ? "signup-username-error" : "signup-username-helper"
              }
              required
            />
            <p id="signup-username-helper" className="text-xs text-white/50">
              Use letras, números, ponto, traço ou underline.
            </p>
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
              placeholder="você@empresa.com"
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

          <Button type="submit" isLoading={isSubmitting} disabled={supabaseUnavailable}>
            Criar conta
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}
