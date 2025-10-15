import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient, ApiClientError, type ListProjectsParams } from "@/lib/api-client";
import type { ProjectListResource } from "@/types/api";

type UseProjectsState = {
  data: ProjectListResource | null;
  loading: boolean;
  error: ApiClientError | null;
};

export function useProjects(initialParams: ListProjectsParams = {}) {
  const [params, setParams] = useState<ListProjectsParams>(initialParams);
  const [{ data, loading, error }, setState] = useState<UseProjectsState>({
    data: null,
    loading: true,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const fetchProjects = useCallback(
    async (override?: ListProjectsParams) => {
      if (abortRef.current) {
        abortRef.current.abort();
      }

      const controller = new AbortController();
      abortRef.current = controller;

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const merged = { ...params, ...override };
        const response = await apiClient.listProjects(merged);

        if (!controller.signal.aborted) {
          setState({ data: response.data, loading: false, error: null });
        }

        return response.data;
      } catch (unknownError) {
        if (controller.signal.aborted) {
          return null;
        }

        const apiError =
          unknownError instanceof ApiClientError
            ? unknownError
            : new ApiClientError("Failed to load projects", 500, null);

        setState((prev) => ({ ...prev, loading: false, error: apiError }));
        throw apiError;
      }
    },
    [params]
  );

  useEffect(() => {
    fetchProjects().catch(() => {
      /* handled in fetchProjects */
    });

    return () => {
      abortRef.current?.abort();
    };
  }, [fetchProjects]);

  const refetch = useCallback(
    (override?: ListProjectsParams) => {
      if (override) {
        setParams((prev) => ({ ...prev, ...override }));
      }

      return fetchProjects(override);
    },
    [fetchProjects]
  );

  return {
    data,
    loading,
    error,
    params,
    setParams,
    refetch,
  } as const;
}
