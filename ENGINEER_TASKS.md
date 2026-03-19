# Sirius Jobs — Engineer Task List

> Priority-ordered list of features to build and bugs to fix. Items marked **CRITICAL** are either broken or blocking users.

---

## ✅ Already Fixed (do not re-do)

| # | Fix | Details |
|---|-----|---------|
| — | Session pricing set to ₦3,000/hr (300000 kobo) | `consultation-payment-enhanced.controller.ts` |
| — | 1-hour minimum restored throughout | Model + controller |
| — | `bookConsultation` session lookup fixed | Was querying `paymentId` (non-existent field), now uses `paymentReference` |
| — | Email session link fixed | Was `/consultation/session/:token` (broken path), now `consultation-session.html?sessionId=` |
| — | `RECOMMENDED_BADGE` compile error fixed | `payment.service.ts` stub |
| — | Professional availability toggle added | `PATCH /api/professionals/availability` + `GET /api/professionals/consultations/pending` |
| — | False advertising removed from frontend | "24/7 tracking", video calls, Flutterwave references, LinkedIn button |
| — | Admin panel built | `sj-admin-internal.html` + `/api/admin/*` routes — see Task 6 for activation steps |
| — | Professional session history UI added | "Consultation history" section on `professional-dashboard.html`, filter by status |

---

## 🔧 ENGINEER: One-time Render Setup Required

The following env variables must be added to the Render backend service before launch. Go to **Render Dashboard → your backend service → Environment → Add Environment Variable**.

| Variable | Value | Purpose |
|---|---|---|
| `ADMIN_PASSWORD` | A strong password of your choice | Unlocks the hidden admin panel at `/sj-admin-internal.html` |

