"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient, ApiClientError } from "@/lib/api-client";
import type { CoursesResourcesResource } from "@/types/api";

export function useCoursesResources() {
  const [data, setData] = useState<CoursesResourcesResource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.getCoursesResources({ signal });
      setData(response.data);
    } catch (unknownError) {
      if (signal?.aborted) {
        return;
      }

      const message =
        unknownError instanceof ApiClientError
          ? unknownError.message
          : "Não foi possível carregar os cursos.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const refresh = useCallback(() => {
    void load();
  }, [load]);

  return {
    data,
    loading,
    error,
    refresh,
  };
}
