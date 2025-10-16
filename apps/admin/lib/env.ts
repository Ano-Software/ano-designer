export type PublicSupabaseConfig = {
  supabaseUrl: string;
  supabaseKey: string;
};

function readEnv(key: string) {
  switch (key) {
    case "NEXT_PUBLIC_SUPABASE_URL":
      return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    case "NEXT_PUBLIC_SUPABASE_ANON_KEY":
      return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    default:
      return process.env[key]?.trim();
  }
}

export function getPublicSupabaseConfig(): PublicSupabaseConfig | null {
  const supabaseUrl = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseKey = readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseKey) {
    if (process.env.NODE_ENV !== "production") {
      if (!supabaseUrl) console.warn("NEXT_PUBLIC_SUPABASE_URL ausente.");
      if (!supabaseKey) console.warn("NEXT_PUBLIC_SUPABASE_ANON_KEY ausente.");
    }
    return null;
  }
  return { supabaseUrl, supabaseKey };
}
