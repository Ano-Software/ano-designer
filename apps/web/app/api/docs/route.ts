import { NextResponse } from "next/server";
import { createOptionsHandler } from "@/lib/api/options";
import { handleCors, resolveCorsHeaders } from "@/lib/api/cors";
import { applyRateLimit, rateLimitHeaders } from "@/lib/api/rate-limit";
import { optionalEnvValues } from "@/lib/env";
export const runtime = "nodejs";

const RATE_LIMIT = {
  limit: 20,
  windowMs: 60_000,
};

const IP_HEADER_CANDIDATES = ["x-forwarded-for", "x-real-ip", "cf-connecting-ip"] as const;

function getClientIdentifier(request: Request) {
  for (const header of IP_HEADER_CANDIDATES) {
    const value = request.headers.get(header);
    if (value) {
      const [first] = value.split(/,\s*/);
      if (first) {
        return first.trim();
      }
    }
  }

  return "anonymous";
}

const siteUrl = optionalEnvValues.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const servers = new Map<string, string>();
servers.set(siteUrl, "Configured site");
servers.set("http://localhost:3000", "Local development");

const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Ano Designer REST API",
    version: "1.0.0",
    description:
      "REST API for authenticated Ano Designer clients. All endpoints require a valid Supabase session cookie unless marked otherwise.",
    contact: {
      name: "Ano Designer",
      url: "https://github.com/ano-designer",
    },
  },
  servers: Array.from(servers.entries()).map(([url, description]) => ({ url, description })),
  tags: [
    { name: "Auth", description: "Session helpers" },
    { name: "Users", description: "User profile management" },
    { name: "Projects", description: "Project lifecycle" },
    { name: "Analytics", description: "Aggregated metrics" },
  ],
  components: {
    securitySchemes: {
      supabaseSession: {
        type: "apiKey",
        in: "cookie",
        name: "sb-access-token",
        description: "Supabase session cookie issued by auth helpers.",
      },
    },
    schemas: {
      ApiError: {
        type: "object",
        properties: {
          message: { type: "string" },
          code: { type: "string", nullable: true },
          details: {},
        },
        required: ["message"],
      },
      ApiResponseSession: {
        type: "object",
        properties: {
          data: {
            $ref: "#/components/schemas/SessionResource",
          },
          error: {
            $ref: "#/components/schemas/ApiError",
            nullable: true,
          },
        },
      },
      ApiResponseUser: {
        type: "object",
        properties: {
          data: {
            $ref: "#/components/schemas/UserResource",
          },
          error: {
            $ref: "#/components/schemas/ApiError",
            nullable: true,
          },
        },
      },
      ApiResponseProjectList: {
        type: "object",
        properties: {
          data: {
            $ref: "#/components/schemas/ProjectListResource",
          },
          error: {
            $ref: "#/components/schemas/ApiError",
            nullable: true,
          },
        },
      },
      ApiResponseProject: {
        type: "object",
        properties: {
          data: {
            type: "object",
            properties: {
              project: { $ref: "#/components/schemas/ProjectResource" },
            },
            required: ["project"],
          },
          error: {
            $ref: "#/components/schemas/ApiError",
            nullable: true,
          },
        },
      },
      ApiResponseDeleted: {
        type: "object",
        properties: {
          data: {
            type: "object",
            properties: {
              deleted: { type: "boolean" },
            },
            required: ["deleted"],
          },
          error: {
            $ref: "#/components/schemas/ApiError",
            nullable: true,
          },
        },
      },
      ApiResponseMetrics: {
        type: "object",
        properties: {
          data: {
            $ref: "#/components/schemas/AnalyticsMetricsResource",
          },
          error: {
            $ref: "#/components/schemas/ApiError",
            nullable: true,
          },
        },
      },
      SessionResource: {
        type: "object",
        properties: {
          session: {
            type: "object",
            nullable: true,
            properties: {
              user: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  email: { type: "string", format: "email", nullable: true },
                },
                required: ["id", "email"],
              },
              expiresAt: { type: "string", format: "date-time", nullable: true },
            },
            required: ["user", "expiresAt"],
          },
        },
        required: ["session"],
      },
      ProfileResource: {
        type: "object",
        properties: {
          fullName: { type: "string", nullable: true },
          username: { type: "string", nullable: true },
          avatarUrl: { type: "string", format: "uri", nullable: true },
          bio: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time", nullable: true },
          updatedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      UserResource: {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              email: { type: "string", format: "email", nullable: true },
              profile: {
                $ref: "#/components/schemas/ProfileResource",
                nullable: true,
              },
            },
            required: ["id", "email", "profile"],
          },
        },
        required: ["user"],
      },
      ProjectResource: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          ownerId: { type: "string", format: "uuid" },
          name: { type: "string" },
          description: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
        required: ["id", "ownerId", "name", "description", "createdAt", "updatedAt"],
      },
      PaginationResource: {
        type: "object",
        properties: {
          page: { type: "integer", minimum: 1 },
          pageSize: { type: "integer", minimum: 1 },
          totalItems: { type: "integer", minimum: 0 },
          totalPages: { type: "integer", minimum: 1 },
        },
        required: ["page", "pageSize", "totalItems", "totalPages"],
      },
      ProjectListResource: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/ProjectResource" },
          },
          pagination: { $ref: "#/components/schemas/PaginationResource" },
          filters: {
            type: "object",
            properties: {
              search: { type: "string" },
            },
          },
          sort: {
            type: "object",
            properties: {
              field: { type: "string", enum: ["created_at", "updated_at", "name"] },
              order: { type: "string", enum: ["asc", "desc"] },
            },
            required: ["field", "order"],
          },
        },
        required: ["items", "pagination", "filters", "sort"],
      },
      AnalyticsMetricsResource: {
        type: "object",
        properties: {
          period: {
            type: "object",
            properties: {
              month: { type: "string", pattern: "^\\d{4}-\\d{2}$" },
              range: {
                type: "object",
                properties: {
                  start: { type: "string", format: "date-time" },
                  end: { type: "string", format: "date-time" },
                },
                required: ["start", "end"],
              },
            },
            required: ["month", "range"],
          },
          metrics: {
            type: "object",
            properties: {
              sales: { type: "integer", minimum: 0 },
              revenue: {
                type: "object",
                properties: {
                  amount: { type: "number" },
                  currency: { type: "string" },
                },
                required: ["amount", "currency"],
              },
              pendingProjects: { type: "integer", minimum: 0 },
            },
            required: ["sales", "revenue", "pendingProjects"],
          },
        },
        required: ["period", "metrics"],
      },
      CreateProjectPayload: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string", nullable: true },
        },
        required: ["name"],
      },
      UpdateProjectPayload: {
        allOf: [{ $ref: "#/components/schemas/CreateProjectPayload" }],
      },
      PatchProjectPayload: {
        type: "object",
        properties: {
          name: { type: "string", nullable: true },
          description: { type: "string", nullable: true },
        },
      },
      UpdateProfilePayload: {
        type: "object",
        properties: {
          fullName: { type: "string", nullable: true },
          username: { type: "string", nullable: true },
          avatarUrl: { type: "string", format: "uri", nullable: true },
          bio: { type: "string", nullable: true },
        },
      },
    },
  },
  paths: {
    "/api/v1/auth/session": {
      get: {
        tags: ["Auth"],
        summary: "Retrieve current Supabase session",
        operationId: "getSession",
        responses: {
          200: {
            description: "Session details or null when unauthenticated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiResponseSession" },
                examples: {
                  authenticated: {
                    value: {
                      data: {
                        session: {
                          user: {
                            id: "00000000-0000-0000-0000-000000000000",
                            email: "user@example.com",
                          },
                          expiresAt: "2025-01-01T12:00:00.000Z",
                        },
                      },
                      error: null,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/users/me": {
      get: {
        tags: ["Users"],
        security: [{ supabaseSession: [] }],
        summary: "Return current user profile",
        operationId: "getCurrentUser",
        responses: {
          200: {
            description: "Current user payload",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiResponseUser" },
              },
            },
          },
        },
      },
      put: {
        tags: ["Users"],
        security: [{ supabaseSession: [] }],
        summary: "Update profile for current user",
        operationId: "updateCurrentUser",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateProfilePayload" },
            },
          },
        },
        responses: {
          200: {
            description: "Updated user payload",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiResponseUser" },
              },
            },
          },
        },
      },
    },
    "/api/v1/projects": {
      get: {
        tags: ["Projects"],
        security: [{ supabaseSession: [] }],
        summary: "List projects with pagination",
        operationId: "listProjects",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", minimum: 1 }, required: false },
          {
            name: "pageSize",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 50 },
            required: false,
          },
          {
            name: "sort",
            in: "query",
            schema: { type: "string", enum: ["created_at", "updated_at", "name"] },
            required: false,
          },
          {
            name: "order",
            in: "query",
            schema: { type: "string", enum: ["asc", "desc"] },
            required: false,
          },
          { name: "search", in: "query", schema: { type: "string" }, required: false },
        ],
        responses: {
          200: {
            description: "Paginated project list",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiResponseProjectList" },
              },
            },
          },
        },
      },
      post: {
        tags: ["Projects"],
        security: [{ supabaseSession: [] }],
        summary: "Create a new project",
        operationId: "createProject",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateProjectPayload" },
              examples: {
                basic: {
                  value: {
                    name: "New landing page",
                    description: "Full branding redesign",
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Created project",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiResponseProject" },
              },
            },
          },
        },
      },
    },
    "/api/v1/projects/{projectId}": {
      parameters: [
        {
          name: "projectId",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      get: {
        tags: ["Projects"],
        security: [{ supabaseSession: [] }],
        summary: "Fetch a project by id",
        operationId: "getProject",
        responses: {
          200: {
            description: "Project payload",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiResponseProject" },
              },
            },
          },
        },
      },
      put: {
        tags: ["Projects"],
        security: [{ supabaseSession: [] }],
        summary: "Replace project data",
        operationId: "replaceProject",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateProjectPayload" },
            },
          },
        },
        responses: {
          200: {
            description: "Updated project",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiResponseProject" },
              },
            },
          },
        },
      },
      patch: {
        tags: ["Projects"],
        security: [{ supabaseSession: [] }],
        summary: "Partially update project",
        operationId: "patchProject",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PatchProjectPayload" },
            },
          },
        },
        responses: {
          200: {
            description: "Updated project",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiResponseProject" },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Projects"],
        security: [{ supabaseSession: [] }],
        summary: "Delete a project",
        operationId: "deleteProject",
        responses: {
          200: {
            description: "Confirmation",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiResponseDeleted" },
              },
            },
          },
        },
      },
    },
    "/api/v1/analytics/metrics": {
      get: {
        tags: ["Analytics"],
        security: [{ supabaseSession: [] }],
        summary: "Aggregated metrics for a given month",
        operationId: "getAnalyticsMetrics",
        parameters: [
          {
            name: "month",
            in: "query",
            required: true,
            schema: { type: "string", pattern: "^\\d{4}-\\d{2}$" },
          },
        ],
        responses: {
          200: {
            description: "Analytics summary",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiResponseMetrics" },
              },
            },
          },
        },
      },
    },
  },
};

