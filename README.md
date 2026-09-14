# App Estudo — Fase 1

Motor de flashcards multi-tenant (isolamento por usuário) com Next.js + Supabase.

## Setup rápido

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Em **Project Settings → API**, copie `Project URL` e `anon public` key.
3. Copie o arquivo de ambiente:

```bash
cp .env.local.example .env.local
```

4. Preencha as variáveis em `.env.local`.
5. No Supabase, abra **SQL Editor**, cole e execute o conteúdo de:

`supabase/migrations/001_phase1_foundation.sql`

6. (Opcional para MVP) Em **Authentication → Providers → Email**, desative
   "Confirm email" para testar cadastro sem confirmação.
7. Instale e rode:

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## O que a Fase 1 entrega

- Auth (login / cadastro / logout) via Supabase
- Tabelas `profiles`, `decks`, `flashcards` com RLS
- CRUD mínimo de decks e flashcards
- Isolamento: cada usuário só vê os próprios dados

## Critério de aceite

Crie duas contas. A conta B não deve ver decks/cards da conta A.
