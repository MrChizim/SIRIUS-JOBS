# Sirius Jobs — Engineer Task List

Last updated: March 2026. Tick off tasks as you complete them.

---

## BEFORE YOU TOUCH ANYTHING — Read This First

The codebase has two separate repos:
- **Frontend** — `SIRIUS-JOBS/` — static HTML, deployed on Vercel
- **Backend** — `SiriusJobsBackEnd/` — TypeScript/Express/MongoDB, deployed on Render

All consultation payments go through Paystack. Sessions are text-only (no calls). The platform takes ₦500 flat per session; professionals earn the rest.

---

## Step 1 — Add These Environment Variables on Render RIGHT NOW

Log into Render → your backend service → Environment → Add each one:

| Variable | What to put |
|---|---|
| `ADMIN_PASSWORD` | A strong password you pick — this is how you log into the admin panel |
| `PAYSTACK_SECRET_KEY` | Your live Paystack secret key |
| `FRONTEND_URL` | Your Vercel frontend URL (e.g. `https://siriusjobs.vercel.app`) |

After saving, Render redeploys in ~2 minutes. These are **not in git** — set them manually.

---

## Step 2 — Things Already Built (Do Not Rebuild)

These are done and deployed. Don't touch unless something breaks.

| What | Where |
|---|---|
| Consultation session pricing — ₦3,000/hr, 1-hour minimum | `consultation-payment-enhanced.controller.ts` |
| Professional availability toggle | `PATCH /api/professionals/availability` |
| Pending sessions widget on pro dashboard | `GET /api/professionals/consultations/pending` |
| Admin panel (hidden page) | `sj-admin-internal.html` — login with `ADMIN_PASSWORD` |
| Professional session history | "Consultation history" section on `professional-dashboard.html` |
| Fixed: session lookup was using wrong field | `bookConsultation` now queries `paymentReference` |
| Fixed: email link was broken path | Now links to `consultation-session.html?sessionId=` |
| Fixed: TypeScript compile error | `RECOMMENDED_BADGE` removed from `payment.service.ts` |

---

## Step 3 — Critical Bugs (Fix Before Launch)

### BUG A — Anyone can fake a payment success
Paystack sends webhooks to your server when payments complete. You are not verifying that the webhook actually came from Paystack. Someone could POST a fake webhook and get a free session.

**Fix:** Add this check at the top of your webhook handler:

```typescript
import crypto from 'crypto';

const hash = crypto
  .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
  .update(JSON.stringify(req.body))
  .digest('hex');

if (hash !== req.headers['x-paystack-signature']) {
  return res.status(400).send('Invalid signature');
}
```

**Where:** Find your Paystack webhook route (look for `/webhook` in the routes files).

---

### BUG B — Worker subscription payment does nothing
Workers can pay a subscription fee but nothing happens after payment — no subscription is activated.

**Fix options (pick one):**
- Build the subscription activation: `POST /api/workers/subscribe` → init Paystack → on webhook → set `subscription.status = 'active'` and `subscription.expiresAt = now + 30 days`
- Or remove the subscription button from `worker-dashboard.html` until you're ready to build it

---

### BUG C — Two Professional models conflict
There are two files: `models/Professional.ts` (uses `'DOCTOR' | 'LAWYER' | 'THERAPIST'` uppercase) and `models/ProfessionalProfile.model.ts` (uses `'doctor' | 'lawyer' | 'therapist'` lowercase). Only one should exist.

**Fix:** Decide which model is actually used throughout the controllers, delete the other one, update any references.

---

## Step 4 — Core Features Not Yet Built

### FEATURE 1 — Professionals never receive email when booked
When a client pays and books a session, the professional has no idea. They have to check their dashboard manually.

The email service (`email.service.ts`) is already set up but only does `console.log` — it needs a real email provider plugged in.

