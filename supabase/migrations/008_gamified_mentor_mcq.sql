-- Fase 8: MCQ, outline por PDF, mentor e jogos

alter table public.flashcards
  add column if not exists options jsonb,
  add column if not exists correct_index integer;

alter table public.study_lessons
  add column if not exists source_file_id uuid references public.source_files (id) on delete set null,
  add column if not exists topic_key text,
  add column if not exists outline_item_id uuid;

create index if not exists study_lessons_source_file_id_idx
  on public.study_lessons (source_file_id);

-- Itens do PDF (nada fica para trás)
create table if not exists public.content_outline_items (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks (id) on delete cascade,
  source_file_id uuid not null references public.source_files (id) on delete cascade,
  title text not null,
  page integer,
  summary text,
  sort_order integer not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'done')),
  created_at timestamptz not null default now()
);

create index if not exists content_outline_items_deck_id_idx
  on public.content_outline_items (deck_id);

create index if not exists content_outline_items_source_file_id_idx
  on public.content_outline_items (source_file_id);

alter table public.content_outline_items enable row level security;

create policy "content_outline_items_select_own"
  on public.content_outline_items for select
  using (
    exists (
      select 1 from public.decks
      where decks.id = content_outline_items.deck_id
        and decks.user_id = auth.uid()
    )
  );

create policy "content_outline_items_insert_own"
  on public.content_outline_items for insert
  with check (
    exists (
      select 1 from public.decks
      where decks.id = content_outline_items.deck_id
        and decks.user_id = auth.uid()
    )
  );

create policy "content_outline_items_update_own"
  on public.content_outline_items for update
  using (
    exists (
      select 1 from public.decks
      where decks.id = content_outline_items.deck_id
        and decks.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.decks
      where decks.id = content_outline_items.deck_id
        and decks.user_id = auth.uid()
    )
  );

create policy "content_outline_items_delete_own"
  on public.content_outline_items for delete
  using (
    exists (
      select 1 from public.decks
      where decks.id = content_outline_items.deck_id
        and decks.user_id = auth.uid()
    )
  );

alter table public.study_lessons
  drop constraint if exists study_lessons_outline_item_id_fkey;

alter table public.study_lessons
  add constraint study_lessons_outline_item_id_fkey
  foreign key (outline_item_id)
  references public.content_outline_items (id)
  on delete set null;

-- Mentor
create table if not exists public.mentor_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  deck_id uuid references public.decks (id) on delete set null,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mentor_conversations_user_id_idx
  on public.mentor_conversations (user_id);

alter table public.mentor_conversations enable row level security;

create policy "mentor_conversations_select_own"
  on public.mentor_conversations for select
  using (auth.uid() = user_id);

create policy "mentor_conversations_insert_own"
  on public.mentor_conversations for insert
  with check (auth.uid() = user_id);

create policy "mentor_conversations_update_own"
  on public.mentor_conversations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "mentor_conversations_delete_own"
  on public.mentor_conversations for delete
  using (auth.uid() = user_id);

create table if not exists public.mentor_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.mentor_conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists mentor_messages_conversation_id_idx
  on public.mentor_messages (conversation_id);

alter table public.mentor_messages enable row level security;

create policy "mentor_messages_select_own"
  on public.mentor_messages for select
  using (auth.uid() = user_id);

create policy "mentor_messages_insert_own"
  on public.mentor_messages for insert
  with check (auth.uid() = user_id);

create policy "mentor_messages_delete_own"
  on public.mentor_messages for delete
  using (auth.uid() = user_id);

-- Sessões de jogos
create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  deck_id uuid not null references public.decks (id) on delete cascade,
  source_file_id uuid references public.source_files (id) on delete set null,
  game_type text not null check (game_type in ('memory', 'crossword')),
  score integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists game_sessions_deck_id_idx
  on public.game_sessions (deck_id);

alter table public.game_sessions enable row level security;

create policy "game_sessions_select_own"
  on public.game_sessions for select
  using (auth.uid() = user_id);

create policy "game_sessions_insert_own"
  on public.game_sessions for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.decks
      where decks.id = game_sessions.deck_id
        and decks.user_id = auth.uid()
    )
  );

create policy "game_sessions_update_own"
  on public.game_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
