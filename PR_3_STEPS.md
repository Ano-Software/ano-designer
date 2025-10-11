Rollback + ajuste fino (3 etapas) — manter Publicar sem resumos

Tarefas aplicadas:

1. Reverter stepper/etapas para 3 passos, removendo Conteudo/Revisao
   - Ordem e rótulos: Projeto, Estilo, Publicar.
   - Primeiro card: só o título “Projeto” (sem número/subtítulo).
   - Ajuste do grid do stepper para 3 colunas.

2. Textos visíveis
   - “Base” → Projeto
   - Conteudo/Revisao removidos.
   - “Publicar” mantido.

3. Publicar: sem resumos
   - Removidos cards “Hero/Botões/Conteúdo”.
   - Mantidos: indicador de slug disponível (a partir do estado da etapa Base), Status do plano, botões Salvar rascunho, Descartar rascunho e Publicar.
   - Regras preservadas: “Publicar” só habilita com plano ativo, slug disponível e campos mínimos do projeto ok.

4. Limpeza de código
   - Removidas referências de step Conteudo/Revisao (estado/validação/JSX).
   - Build Next passou.

Arquivos corrigidos principais:

- apps/web/app/(dashboard)/criar/page.tsx
  • StepKey/steps → 3 etapas (project, style, publish) e labels corretos.
  • Stepper sem número/subtítulo no primeiro card e grid de 3 colunas.
  • Remoção do passo Conteudo e validações associadas.
  • Atualização do fluxo Próximo/Voltar (0..2).
  • Título do primeiro painel: “Projeto”.

- apps/web/components/dashboard/create/ReviewPane.tsx
  • Sem resumos. Título do painel: “Publicar”.
  • Botão “Publicar” agora também verifica campos mínimos do projeto, além de plano/slug.

Checks/CI

- Vercel preview deve ser gerado (projeto ano-designer, root apps/web).

Favor revisar e aprovar para merge na main.
