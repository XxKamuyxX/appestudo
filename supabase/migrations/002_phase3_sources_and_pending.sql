-- Fase 3: source_files (histórico de PDFs) + pending_flashcards (curadoria)

create table if not exists public.source_files (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  file_name text not null,
  content_hash text not null,
  pages integer not null default 0,
  char_count integer not null default 0,
  extracted_text text not null default '',
  created_at timestamptz not null default now(),
  unique (deck_id, content_hash)
);

create index if not exists source_files_deck_id_idx on public.source_files (deck_id);
create index if not exists source_files_user_id_idx on public.source_files (user_id);

alter table public.source_files enable row level security;

create policy "source_files_select_own"
  on public.source_files for select
  using (auth.uid() = user_id);

create policy "source_files_insert_own"
  on public.source_files for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.decks
      where decks.id = source_files.deck_id
        and decks.user_id = auth.uid()
    )
  );

create policy "source_files_delete_own"
  on public.source_files for delete
  using (auth.uid() = user_id);

create table if not exists public.pending_flashcards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks (id) on delete cascade,
  source_file_id uuid references public.source_files (id) on delete set null,
  question text not null,
  answer text not null,
  created_at timestamptz not null default now()
);

create index if not exists pending_flashcards_deck_id_idx
  on public.pending_flashcards (deck_id);

alter table public.pending_flashcards enable row level security;

create policy "pending_flashcards_select_own"
  on public.pending_flashcards for select
  using (
    exists (
      select 1 from public.decks
      where decks.id = pending_flashcards.deck_id
        and decks.user_id = auth.uid()
    )
  );

create policy "pending_flashcards_insert_own"
  on public.pending_flashcards for insert
  with check (
    exists (
      select 1 from public.decks
      where decks.id = pending_flashcards.deck_id
        and decks.user_id = auth.uid()
    )
  );

create policy "pending_flashcards_update_own"
  on public.pending_flashcards for update
  using (
    exists (
      select 1 from public.decks
      where decks.id = pending_flashcards.deck_id
        and decks.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.decks
      where decks.id = pending_flashcards.deck_id
        and decks.user_id = auth.uid()
    )
  );

create policy "pending_flashcards_delete_own"
  on public.pending_flashcards for delete
  using (
    exists (
      select 1 from public.decks
      where decks.id = pending_flashcards.deck_id
        and decks.user_id = auth.uid()
    )
  );
