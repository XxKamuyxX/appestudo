-- Progresso por PDF (cobertura do conteúdo da matéria)

alter table public.flashcards
  add column if not exists source_file_id uuid references public.source_files (id) on delete set null;

create index if not exists flashcards_source_file_id_idx
  on public.flashcards (source_file_id);

create table if not exists public.source_file_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  deck_id uuid not null references public.decks (id) on delete cascade,
  source_file_id uuid not null references public.source_files (id) on delete cascade,
  content_reviewed boolean not null default false,
  lab_practiced boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (user_id, source_file_id)
);

create index if not exists source_file_progress_deck_id_idx
  on public.source_file_progress (deck_id);

alter table public.source_file_progress enable row level security;

create policy "source_file_progress_select_own"
  on public.source_file_progress for select
  using (auth.uid() = user_id);

create policy "source_file_progress_insert_own"
  on public.source_file_progress for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.decks
      where decks.id = source_file_progress.deck_id
        and decks.user_id = auth.uid()
    )
  );

create policy "source_file_progress_update_own"
  on public.source_file_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "source_file_progress_delete_own"
  on public.source_file_progress for delete
  using (auth.uid() = user_id);
