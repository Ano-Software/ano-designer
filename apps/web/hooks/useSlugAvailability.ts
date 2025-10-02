"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient, ApiClientError } from "@/lib/api-client";

type SlugStatus = "idle" | "checking" | "available" | "unavailable" | "error";

type SlugAvailabilityState = {
  status: SlugStatus;
  message: string | null;
  suggestion: string | null;
  isAvailable: boolean;
  pendingSlug: string;
  trigger: (slug: string) => void;
  checkNow: (slug: string) => Promise<boolean>;
  reset: () => void;
};

const DEFAULT_DELAY = 400;

export function useSlugAvailability(delay: number = DEFAULT_DELAY): SlugAvailabilityState {
  const [status, setStatus] = useState<SlugStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [pendingSlug, setPendingSlug] = useState("");

  const timerRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    controllerRef.current?.abort();
    controllerRef.current = null;
    setStatus("idle");
    setMessage(null);
    setSuggestion(null);
    setPendingSlug("");
  }, [clearTimer]);

  const checkNow = useCallback(async (rawSlug: string): Promise<boolean> => {
    const slug = rawSlug.trim().toLowerCase();
    setPendingSlug(slug);

    if (slug.length === 0) {
      setStatus("idle");
      setMessage(null);
      setSuggestion(null);
      return false;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    requestIdRef.current += 1;
    const requestId = requestIdRef.current;

    setStatus("checking");
    setMessage(null);
    setSuggestion(null);

    try {
      const response = await apiClient.checkProjectSlugAvailability(slug, {
        signal: controller.signal,
      });

      if (requestIdRef.current !== requestId) {
        return false;
      }

      const available = Boolean(response.data?.available);
      setSuggestion(response.data?.suggestion ?? null);
      setStatus(available ? "available" : "unavailable");
      setMessage(available ? null : "Este slug ja esta em uso.");
      return available;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return false;
      }

      const apiError =
        error instanceof ApiClientError
          ? error
          : new ApiClientError("Falha ao validar slug.", 500, null);
      setStatus("error");
      setMessage(apiError.message);
      return false;
    }
  }, []);

  const trigger = useCallback(
    (slug: string) => {
      clearTimer();
      setPendingSlug(slug);

      if (!slug.trim()) {
        setStatus("idle");
        setMessage(null);
        setSuggestion(null);
        return;
      }

      timerRef.current = window.setTimeout(() => {
        void checkNow(slug);
      }, delay) as unknown as number;
    },
    [checkNow, clearTimer, delay]
  );

  useEffect(
    () => () => {
      clearTimer();
      controllerRef.current?.abort();
    },
    [clearTimer]
  );

  return {
    status,
    message,
    suggestion,
    isAvailable: status === "available",
    pendingSlug,
    trigger,
    checkNow,
    reset,
  };
}
