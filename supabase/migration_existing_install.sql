-- Run this ONLY if you previously ran the original SeedLedger schema.
-- For a brand-new Supabase project, run schema.sql instead.
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
create table if not exists public.audit_logs (
 id uuid primary key default gen_random_uuid(), entity_type text not null check (entity_type in ('contract','loading','gate_pass','document')),
 entity_id uuid not null, action text not null, details jsonb not null default '{}'::jsonb,
 actor_id uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now()
);
alter table public.audit_logs enable row level security;
drop policy if exists staff_select_audit_logs on public.audit_logs;
create policy staff_select_audit_logs on public.audit_logs for select to authenticated using(true);
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
