type SupabaseConfigWarningProps = {
  className?: string;
};

export const MISSING_SUPABASE_CONFIG_MESSAGE =
  "Configuração do Supabase ausente. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY em apps/web/.env.local.";

const baseClasses =
  "rounded-md border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-100 text-center";

const SupabaseConfigWarning = ({ className = "" }: SupabaseConfigWarningProps) => {
  const classes = `${baseClasses} ${className}`.trim();
  return <p className={classes}>{MISSING_SUPABASE_CONFIG_MESSAGE}</p>;
};

export default SupabaseConfigWarning;
