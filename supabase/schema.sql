-- ═══════════════════════════════════════════════════════════════════
-- NEW ALMAKKA FACTORY (نیو المکہ فیکٹری) — Supabase schema
-- Paste this WHOLE file into: Supabase Dashboard → SQL Editor → Run (once)
-- Creates: all tables, relationships, indexes, RLS policies, realtime,
-- and seed data (marble types, sizes, app settings).
-- ═══════════════════════════════════════════════════════════════════

-- gen_random_uuid() helper (already available on Supabase, kept for safety)
create extension if not exists pgcrypto with schema extensions;

-- ─────────────────────────────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────────────────────────────

-- Customers / suppliers (گاہک / سپلائر)
create table if not exists public.customers (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  phone           text,
  address_note    text,
  type            text not null default 'customer',   -- customer | supplier | both
  opening_balance numeric default 0,
  notes           text,
  created_at      timestamptz not null default now()
);

-- Invoices (بل)
create table if not exists public.invoices (
  id             uuid primary key default gen_random_uuid(),
  invoice_no     text not null,
  invoice_date   date not null default current_date,
  customer_id    uuid references public.customers(id) on delete set null,
  customer_name  text,
  customer_phone text,
  sub_total      numeric default 0,
  total          numeric default 0,
  received       numeric default 0,
  remaining      numeric default 0,
  payment_mode   text,
  notes          text,
  created_at     timestamptz not null default now()
);

-- Invoice line items
create table if not exists public.invoice_items (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references public.invoices(id) on delete cascade,
  quantity    numeric default 1,
  description text,
  size_label  text,
  square_feet numeric default 0,
  rate        numeric default 0,
  amount      numeric default 0
);