export async function GET(request: Request) {
  const corsPreflight = handleCors(request);

  if (corsPreflight) {
    return corsPreflight;
  }

  const corsHeaders = resolveCorsHeaders(request.headers.get("origin"));
  const rate = applyRateLimit(`docs:${getClientIdentifier(request)}`, RATE_LIMIT);

  if (!rate.ok) {
    const response = NextResponse.json(
      {
        data: null,
        error: {
          message: "Too many requests",
          code: "RATE_LIMITED",
        },
      },
      { status: 429 }
    );

    corsHeaders.forEach((value, key) => response.headers.set(key, value));
    const headers = rateLimitHeaders(rate);
    Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
    return response;
  }

  const response = NextResponse.json(openApiDocument, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=60",
    },
  });

  corsHeaders.forEach((value, key) => response.headers.set(key, value));
  const headers = rateLimitHeaders(rate);
  Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
  return response;
}

export const OPTIONS = createOptionsHandler({
  rateLimit: {
    limit: 60,
  },
});

const billingTagExists =
  Array.isArray(openApiDocument.tags) &&
  openApiDocument.tags.some((tag: { name?: string }) => tag?.name === "Billing");

if (!billingTagExists) {
  (openApiDocument.tags as any[]).push({
    name: "Billing",
    description: "Planos, assinaturas e faturamento.",
  });
}

