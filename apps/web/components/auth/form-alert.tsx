import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type FormAlertVariant = "error" | "success" | "info";

type FormAlertProps = {
  variant?: FormAlertVariant;
  title?: string;
  description?: ReactNode;
  className?: string;
  children?: ReactNode;
};

const variantStyles: Record<FormAlertVariant, { container: string; badge: string; label: string }> =
  {
    error: {
      container: "border-red-400/40 bg-red-500/15 text-red-100",
      badge: "bg-red-500/30 text-red-100",
      label: "text-red-100",
    },
    success: {
      container: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100",
      badge: "bg-emerald-500/30 text-emerald-100",
      label: "text-emerald-100",
    },
    info: {
      container: "border-[#e2b23b]/40 bg-[#e2b23b]/10 text-[#fce7af]",
      badge: "bg-[#e2b23b]/30 text-[#fce7af]",
      label: "text-[#fce7af]",
    },
  };

function resolveLabel(variant: FormAlertVariant) {
  switch (variant) {
    case "success":
      return "Sucesso";
    case "info":
      return "Aviso";
    default:
      return "Erro";
  }
}

const FormAlert = ({
  variant = "info",
  title,
  description,
  className,
  children,
}: FormAlertProps) => {
  const styles = variantStyles[variant];
  const body = description ?? children;

  return (
    <div
      role="alert"
      aria-live={variant === "success" ? "polite" : "assertive"}
      className={cn(
        "flex flex-col gap-2 rounded-2xl border px-4 py-3 text-sm",
        styles.container,
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            styles.badge
          )}
        >
          {resolveLabel(variant)}
        </span>
        {title ? <span className={cn("text-sm font-semibold", styles.label)}>{title}</span> : null}
      </div>
      {body ? <div className="text-sm leading-relaxed">{body}</div> : null}
    </div>
  );
};

export type { FormAlertProps, FormAlertVariant };
export { FormAlert };
