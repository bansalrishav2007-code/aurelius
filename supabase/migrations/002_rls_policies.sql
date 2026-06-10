-- Row Level Security (run after 001_initial_schema.sql)

alter table users enable row level security;
alter table assets enable row level security;
alter table liabilities enable row level security;
alter table documents enable row level security;
alter table goals enable row level security;
alter table ai_sessions enable row level security;
alter table legal_entities enable row level security;
alter table tax_calculations enable row level security;
alter table wealth_snapshots enable row level security;
alter table notifications enable row level security;
alter table bookings enable row level security;
alter table audit_log enable row level security;

create policy "Users see own profile" on users for all using (auth.uid() = id);

create policy "Users see own assets" on assets for all using (auth.uid() = user_id);
create policy "Users see own liabilities" on liabilities for all using (auth.uid() = user_id);
create policy "Users see own documents" on documents for all using (auth.uid() = user_id);
create policy "Users see own goals" on goals for all using (auth.uid() = user_id);
create policy "Users see own ai_sessions" on ai_sessions for all using (auth.uid() = user_id);
create policy "Users see own entities" on legal_entities for all using (auth.uid() = user_id);
create policy "Users see own tax" on tax_calculations for all using (auth.uid() = user_id);
create policy "Users see own snapshots" on wealth_snapshots for all using (auth.uid() = user_id);
create policy "Users see own notifications" on notifications for all using (auth.uid() = user_id);
create policy "Users see own bookings" on bookings for all using (auth.uid() = client_id);
