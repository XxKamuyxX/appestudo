-- Fase 4: fonte nas respostas + campos de repetição espaçada (SM-2)

alter table public.pending_flashcards
  add column if not exists source_excerpt text;

alter table public.flashcards
  add column if not exists source_excerpt text;

alter table public.flashcards
  add column if not exists ease_factor numeric not null default 2.5;

alter table public.flashcards
  add column if not exists interval_days integer not null default 0;

alter table public.flashcards
  add column if not exists repetitions integer not null default 0;

alter table public.flashcards
  add column if not exists next_review_at timestamptz not null default now();

create index if not exists flashcards_next_review_at_idx
  on public.flashcards (deck_id, next_review_at);
