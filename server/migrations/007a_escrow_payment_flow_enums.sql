-- Sirius Jobs — real escrow payment flow support (part 1 of 2)
-- Run this FIRST in Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Then run 007b_escrow_payment_flow_rest.sql in a SEPARATE query afterward.
--
-- Postgres requires new enum values to be committed before they can be referenced
-- elsewhere in the same transaction/query — see 006a for the same pattern.

-- escrow_status was 'pending', 'held', 'released', 'refunded', 'disputed'. 'pending'
-- is ambiguous between "row created, nothing sent to Paystack yet" and "charge
-- initialized, waiting on webhook" — split that out. Same for the gap between
-- initiating a payout transfer and Paystack confirming it landed.
do $$ begin
  alter type escrow_status add value if not exists 'charge_pending' before 'held';
exception when duplicate_object then null; end $$;

do $$ begin
  alter type escrow_status add value if not exists 'payout_pending' before 'released';
exception when duplicate_object then null; end $$;
