-- Run this short query once in Supabase SQL Editor:
alter table public.contracts add column if not exists broker_name text;
alter table public.contracts add column if not exists broker_contact_number text;
alter table public.contracts add column if not exists brokerage_terms text;
