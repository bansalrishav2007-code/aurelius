-- Aurelius initial schema (run in Supabase SQL Editor)

create table if not exists users (
  id uuid references auth.users primary key,
  email text unique not null,
  full_name text,
  phone text,
  member_number text unique,
  tier text default 'principal',
  member_since timestamptz default now(),
  invite_code text unique,
  created_at timestamptz default now()
);

create table if not exists assets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  name text not null,
  category text not null,
  value numeric not null,
  original_value numeric,
  date_added date default current_date,
  notes text,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create table if not exists liabilities (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  name text not null,
  type text not null,
  original_amount numeric,
  outstanding_amount numeric,
  date_added date default current_date,
  notes text,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create table if not exists documents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  name text not null,
  category text,
  file_path text,
  file_size integer,
  file_type text,
  status text default 'received',
  ai_summary text,
  created_at timestamptz default now()
);

create table if not exists goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  title text not null,
  category text,
  target_amount numeric,
  current_amount numeric default 0,
  target_date date,
  priority text default 'medium',
  status text default 'active',
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create table if not exists ai_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  title text,
  messages jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists legal_entities (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  name text not null,
  type text not null,
  role text,
  shareholding numeric,
  valuation numeric,
  compliance_status text default 'compliant',
  created_at timestamptz default now()
);

create table if not exists tax_calculations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  financial_year text,
  income_data jsonb,
  deductions_data jsonb,
  tds_data jsonb,
  old_regime_tax numeric,
  new_regime_tax numeric,
  recommended_regime text,
  created_at timestamptz default now()
);

create table if not exists wealth_snapshots (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  net_worth numeric,
  total_assets numeric,
  total_liabilities numeric,
  snapshot_date timestamptz default now()
);

create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  title text not null,
  message text,
  type text,
  read boolean default false,
  created_at timestamptz default now()
);

create table if not exists bookings (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references users(id),
  expert_id uuid,
  service_type text,
  status text default 'pending',
  booking_date timestamptz,
  duration_minutes integer,
  agenda text,
  meeting_room_url text,
  created_at timestamptz default now()
);

create table if not exists audit_log (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id),
  action text,
  details jsonb,
  ip_address text,
  created_at timestamptz default now()
);

create index if not exists idx_assets_user_id on assets(user_id);
create index if not exists idx_liabilities_user_id on liabilities(user_id);
create index if not exists idx_documents_user_id on documents(user_id);
create index if not exists idx_goals_user_id on goals(user_id);
create index if not exists idx_notifications_user_id on notifications(user_id);
