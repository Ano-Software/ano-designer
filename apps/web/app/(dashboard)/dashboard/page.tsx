import Link from "next/link";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { getPublicSupabaseConfig } from "@/lib/env";

const salesTableCandidates = ["sales", "vendas", "orders", "transactions"] as const;
const revenueColumns = ["total", "amount", "valor", "value", "price", "total_amount"] as const;

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

type SalesRows = Array<Record<string, unknown>>;

type DashboardMetrics = {
  monthlySales: number;
  monthlyRevenue: number;
  pendingProjects: number;
};

async function fetchSalesRows(
  client: SupabaseClient<any>,
  userId: string,
  startIso: string,
  endIso: string
): Promise<SalesRows | null> {
  for (const table of salesTableCandidates) {
    const { data, error } = await client
      .from(table)
      .select("*")
      .eq("owner_id", userId)
      .gte("created_at", startIso)
      .lt("created_at", endIso);

    if (error) {
      continue;
    }

    if (Array.isArray(data)) {
      return data;
    }
  }

  return null;
}

function sumRevenue(rows: SalesRows) {
  return rows.reduce((total, row) => {
    for (const column of revenueColumns) {
      const value = row[column];
      const numeric =
        typeof value === "number"
          ? value
          : typeof value === "string"
            ? Number.parseFloat(value)
            : NaN;

      if (!Number.isNaN(numeric)) {
        return total + numeric;
      }
    }

    return total;
  }, 0);
}

async function fetchPendingProjects(
  client: SupabaseClient<any>,
  userId: string,
  startIso: string,
  endIso: string
) {
  const { data, error } = await client
    .from("projects")
    .select("*")
    .eq("owner_id", userId)
    .gte("created_at", startIso)
    .lt("created_at", endIso);

  if (error || !Array.isArray(data)) {
    return 0;
  }

  const completionFlags = new Set(["done", "completed", "concluido", "finalizado", "entregue"]);

  return data.filter((project) => {
    const status = typeof project.status === "string" ? project.status.toLowerCase() : "";
    const progress = typeof project.progress === "number" ? project.progress : null;

    const isCompleted =
      completionFlags.has(status) ||
      project.completed === true ||
      project.is_completed === true ||
      typeof project.completed_at === "string" ||
      progress === 100;

    return !isCompleted;
  }).length;
}

async function getDashboardMetrics(
  client: SupabaseClient<any>,
  userId: string
): Promise<DashboardMetrics> {
  const { startIso, endIso } = getMonthRange();

  const [salesRows, pendingProjects] = await Promise.all([
    fetchSalesRows(client, userId, startIso, endIso),
    fetchPendingProjects(client, userId, startIso, endIso),
  ]);

  const sales = salesRows ?? [];
  const revenue = sumRevenue(sales);

  return {
    monthlySales: sales.length,
    monthlyRevenue: revenue,
    pendingProjects,
  };
}

export default async function DashboardPage() {
  const config = getPublicSupabaseConfig();
  const cookieStore = cookies();
  const supabase = config
    ? (createServerComponentClient<Database>(
        { cookies: () => cookieStore },
        { supabaseUrl: config.supabaseUrl, supabaseKey: config.supabaseKey }
      ) as unknown as SupabaseClient<Database>)
    : null;

  const {
    data: { session },
  } = supabase ? await supabase.auth.getSession() : { data: { session: null } };

  const userId = session?.user?.id;
  const metrics = supabase && userId ? await getDashboardMetrics(supabase, userId) : null;

  const metricsList = [
    {
      title: "Vendas no mes",
      value: formatNumber(metrics?.monthlySales ?? 0),
      description: "Pedidos concluidos neste mes.",
    },
    {
      title: "Faturamento no mes",
      value: formatCurrency(metrics?.monthlyRevenue ?? 0),
      description: "Total somado das vendas confirmadas.",
    },
    {
      title: "Projetos pendentes",
      value: formatNumber(metrics?.pendingProjects ?? 0),
      description: "Projetos iniciados e ainda não finalizados.",
    },
  ];

  return (
    <div className="space-y-12">
      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {metricsList.map((metric) => (
          <article
            key={metric.title}
            className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-[0_20px_60px_rgba(12,32,22,0.35)] backdrop-blur transition hover:border-white/20"
          >
            <header className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
                {metric.title}
              </p>
              <p className="text-3xl font-semibold text-white">{metric.value}</p>
            </header>
            <p className="mt-3 text-sm text-white/60">{metric.description}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/criar"
          className="flex h-28 items-center justify-between rounded-3xl border border-[#e2b23b]/40 bg-[#e2b23b]/15 px-6 py-4 text-left transition hover:border-[#e2b23b]/60 hover:bg-[#e2b23b]/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e2b23b]"
        >
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/60">
              Acoes rapidas
            </p>
            <p className="mt-2 text-2xl font-semibold text-[#e2b23b]">Criar</p>
          </div>
          <span aria-hidden className="text-3xl text-[#e2b23b]">
            &gt;
          </span>
        </Link>

        <Link
          href="/projetos"
          className="flex h-28 items-center justify-between rounded-3xl border border-white/15 bg-white/5 px-6 py-4 text-left transition hover:border-white/30 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e2b23b]"
        >
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/60">
              Acoes rapidas
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">Meus projetos</p>
          </div>
          <span aria-hidden className="text-3xl text-white/80">
            &gt;
          </span>
        </Link>
      </section>
    </div>
  );
}
