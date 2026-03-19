# Sirius Jobs

A Nigerian jobs and consultations platform. Workers find jobs, employers post them, professionals (doctors, lawyers, therapists) offer paid text consultations, and merchants list products/services in a marketplace.

---

## Two Repos, Two Deployments

| Repo | Stack | Deployed on |
|---|---|---|
| `SIRIUS-JOBS/` | Static HTML + Tailwind CSS + vanilla JS | Vercel |
| `SiriusJobsBackEnd/` | TypeScript, Express, MongoDB, Socket.IO | Render |

The frontend talks to the backend via `https://siriusjobsbackend.onrender.com/api`.

---

## What Works Right Now

### Jobs
- Employers can post jobs (₦1,000 per post, paid via Paystack)
- Workers can browse and apply
- Employer dashboard shows all posted jobs and applicants

### Consultations
- Clients browse verified professionals (doctors, lawyers, therapists) on `consultations.html`
- Client picks a professional, selects duration (1hr minimum, ₦3,000/hr), pays via Paystack
- After payment, client is redirected to `consultation-session.html` — a timed text chat
- Session timer counts down; client can extend in 1-hour blocks (₦3,000/hr)
- Professional sees pending/active bookings on their dashboard
- Professional can toggle availability on/off — unavailable pros are hidden from new bookings
- Professional's past sessions shown in "Consultation history" on their dashboard

### Admin Panel
- Hidden page at `/sj-admin-internal.html` — no link to it anywhere on the site
- Login with a password (set `ADMIN_PASSWORD` env var on Render)
- Shows: user counts, total revenue, active sessions
- Users tab: search, filter by type, suspend/unsuspend accounts
- Sessions tab: all paid sessions, filter by status
- Verifications tab: professionals awaiting approval — click Verify to make them publicly visible

### Accounts
- Workers, employers, professionals, merchants can register and log in
- JWT authentication
- Profile editing, photo upload, payout account saving (professionals)

### Marketplace
- Merchants can list services/products after paying a subscription (₦30k/₦57k/₦108k plans)
- Public marketplace browse page

---

## What Does NOT Work Yet

### Emails are not sent
The email service (`backend/src/services/email.service.ts`) is a stub — it only does `console.log`. No emails are actually delivered. This means:
- Professionals do not get notified when a client books them
- Clients do not receive their session link by email (they are redirected directly after payment, but if they close the tab they have no way back)
- No welcome emails, no payment receipts, nothing

**Fix:** See "What to Build Next" → Email.

### Professional payouts are not built
Professionals earn money from sessions but cannot withdraw it. The "Request payout" button on the professional dashboard does nothing. There is no wallet balance tracking.

**Fix:** See "What to Build Next" → Payouts.

### Worker subscription does nothing
Workers can pay a subscription fee but it does not activate anything — no subscription status is set, no features unlock.

**Fix:** Either build the subscription system or remove the button from `worker-dashboard.html`.

### Employer ID upload has no backend
The frontend warns employers they need to upload an ID, but there is no endpoint to receive it. The upload button does not work.

**Fix:** See "What to Build Next" → Employer ID.

### Paystack webhooks are not verified
The backend does not check that incoming Paystack webhooks actually came from Paystack. A malicious request could fake a payment success.

**Fix:** See "What to Build Next" → Webhook security.

### No Google Sign-In
Users must register manually. There is no "Continue with Google" option.

### Two conflicting Professional models
`models/Professional.ts` uses uppercase types (`'DOCTOR'`), `models/ProfessionalProfile.model.ts` uses lowercase (`'doctor'`). One is unused. This needs cleaning up.

---

## What to Build Next — Backend Engineer

### 1. Fix Webhook Security (Do This First — Security Risk)

Find the Paystack webhook route (search for `/webhook` in the routes folder) and add this at the top before doing anything with the payload:

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

Without this, anyone can POST a fake webhook and get a free session.

---

### 2. Email Notifications

