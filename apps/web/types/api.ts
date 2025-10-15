export type ApiError = {
  message: string;
  code?: string;
  details?: unknown;
};

export type ApiResponse<Data> = {
  data: Data;
  error: ApiError | null;
};

export type SessionResource = {
  session: {
    user: {
      id: string;
      email: string | null;
    };
    expiresAt: string | null;
  } | null;
};

export type ProfileResource = {
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type UserResource = {
  user: {
    id: string;
    email: string | null;
    profile: ProfileResource | null;
  };
};

export type ProjectResource = {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LinkButtonStyle = "filled" | "gradient" | "glass" | "outline" | "neumorphic";

export type SlugAvailabilityResource = {
  available: boolean;
  suggestion?: string | null;
};

export type LinkButtonTemplateResource = {
  id: string;
  name: string;
  label: string;
  description?: string | null;
  style: LinkButtonStyle;
  textColor: string;
  background: string;
  secondaryBackground?: string | null;
  icon?: string | null;
  image?: string | null;
};

export type LinkButtonTemplateListResource = {
  templates: LinkButtonTemplateResource[];
};

export type ProjectPublicationLimitResource = {
  planId: string | null;
  planName: string | null;
  limit: number | null;
  used: number;
  period: string;
};

export type PaginationResource = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type ProjectListResource = {
  items: ProjectResource[];
  pagination: PaginationResource;
  filters: {
    search?: string;
  };
  sort: {
    field: "created_at" | "updated_at" | "name";
    order: "asc" | "desc";
  };
};

export type AnalyticsMetricsResource = {
  period: {
    month: string;
    range: {
      start: string;
      end: string;
    };
  };
  metrics: {
    sales: number;
    revenue: {
      amount: number;
      currency: string;
    };
    pendingProjects: number;
  };
};

export type CreateProjectPayload = {
  name: string;
  description?: string | null;
};

export type UpdateProjectPayload = {
  name: string;
  description?: string | null;
};

export type PatchProjectPayload = Partial<{
  name: string | null;
  description: string | null;
}>;

export type UpdateProfilePayload = Partial<{
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
}>;

export type BillingProfileResource = {
  planId: string | null;
  active: boolean | null;
  planExpiresAt: string | null;
  theme: "light" | "dark" | null;
};

export type SubscriptionResource = {
  planId: string;
  mode: "monthly" | "recurring";
  status: string;
  manageUrl: string | null;
};

export type BillingSubscriptionResource = {
  profile: BillingProfileResource;
  subscription: SubscriptionResource | null;
};

export type CreateCheckoutPayload = {
  planId: string;
  mode: "monthly" | "recurring";
};

export type CreateCheckoutResource = {
  checkoutUrl?: string;
  pix?: {
    copyPasteCode: string;
    qrCodeImageUrl?: string;
    expiresAt?: string;
  };
  message?: string;
};

export type TransactionStatus = "paid" | "pending" | "overdue";

export type TransactionsReportItem = {
  clientName: string;
  phone: string | null;
  date: string | null;
  amount: number | null;
  dueDate: string | null;
  status: TransactionStatus;
};

export type TransactionsReportFilters = {
  start?: string | null;
  end?: string | null;
  status?: TransactionStatus | null;
  search?: string | null;
};

export type TransactionsReportSortField = "date" | "due_date" | "amount" | "client_name";

export type TransactionsReportResource = {
  items: TransactionsReportItem[];
  summary: {
    customers: number;
    total: number;
  };
  pagination: PaginationResource;
  filters: TransactionsReportFilters;
  sort: {
    field: TransactionsReportSortField;
    order: "asc" | "desc";
  };
};

export type CourseVideoResource = {
  id: string;
  title: string;
  duration: string;
  url: string | null;
};

export type CoursePdfResource = {
  id: string;
  title: string;
  url: string | null;
  size: string | null;
};

export type CourseExternalResource = {
  id: string;
  title: string;
  url: string | null;
  description: string | null;
};

export type CoursesResourcesResource = {
  videos: CourseVideoResource[];
  pdfs: CoursePdfResource[];
  externals: CourseExternalResource[];
};
