export default function ProjetosPage() {
  return (
    <section className="space-y-6 rounded-3xl border border-dashed border-white/15 bg-white/5 p-10 text-white">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
          Visao geral
        </p>
        <h1 className="text-3xl font-semibold">Meus projetos</h1>
      </header>
      <p className="max-w-2xl text-sm text-white/70">
        Em breve voce vera aqui os projetos ativos, status de entrega, responsaveis e indicadores
        chave para tomar decisoes rapidas.
      </p>
    </section>
  );
}
