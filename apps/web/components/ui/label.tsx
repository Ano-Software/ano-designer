import * as React from "react";
import { cn } from "@/lib/cn";

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement> & {
  requiredIndicator?: boolean;
};

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(function Label(
  { className, required, requiredIndicator = required, children, ...props },
  ref
) {
  return (
    <label
      ref={ref}
      className={cn("text-sm font-semibold tracking-tight text-white", className)}
      {...props}
    >
      <span className="inline-flex items-center gap-2">
        <span>{children}</span>
        {requiredIndicator ? (
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#e2b23b]">
            Obrigatorio
          </span>
        ) : null}
      </span>
    </label>
  );
});

Label.displayName = "Label";

export type { LabelProps };
export { Label };
