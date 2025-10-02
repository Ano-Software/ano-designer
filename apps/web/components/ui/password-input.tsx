"use client";

import * as React from "react";
import { Input, type InputProps } from "@/components/ui/input";
import { cn } from "@/lib/cn";

type PasswordInputProps = Omit<InputProps, "type" | "trailingIcon"> & {
  revealAriaLabel?: string;
  concealAriaLabel?: string;
};

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  {
    className,
    error,
    revealAriaLabel = "Mostrar senha",
    concealAriaLabel = "Ocultar senha",
    ...props
  },
  ref
) {
  const [visible, setVisible] = React.useState(false);
  const toggleLabel = visible ? concealAriaLabel : revealAriaLabel;

  return (
    <div className="relative">
      <Input
        ref={ref}
        type={visible ? "text" : "password"}
        className={cn("pr-28", className)}
        error={error}
        {...props}
      />

      <button
        type="button"
        className="absolute inset-y-0 right-2 my-2 inline-flex items-center justify-center rounded-xl px-4 text-xs font-semibold uppercase tracking-wide text-white/70 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e2b23b]/40"
        onClick={() => setVisible((current) => !current)}
        aria-pressed={visible}
        aria-label={toggleLabel}
      >
        {visible ? "Ocultar" : "Mostrar"}
      </button>
    </div>
  );
});

PasswordInput.displayName = "PasswordInput";

export type { PasswordInputProps };
export { PasswordInput };