Steps:
1. Log into [render.com](https://render.com)
2. Open the **SiriusJobsBackEnd** service
3. Click **Environment** in the left sidebar
4. Add `ADMIN_PASSWORD` with your chosen password
5. Click **Save Changes** — Render will redeploy automatically (~2 min)
6. Test by visiting `https://[your-frontend-domain]/sj-admin-internal.html` and entering the password

**Keep `ADMIN_PASSWORD` secret — do not commit it to git.**

---

## 🔴 CRITICAL — Fix Before Launch

### ~~1. Fix Consultation Price per Hour~~ ✅ FIXED
`DEFAULT_PRICE_PER_HOUR = 300000` (₦3,000/hr). 1-hour minimum enforced throughout.

---

### ~~2. Consultation Session: Fix `minimumDuration`~~ ✅ FIXED
All session minimums set to 3600000ms (1 hour). Deployed.

---

### 3. Worker Subscription — Remove or Keep?
The `WORKER_SUBSCRIPTION: 1000` payment amount is in config but there is no `/subscribe` or `/activate-subscription` endpoint. Either:
- **Build it:** POST `/api/workers/subscribe` → Paystack init → webhook → set `subscription.status = 'active'`, `subscription.expiresAt = now + 30 days`
- **Remove it from the frontend** until you're ready

Current state: workers can pay but nothing activates their subscription.

---

### 4. Professional Payout — Not Implemented
After a consultation session completes, the professional is owed `(session amount - ₦500 platform fee)`. There is NO payout/withdrawal system.

**Need to build:**
- `ProfessionalProfile` should track `walletBalance` (pending payout)
- When a session is `completed`, add `(paymentAmount - 500)` to professional's walletBalance
- Professional dashboard should show wallet balance
- Withdrawal endpoint: POST `/api/professionals/withdraw` — validates bank account, triggers Paystack Transfer API
- Paystack Transfer requires: recipient code (create via `/transferrecipient`), then POST `/transfer`

---

### 5. Paystack Webhook — Verify HMAC Signature
**File:** Find your webhook handler (likely in routes or a dedicated webhook controller)

Every incoming Paystack webhook must be verified:
```typescript
import crypto from 'crypto';
const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
  .update(JSON.stringify(req.body))
  .digest('hex');
if (hash !== req.headers['x-paystack-signature']) {
  return res.status(400).send('Invalid signature');
}
```
Without this, anyone can fake a payment success.

---

## 🟠 HIGH PRIORITY — Core Features Missing

### ~~6. Admin Panel~~ ✅ BUILT — needs Render env var to activate

**Frontend:** `SIRIUS-JOBS/sj-admin-internal.html` — hidden page, no links to it anywhere.
**Backend:** `backend/src/controllers/admin.controller.ts` + `backend/src/routes/admin.routes.ts`, registered at `/api/admin`.

**What's working:**
- Password-only login via `POST /api/admin/login` — checks `process.env.ADMIN_PASSWORD`
- Stats: user counts by type, active/pending sessions, total revenue
- Users: paginated list, search by name/email, filter by type, suspend/unsuspend
- Sessions: all paid sessions, filter by status, paginated
- Verifications: professionals with `isVerified: false`, one-click verify button

**To activate:** Set `ADMIN_PASSWORD` env var on Render (see setup section above).

**Still missing (engineer to add later):**
- Paystack refund trigger from admin panel
- Worker ID verification queue (currently only professional verification is shown)

---

### 7. Professionals: Consultation History Endpoint
**Currently missing from backend.** Frontend `professional-dashboard.html` likely tries to call this.

```
GET /api/professionals/consultations?status=completed&page=1&limit=20
```

Returns: list of sessions where `session.professionalId === req.user._id`, with client username, duration, amount earned, date.

---

### 8. Google Sign-In / Sign-Up
Use **Passport.js** with `passport-google-oauth20`.

Steps:
1. `npm install passport passport-google-oauth20 @types/passport @types/passport-google-oauth20`
2. Create Google OAuth app at console.cloud.google.com — get `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
3. Add env vars to Render
4. Routes:
   - `GET /api/auth/google` — redirect to Google
   - `GET /api/auth/google/callback` — handle callback, create/find user, return JWT
5. On first Google login: user needs to choose their account type (worker/employer/etc.) — redirect to an onboarding page
6. Frontend: add "Continue with Google" button on `login.html` and `register.html`

---

### 9. Email Notifications
Currently the backend may send emails for consultation sessions (session token delivery). Verify this is working. Also add:

- **Welcome email** on registration
- **Job application received** (to employer)
- **You have a new consultation booking** (to professional)
- **Session starting soon** reminder (15 min before expiry — use a cron job or delayed job queue)
- **Payment confirmed** receipt

Use **Nodemailer** with Gmail App Password or **Resend** (free 3,000 emails/month, simpler setup).

---

### 10. Real ID Verification — Manual vs Automatic

**Current state (manual review):** Workers/professionals upload ID documents. Admin reviews in the admin panel and clicks "Approve". This sets `governmentId.verifiedAt = new Date()` and emails the user.

**How to make it automatic (options):**

**Option A — Smile Identity (recommended for Nigeria)**
- Nigerian KYC API: verifies NIN, BVN, driver's licence, passport against NIMC/VIO databases in real time
- `npm install smile-id-core` or use their REST API
- On ID upload: call Smile Identity verify endpoint with the ID number + type
- If verified: set `governmentId.verifiedAt = new Date()` immediately, no human needed
- Cost: ~$0.30–$0.50 per verification (pay-as-you-go)
- Docs: smileidentity.com

**Option B — Prembly (cheaper, Nigerian-focused)**
- Similar to Smile Identity, supports NIN, BVN, CAC, driver's licence
- REST API: `POST https://api.prembly.com/identitypass/verification/nin`
- Cost: lower than Smile Identity
- Docs: prembly.com/identitypass

**Option C — Manual admin review (current fallback)**
- Keep as fallback when APIs are unavailable
- Admin panel shows a queue of pending verifications
- Admin views the uploaded document image, clicks Approve or Reject

**Recommended:** Start with Option C (already described in task 6), then add Prembly for NIN auto-verify once you have budget. Employers can be verified automatically via NIN; professionals require additional licence checks that may still need manual review.

**Need:**
- Employer ID upload endpoint: `POST /api/employers/upload-id` (same structure as worker upload)
- On approval: set `governmentId.verifiedAt = new Date()` on employer profile
- Email the user: "Your ID has been verified. You can now post jobs."
- The verified flag blocks job posting until set

---

### 11. Consultation Session: Professional Must Accept Booking
Currently a session becomes `active` the moment the client pays. The professional doesn't know they have a booking until they check their dashboard.

**Consider adding:**
- Session status: `pending_professional` → professional accepts → `active`
- Notify professional via email when a booking is made
- Professional has 24h to accept; if not, auto-cancel and refund client
- OR: simpler — just email/notify the professional and let session activate immediately, but send them a notification

---

## 🟡 MEDIUM PRIORITY — Quality of Life

### 12. Consultation: Dispute & Fraud Handling
If a client claims a professional never showed up:

1. Client emails `support@siriusjobs.com` within 48h
2. Admin checks session record (was it `active`? did `messageCount > 0`?)
3. If `messageCount === 0` and session shows no activity → issue refund via Paystack Refund API
4. If professional was active → no refund; flag professional account

**Paystack Refund API:**
```
POST https://api.paystack.co/refund
{ "transaction": "<reference>" }
```

Add this endpoint: `POST /api/admin/refund` (admin only).

---

### 13. Consultation: Reduce Paystack Fees
Paystack charges ~1.5% + ₦100 per transaction. On a ₦1,500 session: ~₦122 fee (8%). Options:

**Option A — Minimum session price:** Enforce ₦3,000 minimum (2 hours or 1 hour of a higher-rate professional). Fees become ~3-4%.

**Option B — Monthly wallet top-up:** Clients top up a balance (e.g. ₦10,000 at once). Each session deducts from wallet. One Paystack charge for many sessions. Requires building a wallet system.

**Option C — Accept the fees** — at ₦1,500/session, you keep ₦878 (₦500 platform fee − ₦122 Paystack fee + whatever the ₦500 fee covers). This is your cost of doing business.

Recommended: **Option A** in the short term. Option B when you have enough repeat consultation clients.

---

### 14. Bank Account Verification
Before allowing withdrawal, verify professional's bank account via Paystack:
```
GET https://api.paystack.co/bank/resolve?account_number=...&bank_code=...
```
Also fetch list of banks: `GET https://api.paystack.co/bank`

**Add to professional profile:**
- `bankName`, `bankCode`, `accountNumber`, `accountName` (returned by Paystack resolve)
- Verified flag: only allow withdrawal when bank is verified

---

### 15. Worker Dashboard: Fix Active Jobs Count
The worker dashboard shows "Active Jobs" — this should count employer job posts where the worker has an accepted application. Currently unclear if this query is implemented. Verify the `/api/workers/dashboard` or `/api/workers/me` response includes this count.

---

### 16. Job Application Flow — Status Updates
Employers can post jobs and workers can apply, but can employers accept/reject applications? Add:
```
PATCH /api/jobs/:jobId/applications/:applicationId
{ "status": "accepted" | "rejected" | "shortlisted" }
```
Notify worker by email when status changes.

---

### 17. Merchant: Listing Expiry Check
When a merchant's plan expires, their listing should stop appearing in the marketplace.

Check: Does `GET /api/merchants/public` filter by `subscriptionExpiresAt > now`? If not, add that filter.

---

## 🟢 LOW PRIORITY / FUTURE

### 18. Reviews & Ratings
- Workers: employers can rate after a hire
- Professionals: clients can rate after a completed consultation
- Merchants: customers can rate/leave reviews
- Show average rating on listing cards

### 19. Search & Filters
- `findworker.html` — filter by skill, location, price range, ID verified only
- `consultations.html` — filter by professional type (doctor/lawyer/therapist), availability
- `marketplace.html` — filter by category, location

### 20. Push Notifications / In-App Notifications
When a user gets a message, booking, or payment confirmation, show a notification bell in the navbar.

---

## 🔧 Known Bugs to Clean Up

| # | File | Issue |
|---|------|-------|
| 1 | `backend/src/` (8 files) | `recommendedBadge` logic is dormant — remove the DB field, model enum value, and all references safely |
| 2 | `consultation-payment-enhanced.controller.ts` | Uses raw `axios` + manual `PAYSTACK_SECRET_KEY`. Should use the shared `paystackClient` from `config/paystack.ts` for consistency |
| 3 | `verify.html` footer | Links to "Verify Credentials" — update footer across all pages to link to `verify.html` only if you want workers to see it, otherwise remove it from public navigation |
| 4 | All pages | `example.com` in `og:url` and `canonical` meta tags — replace with real domain |
| 5 | `backend/src/models/Professional.ts` | Has uppercase `'DOCTOR' | 'LAWYER' | 'THERAPIST'` but `ProfessionalProfile.model.ts` uses lowercase `'doctor' | 'lawyer' | 'therapist'`. There are two different models — confirm which one is used where and consolidate |

---

## Environment Variables Needed (Add to Render)

```
PAYSTACK_SECRET_KEY=<your_paystack_secret_key>
GOOGLE_CLIENT_ID=...          (for Google OAuth)
GOOGLE_CLIENT_SECRET=...      (for Google OAuth)
EMAIL_USER=...                (for Nodemailer)
EMAIL_PASS=...                (app password, not account password)
ADMIN_SEED_EMAIL=...          (email for first admin user)
ADMIN_SEED_PASSWORD=...       (password for first admin user)
```

---

*Document prepared: March 2026. Update this file as tasks are completed.*
