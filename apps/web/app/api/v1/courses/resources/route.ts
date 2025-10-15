import { handleApiRequest } from "@/lib/api/handler";
import { success } from "@/lib/api/response";
import { ApiError } from "@/lib/api/errors";
import { isSchemaMissingError } from "@/lib/schema-errors";

export const runtime = "nodejs";

type VideoRow = {
  id: string;
  owner_id: string;
  title: string | null;
  duration: string | null;
  url: string | null;
};

type PdfRow = {
  id: string;
  owner_id: string;
  title: string | null;
  url: string | null;
  size: string | null;
};

type ExternalRow = {
  id: string;
  owner_id: string;
  title: string | null;
  url: string | null;
  description: string | null;
};

function mapVideo(row: VideoRow) {
  return {
    id: row.id,
    title: row.title ?? "Video",
    duration: row.duration ?? "",
    url: row.url,
  };
}

function mapPdf(row: PdfRow) {
  return {
    id: row.id,
    title: row.title ?? "Material",
    url: row.url,
    size: row.size,
  };
}

function mapExternal(row: ExternalRow) {
  return {
    id: row.id,
    title: row.title ?? "Curso externo",
    url: row.url,
    description: row.description,
  };
}

async function safeQuery<TResult>(
  action: () => Promise<{ data: TResult[] | null; error: { message?: string | null } | null }>,
  label: string
) {
  try {
    const { data, error } = await action();

    if (error) {
      if (isSchemaMissingError(error)) {
        console.warn(`[Cursos] Schema missing for ${label}`, error.message);
        return [] as TResult[];
      }

      console.error(`[Cursos] Failed loading ${label}`, error.message);
      return [] as TResult[];
    }

    return (data ?? []) as TResult[];
  } catch (unknownError) {
    console.error(`[Cursos] Unexpected error loading ${label}`, unknownError);
    return [] as TResult[];
  }
}

export async function GET(request: Request, context: { params: Record<string, string> }) {
  return handleApiRequest(
    request,
    context,
    async ({ supabase, user }) => {
      if (!user) {
        throw new ApiError("Not authenticated", 401, { code: "UNAUTHENTICATED" });
      }

      const videos = await safeQuery<VideoRow>(
        () =>
          supabase
            .from("course_videos")
            .select("id, owner_id, title, duration, url")
            .eq("owner_id", user.id)
            .order("created_at", { ascending: false }),
        "course_videos"
      );

      const pdfs = await safeQuery<PdfRow>(
        () =>
          supabase
            .from("course_pdfs")
            .select("id, owner_id, title, url, size")
            .eq("owner_id", user.id)
            .order("created_at", { ascending: false }),
        "course_pdfs"
      );

      const externals = await safeQuery<ExternalRow>(
        () =>
          supabase
            .from("course_externals")
            .select("id, owner_id, title, url, description")
            .eq("owner_id", user.id)
            .order("created_at", { ascending: false }),
        "course_externals"
      );

      return success({
        videos: videos.map(mapVideo),
        pdfs: pdfs.map(mapPdf),
        externals: externals.map(mapExternal),
      });
    },
    {
      auth: "required",
      rateLimit: {
        limit: 60,
      },
    }
  );
}