Object.assign(openApiDocument.components.schemas, {
  BillingProfileResource: {
    type: "object",
    properties: {
      planId: { type: "string", nullable: true },
      active: { type: "boolean", nullable: true },
      planExpiresAt: { type: "string", format: "date", nullable: true },
      theme: {
        type: "string",
        nullable: true,
        enum: ["light", "dark"],
      },
    },
    required: ["planId", "active", "planExpiresAt", "theme"],
  },
  SubscriptionResource: {
    type: "object",
    properties: {
      planId: { type: "string" },
      mode: { type: "string", enum: ["monthly", "recurring"] },
      status: { type: "string" },
      manageUrl: { type: "string", nullable: true },
    },
    required: ["planId", "mode", "status", "manageUrl"],
  },
  BillingSubscriptionResource: {
    type: "object",
    properties: {
      profile: { $ref: "#/components/schemas/BillingProfileResource" },
      subscription: {
        anyOf: [{ $ref: "#/components/schemas/SubscriptionResource" }, { type: "null" }],
      },
    },
    required: ["profile", "subscription"],
  },
  ApiResponseBillingSubscription: {
    type: "object",
    properties: {
      data: { $ref: "#/components/schemas/BillingSubscriptionResource" },
      error: { $ref: "#/components/schemas/ApiError", nullable: true },
    },
    required: ["data", "error"],
  },
  CreateCheckoutPayload: {
    type: "object",
    properties: {
      planId: { type: "string", enum: ["plan_a", "plan_b", "plan_c"] },
      mode: { type: "string", enum: ["monthly", "recurring"] },
    },
    required: ["planId", "mode"],
  },
  CreateCheckoutResource: {
    type: "object",
    properties: {
      checkoutUrl: { type: "string", format: "uri", nullable: true },
      pix: {
        type: "object",
        nullable: true,
        properties: {
          copyPasteCode: { type: "string" },
          qrCodeImageUrl: { type: "string", format: "uri", nullable: true },
          expiresAt: { type: "string", format: "date-time", nullable: true },
        },
        required: ["copyPasteCode"],
      },
      message: { type: "string", nullable: true },
    },
  },
  ApiResponseCheckout: {
    type: "object",
    properties: {
      data: { $ref: "#/components/schemas/CreateCheckoutResource" },
      error: { $ref: "#/components/schemas/ApiError", nullable: true },
    },
    required: ["data", "error"],
  },
});

