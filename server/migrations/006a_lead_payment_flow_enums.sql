-- Sirius Jobs — real lead-fee payment flow support (part 1 of 2)
-- Run this FIRST in Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Then run 006b_lead_payment_flow_rest.sql in a SEPARATE query afterward.
--
-- Postgres requires new enum values to be committed before they can be referenced
-- elsewhere (including in a DEFAULT clause) — see error 55P04 if you try to do both
-- in one transaction/query. Splitting into two files/runs works around that.

do $$ begin
  alter type lead_status add value if not exists 'pending_payment' before 'purchased';
exception when duplicate_object then null; end $$;

do $$ begin
  alter type payment_status add value if not exists 'pending' before 'paid';
exception when duplicate_object then null; end $$;
