import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type RemoveBackgroundPayload = {
  image?: string;
};

serve(async (request) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: RemoveBackgroundPayload | null = null;

  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const image = typeof payload?.image === "string" ? payload.image : null;

  if (!image) {
    return new Response(JSON.stringify({ error: "Image is required" }), {
      status: 422,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ image, processed: false, message: "Background removal stub" }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
});
