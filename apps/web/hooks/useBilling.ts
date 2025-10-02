"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient, ApiClientError } from "@/lib/api-client";
import type {
  BillingSubscriptionResource,
  CreateCheckoutPayload,
  CreateCheckoutResource,
} from "@/types/api";

type UseBillingOptions = {
  initialData?: BillingSubscriptionResource | null;
};

type ToastState = {
  type: "success" | "error";
  message: string;
};

type CheckoutState = {
  planId: string;
  mode: "monthly" | "recurring";
} | null;

export function useBilling(options?: UseBillingOptions) {
  const [data, setData] = useState<BillingSubscriptionResource | null>(
    options?.initialData ?? null
  );
  const [loading, setLoading] = useState(!options?.initialData);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [checkoutState, setCheckoutState] = useState<CheckoutState>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.getBillingSubscription();
      setData(response.data);
    } catch (unknownError) {
      const apiError =
        unknownError instanceof ApiClientError
          ? unknownError
          : new ApiClientError("Erro ao carregar", 500, null);
      setError(apiError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!options?.initialData) {
      void fetchData();
    }
  }, [fetchData, options?.initialData]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const createCheckout = useCallback(
    async (payload: CreateCheckoutPayload): Promise<CreateCheckoutResource | null> => {
      setCheckoutState(payload);
      setToast(null);

      try {
        const response = await apiClient.createCheckout(payload);
        void fetchData();
        if (response.data?.message) {
          setToast({ type: "success", message: response.data.message });
        }
        return response.data;
      } catch (unknownError) {
        const apiError =
          unknownError instanceof ApiClientError
            ? unknownError
            : new ApiClientError("Falha ao criar checkout", 500, null);
        setToast({ type: "error", message: apiError.message });
        throw apiError;
      } finally {
        setCheckoutState(null);
      }
    },
    [fetchData]
  );

  return {
    data,
    loading,
    error,
    toast,
    setToast,
    checkoutState,
    refresh: fetchData,
    createCheckout,
  } as const;
}
