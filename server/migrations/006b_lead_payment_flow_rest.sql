-- Sirius Jobs — real lead-fee payment flow support (part 2 of 2)
-- Run this AFTER 006a_lead_payment_flow_enums.sql has been run and committed
-- (running it in a separate SQL Editor query, after part 1 finished, is enough).

-- The original schema (001_initial_schema.sql) had leads.status default straight to
-- 'purchased' and lead_payments.status default straight to 'paid' — there was no way
-- to represent "payment initiated, waiting on Paystack to confirm." Part 1 added that
-- state to the enums; this sets it as the actual default.

alter table public.leads alter column status set default 'pending_payment';
alter table public.lead_payments alter column status set default 'pending';

-- lead_fee_charged was NOT NULL at insert time, but the server now creates the lead
-- row before Paystack has told us the amount was actually captured. It's still
-- required, just now filled in by the server at insert time from the category's
-- configured fee rather than left for a later update — no schema change needed there,
-- just noting the server is the one setting it going forward, not client code.

-- lead_payments needs a way to store what Paystack told us on the way back, for
-- reconciliation/debugging.
alter table public.lead_payments add column if not exists paystack_response jsonb;

-- Server-side writes to leads/lead_payments happen exclusively through the
-- service_role key (bypasses RLS) from server/api/*, since only trusted server code
-- should ever mark a payment as paid. No new client-facing RLS policies needed here.
