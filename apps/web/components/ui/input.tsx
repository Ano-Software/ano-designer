import * as React from "react";
import { cn } from "@/lib/cn";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: string | null;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, error, leadingIcon, trailingIcon, type = "text", ...props },
  ref
) {
  const hasLeading = Boolean(leadingIcon);
  const hasTrailing = Boolean(trailingIcon);

  return (
    <div className="relative">
      {hasLeading ? (
        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-white/50">
          {leadingIcon}
        </span>
      ) : null}

      <input
        ref={ref}
        type={type}
        className={cn(
          "h-12 w-full rounded-2xl border border-white/15 bg-white/10 px-4 text-base text-white placeholder:text-white/50 shadow-inner shadow-black/5 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e2b23b]/25 disabled:cursor-not-allowed disabled:opacity-60",
          hasLeading && "pl-11",
          hasTrailing && "pr-11",
          error && "border-red-400/70 focus-visible:ring-red-400/20",
          className
        )}
        aria-invalid={Boolean(error)}
        {...props}
      />

      {hasTrailing ? (
        <span className="absolute inset-y-0 right-3 flex items-center text-white/60">
          {trailingIcon}
        </span>
      ) : null}
    </div>
  );
});

Input.displayName = "Input";

export type { InputProps };
export { Input };
