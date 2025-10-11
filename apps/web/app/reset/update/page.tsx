"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { AuthLayout } from "@/components/auth/auth-layout";
import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import SupabaseConfigWarning, {
  MISSING_SUPABASE_CONFIG_MESSAGE,
} from "@/components/SupabaseConfigWarning";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

const passwordSchema = z
  .object({
    password: z
      .string({ required_error: "Informe uma nova senha." })
      .min(8, "Mínimo de 8 caracteres."),
    confirmPassword: z.string({ required_error: "Confirme a nova senha." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não conferem.",
    path: ["confirmPassword"],
  });

type PasswordValues = z.infer<typeof passwordSchema>;

type FieldErrors = Partial<Record<keyof PasswordValues, string>>;

export default function ResetUpdatePage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const supabaseUnavailable = supabase === null;

  const [values, setValues] = useState<PasswordValues>({ password: "", confirmPassword: "" });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let active = true;

    const verifySession = async () => {
      const { data } = await supabase.auth.getSession();

      if (!active) return;

      if (!data.session) {
        router.replace("/login");
      }
    };

    verifySession();

    return () => {
      active = false;
    };
  }, [router, supabase]);

  const handleChange = (field: keyof PasswordValues) => (event: ChangeEvent<HTMLInputElement>) => {
    setValues((prev) => ({ ...prev, [field]: event.target.value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const result = passwordSchema.safeParse(values);

    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const path = issue.path[0];
        if (typeof path === "string" && !errors[path as keyof PasswordValues]) {
          errors[path as keyof PasswordValues] = issue.message;
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
      const { password } = result.data;
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        throw updateError;
      }

      setFieldErrors({});
      setValues({ password: "", confirmPassword: "" });
      setSuccess("Senha redefinida com sucesso! Vamos levar você ao painel.");
      setTimeout(() => router.replace("/dashboard"), 800);
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "Não foi possível atualizar sua senha no momento. Tente novamente.";
      setError(message || "Não foi possível atualizar sua senha no momento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Defina uma nova senha"
      description="Escolha uma senha forte para manter sua conta protegida."
      highlight="Recuperação"
      footer={
        <p>
          Precisa de ajuda?{" "}
          <Link className="font-semibold text-[#e2b23b] hover:underline" href="/reset">
            Voltar para recuperacao
          </Link>
        </p>
      }
    >
      <div className="space-y-6" aria-live="polite">
        {supabaseUnavailable && <SupabaseConfigWarning />}

        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="reset-new-password">Nova senha</Label>
            <PasswordInput
              id="reset-new-password"
              autoComplete="new-password"
              placeholder="Crie uma nova senha"
              value={values.password}
              onChange={handleChange("password")}
              error={fieldErrors.password}
              disabled={isSubmitting || supabaseUnavailable}
              aria-describedby={
                fieldErrors.password ? "reset-new-password-error" : "reset-new-password-helper"
              }
              required
            />
            <p id="reset-new-password-helper" className="text-xs text-white/50">
              Utilize pelo menos 8 caracteres combinando letras, números e símbolos.
            </p>
            {fieldErrors.password ? (
              <p id="reset-new-password-error" className="text-xs font-medium text-red-300">
                {fieldErrors.password}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reset-new-confirm">Confirmar nova senha</Label>
            <PasswordInput
              id="reset-new-confirm"
              autoComplete="new-password"
              placeholder="Repita a nova senha"
              value={values.confirmPassword}
              onChange={handleChange("confirmPassword")}
              error={fieldErrors.confirmPassword}
              disabled={isSubmitting || supabaseUnavailable}
              aria-describedby={fieldErrors.confirmPassword ? "reset-new-confirm-error" : undefined}
              required
            />
            {fieldErrors.confirmPassword ? (
              <p id="reset-new-confirm-error" className="text-xs font-medium text-red-300">
                {fieldErrors.confirmPassword}
              </p>
            ) : null}
          </div>

          {error ? <FormAlert variant="error">{error}</FormAlert> : null}
          {success ? <FormAlert variant="success">{success}</FormAlert> : null}

          <Button type="submit" isLoading={isSubmitting} disabled={supabaseUnavailable}>
            Atualizar senha
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}
