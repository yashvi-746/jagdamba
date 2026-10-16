-- Migration: Farmer Procurement, Daily Purchase, and Triplicate Billing Module
-- "Make differ section" requested in specification document

-- 1. Farmers Master
create table if not exists public.farmers (
  id uuid primary key default gen_random_uuid(),
  farmer_name text not null,
  village text not null,
  vehicle_number text,
  contact_number text,
  land_record text,
  aadhaar_card_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Buyers Master
create table if not exists public.buyers (
  id uuid primary key default gen_random_uuid(),
  buyer_name text not null,
  address text not null default 'Handod',
  created_at timestamptz not null default now()
);

-- Seed default buyer if none exists
insert into public.buyers (buyer_name, address)
values ('Shree Jagdamba Cotton G And P Factory', 'Handod')
on conflict do nothing;

-- 3. Cotton Daily Purchase (Fast Tabular Log)
create table if not exists public.daily_cotton_purchases (
  id uuid primary key default gen_random_uuid(),
  purchase_date date not null default current_date,
  sr_no integer,
  farmer_name text not null,
  village_name text not null,
  cotton_type text not null default 'S/6',
  weight numeric(12,2) not null check (weight > 0),
  rate numeric(12,2) not null check (rate > 0),
  amount numeric(14,2) not null,
  created_at timestamptz not null default now()
);

-- 4. Triplicate Farmer Bills
create sequence if not exists public.triplicate_bill_seq start 1001;
create table if not exists public.triplicate_bills (
  id uuid primary key default gen_random_uuid(),
  bill_number text unique not null default ('TB-' || nextval('public.triplicate_bill_seq')::text),
  farmer_id uuid references public.farmers(id) on delete set null,
  seller_name text not null,
  village_name text not null,
  bill_date date not null default current_date,
  bill_time text not null default to_char(current_time, 'HH12:MI AM'),
  commodity text not null default 'Kapash',
  cotton_type text not null default 'S/6',
  heap_number text not null default '1',
  gate_pass_number text not null default 'GP-01',
  gross_weight numeric(12,2) not null check (gross_weight >= 0),
  tare_weight numeric(12,2) not null check (tare_weight >= 0),
  net_weight numeric(12,2) not null check (net_weight > 0),
  rate numeric(12,2) not null check (rate > 0),
  gross_amount numeric(14,2) not null,
  labor_charges numeric(12,2) not null default 0,
  net_amount numeric(14,2) not null,
  payment_mode text not null check (payment_mode in ('CASH', 'DEBIT')),
  
  -- Cash payment currency drawer counts { "500": count, "200": count, ... }
  currency_drawer jsonb not null default '{}'::jsonb,
  
  -- Debit payment details
  due_date date,
  total_credit_days integer,
  cheque_number text,
  neft_reference text,
  bank_name text,
  
  status text not null default 'completed',
  created_at timestamptz not null default now()
);

-- 5. Indexes for fast reporting by heap and payment mode
create index if not exists triplicate_heap_date_idx on public.triplicate_bills(heap_number, bill_date);
create index if not exists triplicate_mode_date_idx on public.triplicate_bills(payment_mode, bill_date);
create index if not exists daily_purchases_date_idx on public.daily_cotton_purchases(purchase_date desc);
