import * as React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  helperText?: string;
};

const baseInputClasses =
  "w-full rounded-lg border border-white/10 bg-[#193f33] px-4 py-3 text-base text-[#F5F7F8] placeholder:text-[#F5F7F8]/40 focus:border-[#e2b23b] focus:outline-none focus:ring-2 focus:ring-[#e2b23b]/50 disabled:cursor-not-allowed disabled:opacity-60";

const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, helperText, className = "", id, ...props },
  ref
) {
  return (
    <label htmlFor={id} className="flex flex-col gap-2 text-sm text-[#F5F7F8]">
      {label && <span className="font-medium">{label}</span>}
      <input id={id} ref={ref} className={`${baseInputClasses} ${className}`.trim()} {...props} />
      {helperText && <span className="text-xs text-[#F5F7F8]/60">{helperText}</span>}
    </label>
  );
});

export type { InputProps };
export { baseInputClasses };
export default Input;
