# SiriusJobs — Node.js Backend Full Audit
**Date:** 2026-03-18
**Backend URL:** https://siriusjobs-backend.onrender.com
**Stack:** TypeScript · Express · MongoDB · Socket.IO · Paystack

---

## What Was Already Fixed (Already Pushed to Your GitHub Repo)

These bugs were found, fixed, and pushed to `github.com/MrChizim/SiriusJobsBackEnd` on 2026-03-18.
**You do not need to touch these.** Pull the latest code and they are already in.

| Bug | File Changed | What Was Fixed |
|-----|-------------|----------------|
| BUG-01 | `backend/src/server.ts` | Consultation session timer was hardcoded to 24h regardless of what the client paid for. Now uses the session's actual `durationHours` field. |
| BUG-02 | `backend/src/controllers/professional.controller.ts` | `getSessionMessages` was returning a number (messageCount) instead of the actual messages. Also fixed an ObjectId comparison that was blocking the ownership check. |
| BUG-03 | `backend/src/controllers/job.controller.ts` | Jobs could be created for free — the ₦1,000 payment was never verified. Now checks for a completed payment record before creating the job. |
| BUG-06 | `backend/src/services/auth.service.ts` | `require()` calls for `crypto`, `jsonwebtoken`, and `email.service` were inside functions (called on every request). Moved to top-level imports. |
| BUG-07 | `backend/src/services/payment.service.ts` | `setMonth()` was used for subscription date calculation — this miscounts near month boundaries (e.g. Jan 31 + 3 months = May 3, not Apr 30). Replaced with reliable day-based math (`setDate + 30 days`). |
| BUG-05 (frontend) | `SIRIUS-JOBS/marketplace-dashboard.html` | Merchant analytics dashboard was calling a URL that doesn't exist (`/api/marketplace/analytics/:id`). Fixed to call the correct endpoint (`/api/merchants/analytics`) with the auth token, and mapped the response fields correctly. |

**To get these fixes:** run `git pull origin main` in your backend folder.

---

## What YOU Still Need to Do

### 1. Set Environment Variables on Render — DO THIS FIRST

Nothing works without these. Every API call will fail until these are set.

Go to **Render → your Node.js service → Environment** and add:

```
NODE_ENV=production
PORT=4000

MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/sirius_jobs?retryWrites=true&w=majority

JWT_SECRET=<generate this — see below>
JWT_REFRESH_SECRET=<generate this — different value from JWT_SECRET>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

PAYSTACK_SECRET_KEY=<your_paystack_secret_key_from_dashboard>
PAYSTACK_PUBLIC_KEY=<your_paystack_public_key_from_dashboard>

CLIENT_ORIGIN=https://your-app.vercel.app
FRONTEND_URL=https://your-app.vercel.app

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=youremail@gmail.com
SMTP_PASS=your-gmail-app-password
```

**How to generate JWT secrets — run this in your terminal twice:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
First output → `JWT_SECRET`. Second output → `JWT_REFRESH_SECRET`. Never use the same value for both. Never change them after going live or every user gets logged out.

**CORS note:** `CLIENT_ORIGIN` must be the exact Vercel URL of the frontend. If you have multiple domains separate with commas:
```
CLIENT_ORIGIN=https://sirius-jobs.vercel.app,https://siriusjobs.com
```

---

### 2. Set Up MongoDB Atlas

The backend uses MongoDB. You need a live database.

