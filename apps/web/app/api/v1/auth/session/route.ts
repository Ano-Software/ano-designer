import { createOptionsHandler } from "@/lib/api/options";
import { handleApiRequest } from "@/lib/api/handler";
import { success } from "@/lib/api/response";
export const runtime = "nodejs";

type SessionPayload = {
  session: {
    user: {
      id: string;
      email: string | null;
    };
    expiresAt: string | null;
  } | null;
};

export async function GET(request: Request, context: { params: Record<string, string> }) {
  return handleApiRequest(
    request,
    context,
    async ({ supabase }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        return success<SessionPayload>({ session: null });
      }

      const expiresAt =
        typeof session.expires_at === "number"
          ? new Date(session.expires_at * 1000).toISOString()
          : null;

      return success<SessionPayload>({
        session: {
          user: {
            id: session.user.id,
            email: session.user.email ?? null,
          },
          expiresAt,
        },
      });
    },
    {
      auth: "optional",
      rateLimit: {
        limit: 60,
      },
    }
  );
}

export const OPTIONS = createOptionsHandler();
