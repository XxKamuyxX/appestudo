-- Fase 5: citação estruturada (doc + página) + XP/streaks

alter table public.pending_flashcards
  add column if not exists source_file_name text;

alter table public.pending_flashcards
  add column if not exists source_page integer;

alter table public.flashcards
  add column if not exists source_file_name text;

alter table public.flashcards
  add column if not exists source_page integer;

create table if not exists public.user_stats (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  xp integer not null default 0,
  streak_current integer not null default 0,
  streak_best integer not null default 0,
  last_study_date date,
  updated_at timestamptz not null default now()
);

alter table public.user_stats enable row level security;

create policy "user_stats_select_own"
  on public.user_stats for select
  using (auth.uid() = user_id);

create policy "user_stats_insert_own"
  on public.user_stats for insert
  with check (auth.uid() = user_id);

create policy "user_stats_update_own"
  on public.user_stats for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