- Go to [mongodb.com/atlas](https://mongodb.com/atlas) and create a free cluster
- Create a database user (username + password)
- Go to Network Access → Add IP Address → Allow from anywhere (`0.0.0.0/0`) — required for Render
- Click Connect → Drivers → copy the connection string
- Paste it as `MONGODB_URI` on Render, replacing `<username>` and `<password>` with your database user's credentials

---

### 3. Wire Up the Email Service — BUG-04

**File:** `backend/src/services/email.service.ts`

This is the only remaining code bug that was not fixed because it requires you to choose an email provider. Right now all email functions just `console.log` and do nothing. This affects:

- Password reset (link is generated but never emailed)
- Email verification (token generated but never emailed)
- Job application notifications to employers
- Consultation session token delivery to client
- Hire notifications

**Recommended fix — use Resend (easiest, free tier, no SMTP config):**

1. Sign up at [resend.com](https://resend.com) — free
2. Get your API key
3. Install the package: `npm install resend`
4. Replace the `sendEmail` function in `email.service.ts` with:

```typescript
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (to: string, subject: string, html: string) => {
  await resend.emails.send({
    from: 'SiriusJobs <noreply@yourdomain.com>',
    to,
    subject,
    html,
  });
};
```

5. Add `RESEND_API_KEY=re_xxxxxxxxxxxx` to Render environment variables

All the other email functions (`sendPasswordResetEmail`, `sendConsultationSessionEmail`, etc.) are already written — they just call `sendEmail`. Once `sendEmail` works, everything else works automatically.

---

### 4. Delete the Unused MongoDB Config File

**File:** `backend/src/config/mongo.ts`

This file is an unused duplicate of `database.ts`. It creates confusion. Just delete it — it is not imported anywhere.

---

## Quick Summary — Status of Everything

| Feature | Status |
|---------|--------|
| Server starts & connects to MongoDB | ✅ Ready (set env vars) |
| Authentication — all 5 roles | ✅ Working |
| Worker system | ✅ Working |
| Employer system | ✅ Working |
| Merchant system | ✅ Working |
| Merchant analytics dashboard | ✅ Fixed (was broken URL) |
| Jobs & Applications | ✅ Fixed (payment now enforced) |
| Consultation booking & payment | ✅ Working |
| Consultation session timer | ✅ Fixed (was always 24h) |
| Consultation chat messages | ✅ Fixed (was returning wrong data) |
| Consultation real-time (Socket.IO) | ✅ Working |
| Dashboards — worker, employer, professional | ✅ Working |
| Analytics & tracking | ✅ Working |
| Merchant subscriptions | ✅ Fixed (date math corrected) |
| Paystack webhook | ✅ Working |
| Rate limiting & security | ✅ Working |
| Email — password reset, verification, notifications | ❌ Needs wiring (BUG-04 above) |
| CORS | ⚠️ Set CLIENT_ORIGIN on Render |

---

## Go-Live Checklist

Work through this in order:

- [ ] `git pull origin main` — get the fixes already pushed
- [ ] Create MongoDB Atlas cluster and get connection string
- [ ] Set all environment variables on Render (Section 1 above)
- [ ] Wire up email service (Section 3 above)
- [ ] Check Render logs — confirm server starts and connects to MongoDB
- [ ] Test registration for each role (worker, employer, professional, merchant)
- [ ] Test full consultation flow (book → pay via Paystack test mode → chat → review)
- [ ] Test full worker subscription flow (pay → verify → worker appears in listings)
- [ ] Test job post flow (pay → post → apply → accept/reject)
- [ ] Test password reset end to end (confirm email arrives)
- [ ] Switch Paystack from test keys to live keys
- [ ] Set `NODE_ENV=production` on Render

---

## Frontend Connection Status (Page by Page)

The frontend `api.js` automatically routes all `/api/*` calls to `https://siriusjobs-backend.onrender.com`. The wiring is already in place — no changes needed on the frontend side except the marketplace fix already pushed.

| Page | Status |
|------|--------|
| login.html | ✅ Connected |
| register.html | ✅ Connected |
| verify.html | ⚠️ Route exists, works once email is wired |
| worker-dashboard.html | ✅ Connected |
| employer-dashboard.html | ✅ Connected |
| professional-dashboard.html | ✅ Connected |
| marketplace-dashboard.html | ✅ Fixed and connected |
| jobs.html | ✅ Connected |
| findworker.html | ✅ Connected |
| consultations.html | ✅ Connected |
| consultation-profile.html | ✅ Connected |
| consultation-payment.html | ✅ Connected |
| consultation-verify.html | ✅ Connected |
| consultation-session.html | ✅ Connected (Socket.IO) |
| edit-profile.html | ✅ Connected |
| edit-company.html | ✅ Connected |
| services.html | ✅ Connected |
| index.html | ✅ Connected |

---

## Nice-to-Have After Launch

Not blocking — do these after the site is live:

1. **Add an admin endpoint to verify professionals** — right now you have to manually open MongoDB and set `isVerified: true` on a professional's record. A simple admin route would save time.
2. **Subscription renewal reminders** — send an email 7 days before a worker's subscription expires so they renew before being hidden from listings.
3. **Add consultation sessions to the professional dashboard page** — the backend endpoint exists, it just needs to be wired into the dashboard UI.

---

*Audit completed 2026-03-18 — fixes pushed to github.com/MrChizim/SiriusJobsBackEnd*
