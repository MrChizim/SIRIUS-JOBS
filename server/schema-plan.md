# Sirius Jobs — data model plan (draft, for review before applying to Supabase)

Grounded in the market brief (2026-08-12): two payment paths (escrow-commission for
small/medium tasks, lead-fee for big trade jobs), Paystack split-payment/manual-settlement
instead of custom escrow, Verified Badge as a trust signal, NIN-style verification as the
2026 baseline for "verified" in Nigeria.

## Tables

**profiles** (extends Supabase `auth.users`)
- id (uuid, = auth.users.id)
- full_name, phone, whatsapp
- role: 'poster' | 'tasker' | 'both'
- city (Port Harcourt / Lagos / ... — matters for matching)
- verified_badge (bool), nin_verified_at (timestamp, nullable)
- rating_avg, rating_count, completion_count
- created_at

**tasks**
- id, poster_id -> profiles
- title, description, category
- path: 'escrow' | 'lead_fee'   -- which of the two business models this task uses
- budget_min, budget_max
- location_text, city
- status: 'open' | 'bidding_closed' | 'in_progress' | 'completed' | 'cancelled' | 'disputed'
- created_at, updated_at

**bids** (escrow-path tasks only — taskers competing on price)
- id, task_id -> tasks, tasker_id -> profiles
- amount, message
- status: 'pending' | 'accepted' | 'rejected' | 'withdrawn'
- created_at

**leads** (lead-fee-path tasks only — trade pros paying to be introduced)
- id, task_id -> tasks, professional_id -> profiles
- lead_fee_charged (amount actually paid for this lead)
- status: 'purchased' | 'contacted' | 'won' | 'lost'
- created_at

**escrow_transactions** (escrow-path only — mirrors Paystack split-payment state)
- id, task_id -> tasks, bid_id -> bids
- paystack_reference, paystack_subaccount_code (tasker's split target)
- amount, commission_amount, payout_amount
- status: 'pending' | 'held' | 'released' | 'refunded' | 'disputed'
- held_at, released_at

**lead_payments** (lead-fee-path only — one-off Paystack charges, no holding)
- id, lead_id -> leads
- paystack_reference, amount
- status: 'paid' | 'failed' | 'refunded'
- created_at

**reviews**
- id, task_id -> tasks, reviewer_id -> profiles, reviewee_id -> profiles
- rating (1-5), comment
- created_at

**disputes**
- id, task_id -> tasks, raised_by -> profiles
- reason, status: 'open' | 'resolved' | 'escalated'
- resolution_notes, created_at, resolved_at

## Category → path mapping (confirmed 2026-08-12)

Auto-assigned, invisible to the user — poster just picks a category, the system decides
escrow vs lead-fee behind the scenes.

**Escrow path** (small/medium, Airtasker-style, Paystack split-payment held until confirmed):
Cleaning, Moving/Delivery, Handyman/Small Repairs, Errands, Gardening, Furniture Assembly

**Lead-fee path** (big trade jobs, MyJobQuote-style, flat fee per accepted lead):
Plumbing, Electrical, Building/Construction, Painting, AC/Appliance Repair, Interior Design

## Notes / open questions for the founder
- Money never sits in a Sirius Jobs-owned account — `escrow_transactions` and
  `lead_payments` only ever mirror Paystack's own state (see market brief, CBN section).
  Sirius Jobs' backend triggers Paystack split-payment settlement; it doesn't hold funds.
- Row Level Security (RLS) will restrict: posters see their own tasks/bids, taskers see
  open tasks + their own bids, nobody sees another user's financial rows except admin.
