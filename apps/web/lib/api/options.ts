import { handleApiRequest } from "@/lib/api/handler";
import { success } from "@/lib/api/response";

type OptionsHandler = (
  request: Request,
  context: { params: Record<string, string> }
) => Promise<Response>;

type OptionsConfig = {
  rateLimit?: {
    limit?: number;
  };
};

export function createOptionsHandler(config?: OptionsConfig): OptionsHandler {
  return function OPTIONS(request: Request, context: { params: Record<string, string> }) {
    return handleApiRequest(request, context, async () => success<{ ok: true }>({ ok: true }), {
      auth: "none",
      rateLimit: {
        limit: config?.rateLimit?.limit ?? 120,
      },
    });
  };
}
