-- Fase 7: laboratório interativo (hotspots nas figuras do PDF)

alter table public.source_images
  add column if not exists is_interactive boolean not null default false;

create table if not exists public.image_hotspots (
  id uuid primary key default gen_random_uuid(),
  source_image_id uuid not null references public.source_images (id) on delete cascade,
  deck_id uuid not null references public.decks (id) on delete cascade,
  x_pct numeric not null check (x_pct >= 0 and x_pct <= 100),
  y_pct numeric not null check (y_pct >= 0 and y_pct <= 100),
  label_simple text not null,
  label_technical text,
  odontology_use text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists image_hotspots_image_id_idx
  on public.image_hotspots (source_image_id);

create index if not exists image_hotspots_deck_id_idx
  on public.image_hotspots (deck_id);

alter table public.image_hotspots enable row level security;

create policy "image_hotspots_select_own"
  on public.image_hotspots for select
  using (
    exists (
      select 1 from public.decks
      where decks.id = image_hotspots.deck_id
        and decks.user_id = auth.uid()
    )
  );

create policy "image_hotspots_insert_own"
  on public.image_hotspots for insert
  with check (
    exists (
      select 1 from public.decks
      where decks.id = image_hotspots.deck_id
        and decks.user_id = auth.uid()
    )
  );

create policy "image_hotspots_update_own"
  on public.image_hotspots for update
  using (
    exists (
      select 1 from public.decks
      where decks.id = image_hotspots.deck_id
        and decks.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.decks
      where decks.id = image_hotspots.deck_id
        and decks.user_id = auth.uid()
    )
  );

create policy "image_hotspots_delete_own"
  on public.image_hotspots for delete
  using (
    exists (
      select 1 from public.decks
      where decks.id = image_hotspots.deck_id
        and decks.user_id = auth.uid()
    )
  );
