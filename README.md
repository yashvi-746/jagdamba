# SeedLedger — Cotton Seed Contract Management System

A premium, responsive React + Vite business dashboard for the four-step workflow in `cotton seed contract.docx`, using Supabase PostgreSQL, Auth and private Storage.

## What is implemented

### Step 1 — Cotton seed contract
- Contract date and auto-generated contract number (`CS-YYYY-00001`)
- Original `PARTY NAME`, GST number, address and contact number fields
- Optional separate buyer and seller details, including GST, address and contact fields, so the signature roles can be tracked separately
- Fixed commodity `COTTON SEED`; quantity in quintals; delivery and payment conditions; rate per quintal; `LOOSE` / `BAGS`; delivery address
- Database validation for positive quantity, packing type and rate
- PDF contract confirmation with all source fields and the five source-document clauses preserved in their original wording
- Broker, buyer and seller signature/stamp areas in the PDF

### Step 2 — Contract confirmation
- Contract PDF generated and downloaded after save
- PDF upload to the private `contract-documents` Storage bucket and document metadata saved in PostgreSQL
- Contract confirmation preparation tracking
- Email and WhatsApp message composition shortcuts. The user must verify the recipient, attach the PDF and press Send; this browser app does not send messages autonomously because no email provider or WhatsApp Business API credentials were supplied.
- Buyer, seller and broker signature receipt tracking (staff records receipt; this is not an electronic signature)

### Step 3 — Loading details
- Truck / tempo number
- Net weight in quintals
- Driver license number
- Transport number
- Transport name
- LR number
- Loading details linked to the contract, editable via upsert, with an audit entry

### Step 4 — Gate pass
- Gate pass number (`GP-YYYY-00001` sequence)
- Gate pass PDF contains contract, party, delivery, loading and transport details
- Gate pass PDF saved to private Supabase Storage and linked to the gate-pass and contract records
- Gate pass list with secure, short-lived signed links for opening PDFs

### Security and operations
- Supabase email/password authentication; no public sign-up UI
- PostgreSQL Row Level Security on app tables
- Private PDF bucket (10 MB per PDF limit)
- Audit entries for contract creation, loading saves, confirmation preparation, signature status changes and gate pass generation
- Responsive layout for desktop and mobile
- Preview mode with sample records when environment variables are absent (read-only)

## Requirements
- Node.js 20.19+ or 22.12+ recommended
- A Supabase project

## Setup — new Supabase project
1. Create a Supabase project.
2. Open **SQL Editor** and run `supabase/schema.sql`.
3. In **Project Settings → API**, copy the Project URL and publishable/anon key.
4. Copy `.env.example` to `.env` and set:

   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
   ```

5. Create office accounts from **Authentication → Users** in the Supabase dashboard. Do not enable public sign-ups. Confirm each staff email if required. Only create accounts for trusted internal staff; all authenticated staff can access shared workspace data.
6. Install and run:

   ```bash
   npm install
   npm run dev
   ```

7. For a production build:

   ```bash
   npm run build
   npm run preview
   ```

8. For Vercel or another static host, add both `VITE_SUPABASE_*` environment variables to the hosting project and redeploy. Add the deployed origin to Supabase Auth URL configuration and allowed redirect URLs if applicable.

## If you already ran the earlier schema
Run `supabase/migration_existing_install.sql` in Supabase SQL Editor instead of re-running the whole schema. Back up the database first. For a new project, use `schema.sql`.

## Workflow
1. Create a contract and enter the original R&D document fields. Buyer/seller details are optional additions; the original `PARTY NAME` field remains.
2. Save. PostgreSQL assigns a contract number when the number field is blank. The contract PDF is generated, downloaded, and uploaded to private Storage.
3. From the contract details page, prepare a message for email/WhatsApp, record when signatures have been physically received, and save loading details.
4. Generate the gate pass only after all required loading fields are saved. The PDF is downloaded and stored in private Storage.

## Important notes before production
- The source Word document has a single `PARTY NAME` field but refers to both buyer and seller in its terms. The application preserves that field and adds separate optional buyer/seller fields to support the signature roles; office staff should confirm how they want to use these fields.
- The five terms are retained in the PDF from the source document. They include binding-confirmation and broker-liability language. Have a qualified lawyer review and approve them before commercial use; the application does not determine legal enforceability.
- Email/WhatsApp are user-assisted composition shortcuts, not automated delivery or delivery receipts. A production integration requires approved provider setup, credentials and server-side functions.
- Signature tracking records staff confirmation that a signature was received. It does not collect cryptographic/electronic signatures.
- The browser build has no service-role secret. RLS protects database access and the bucket is private. Keep public sign-up disabled and restrict access to trusted office accounts.
- Contract number sequences are database sequences and can have gaps if transactions are rolled back. Do not manually edit numbers without an office numbering policy.
- Database changes and real Supabase storage cannot be verified until you connect your own Supabase project and run the SQL.
