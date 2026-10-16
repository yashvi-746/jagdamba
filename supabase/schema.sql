-- SeedLedger — Cotton Seed Contract Management
-- Fresh-project schema. Run once in Supabase SQL Editor as project owner.
-- Do not expose the service_role key in the browser.
create extension if not exists pgcrypto;
do $$ begin create type public.contract_status as enum ('draft','pending','confirmed','loading','completed'); exception when duplicate_object then null; end $$;
do $$ begin create type public.packing_type as enum ('LOOSE','BAGS'); exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '', role text not null default 'staff' check (role in ('admin','staff')),
 created_at timestamptz not null default now()
);
create table if not exists public.parties (
 id uuid primary key default gen_random_uuid(), name text not null, gst_number text, address text, contact_number text,
 created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.contracts (
 id uuid primary key default gen_random_uuid(), contract_number text unique,
 contract_date date not null default current_date,
 party_name text not null, gst_number text, party_address text, contact_number text,
 buyer_name text, buyer_gst_number text, buyer_address text, buyer_contact_number text,
 seller_name text, seller_gst_number text, seller_address text, seller_contact_number text,
 quantity_quintals numeric(14,2) not null check (quantity_quintals > 0),
 commodity text not null default 'COTTON SEED' check (commodity = 'COTTON SEED'),
 delivery_condition text not null, payment_condition text not null,
 rate_per_quintal numeric(14,2) not null check (rate_per_quintal >= 0),
 packing_type public.packing_type not null default 'LOOSE', delivery_address text not null,
 status public.contract_status not null default 'draft',
 confirmation_prepared_at timestamptz, confirmation_channel text check (confirmation_channel in ('email','whatsapp','manual') or confirmation_channel is null),
 buyer_signed_at timestamptz, seller_signed_at timestamptz, broker_signed_at timestamptz,
 created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.loading_details (
 id uuid primary key default gen_random_uuid(), contract_id uuid not null unique references public.contracts(id) on delete cascade,
 vehicle_number text not null, net_weight_quintals numeric(14,2) not null check (net_weight_quintals > 0),
 driver_license_number text not null, transport_number text, transport_name text not null, lr_number text not null,
 created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create sequence if not exists public.contract_number_seq start 1;
create sequence if not exists public.gate_pass_number_seq start 1;
create table if not exists public.gate_passes (
 id uuid primary key default gen_random_uuid(),
 gate_pass_number text unique not null default ('GP-' || to_char(current_date,'YYYY') || '-' || lpad(nextval('public.gate_pass_number_seq')::text,5,'0')),
 contract_id uuid not null references public.contracts(id) on delete restrict,
 loading_detail_id uuid not null references public.loading_details(id) on delete restrict,
 storage_path text, created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.contract_documents (
 id uuid primary key default gen_random_uuid(), contract_id uuid not null references public.contracts(id) on delete cascade,
 gate_pass_id uuid references public.gate_passes(id) on delete cascade,
 document_type text not null check (document_type in ('contract_pdf','signed_contract','gate_pass_pdf')),
 storage_path text not null, file_name text not null, uploaded_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.audit_logs (
 id uuid primary key default gen_random_uuid(), entity_type text not null check (entity_type in ('contract','loading','gate_pass','document')),
 entity_id uuid not null, action text not null, details jsonb not null default '{}'::jsonb,
 actor_id uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now()
);
-- Upgrade-safe additions for an existing SeedLedger database.
alter table public.contracts add column if not exists buyer_name text;
alter table public.contracts add column if not exists buyer_gst_number text;
alter table public.contracts add column if not exists buyer_address text;
alter table public.contracts add column if not exists buyer_contact_number text;
alter table public.contracts add column if not exists seller_name text;
alter table public.contracts add column if not exists seller_gst_number text;
alter table public.contracts add column if not exists seller_address text;
alter table public.contracts add column if not exists seller_contact_number text;
alter table public.contracts add column if not exists confirmation_prepared_at timestamptz;
alter table public.contracts add column if not exists confirmation_channel text;
alter table public.contracts add column if not exists buyer_signed_at timestamptz;
alter table public.contracts add column if not exists seller_signed_at timestamptz;
alter table public.contracts add column if not exists broker_signed_at timestamptz;
alter table public.gate_passes add column if not exists storage_path text;
alter table public.contract_documents add column if not exists gate_pass_id uuid references public.gate_passes(id) on delete cascade;
alter table public.contract_documents add column if not exists file_name text not null default 'document.pdf';
alter table public.contract_documents drop constraint if exists contract_documents_document_type_check;
alter table public.contract_documents add constraint contract_documents_document_type_check check (document_type in ('contract_pdf','signed_contract','gate_pass_pdf'));

create index if not exists contracts_date_idx on public.contracts(contract_date desc);
create index if not exists contracts_status_idx on public.contracts(status);
create index if not exists loading_details_contract_idx on public.loading_details(contract_id);
create index if not exists gate_passes_contract_idx on public.gate_passes(contract_id);
create unique index if not exists gate_passes_loading_unique_idx on public.gate_passes(loading_detail_id);
create index if not exists contract_documents_contract_idx on public.contract_documents(contract_id);
create index if not exists audit_logs_entity_idx on public.audit_logs(entity_type,entity_id,created_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end; $$;
drop trigger if exists parties_updated_at on public.parties;
create trigger parties_updated_at before update on public.parties for each row execute function public.set_updated_at();
drop trigger if exists contracts_updated_at on public.contracts;
create trigger contracts_updated_at before update on public.contracts for each row execute function public.set_updated_at();
drop trigger if exists loading_details_updated_at on public.loading_details;
create trigger loading_details_updated_at before update on public.loading_details for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id,full_name,role) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),'staff') on conflict(id) do nothing; return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
create or replace function public.assign_contract_number() returns trigger language plpgsql as $$
begin if new.contract_number is null or btrim(new.contract_number)='' then new.contract_number:='CS-'||to_char(coalesce(new.contract_date,current_date),'YYYY')||'-'||lpad(nextval('public.contract_number_seq')::text,5,'0'); end if; return new; end; $$;
drop trigger if exists contracts_assign_number on public.contracts;
create trigger contracts_assign_number before insert on public.contracts for each row execute function public.assign_contract_number();

alter table public.profiles enable row level security;
alter table public.parties enable row level security;
alter table public.contracts enable row level security;
alter table public.loading_details enable row level security;
alter table public.gate_passes enable row level security;
alter table public.contract_documents enable row level security;
alter table public.audit_logs enable row level security;
-- Authenticated users are office staff. Disable public sign-up in Auth settings and create staff accounts manually.
drop policy if exists "Staff can read profiles" on public.profiles;
create policy "Staff can read profiles" on public.profiles for select to authenticated using (true);
drop policy if exists "Users can update own profile name" on public.profiles;
create policy "Users can update own profile name" on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());

do $$ declare t text; begin
 foreach t in array array['parties','contracts','loading_details','gate_passes','contract_documents','audit_logs'] loop
  execute format('drop policy if exists %I on public.%I', 'staff_select_'||t, t);
  execute format('create policy %I on public.%I for select to authenticated using (true)', 'staff_select_'||t, t);
 end loop;
end $$;
drop policy if exists staff_insert_parties on public.parties;
create policy staff_insert_parties on public.parties for insert to authenticated with check(created_by=auth.uid());
drop policy if exists staff_update_parties on public.parties;
create policy staff_update_parties on public.parties for update to authenticated using(true) with check(true);
drop policy if exists staff_delete_parties on public.parties;
create policy staff_delete_parties on public.parties for delete to authenticated using(true);
drop policy if exists staff_insert_contracts on public.contracts;
create policy staff_insert_contracts on public.contracts for insert to authenticated with check(created_by=auth.uid());
drop policy if exists staff_update_contracts on public.contracts;
create policy staff_update_contracts on public.contracts for update to authenticated using(true) with check(true);
drop policy if exists staff_delete_contracts on public.contracts;
create policy staff_delete_contracts on public.contracts for delete to authenticated using(true);
drop policy if exists staff_insert_loading on public.loading_details;
create policy staff_insert_loading on public.loading_details for insert to authenticated with check(created_by=auth.uid());
drop policy if exists staff_update_loading on public.loading_details;
create policy staff_update_loading on public.loading_details for update to authenticated using(true) with check(true);
drop policy if exists staff_delete_loading on public.loading_details;
create policy staff_delete_loading on public.loading_details for delete to authenticated using(true);
drop policy if exists staff_insert_gate_passes on public.gate_passes;
create policy staff_insert_gate_passes on public.gate_passes for insert to authenticated with check(created_by=auth.uid());
drop policy if exists staff_update_gate_passes on public.gate_passes;
create policy staff_update_gate_passes on public.gate_passes for update to authenticated using(true) with check(true);
drop policy if exists staff_insert_documents on public.contract_documents;
create policy staff_insert_documents on public.contract_documents for insert to authenticated with check(uploaded_by=auth.uid());
drop policy if exists staff_delete_documents on public.contract_documents;
create policy staff_delete_documents on public.contract_documents for delete to authenticated using(uploaded_by=auth.uid());
drop policy if exists staff_insert_audit on public.audit_logs;
create policy staff_insert_audit on public.audit_logs for insert to authenticated with check(actor_id=auth.uid());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('contract-documents','contract-documents',false,10485760,array['application/pdf'])
on conflict(id) do update set public=false, file_size_limit=10485760, allowed_mime_types=array['application/pdf'];
drop policy if exists staff_read_contract_storage on storage.objects;
create policy staff_read_contract_storage on storage.objects for select to authenticated using(bucket_id='contract-documents');
drop policy if exists staff_upload_contract_storage on storage.objects;
create policy staff_upload_contract_storage on storage.objects for insert to authenticated with check(bucket_id='contract-documents');
drop policy if exists staff_update_contract_storage on storage.objects;
create policy staff_update_contract_storage on storage.objects for update to authenticated using(bucket_id='contract-documents') with check(bucket_id='contract-documents');
drop policy if exists staff_delete_contract_storage on storage.objects;
create policy staff_delete_contract_storage on storage.objects for delete to authenticated using(bucket_id='contract-documents');
