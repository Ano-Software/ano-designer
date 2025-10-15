"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useCoursesResources } from "@/hooks/useCoursesResources";

type CoursesPageProps = {
  blocked: boolean;
  planExpiresAt: string | null;
};

type SectionProps = {
  title: string;
  description: string;
};

function SectionHeading({ title, description }: SectionProps) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="text-sm text-white/60">{description}</p>
    </div>
  );
}

export function CoursesPage({ blocked, planExpiresAt }: CoursesPageProps) {
  const { data, loading, error, refresh } = useCoursesResources();

  useEffect(() => {
    if (error) {
      console.error("[Cursos] Falha ao carregar recursos", error);
    }
  }, [error]);

  if (blocked) {
    const detail = planExpiresAt
      ? `Seu plano venceu em ${new Date(planExpiresAt).toLocaleDateString("pt-BR")}.`
      : "Ative um plano para liberar os cursos.";

    return (
      <div className="space-y-6">
        <section className="rounded-2xl border border-white/10 bg-white/5 px-6 py-8 text-center shadow-sm backdrop-blur">
          <h1 className="text-2xl font-semibold text-white">
            Para acessar esta area, ative seu plano
          </h1>
          <p className="mt-3 text-sm text-white/70">{detail}</p>
          <div className="mt-6 flex justify-center">
            <Link
              href="/pagamentos"
              className="inline-flex items-center rounded-full bg-[#e2b23b] px-6 py-2 text-sm font-semibold text-[#0c2016] transition hover:bg-[#f0c761]"
            >
              Ver planos
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const videos = data?.videos ?? [];
  const pdfs = data?.pdfs ?? [];
  const externals = data?.externals ?? [];

  const showVideoSkeleton = loading && !data;
  const showPdfSkeleton = loading && !data;
  const showExternalSkeleton = loading && !data;

  return (
    <div className="space-y-8">
      {error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          <div className="flex items-center justify-between gap-4">
            <p>{error}</p>
            <button
              type="button"
              onClick={refresh}
              className="rounded-full border border-rose-100/40 px-3 py-1 text-xs font-semibold text-rose-100 transition hover:bg-rose-100/10"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-white/5 px-6 py-6 shadow-sm backdrop-blur">
        <SectionHeading
          title="Videos"
          description="Acompanhe as aulas gravadas e aprimore suas habilidades."
        />
        {showVideoSkeleton ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`video-skeleton-${index}`}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 animate-pulse"
              >
                <div className="h-48 w-full rounded-xl bg-white/10" />
                <div className="h-4 w-1/2 rounded bg-white/10" />
                <div className="h-4 w-1/4 rounded bg-white/10" />
              </div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-white/60">
            Nenhum conteúdo disponível ainda.
          </div>
        ) : (
          <div className="space-y-4">
            {videos.map((video) => (
              <article
                key={video.id}
                className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-sm"
              >
                <div className="aspect-video overflow-hidden rounded-xl border border-white/10 bg-black/40">
                  {video.url ? (
                    <video controls className="h-full w-full" src={video.url} />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-white/50">
                      URL não disponível
                    </div>
                  )}
                </div>
                <div className="mt-4 space-y-1">
                  <h3 className="text-lg font-semibold text-white">{video.title}</h3>
                  <p className="text-sm text-white/60">Duracao: {video.duration}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 px-6 py-6 shadow-sm backdrop-blur">
        <SectionHeading
          title="Materiais (PDF)"
          description="Baixe os materiais complementares utilizados nas aulas."
        />
        {showPdfSkeleton ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`pdf-skeleton-${index}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/10 p-4 animate-pulse"
              >
                <div className="h-4 w-1/2 rounded bg-white/10" />
                <div className="h-4 w-20 rounded bg-white/10" />
              </div>
            ))}
          </div>
        ) : pdfs.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-white/60">
            Nenhum conteúdo disponível ainda.
          </div>
        ) : (
          <ul className="space-y-3">
            {pdfs.map((pdf) => (
              <li
                key={pdf.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-white">{pdf.title}</p>
                  <p className="text-xs text-white/50">{pdf.size ?? "Tamanho indisponível"}</p>
                </div>
                <a
                  href={pdf.url ?? "#"}
                  download
                  className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
                  onClick={(event) => {
                    if (!pdf.url) {
                      event.preventDefault();
                    }
                  }}
                >
                  Baixar PDF
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 px-6 py-6 shadow-sm backdrop-blur">
        <SectionHeading
          title="Cursos externos"
          description="Selecao de links recomendados para aprofundar seus estudos."
        />
        {showExternalSkeleton ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`external-skeleton-${index}`}
                className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/10 p-4 animate-pulse"
              >
                <div className="h-4 w-1/2 rounded bg-white/10" />
                <div className="h-4 w-2/3 rounded bg-white/10" />
              </div>
            ))}
          </div>
        ) : externals.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-white/60">
            Nenhum conteúdo disponível ainda.
          </div>
        ) : (
          <ul className="space-y-3">
            {externals.map((external) => (
              <li key={external.id} className="rounded-2xl border border-white/10 bg-white/10 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{external.title}</p>
                    <p className="text-xs text-white/60">
                      {external.description ?? "Sem descricao"}
                    </p>
                  </div>
                  <Link
                    href={external.url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
                    onClick={(event) => {
                      if (!external.url) {
                        event.preventDefault();
                      }
                    }}
                  >
                    Acessar
                    <span aria-hidden>\u2197</span>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
