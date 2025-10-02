"use client";

import Link from "next/link";
import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { z } from "zod";
import { AuthLayout } from "@/components/auth/auth-layout";
import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SupabaseConfigWarning, {
  MISSING_SUPABASE_CONFIG_MESSAGE,
} from "@/components/SupabaseConfigWarning";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

const resetSchema = z.object({
  email: z
    .string({ required_error: "Informe o e-mail cadastrado." })
    .min(1, "Informe o e-mail cadastrado.")
    .email("Informe um e-mail valido."),
});

type ResetValues = z.infer<typeof resetSchema>;

type FieldErrors = Partial<Record<keyof ResetValues, string>>;

export default function ResetPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const supabaseUnavailable = supabase === null;

  const [values, setValues] = useState<ResetValues>({ email: "" });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setValues({ email: event.target.value });
    setFieldErrors({});
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const result = resetSchema.safeParse(values);

    if (!result.success) {
      const issue = result.error.issues[0];
      if (issue && typeof issue.path[0] === "string") {
        setFieldErrors({ [issue.path[0] as keyof ResetValues]: issue.message });
      }
      return;
    }

    if (!supabase) {
      setError(MISSING_SUPABASE_CONFIG_MESSAGE);
      return;
    }

    setIsSubmitting(true);

    try {
      const { email } = result.data;
      const redirectTo =
        typeof window === "undefined" ? undefined : `${window.location.origin}/auth/callback`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (resetError) {
        throw resetError;
      }

      setSuccess(
        "Se encontrarmos seu cadastro, enviaremos um link de redefinicao por e-mail nos proximos minutos."
      );
      setFieldErrors({});
      setValues({ email: "" });
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "Nao foi possivel enviar o e-mail de redefinicao agora.";
      setError(message || "Nao foi possivel enviar o e-mail de redefinicao agora.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Redefina sua senha"
      description="Informe o e-mail associado a sua conta para receber um link seguro de redefinicao."
      highlight="Recuperacao"
      footer={
        <>
          <p>
            Lembrou a senha?{" "}
            <Link className="font-semibold text-[#e2b23b] hover:underline" href="/login">
              Voltar para login
            </Link>
          </p>
          <p>
            Ainda nao possui conta?{" "}
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
            <Label htmlFor="reset-email">E-mail cadastrado</Label>
            <Input
              id="reset-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="nome@empresa.com"
              value={values.email}
              onChange={handleChange}
              error={fieldErrors.email}
              disabled={isSubmitting || supabaseUnavailable}
              aria-describedby={fieldErrors.email ? "reset-email-error" : undefined}
              required
            />
            {fieldErrors.email ? (
              <p id="reset-email-error" className="text-xs font-medium text-red-300">
                {fieldErrors.email}
              </p>
            ) : null}
          </div>

          {error ? <FormAlert variant="error">{error}</FormAlert> : null}
          {success ? <FormAlert variant="success">{success}</FormAlert> : null}

          <Button type="submit" isLoading={isSubmitting} disabled={supabaseUnavailable}>
            Enviar instrucoes
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}
