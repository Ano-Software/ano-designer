import type {
  ApiError,
  ApiResponse,
  AnalyticsMetricsResource,
  BillingSubscriptionResource,
  CreateCheckoutPayload,
  CreateCheckoutResource,
  CreateProjectPayload,
  PatchProjectPayload,
  ProjectListResource,
  ProjectResource,
  LinkButtonTemplateListResource,
  ProjectPublicationLimitResource,
  SlugAvailabilityResource,
  SessionResource,
  TransactionsReportResource,
  TransactionStatus,
  TransactionsReportSortField,
  UpdateProfilePayload,
  UpdateProjectPayload,
  UserResource,
  CourseVideoResource,
  CoursePdfResource,
  CourseExternalResource,
  CoursesResourcesResource,
} from "@/types/api";

const API_PREFIX = "/api/v1";

export type ListProjectsParams = {
  page?: number;
  pageSize?: number;
  sort?: "created_at" | "updated_at" | "name";
  order?: "asc" | "desc";
  search?: string;
};

export type TransactionsReportParams = {
  start?: string | null;
  end?: string | null;
  status?: TransactionStatus | null;
  search?: string | null;
  page?: number;
  pageSize?: number;
  sort?: TransactionsReportSortField;
  order?: "asc" | "desc";
};

export class ApiClientError extends Error {
  status: number;
  payload: ApiError | null;

  constructor(message: string, status: number, payload: ApiError | null) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.payload = payload;
  }
}

async function parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
  if (response.status === 204) {
    return { data: null as T, error: null } as ApiResponse<T>;
  }

  const text = await response.text();

  if (!text) {
    return { data: null as T, error: null } as ApiResponse<T>;
  }

  try {
    return JSON.parse(text) as ApiResponse<T>;
  } catch (error) {
    throw new ApiClientError("Unable to parse API response", response.status, null);
  }
}

async function apiFetch<T>(input: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(input, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const parsed = await parseResponse<T>(response);

  if (!response.ok) {
    throw new ApiClientError(
      parsed.error?.message ?? "Request failed",
      response.status,
      parsed.error
    );
  }

  return parsed;
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    search.set(key, String(value));
  });

  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const apiClient = {
  async getSession() {
    return apiFetch<SessionResource>(`${API_PREFIX}/auth/session`);
  },
  async getCurrentUser() {
    return apiFetch<UserResource>(`${API_PREFIX}/users/me`);
  },
  async updateCurrentUser(payload: UpdateProfilePayload) {
    return apiFetch<UserResource>(`${API_PREFIX}/users/me`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  async listProjects(params: ListProjectsParams = {}) {
    const query = buildQuery(params);
    return apiFetch<ProjectListResource>(`${API_PREFIX}/projects${query}`);
  },
  async createProject(payload: CreateProjectPayload) {
    return apiFetch<{ project: ProjectResource }>(`${API_PREFIX}/projects`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async checkProjectSlugAvailability(slug: string, init?: RequestInit) {
    const normalized = slug.trim();
    const query = buildQuery({ slug: normalized });
    return apiFetch<SlugAvailabilityResource>(
      `${API_PREFIX}/projects/slug-available${query}`,
      init
    );
  },
  async listLinkButtonTemplates(init?: RequestInit) {
    return apiFetch<LinkButtonTemplateListResource>(`${API_PREFIX}/templates/link-buttons`, init);
  },
  async getProjectPublicationLimit(init?: RequestInit) {
    return apiFetch<ProjectPublicationLimitResource>(`${API_PREFIX}/projects/limits`, init);
  },
  async getProject(projectId: string) {
    return apiFetch<{ project: ProjectResource }>(`${API_PREFIX}/projects/${projectId}`);
  },
  async updateProject(projectId: string, payload: UpdateProjectPayload) {
    return apiFetch<{ project: ProjectResource }>(`${API_PREFIX}/projects/${projectId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  async patchProject(projectId: string, payload: PatchProjectPayload) {
    return apiFetch<{ project: ProjectResource }>(`${API_PREFIX}/projects/${projectId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  async deleteProject(projectId: string) {
    return apiFetch<{ deleted: boolean }>(`${API_PREFIX}/projects/${projectId}`, {
      method: "DELETE",
    });
  },
  async getAnalyticsMetrics(month: string) {
    const query = buildQuery({ month });
    return apiFetch<AnalyticsMetricsResource>(`${API_PREFIX}/analytics/metrics${query}`);
  },
  async getBillingSubscription() {
    return apiFetch<BillingSubscriptionResource>(`${API_PREFIX}/billing/subscription`);
  },
  async createCheckout(payload: CreateCheckoutPayload) {
    return apiFetch<CreateCheckoutResource>(`${API_PREFIX}/billing/create-checkout`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async getTransactionsReport(params: TransactionsReportParams = {}, init?: RequestInit) {
    const query = buildQuery({
      start: params.start ?? undefined,
      end: params.end ?? undefined,
      status: params.status ?? undefined,
      search: params.search ?? undefined,
      page: params.page ?? undefined,
      pageSize: params.pageSize ?? undefined,
      sort: params.sort ?? undefined,
      order: params.order ?? undefined,
    });
    return apiFetch<TransactionsReportResource>(`${API_PREFIX}/reports/transactions${query}`, init);
  },
  async getCoursesResources(init?: RequestInit) {
    return apiFetch<CoursesResourcesResource>(`${API_PREFIX}/courses/resources`, init);
  },
  async exportTransactionsReport(
    format: "csv" | "xlsx" | "pdf",
    params: TransactionsReportParams = {},
    init?: RequestInit
  ) {
    const query = buildQuery({
      format,
      start: params.start ?? undefined,
      end: params.end ?? undefined,
      status: params.status ?? undefined,
      search: params.search ?? undefined,
      sort: params.sort ?? undefined,
      order: params.order ?? undefined,
    });
    const response = await fetch(`${API_PREFIX}/reports/transactions/export${query}`, {
      credentials: "include",
    });
    if (!response.ok) {
      let parsed: ApiResponse<never> | null = null;
      try {
        parsed = await parseResponse<never>(response.clone());
      } catch {
        parsed = null;
      }
      throw new ApiClientError(
        parsed?.error?.message ?? "Request failed",
        response.status,
        parsed?.error ?? null
      );
    }
    return response;
  },
};
