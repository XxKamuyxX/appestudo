-- Fase 1: profiles, decks, flashcards + RLS (multi-tenant por usuário)

-- Profiles (espelha auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Criar profile automaticamente no signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Decks (matérias)
create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists decks_user_id_idx on public.decks (user_id);

alter table public.decks enable row level security;

create policy "decks_select_own"
  on public.decks for select
  using (auth.uid() = user_id);

create policy "decks_insert_own"
  on public.decks for insert
  with check (auth.uid() = user_id);

create policy "decks_update_own"
  on public.decks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "decks_delete_own"
  on public.decks for delete
  using (auth.uid() = user_id);

-- Flashcards
create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks (id) on delete cascade,
  question text not null,
  answer text not null,
  created_at timestamptz not null default now()
);

create index if not exists flashcards_deck_id_idx on public.flashcards (deck_id);

alter table public.flashcards enable row level security;

create policy "flashcards_select_own"
  on public.flashcards for select
  using (
    exists (
      select 1 from public.decks
      where decks.id = flashcards.deck_id
        and decks.user_id = auth.uid()
    )
  );

create policy "flashcards_insert_own"
  on public.flashcards for insert
  with check (
    exists (
      select 1 from public.decks
      where decks.id = flashcards.deck_id
        and decks.user_id = auth.uid()
    )
  );

create policy "flashcards_update_own"
  on public.flashcards for update
  using (
    exists (
      select 1 from public.decks
      where decks.id = flashcards.deck_id
        and decks.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.decks
      where decks.id = flashcards.deck_id
        and decks.user_id = auth.uid()
    )
  );

create policy "flashcards_delete_own"
  on public.flashcards for delete
  using (
    exists (
      select 1 from public.decks
      where decks.id = flashcards.deck_id
        and decks.user_id = auth.uid()
    )
  );
