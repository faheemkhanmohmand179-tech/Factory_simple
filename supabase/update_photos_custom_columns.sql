-- ═══════════════════════════════════════════════════════════════════
-- NEW ALMAKKA FACTORY — UPDATE SQL (photos + custom columns everywhere)
-- ▶ Run this WHOLE file in: Supabase Dashboard → SQL Editor → Run
-- ▶ Safe to run again and again (it never duplicates or breaks)
-- ▶ This adds: photo columns on every table, the custom-columns table
--   used by Settings, and the product-photos storage bucket.
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1) PHOTO + CUSTOM-FIELD COLUMNS on every data table
--    photo_urls     = list of uploaded photo links (Supabase Storage)
--    custom_fields  = values for the manual columns added in Settings
-- ─────────────────────────────────────────────────────────────────────
alter table public.stock         add column if not exists photo_urls text[] default '{}';
alter table public.stock         add column if not exists custom_fields jsonb default '{}'::jsonb;

alter table public.customers     add column if not exists photo_urls text[] default '{}';
alter table public.customers     add column if not exists custom_fields jsonb default '{}'::jsonb;

alter table public.labour        add column if not exists photo_urls text[] default '{}';
alter table public.labour        add column if not exists custom_fields jsonb default '{}'::jsonb;

alter table public.machinery     add column if not exists photo_urls text[] default '{}';
alter table public.machinery     add column if not exists custom_fields jsonb default '{}'::jsonb;

alter table public.expenses      add column if not exists photo_urls text[] default '{}';
alter table public.expenses      add column if not exists custom_fields jsonb default '{}'::jsonb;

alter table public.marble_types  add column if not exists photo_urls text[] default '{}';
alter table public.marble_types  add column if not exists custom_fields jsonb default '{}'::jsonb;

alter table public.marble_sizes  add column if not exists photo_urls text[] default '{}';
alter table public.marble_sizes  add column if not exists custom_fields jsonb default '{}'::jsonb;

alter table public.invoices      add column if not exists photo_urls text[] default '{}';

-- ─────────────────────────────────────────────────────────────────────
-- 2) custom_columns — the manually-added columns defined in Settings
--    (table_name is one of: stock, customers, labour, machinery,
--     expenses, marble_types, marble_sizes, invoices)
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.custom_columns (
  id          uuid primary key default gen_random_uuid(),
  table_name  text not null,
  key         text not null,
  label_ur    text not null,
  label_en    text not null,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  unique (table_name, key)
);

alter table public.custom_columns enable row level security;
drop policy if exists "authenticated full access" on public.custom_columns;
create policy "authenticated full access" on public.custom_columns
  for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

do $$ begin alter publication supabase_realtime add table public.custom_columns; exception when others then null; end $$;

-- ─────────────────────────────────────────────────────────────────────
-- 3) STORAGE bucket for the photos (public read, logged-in upload)
-- ─────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('product-photos', 'product-photos', true)
on conflict (id) do nothing;

drop policy if exists "product photos: public read" on storage.objects;
create policy "product photos: public read"
  on storage.objects for select
  using (bucket_id = 'product-photos');

drop policy if exists "product photos: authenticated upload" on storage.objects;
create policy "product photos: authenticated upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-photos');

drop policy if exists "product photos: authenticated update" on storage.objects;
create policy "product photos: authenticated update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-photos');

drop policy if exists "product photos: authenticated delete" on storage.objects;
create policy "product photos: authenticated delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-photos');

-- ✅ Done. The app now supports photos and manual columns on every page.
