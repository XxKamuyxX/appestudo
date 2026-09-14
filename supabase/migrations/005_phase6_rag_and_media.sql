-- Fase 6: RAG (pgvector), imagens, plano de estudo

create extension if not exists vector;

-- Chunks com embedding
create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks (id) on delete cascade,
  source_file_id uuid not null references public.source_files (id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  page integer,
  embedding vector(768),
  created_at timestamptz not null default now()
);

create index if not exists document_chunks_deck_id_idx
  on public.document_chunks (deck_id);

create index if not exists document_chunks_source_file_id_idx
  on public.document_chunks (source_file_id);

alter table public.document_chunks enable row level security;

create policy "document_chunks_select_own"
  on public.document_chunks for select
  using (
    exists (
      select 1 from public.decks
      where decks.id = document_chunks.deck_id
        and decks.user_id = auth.uid()
    )
  );

create policy "document_chunks_insert_own"
  on public.document_chunks for insert
  with check (
    exists (
      select 1 from public.decks
      where decks.id = document_chunks.deck_id
        and decks.user_id = auth.uid()
    )
  );

create policy "document_chunks_delete_own"
  on public.document_chunks for delete
  using (
    exists (
      select 1 from public.decks
      where decks.id = document_chunks.deck_id
        and decks.user_id = auth.uid()
    )
  );

-- Busca por similaridade
create or replace function public.match_document_chunks(
  query_embedding vector(768),
  match_deck_id uuid,
  match_count integer default 6
)
returns table (
  id uuid,
  deck_id uuid,
  source_file_id uuid,
  content text,
  page integer,
  similarity float
)
language sql
stable
as $$
  select
    dc.id,
    dc.deck_id,
    dc.source_file_id,
    dc.content,
    dc.page,
    1 - (dc.embedding <=> query_embedding) as similarity
  from public.document_chunks dc
  where dc.deck_id = match_deck_id
    and dc.embedding is not null
    and exists (
      select 1 from public.decks d
      where d.id = dc.deck_id and d.user_id = auth.uid()
    )
  order by dc.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

-- Imagens extraídas do PDF
create table if not exists public.source_images (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks (id) on delete cascade,
  source_file_id uuid not null references public.source_files (id) on delete cascade,
  page integer,
  storage_path text,
  public_url text not null,
  width integer,
  height integer,
  label text,
  label_hint text,
  created_at timestamptz not null default now()
);

create index if not exists source_images_deck_id_idx
  on public.source_images (deck_id);

alter table public.source_images enable row level security;

create policy "source_images_select_own"
  on public.source_images for select
  using (
    exists (
      select 1 from public.decks
      where decks.id = source_images.deck_id
        and decks.user_id = auth.uid()
    )
  );

create policy "source_images_insert_own"
  on public.source_images for insert
  with check (
    exists (
      select 1 from public.decks
      where decks.id = source_images.deck_id
        and decks.user_id = auth.uid()
    )
  );

create policy "source_images_update_own"
  on public.source_images for update
  using (
    exists (
      select 1 from public.decks
      where decks.id = source_images.deck_id
        and decks.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.decks
      where decks.id = source_images.deck_id
        and decks.user_id = auth.uid()
    )
  );

create policy "source_images_delete_own"
  on public.source_images for delete
  using (
    exists (
      select 1 from public.decks
      where decks.id = source_images.deck_id
        and decks.user_id = auth.uid()
    )
  );

-- Plano de estudo
create table if not exists public.study_plans (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks (id) on delete cascade,
  title text not null,
  summary text,
  created_at timestamptz not null default now(),
  unique (deck_id)
);

alter table public.study_plans enable row level security;

create policy "study_plans_select_own"
  on public.study_plans for select
  using (
    exists (
      select 1 from public.decks
      where decks.id = study_plans.deck_id
        and decks.user_id = auth.uid()
    )
  );

create policy "study_plans_insert_own"
  on public.study_plans for insert
  with check (
    exists (
      select 1 from public.decks
      where decks.id = study_plans.deck_id
        and decks.user_id = auth.uid()
    )
  );

create policy "study_plans_update_own"
  on public.study_plans for update
  using (
    exists (
      select 1 from public.decks
      where decks.id = study_plans.deck_id
        and decks.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.decks
      where decks.id = study_plans.deck_id
        and decks.user_id = auth.uid()
    )
  );

create policy "study_plans_delete_own"
  on public.study_plans for delete
  using (
    exists (
      select 1 from public.decks
      where decks.id = study_plans.deck_id
        and decks.user_id = auth.uid()
    )
  );

create table if not exists public.study_lessons (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.study_plans (id) on delete cascade,
  deck_id uuid not null references public.decks (id) on delete cascade,
  sort_order integer not null default 0,
  title text not null,
  explanation_simple text not null,
  technical_term text,
  activity_prompt text not null,
  activity_answer text,
  practical_odontology text not null,
  status text not null default 'pending'
    check (status in ('pending', 'done')),
  created_at timestamptz not null default now()
);

create index if not exists study_lessons_plan_id_idx
  on public.study_lessons (plan_id);

alter table public.study_lessons enable row level security;

create policy "study_lessons_select_own"
  on public.study_lessons for select
  using (
    exists (
      select 1 from public.decks
      where decks.id = study_lessons.deck_id
        and decks.user_id = auth.uid()
    )
  );

create policy "study_lessons_insert_own"
  on public.study_lessons for insert
  with check (
    exists (
      select 1 from public.decks
      where decks.id = study_lessons.deck_id
        and decks.user_id = auth.uid()
    )
  );

create policy "study_lessons_update_own"
  on public.study_lessons for update
  using (
    exists (
      select 1 from public.decks
      where decks.id = study_lessons.deck_id
        and decks.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.decks
      where decks.id = study_lessons.deck_id
        and decks.user_id = auth.uid()
    )
  );

create policy "study_lessons_delete_own"
  on public.study_lessons for delete
  using (
    exists (
      select 1 from public.decks
      where decks.id = study_lessons.deck_id
        and decks.user_id = auth.uid()
    )
  );

-- Storage bucket para imagens (público de leitura; escrita autenticada)
insert into storage.buckets (id, name, public)
values ('source-images', 'source-images', true)
on conflict (id) do nothing;

drop policy if exists "source_images_storage_select" on storage.objects;
drop policy if exists "source_images_storage_insert" on storage.objects;
drop policy if exists "source_images_storage_update" on storage.objects;
drop policy if exists "source_images_storage_delete" on storage.objects;

create policy "source_images_storage_select"
  on storage.objects for select
  using (bucket_id = 'source-images');

create policy "source_images_storage_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'source-images'
    and auth.role() = 'authenticated'
  );

create policy "source_images_storage_update"
  on storage.objects for update
  using (
    bucket_id = 'source-images'
    and auth.role() = 'authenticated'
  );

create policy "source_images_storage_delete"
  on storage.objects for delete
  using (
    bucket_id = 'source-images'
    and auth.role() = 'authenticated'
  );

grant execute on function public.match_document_chunks(vector, uuid, integer) to authenticated;
grant execute on function public.match_document_chunks(vector, uuid, integer) to service_role;
