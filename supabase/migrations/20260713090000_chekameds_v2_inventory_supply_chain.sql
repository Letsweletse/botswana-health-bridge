-- ChekaMeds v2.0 additive national pharmaceutical inventory and supply chain expansion.
-- Non-destructive: creates new tables, indexes, triggers and RLS policies only.

create extension if not exists pgcrypto;

create table if not exists public.warehouses (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid,
  name text not null,
  region text,
  district text,
  warehouse_type text not null default 'medical_store',
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  medicine_name text not null,
  generic_name text,
  strength text,
  dosage_form text,
  pack_size text,
  atc_code text,
  primary_barcode text,
  minimum_stock integer not null default 0,
  maximum_stock integer not null default 0,
  safety_stock integer not null default 0,
  reorder_point integer not null default 0,
  lead_time_days integer not null default 0,
  economic_order_quantity integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.inventory_batches (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references public.inventory(id),
  batch_number text not null,
  expiry_date date not null,
  supplier text,
  purchase_price numeric(12,2) not null default 0,
  selling_price numeric(12,2) not null default 0,
  quantity integer not null default 0 check (quantity >= 0),
  barcode text,
  date_received date not null default current_date,
  warehouse_location text,
  warehouse_id uuid references public.warehouses(id),
  facility_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references public.inventory(id),
  batch_id uuid references public.inventory_batches(id),
  transaction_type text not null check (transaction_type in ('goods_received','goods_issued','stock_adjustment','damaged','expired','transfer','return')),
  quantity integer not null,
  facility_name text,
  warehouse_id uuid references public.warehouses(id),
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.stock_transfers (
  id uuid primary key default gen_random_uuid(),
  transfer_number text not null unique,
  from_facility_name text,
  to_facility_name text,
  from_warehouse_id uuid references public.warehouses(id),
  to_warehouse_id uuid references public.warehouses(id),
  status text not null default 'requested' check (status in ('requested','approved','allocated','in_transit','received','cancelled','failed')),
  requested_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  received_by uuid references auth.users(id),
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  shipped_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.transfer_items (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references public.stock_transfers(id),
  inventory_id uuid not null references public.inventory(id),
  batch_id uuid references public.inventory_batches(id),
  requested_quantity integer not null check (requested_quantity > 0),
  allocated_quantity integer not null default 0 check (allocated_quantity >= 0),
  received_quantity integer not null default 0 check (received_quantity >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number text not null unique,
  supplier_name text not null,
  facility_name text,
  warehouse_id uuid references public.warehouses(id),
  status text not null default 'draft' check (status in ('draft','pending','approved','ordered','partially_delivered','delivered','cancelled','closed')),
  total_amount numeric(14,2) not null default 0,
  requested_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  expected_delivery_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id),
  inventory_id uuid not null references public.inventory(id),
  quantity_ordered integer not null check (quantity_ordered > 0),
  quantity_received integer not null default 0 check (quantity_received >= 0),
  unit_price numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.goods_received (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid references public.purchase_orders(id),
  inventory_id uuid not null references public.inventory(id),
  batch_id uuid references public.inventory_batches(id),
  quantity integer not null check (quantity > 0),
  received_by uuid references auth.users(id),
  received_at timestamptz not null default now(),
  notes text
);

create table if not exists public.goods_issued (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references public.inventory(id),
  batch_id uuid references public.inventory_batches(id),
  quantity integer not null check (quantity > 0),
  issued_to text,
  issued_by uuid references auth.users(id),
  issued_at timestamptz not null default now(),
  notes text
);

create table if not exists public.warehouse_inventory (
  id uuid primary key default gen_random_uuid(),
  warehouse_id uuid not null references public.warehouses(id),
  inventory_id uuid not null references public.inventory(id),
  batch_id uuid references public.inventory_batches(id),
  quantity integer not null default 0 check (quantity >= 0),
  location_code text,
  updated_at timestamptz not null default now(),
  unique (warehouse_id, inventory_id, batch_id)
);

create table if not exists public.facility_inventory (
  id uuid primary key default gen_random_uuid(),
  facility_name text not null,
  inventory_id uuid not null references public.inventory(id),
  batch_id uuid references public.inventory_batches(id),
  quantity integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  unique (facility_name, inventory_id, batch_id)
);

create table if not exists public.inventory_alerts (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid references public.inventory(id),
  batch_id uuid references public.inventory_batches(id),
  facility_name text,
  warehouse_id uuid references public.warehouses(id),
  alert_type text not null check (alert_type in ('low_stock','critical_stock','out_of_stock','expiring_stock','expired_stock','failed_transfer','pending_order','delayed_delivery')),
  severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
  message text not null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.reorder_rules (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references public.inventory(id),
  facility_name text,
  warehouse_id uuid references public.warehouses(id),
  minimum_stock integer not null default 0,
  maximum_stock integer not null default 0,
  safety_stock integer not null default 0,
  reorder_point integer not null default 0,
  lead_time_days integer not null default 0,
  economic_order_quantity integer,
  preferred_supplier text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.consumption_history (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references public.inventory(id),
  facility_name text,
  warehouse_id uuid references public.warehouses(id),
  period_date date not null,
  daily_usage numeric(12,2) not null default 0,
  weekly_usage numeric(12,2) not null default 0,
  monthly_usage numeric(12,2) not null default 0,
  quarterly_usage numeric(12,2) not null default 0,
  annual_usage numeric(12,2) not null default 0,
  rolling_average numeric(12,2) not null default 0,
  seasonal_trend numeric(12,2),
  created_at timestamptz not null default now()
);

create table if not exists public.forecast_history (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references public.inventory(id),
  facility_name text,
  warehouse_id uuid references public.warehouses(id),
  forecast_date date not null default current_date,
  forecast_quantity numeric(12,2) not null default 0,
  estimated_stockout_date date,
  suggested_reorder_quantity integer not null default 0,
  model_version text not null default 'rules-v1',
  created_at timestamptz not null default now()
);

create table if not exists public.expiry_tracking (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references public.inventory(id),
  batch_id uuid not null references public.inventory_batches(id),
  expiry_date date not null,
  quantity_at_risk integer not null default 0,
  status text not null default 'active' check (status in ('active','expiring_soon','expired','disposed','returned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supplier_catalogue (
  id uuid primary key default gen_random_uuid(),
  supplier_name text not null,
  inventory_id uuid not null references public.inventory(id),
  barcode text,
  unit_price numeric(12,2) not null default 0,
  lead_time_days integer not null default 0,
  is_preferred boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  facility_name text,
  action text not null,
  entity text not null,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  device text,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  facility_name text,
  channel text not null default 'dashboard' check (channel in ('dashboard','email','sms','push')),
  title text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.cms_dashboard_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null unique,
  payload jsonb not null default '{}'::jsonb,
  refreshed_at timestamptz not null default now()
);

create index if not exists idx_inventory_barcode on public.inventory(primary_barcode) where deleted_at is null;
create index if not exists idx_inventory_batches_barcode on public.inventory_batches(barcode) where deleted_at is null;
create unique index if not exists idx_inventory_batches_unique_scope on public.inventory_batches(inventory_id, batch_number, coalesce(warehouse_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(facility_name, '')) where deleted_at is null;
create unique index if not exists idx_reorder_rules_unique_scope on public.reorder_rules(inventory_id, coalesce(facility_name, ''), coalesce(warehouse_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists idx_inventory_batches_expiry on public.inventory_batches(expiry_date, quantity) where deleted_at is null;
create index if not exists idx_inventory_transactions_lookup on public.inventory_transactions(inventory_id, created_at desc) where deleted_at is null;
create index if not exists idx_stock_transfers_status on public.stock_transfers(status, created_at desc) where deleted_at is null;
create index if not exists idx_purchase_orders_status on public.purchase_orders(status, created_at desc) where deleted_at is null;
create index if not exists idx_alerts_open on public.inventory_alerts(alert_type, severity, created_at desc) where resolved_at is null;
create index if not exists idx_audit_logs_entity on public.audit_logs(entity, entity_id, created_at desc);

alter table public.warehouses enable row level security;
alter table public.inventory enable row level security;
alter table public.inventory_batches enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.stock_transfers enable row level security;
alter table public.transfer_items enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;
alter table public.goods_received enable row level security;
alter table public.goods_issued enable row level security;
alter table public.warehouse_inventory enable row level security;
alter table public.facility_inventory enable row level security;
alter table public.inventory_alerts enable row level security;
alter table public.reorder_rules enable row level security;
alter table public.consumption_history enable row level security;
alter table public.forecast_history enable row level security;
alter table public.expiry_tracking enable row level security;
alter table public.supplier_catalogue enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.cms_dashboard_cache enable row level security;

create policy "authenticated users can view v2 inventory tables" on public.inventory for select to authenticated using (deleted_at is null);
create policy "authenticated users can view v2 batches" on public.inventory_batches for select to authenticated using (deleted_at is null);
create policy "authenticated users can view warehouses" on public.warehouses for select to authenticated using (deleted_at is null);
create policy "authenticated users can view transactions" on public.inventory_transactions for select to authenticated using (deleted_at is null);
create policy "authenticated users can view transfers" on public.stock_transfers for select to authenticated using (deleted_at is null);
create policy "authenticated users can view transfer items" on public.transfer_items for select to authenticated using (true);
create policy "authenticated users can view purchase orders" on public.purchase_orders for select to authenticated using (deleted_at is null);
create policy "authenticated users can view purchase items" on public.purchase_order_items for select to authenticated using (true);
create policy "authenticated users can view goods received" on public.goods_received for select to authenticated using (true);
create policy "authenticated users can view goods issued" on public.goods_issued for select to authenticated using (true);
create policy "authenticated users can view warehouse inventory" on public.warehouse_inventory for select to authenticated using (true);
create policy "authenticated users can view facility inventory" on public.facility_inventory for select to authenticated using (true);
create policy "authenticated users can view alerts" on public.inventory_alerts for select to authenticated using (true);
create policy "authenticated users can view reorder rules" on public.reorder_rules for select to authenticated using (true);
create policy "authenticated users can view consumption" on public.consumption_history for select to authenticated using (true);
create policy "authenticated users can view forecasts" on public.forecast_history for select to authenticated using (true);
create policy "authenticated users can view expiry" on public.expiry_tracking for select to authenticated using (true);
create policy "authenticated users can view supplier catalogue" on public.supplier_catalogue for select to authenticated using (is_active = true);
create policy "users can view their notifications" on public.notifications for select to authenticated using (user_id = auth.uid() or user_id is null);
create policy "authenticated users can view cms cache" on public.cms_dashboard_cache for select to authenticated using (true);
create policy "authenticated users can insert audit logs" on public.audit_logs for insert to authenticated with check (true);
create policy "authenticated users can view audit logs" on public.audit_logs for select to authenticated using (true);
