-- Run in Supabase > SQL Editor
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  sap_profile_id text unique,
  role text not null default 'driver' check (role in ('driver','admin'))
);

create table orders (
  order_id text primary key,
  sap_profile_id text not null,
  work_date date not null,
  created_time text,
  completed_time text,
  distance numeric default 0,
  pay numeric default 0
);
create index orders_driver_day on orders (sap_profile_id, work_date);

alter table profiles enable row level security;
alter table orders enable row level security;

create function is_admin() returns boolean
language sql security definer stable as
$$ select exists (select 1 from profiles where id = auth.uid() and role = 'admin') $$;

create policy "read own profile" on profiles for select
  using (id = auth.uid() or is_admin());

create policy "drivers read own orders" on orders for select
  using (sap_profile_id = (select sap_profile_id from profiles where id = auth.uid()) or is_admin());
create policy "admin insert orders" on orders for insert with check (is_admin());
create policy "admin update orders" on orders for update using (is_admin());

-- AFTER creating a user in Authentication > Users, link them:
-- insert into profiles (id, full_name, sap_profile_id) values ('<user uuid>', 'Juan Dela Cruz', '<Sap Profile Id from CSV>');
-- Your own admin account:
-- insert into profiles (id, full_name, role) values ('<your user uuid>', 'Admin', 'admin');
