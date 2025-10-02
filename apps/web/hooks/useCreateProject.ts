import { useState } from "react";
import { apiClient, ApiClientError } from "@/lib/api-client";
import type { CreateProjectPayload, ProjectResource } from "@/types/api";

type UseCreateProjectOptions = {
  onSuccess?: (project: ProjectResource) => void;
  onError?: (error: ApiClientError) => void;
};

export function useCreateProject(options: UseCreateProjectOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiClientError | null>(null);

  const createProject = async (payload: CreateProjectPayload) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.createProject(payload);
      options.onSuccess?.(response.data.project);
      return response.data.project;
    } catch (unknownError) {
      const apiError =
        unknownError instanceof ApiClientError
          ? unknownError
          : new ApiClientError("Failed to create project", 500, null);
      setError(apiError);
      options.onError?.(apiError);
      throw apiError;
    } finally {
      setLoading(false);
    }
  };

  return {
    createProject,
    loading,
    error,
  } as const;
}