Object.assign(openApiDocument.paths, {
  "/api/v1/billing/subscription": {
    get: {
      tags: ["Billing"],
      security: [{ supabaseSession: [] }],
      summary: "Estado atual de assinatura do usuario autenticado",
      operationId: "getBillingSubscription",
      responses: {
        200: {
          description: "Dados de assinatura",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponseBillingSubscription" },
              examples: {
                assinaturaAtiva: {
                  summary: "Plano ativo",
                  value: {
                    data: {
                      profile: {
                        planId: "plan_b",
                        active: true,
                        planExpiresAt: "2025-12-31",
                        theme: "dark",
                      },
                      subscription: {
                        planId: "plan_b",
                        mode: "recurring",
                        status: "active",
                        manageUrl: "https://app.exemplo.com/pagamentos",
                      },
                    },
                    error: null,
                  },
                },
                semAssinatura: {
                  summary: "Sem plano",
                  value: {
                    data: {
                      profile: {
                        planId: null,
                        active: false,
                        planExpiresAt: null,
                        theme: "light",
                      },
                      subscription: null,
                    },
                    error: null,
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/billing/create-checkout": {
    post: {
      tags: ["Billing"],
      security: [{ supabaseSession: [] }],
      summary: "Inicia o fluxo de checkout para contratar ou atualizar um plano",
      operationId: "createBillingCheckout",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CreateCheckoutPayload" },
            examples: {
              assinaturaMensal: {
                summary: "Checkout mensal com PIX",
                value: {
                  planId: "plan_a",
                  mode: "monthly",
                },
              },
              upgradeRecorrente: {
                summary: "Upgrade para cobranca recorrente",
                value: {
                  planId: "plan_b",
                  mode: "recurring",
                },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: "Checkout criado",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApiResponseCheckout" },
              examples: {
                pix: {
                  summary: "Retorno com PIX",
                  value: {
                    data: {
                      pix: {
                        copyPasteCode:
                          "00020126ANODESIGNERPLAN_A-123456785204000053039865405699005802BR5925ANO DESIGNER STUDIO6009SAO PAULO6304",
                        expiresAt: "2025-09-26T18:30:00.000Z",
                      },
                      message: "Use o PIX gerado para concluir o pagamento e ativar o plano.",
                    },
                    error: null,
                  },
                },
                checkoutUrl: {
                  summary: "Retorno com URL de checkout",
                  value: {
                    data: {
                      checkoutUrl:
                        "https://app.exemplo.com/pagamentos/checkout?plan=plan_b&mode=recurring&intent=abc123",
                      message: "Redirecionando para o checkout seguro.",
                    },
                    error: null,
                  },
                },
              },
            },
          },
        },
      },
    },
  },
});