Sign up for [Resend](https://resend.com) — free 3,000 emails/month, the simplest option for Node.js.

```bash
npm install resend
```

Add `RESEND_API_KEY` to Render env vars, then replace `sendEmail()` in `backend/src/services/email.service.ts`:

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

Once real emails work, add these notification calls:
- In `verifyConsultationPayment()` — after `session.startSession()` — look up the professional's `User` record and email them: "You have a new booking."
- On registration — call `sendWelcomeEmail()` (already written, just not called)
- On job application — email the employer (function already exists in email service)

---

### 3. Professional Payouts

Currently ₦0 is tracked and nothing can be withdrawn.

**Step 1** — Add wallet balance to the model (`ProfessionalProfile.model.ts`):
```typescript
walletBalance: { type: Number, default: 0 }
```

**Step 2** — When a session expires or completes, credit the professional. Add this to the webhook handler or a scheduled job:
```typescript
await ProfessionalProfile.findOneAndUpdate(
  { userId: session.professionalId },
  { $inc: { walletBalance: session.paymentAmount - 50000 } } // minus ₦500 platform fee in kobo
);
```

**Step 3** — Build `POST /api/professionals/withdraw`:
1. Verify bank account: `GET https://api.paystack.co/bank/resolve?account_number=XXXX&bank_code=XXX`
2. Create transfer recipient: `POST https://api.paystack.co/transferrecipient`
3. Initiate transfer: `POST https://api.paystack.co/transfer`
4. On transfer webhook success, set `walletBalance = 0`

Bank list: `GET https://api.paystack.co/bank`

---

### 4. Employer ID Upload

Frontend shows a warning that employers need to upload ID, but there's no endpoint.

Build `POST /api/employers/upload-id` — same structure as the existing worker ID upload endpoint. On upload:
- Store the file URL on the employer profile
- Show it in the admin panel verifications queue
- When admin approves: set `governmentId.verifiedAt = new Date()` and email the employer

---

### 5. Fix Worker Subscription

Workers can pay ₦1,000 but nothing activates. Either:

**Option A — Build it:**
- `POST /api/workers/subscribe` → initialize Paystack payment
- On Paystack webhook: set `subscription.status = 'active'`, `subscription.expiresAt = now + 30 days`

**Option B — Remove it** from `worker-dashboard.html` until you're ready.

---

### 6. Admin Panel — Add Refund Button

Add to `backend/src/controllers/admin.controller.ts`:

```typescript
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

Register as `POST /api/admin/refund` in `admin.routes.ts`, then add a Refund button per row in the Sessions tab of `sj-admin-internal.html`.

---

### 7. Google Sign-In (When Ready)

```bash
npm install passport passport-google-oauth20 @types/passport @types/passport-google-oauth20
```

1. Create OAuth app at [console.cloud.google.com](https://console.cloud.google.com)
2. Get `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, add to Render
3. Add routes: `GET /api/auth/google` → redirect to Google, `GET /api/auth/google/callback` → find/create user, return JWT
4. On first Google login with no `accountType` yet → redirect to an onboarding page to pick account type
5. Add "Continue with Google" button to `login.html` and `register.html`

---

## Smaller Fixes (Low Effort)

| What | How |
|---|---|
| Unavailable professionals still show in listings | Add `isAvailableForConsultation: true` to the `getProfessionals()` MongoDB query |
| Session history can only filter one status at a time | Update `getMySessions()` to accept comma-separated `status` values, or update the frontend to merge multiple calls |
| Merchant expired listings still show | Add `subscriptionExpiresAt: { $gt: new Date() }` filter to the public merchants query |
| Employers can't accept/reject applications | Add `PATCH /api/jobs/:jobId/applications/:applicationId` with `{ status: 'accepted' \| 'rejected' }` |
| Duplicate Professional model | Delete whichever of `models/Professional.ts` or `models/ProfessionalProfile.model.ts` is not used |
| Meta tags | All HTML pages have `og:url` pointing to `example.com` — replace with real domain |

---

## Environment Variables (Render)

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens |
| `PAYSTACK_SECRET_KEY` | Live Paystack secret key |
| `FRONTEND_URL` | Vercel frontend URL — used in email links and Paystack callbacks |
| `ADMIN_PASSWORD` | Password for the hidden admin panel |
| `RESEND_API_KEY` | Resend email API key (once email is implemented) |
| `GOOGLE_CLIENT_ID` | Google OAuth (when Google Sign-In is built) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth (when Google Sign-In is built) |

---

## Key Files Reference

| File | What it does |
|---|---|
| `SIRIUS-JOBS/sj-admin-internal.html` | Hidden admin panel — access by direct URL only |
| `SIRIUS-JOBS/consultation-session.html` | Live timed text chat between client and professional |
| `SIRIUS-JOBS/consultation-verify.html` | Paystack callback page — verifies payment and starts session |
| `SIRIUS-JOBS/professional-dashboard.html` | Professional's main dashboard — availability, earnings, session history |
| `backend/src/controllers/consultation-payment-enhanced.controller.ts` | Handles consultation payment init, verification, and session extension |
| `backend/src/controllers/admin.controller.ts` | All admin API endpoints |
| `backend/src/services/email.service.ts` | Email stub — replace `sendEmail()` to activate |
| `backend/src/models/ProfessionalProfile.model.ts` | Professional data — use this one, not `Professional.ts` |
| `backend/src/models/ConsultationSession.model.ts` | Session schema with timer, payment, extension tracking |