**How to fix:**
1. Sign up for [Resend](https://resend.com) — free 3,000 emails/month, easiest to set up
2. Add `RESEND_API_KEY` to Render env vars
3. Install: `npm install resend`
4. Replace the `sendEmail()` function body in `backend/src/services/email.service.ts`:
```typescript
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async (to: string, subject: string, body: string) => {
  await resend.emails.send({
    from: 'Sirius Jobs <noreply@yourdomain.com>',
    to,
    subject,
    html: body,
  });
};
```
5. Then add a call to notify the professional in `verifyConsultationPayment()` in `consultation-payment-enhanced.controller.ts` — after `session.startSession()`, look up the professional's User record and send them an email.

---

### FEATURE 2 — Professionals cannot withdraw earnings
Session payments go through Paystack to you, but professionals have no way to request a payout. The dashboard shows "₦0 available to withdraw" but nothing happens when they click it.

**What needs building:**
1. Add `walletBalance: Number` field to `ProfessionalProfile.model.ts`
2. When a session expires/completes, add `(paymentAmount - 50000)` (kobo) to the professional's `walletBalance` — do this in a webhook handler or a scheduled job
3. Build `POST /api/professionals/withdraw`:
   - Create Paystack transfer recipient using their saved bank details: `POST https://api.paystack.co/transferrecipient`
   - Initiate transfer: `POST https://api.paystack.co/transfer`
   - Deduct from `walletBalance` only after Paystack confirms
4. Before allowing withdrawal, verify their bank account: `GET https://api.paystack.co/bank/resolve?account_number=...&bank_code=...`

---

### FEATURE 3 — Employer ID upload not wired up
The frontend warns employers they need to upload an ID, but there's no backend endpoint to receive it.

**What needs building:**
- `POST /api/employers/upload-id` — same structure as the existing worker ID upload
- On admin approval (via admin panel): set `governmentId.verifiedAt = new Date()` on employer profile
- Email the employer: "Your ID has been verified. You can now post jobs."

---

### FEATURE 4 — Google Sign-In not implemented
Login and register pages have no Google button. Users have to create accounts manually.

**How to build:**
1. `npm install passport passport-google-oauth20 @types/passport @types/passport-google-oauth20`
2. Create a Google OAuth app at [console.cloud.google.com](https://console.cloud.google.com) → get `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
3. Add both to Render env vars
4. Add routes:
   - `GET /api/auth/google` — redirects to Google login
   - `GET /api/auth/google/callback` — creates or finds user, returns JWT
5. On first Google login, if no `accountType` set yet, redirect to an onboarding page where user picks worker/employer/professional/merchant
6. Add "Continue with Google" button to `login.html` and `register.html`

---

### FEATURE 5 — Admin panel needs Paystack refund button
Currently if a client complains a professional never showed up, you have to log into Paystack manually to issue a refund.

**Add to admin panel backend (`admin.controller.ts`):**
```typescript
// POST /api/admin/refund
export const issueRefund = asyncHandler(async (req: any, res: Response) => {
  const { reference } = req.body;
  const response = await axios.post(
    'https://api.paystack.co/refund',
    { transaction: reference },
    { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
  );
  return sendSuccess(res, response.data, 'Refund initiated');
});
```

Add a "Refund" button per session row in `sj-admin-internal.html`.

---

## Step 5 — Smaller Tasks (Do When You Have Time)

| Task | Detail |
|---|---|
| **Merchant listing expiry** | `GET /api/merchants/public` should filter out merchants where `subscriptionExpiresAt < now`. Check if this is already done — if not, add the filter. |
| **Job application status** | Can employers accept/reject applications? Add `PATCH /api/jobs/:jobId/applications/:applicationId` with `{ status: 'accepted' \| 'rejected' }` and email the worker. |
| **Meta tags** | Every HTML page has `og:url` set to `example.com`. Replace with the real domain. |
| **Consultation page — availability filter** | `consultations.html` should hide professionals where `isAvailableForConsultation: false`. The field exists; just add it to the `getProfessionals()` query filter when the client requests available-only. |
| **Session history endpoint** | `professional-dashboard.html` calls `GET /api/professionals/sessions?status=active,expired,...`. The backend `getMySessions()` only accepts a single status string. Either update the controller to accept comma-separated values, or make the frontend call once per status and merge. |

---

## Step 6 — Future / When Ready

- **Push notifications** — notification bell in navbar for new bookings, messages, payments
- **Google Maps / location** — filter workers and merchants by city or area
- **Ratings on job listings** — employers rate workers after a hire; workers rate employers
- **Marketplace reviews** — customers review merchants
- **"Session starting soon" reminder** — email client and professional 15 min before session expires (needs a cron job — use `node-cron` or Render cron jobs)

---

## Known Broken References (Low Risk, Clean Up Anytime)

| File | Issue |
|---|---|
| `backend/src/controllers/consultation-payment-enhanced.controller.ts` | Uses raw `axios` with `PAYSTACK_SECRET_KEY` directly instead of the shared `paystackClient` from `config/paystack.ts`. Works fine but inconsistent. |
| All HTML pages | `<link rel="canonical">` and `og:url` still say `example.com` |
| `backend/src/models/Professional.ts` | Duplicate of `ProfessionalProfile.model.ts` with different casing — one should be deleted |
