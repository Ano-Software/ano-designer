"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

const providerConfig = {
  google: {
    label: "Entrar com Google",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#EA4335"
          d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.2-1.9 2.9l3 2.3c1.8-1.7 2.8-4.2 2.8-7 0-.7-.1-1.3-.2-1.9H12z"
        />
        <path
          fill="#34A853"
          d="M6.5 13.3l-.8.6-2.4 1.8C5.3 19 8.4 21 12 21c2.2 0 4-.7 5.3-2l-3-2.3c-.8.5-1.8.8-3 .8-2.3 0-4.2-1.5-4.9-3.6z"
        />
        <path
          fill="#4A90E2"
          d="M3.3 7.4A8.956 8.956 0 003 12c0 1.6.4 3.1 1.2 4.4l3.3-2.6a5.4 5.4 0 01-.3-1.8c0-.6.1-1.2.3-1.8z"
        />
        <path
          fill="#FBBC05"
          d="M12 5.2c1.2 0 2.2.4 3 1l2.2-2.2C16 2.7 14.2 2 12 2 8.4 2 5.3 4 3.6 6.8l3.3 2.6c.7-2.1 2.6-3.6 5.1-3.6z"
        />
      </svg>
    ),
  },
  apple: {
    label: "Entrar com Apple",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M16.1 2.2c0 1-.4 1.9-1 2.6a3.7 3.7 0 01-2.8 1.4c-.1-1-.2-2 .4-2.8.5-.8 1.6-1.4 2.7-1.4.3 0 .5 0 .7.2zM19 8.7c-.6-.8-1.4-1.3-2.3-1.3-1.1 0-1.5.5-2.3.5s-1.3-.5-2.3-.5c-.9 0-1.8.5-2.4 1.3-1 .9-1.6 2.5-1.6 3.9 0 1.7.6 3.4 1.4 4.5.6.8 1.3 1.7 2.2 1.7.9 0 1.2-.5 2.3-.5s1.4.5 2.3.5 1.6-.8 2.2-1.6c.7-1 1-2 1-2-.1 0-2-.8-2-3.1 0-1.9 1.5-2.8 1.6-2.9z"
        />
      </svg>
    ),
  },
} as const;

type Provider = keyof typeof providerConfig;

type OAuthButtonsProps = {
  onSignIn?: (provider: Provider) => Promise<void> | void;
  disabled?: boolean;
  className?: string;
  providers?: Provider[];
};

const OAuthButtons = ({ onSignIn, disabled, className, providers }: OAuthButtonsProps) => {
  const [loading, setLoading] = React.useState<Provider | null>(null);
  const list: Provider[] = React.useMemo(
    () =>
      providers && providers.length > 0 ? providers : (Object.keys(providerConfig) as Provider[]),
    [providers]
  );

  const handleClick = async (provider: Provider) => {
    if (disabled || loading) return;
    try {
      setLoading(provider);
      if (provider === "google") {
        if (typeof window !== "undefined") {
          window.location.assign("/auth/google/start");
          return;
        }
      }
      await onSignIn?.(provider);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className={className}>
      <div className="grid gap-3">
        {list.map((provider) => {
          const config = providerConfig[provider];
          const isLoading = loading === provider;

          return (
            <Button
              key={provider}
              type="button"
              variant="outline"
              isLoading={isLoading}
              disabled={disabled}
              leftIcon={!isLoading ? config.icon : undefined}
              onClick={() => handleClick(provider)}
            >
              {config.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export type { OAuthButtonsProps, Provider as OAuthProvider };
export { OAuthButtons };