-- Customer / supplier ledger (ادھار، جمع، خریداری، فروخت، ادائیگی)
create table if not exists public.ledger_entries (
  id          uuid primary key default gen_random_uuid(),
  party_id    uuid references public.customers(id) on delete cascade,
  party_name  text,
  entry_date  date not null default current_date,
  kind        text not null,               -- udhaar | jama | kharid | farokht | payment
  amount      numeric not null default 0,
  description text,
  invoice_id  uuid references public.invoices(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- Labour (لیبر)
create table if not exists public.labour (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  phone           text,
  category        text not null default 'helper', -- mistri | helper | polish | cutting | loading | other
  custom_category text,
  daily_wage      numeric default 0,
  join_date       date,
  active          boolean not null default true,
  notes           text,
  created_at      timestamptz not null default now()
);

-- Attendance (حاضری)
create table if not exists public.attendance (
  id              uuid primary key default gen_random_uuid(),
  labour_id       uuid not null references public.labour(id) on delete cascade,
  labour_name     text,
  attendance_date date not null default current_date,
  status          text not null default 'present', -- present | absent | half | leave
  overtime_hours  numeric default 0,
  note            text,
  created_at      timestamptz not null default now()
);

-- Wage payments (اجرتیں)
create table if not exists public.wage_payments (
  id           uuid primary key default gen_random_uuid(),
  labour_id    uuid not null references public.labour(id) on delete cascade,
  labour_name  text,
  payment_date date not null default current_date,
  amount       numeric not null default 0,
  period_from  date,
  period_to    date,
  note         text,
  created_at   timestamptz not null default now()
);

-- Machinery (مشینیں)
create table if not exists public.machinery (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  type         text not null default 'other', -- cutter | polisher | grinder | tractor | other
  custom_type  text,
  model        text,
  status       text not null default 'working', -- working | repair | idle
  purchase_date date,
  cost         numeric default 0,
  notes        text,
  created_at   timestamptz not null default now()
);

-- Machinery maintenance log (مرمت)
create table if not exists public.machinery_maintenance (
  id          uuid primary key default gen_random_uuid(),
  machine_id  uuid not null references public.machinery(id) on delete cascade,
  log_date    date not null default current_date,
  description text,
  cost        numeric default 0
);

-- Marble types (ماربل کی اقسام)
create table if not exists public.marble_types (
  id         uuid primary key default gen_random_uuid(),
  name_ur    text not null,
  name_en    text not null unique,
  color_name text,
  color_hex  text default '#94a3b8',
  cuts       text[] default '{}',
  notes      text,
  created_at timestamptz not null default now()
);

-- Marble sizes (ماربل کے سائز)
create table if not exists public.marble_sizes (
  id        uuid primary key default gen_random_uuid(),
  label     text not null unique,
  length_in numeric,
  width_in  numeric,
  unit      text not null default 'inch', -- inch | feet
  is_custom boolean not null default false,
  notes     text
);

-- Stock (اسٹاک)
create table if not exists public.stock (
  id              uuid primary key default gen_random_uuid(),
  marble_type_id  uuid references public.marble_types(id) on delete set null,
  marble_type_name text,
  size_id         uuid references public.marble_sizes(id) on delete set null,
  size_label      text,
  color           text,
  quantity        numeric default 0,
  square_feet     numeric default 0,
  rate_per_sqft   numeric default 0,
  location_note   text,
  updated_at      timestamptz not null default now()
);

-- Expenses (خرچے)
create table if not exists public.expenses (
  id              uuid primary key default gen_random_uuid(),
  expense_date    date not null default current_date,
  category        text not null default 'other', -- bijli | diesel | transport | repair | khana | other
  custom_category text,
  amount          numeric not null default 0,
  description     text,
  created_at      timestamptz not null default now()
);

-- App settings (single fixed row, id = 'app')
create table if not exists public.app_settings (
  id                text primary key default 'app',
  lang              text not null default 'ur',
  theme             text not null default 'light',
  default_rate_mode text not null default 'sqft',  -- sqft | qty
  invoice_prefix    text not null default 'AF',
  next_invoice_no   int not null default 1,
  show_bubbles      boolean not null default true,
  currency_label    text not null default 'روپے'
);

-- ─────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────
create index if not exists invoices_date_idx          on public.invoices (invoice_date desc);
create index if not exists invoices_customer_idx      on public.invoices (customer_id);
create index if not exists invoice_items_invoice_idx  on public.invoice_items (invoice_id);
create index if not exists ledger_party_idx           on public.ledger_entries (party_id);
create index if not exists ledger_date_idx            on public.ledger_entries (entry_date desc);
create index if not exists attendance_date_idx        on public.attendance (attendance_date desc);
create unique index if not exists attendance_labour_date_uidx on public.attendance (labour_id, attendance_date);
create index if not exists wage_payments_labour_idx   on public.wage_payments (labour_id);
create index if not exists maintenance_machine_idx    on public.machinery_maintenance (machine_id);
create index if not exists stock_type_idx             on public.stock (marble_type_id);
create index if not exists expenses_date_idx          on public.expenses (expense_date desc);

-- ─────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY — only signed-in users may read/write
-- ─────────────────────────────────────────────────────────────────────
alter table public.customers             enable row level security;
alter table public.invoices              enable row level security;
alter table public.invoice_items         enable row level security;
alter table public.ledger_entries        enable row level security;
alter table public.labour                enable row level security;
alter table public.attendance            enable row level security;
alter table public.wage_payments         enable row level security;
alter table public.machinery             enable row level security;
alter table public.machinery_maintenance enable row level security;
alter table public.marble_types          enable row level security;
alter table public.marble_sizes          enable row level security;
alter table public.stock                 enable row level security;
alter table public.expenses              enable row level security;
alter table public.app_settings          enable row level security;

drop policy if exists "authenticated full access" on public.customers;
create policy "authenticated full access" on public.customers
  for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access" on public.invoices;
create policy "authenticated full access" on public.invoices
  for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access" on public.invoice_items;
create policy "authenticated full access" on public.invoice_items
  for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access" on public.ledger_entries;
create policy "authenticated full access" on public.ledger_entries
  for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access" on public.labour;
create policy "authenticated full access" on public.labour
  for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access" on public.attendance;
create policy "authenticated full access" on public.attendance
  for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access" on public.wage_payments;
create policy "authenticated full access" on public.wage_payments
  for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access" on public.machinery;
create policy "authenticated full access" on public.machinery
  for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access" on public.machinery_maintenance;
create policy "authenticated full access" on public.machinery_maintenance
  for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access" on public.marble_types;
create policy "authenticated full access" on public.marble_types
  for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access" on public.marble_sizes;
create policy "authenticated full access" on public.marble_sizes
  for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access" on public.stock;
create policy "authenticated full access" on public.stock
  for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access" on public.expenses;
create policy "authenticated full access" on public.expenses
  for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access" on public.app_settings;
create policy "authenticated full access" on public.app_settings
  for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────────────
-- REALTIME — so every screen updates live on all devices
-- ─────────────────────────────────────────────────────────────────────
do $$ begin alter publication supabase_realtime add table public.customers;             exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.invoices;              exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.invoice_items;         exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.ledger_entries;        exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.labour;                exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.attendance;            exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.wage_payments;         exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.machinery;             exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.machinery_maintenance; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.marble_types;          exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.marble_sizes;          exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.stock;                 exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.expenses;              exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.app_settings;          exception when others then null; end $$;

-- ─────────────────────────────────────────────────────────────────────
-- SEED DATA (runs cleanly once; safe to re-run)
-- ─────────────────────────────────────────────────────────────────────
insert into public.marble_types (name_ur, name_en, color_name, color_hex, cuts) values
  ('سبز ماربل',   'Ziarat Green',  'سبز',   '#0e9f6e', array['سلیب','ٹائل']),
  ('سفید ماربل',  'White Marble',  'سفید',  '#e5e7eb', array['سلیب','ٹائل']),
  ('بدل ماربل',   'Badal Marble',  'خاکی',  '#b8a89a', array['سلیب','پتی']),
  ('ٹراورٹائن',   'Travertine',    'ہلکی',  '#d8c3a5', array['سلیب','بارڈر']),
  ('گرینائٹ',     'Granite',       'سیاہ',  '#374151', array['سلیب','چوکھٹ']),
  ('اونکس',       'Onyx',          'ہرا',   '#a3b18a', array['سلیب','سیڑھی'])
on conflict (name_en) do nothing;

insert into public.marble_sizes (label, length_in, width_in, unit) values
  ('12x12',    12, 12, 'inch'),
  ('24x12',    24, 12, 'inch'),
  ('24x24',    24, 24, 'inch'),
  ('12x24',    12, 24, 'inch'),
  ('18x18',    18, 18, 'inch'),
  ('36x24',    36, 24, 'inch'),
  ('48x24',    48, 24, 'inch'),
  ('36x36',    36, 36, 'inch'),
  ('پتی 4x24',  4, 24, 'inch'),
  ('پتی 6x24',  6, 24, 'inch')
on conflict (label) do nothing;

insert into public.app_settings (id, lang, theme, default_rate_mode, invoice_prefix, next_invoice_no, show_bubbles, currency_label)
values ('app', 'ur', 'light', 'sqft', 'AF', 1, true, 'روپے')
on conflict (id) do nothing;
