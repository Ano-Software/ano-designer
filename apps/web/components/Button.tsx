import * as React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className = "", children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={`inline-flex h-12 w-full items-center justify-center rounded-lg bg-[#e2b23b] px-6 text-sm font-semibold text-black transition hover:bg-[#d4a22e] focus:outline-none focus:ring-2 focus:ring-[#e2b23b]/50 disabled:cursor-not-allowed disabled:opacity-60 ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
});

export type { ButtonProps };
export default Button;
