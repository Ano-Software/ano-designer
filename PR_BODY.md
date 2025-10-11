Tarefa 1 — Publicar: remover cards de resumo

- Remove totalmente os cards/resumos "Hero", "Botões" e "Conteúdo" da aba Publicar (ReviewPane).
- Exclui renderização e toda a lógica/imports usados apenas para populá-los.
- Preservado: checagem de disponibilidade do link (slug), Status do plano, e botões: Salvar rascunho, Descartar rascunho e Publicar.
- Sem alterações de cores, tipografia, grid global ou textos.

Validações funcionais preservadas:

- “Publicar” habilita apenas com plano ativo, slug válido/disponível e campos mínimos do projeto ok (e, se “Pago = Sim”, valor + forma).
- Ao publicar, grava publication.status='published' e publicPath (lógica já existente no fluxo).

Entrega técnica:

- Arquivo/linhas: apps/web/components/dashboard/create/ReviewPane.tsx (remoção dos SummarySection e funções describe\* + imports associados).
- Código morto vinculado apenas aos resumos foi removido.

CI/Proteções:

- Se houver revisão obrigatória/CI, favor aprovar. Vercel deve gerar preview para este PR (projeto ano-designer, root apps/web).
