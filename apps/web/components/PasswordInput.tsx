"use client";

import * as React from "react";
import { baseInputClasses } from "./Input";

type PasswordInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  helperText?: string;
};

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { label, helperText, className = "", id, disabled, ...props },
  ref
) {
  const [visible, setVisible] = React.useState(false);

  return (
    <label htmlFor={id} className="flex flex-col gap-2 text-sm text-[#F5F7F8]">
      {label && <span className="font-medium">{label}</span>}
      <div className="relative">
        <input
          id={id}
          ref={ref}
          type={visible ? "text" : "password"}
          className={`${baseInputClasses} pr-12 ${className}`.trim()}
          disabled={disabled}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-xs font-semibold text-black/70 transition hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
          aria-pressed={visible}
          disabled={disabled}
        >
          {visible ? "Ocultar" : "Mostrar"}
        </button>
      </div>
      {helperText && <span className="text-xs text-[#F5F7F8]/60">{helperText}</span>}
    </label>
  );
});

export type { PasswordInputProps };
export default PasswordInput;
