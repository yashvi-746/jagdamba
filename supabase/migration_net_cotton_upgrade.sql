-- Net Cotton System Upgrade Migration
-- Run this in your Supabase SQL Editor to support Cotton Bales, PR No, Lot No, Rate Per Candy, and Driver Contact No.

-- 1. Commodity Check: Allow both 'COTTON BALES' and 'COTTON SEED', default to 'COTTON BALES'
alter table public.contracts drop constraint if exists contracts_commodity_check;
alter table public.contracts alter column commodity set default 'COTTON BALES';
alter table public.contracts add constraint contracts_commodity_check 
  check (commodity in ('COTTON BALES', 'COTTON SEED'));

-- 2. Add PR Number and Lot Number to contracts
alter table public.contracts add column if not exists pr_number text;
alter table public.contracts add column if not exists lot_number text;

-- 3. Add Rate per Candy, Quantity Bales, and Rate Unit to contracts
alter table public.contracts add column if not exists rate_per_candy numeric(14,2);
alter table public.contracts add column if not exists quantity_bales integer;
alter table public.contracts add column if not exists rate_unit text default 'candy';

-- 4. Add Broker fields if not already present
alter table public.contracts add column if not exists broker_person_name text;
alter table public.contracts add column if not exists broker_firm_name text;
alter table public.contracts add column if not exists broker_name text;
alter table public.contracts add column if not exists broker_contact_number text;
alter table public.contracts add column if not exists brokerage_calc_type text default 'per_quintal';
alter table public.contracts add column if not exists brokerage_rate numeric(14,2);
alter table public.contracts add column if not exists brokerage_total numeric(14,2);
alter table public.contracts add column if not exists brokerage_terms text;
alter table public.contracts add column if not exists brokerage_paid_by text default 'buyer';

-- 5. Add Driver Contact Number to loading_details
alter table public.loading_details add column if not exists driver_contact_number text;

-- 6. Indexing for fast search
create index if not exists contracts_pr_lot_idx on public.contracts(pr_number, lot_number);
