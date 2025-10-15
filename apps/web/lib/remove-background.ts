"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase-client";

export async function removeBackground(imageDataUrl: string): Promise<string> {
  const client = createSupabaseBrowserClient();

  if (!client) {
    throw new Error("Supabase não configurado. Configure SUPABASE_URL e SUPABASE_ANON_KEY.");
  }

  const { data, error } = await client.functions.invoke("remove-background", {
    body: { image: imageDataUrl },
  });

  if (error) {
    throw new Error(error.message ?? "Falha ao remover fundo.");
  }

  const processed = typeof data?.image === "string" ? data.image : imageDataUrl;
  return processed;
}
