import * as React from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[#e2b23b] text-[#03160f] shadow-[0_18px_60px_rgba(226,178,59,0.35)] hover:bg-[#d4a22e] focus-visible:ring-[#e2b23b]/40",
  secondary:
    "bg-white/10 text-white shadow-[0_18px_60px_rgba(5,30,22,0.45)] hover:bg-white/15 focus-visible:ring-white/30",
  outline:
    "border border-white/15 bg-transparent text-white hover:bg-white/10 focus-visible:ring-white/30",
  ghost: "text-white/70 hover:text-white focus-visible:ring-white/30",
};

const baseClasses =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-6 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60";

const spinner = (
  <svg
    className="size-4 animate-spin"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    role="presentation"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
      fill="none"
    />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", isLoading, leftIcon, children, disabled, ...props },
  ref
) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      ref={ref}
      className={cn(baseClasses, variantClasses[variant], className)}
      data-variant={variant}
      disabled={isDisabled}
      {...props}
    >
      {isLoading ? spinner : leftIcon}
      <span className="truncate">{children}</span>
    </button>
  );
});

Button.displayName = "Button";

export type { ButtonProps, ButtonVariant };
export { Button };
