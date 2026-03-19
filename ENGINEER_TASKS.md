# Sirius Jobs — Engineer Tasks

Two repos: `SIRIUS-JOBS/` (frontend, Vercel) and `SiriusJobsBackEnd/` (Express/MongoDB, Render).

---

## Do This First — Render Environment Variables

Go to Render → backend service → Environment → add:

| Variable | Value |
|---|---|
| `ADMIN_PASSWORD` | Password for the hidden admin panel at `/sj-admin-internal.html` |
| `PAYSTACK_SECRET_KEY` | Your live Paystack secret key |
| `FRONTEND_URL` | Your Vercel URL e.g. `https://siriusjobs.vercel.app` |

---

## Critical Bugs

**1. Paystack webhook has no signature check — anyone can fake a payment**
Find your webhook route and add at the top:
```typescript
import crypto from 'crypto';
const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
  .update(JSON.stringify(req.body)).digest('hex');
if (hash !== req.headers['x-paystack-signature']) return res.status(400).send('Invalid signature');
```

**2. Worker subscription payment does nothing**
Workers pay but no subscription activates. Either build `POST /api/workers/subscribe` (Paystack → webhook → set `subscription.status = 'active'`, `expiresAt = now + 30d`) or remove the button from `worker-dashboard.html`.

**3. Two conflicting Professional models**
`models/Professional.ts` uses uppercase `'DOCTOR'|'LAWYER'|'THERAPIST'`, `models/ProfessionalProfile.model.ts` uses lowercase. One is unused — find which, delete the other.

---

## Features to Build

**1. Email notifications — currently `console.log` only**
`backend/src/services/email.service.ts` → `sendEmail()` is a stub. Plug in [Resend](https://resend.com) (free 3k emails/month):
```typescript
import { Resend } from 'resend'; // npm install resend
const resend = new Resend(process.env.RESEND_API_KEY);
export const sendEmail = async (to: string, subject: string, body: string) => {
  await resend.emails.send({ from: 'Sirius Jobs <noreply@yourdomain.com>', to, subject, html: body });
};
```
Add `RESEND_API_KEY` to Render. Then in `verifyConsultationPayment()`, after `session.startSession()`, look up the professional's User and email them: "You have a new consultation booking."

**2. Professional payout — not built**
Professionals earn money but can't withdraw it.
- Add `walletBalance: Number` to `ProfessionalProfile.model.ts`
- On session complete/expire: add `paymentAmount - 50000` kobo to walletBalance
- Build `POST /api/professionals/withdraw`: create Paystack transfer recipient → initiate transfer → deduct walletBalance on confirmation
- Verify bank first: `GET https://api.paystack.co/bank/resolve?account_number=...&bank_code=...`

**3. Employer ID upload endpoint missing**
Frontend warns employers to upload ID but no backend endpoint exists.
- Build `POST /api/employers/upload-id` (same as worker ID upload)
- Admin approves via admin panel → set `governmentId.verifiedAt = new Date()` → email employer

**4. Admin panel refund button**
Add to `admin.controller.ts` + `admin.routes.ts` + button in `sj-admin-internal.html`:
```typescript
// POST /api/admin/refund
const { reference } = req.body;
await axios.post('https://api.paystack.co/refund', { transaction: reference },
  { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } });
```

**5. Google Sign-In**
`npm install passport passport-google-oauth20` → Google Cloud Console → get `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` → add to Render → routes: `GET /api/auth/google` and `/api/auth/google/callback` → "Continue with Google" button on `login.html` and `register.html`.

---

## Smaller Fixes

| What | Where |
|---|---|
| Hide unavailable professionals | Add `isAvailableForConsultation: true` filter to `getProfessionals()` query |
| Session history multi-status | `getMySessions()` only accepts one status — update to accept comma-separated or array |
| Merchant listing expiry | `GET /api/merchants/public` — filter out `subscriptionExpiresAt < now` if not already done |
| Job application accept/reject | `PATCH /api/jobs/:jobId/applications/:applicationId` with `{ status: 'accepted'\|'rejected' }` + email worker |
| Meta tags | All HTML pages have `og:url = example.com` — replace with real domain |
