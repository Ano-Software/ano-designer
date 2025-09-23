# ano-designer

## Objetivo do monorepo
Concentrar aplicações e bibliotecas compartilhadas do projeto ano-designer em um único repositório gerenciável.

## Estrutura de pastas (apps/packages)
- `apps/web`: aplicação web principal.
- `packages/ui`: componentes de interface reutilizáveis.
- `packages/db`: scripts e utilitários relacionados ao banco de dados.
- `packages/utils`: funções utilitárias comuns.

## Fluxo de branches: dev → staging → main (PR obrigatório)
Todo trabalho parte de `dev`, progride via PR para `staging` e é promovido para `main` somente após revisão obrigatória.

## Deploys: Vercel (app-dev/app-staging/app-prod)
Cada branch principal direciona para um ambiente Vercel: `app-dev`, `app-staging` e `app-prod` respectivamente.

## Back-end as a service: Supabase (dev/staging/prod)
Supabase provê os serviços de back-end, com instâncias dedicadas para desenvolvimento, homologação e produção.

## Pagamentos: Mercado Pago (sandbox por enquanto)
Integração de pagamentos utilizando Mercado Pago, operando inicialmente apenas em ambiente sandbox.

## Padrões: EditorConfig, Prettier, Husky/lint-staged (adicionados depois)
O repositório segue as configurações do EditorConfig e Prettier, com Husky e lint-staged planejados para adição futura.

## Como contribuir (Conventional Commits futuramente)
Contribuições devem seguir boas práticas de PR e, futuramente, adotar o padrão Conventional Commits para mensagens.
