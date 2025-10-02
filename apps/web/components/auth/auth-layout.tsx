import Image from "next/image";
import type { ReactNode } from "react";

type AuthLayoutProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  highlight?: string;
};

const AuthLayout = ({ title, description, children, footer, highlight }: AuthLayoutProps) => {
  const highlightText = highlight ?? "Bem-vindo de volta";

  return (
    <div className="relative min-h-screen w-full bg-[#040f0b] text-white">
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#e2b23b]/18 blur-3xl" />
        <div className="absolute bottom-16 left-16 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute top-24 right-20 h-72 w-72 rounded-full bg-emerald-700/10 blur-3xl" />
        <div className="absolute inset-6 rounded-[32px] border border-white/5" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1400px] flex-col items-center justify-center px-4 py-12 sm:px-8 lg:px-12 xl:px-16">
        <div className="w-full max-w-[460px]">
          <div className="overflow-hidden rounded-[36px] border border-white/10 bg-[#0a221a]/85 p-8 shadow-[0_30px_100px_rgba(3,17,12,0.7)] backdrop-blur">
            <div className="mb-6 flex flex-col gap-4 text-center">
              <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/40">
                <span>{highlightText}</span>
              </div>

              <div className="flex items-center justify-center gap-3 text-white/80">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
                  <Image src="/logo-ano.png" width={40} height={40} alt="ANO Designer" priority />
                </div>
                <div className="text-left">
                  <p className="text-xs uppercase tracking-[0.25em] text-white/50">Plataforma</p>
                  <span className="text-lg font-semibold text-white">ANO Designer</span>
                </div>
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-white">{title}</h1>
                <p className="text-base leading-relaxed text-white/65">{description}</p>
              </div>
            </div>

            {children}

            {footer ? (
              <div className="mt-8 space-y-3 text-center text-sm text-white/65">{footer}</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export { AuthLayout };
export type { AuthLayoutProps };
