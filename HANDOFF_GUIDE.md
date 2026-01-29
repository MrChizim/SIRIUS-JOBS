# Sirius Jobs Handoff Guide

This guide is for the backend developer and anyone new to the codebase. It maps the project, calls out where to look, and lists the backend functions the frontend expects.

---

## Tech Stack (Used So Far)

**Frontend**
- HTML (static pages in root)
- CSS (Tailwind utility classes + `assets/site-shell.css`)
- JavaScript (inline scripts + helper files)
- Feather Icons (CDN)

**Backend (existing folder)**
- Node.js + TypeScript + Express
- MongoDB (via Mongoose)
- Socket.io (consultation real-time chat)

---

## Project Layout

- `/*.html` – all public pages and dashboards (each page is a full HTML file).
- `assets/site-shell.css` – shared styling (nav, hamburger menu, gradients, footer styles).
- `assets/site-shell.js` – light nav enhancements.
- `api.js` – API base URL helpers.
- `session-utils.js` / `session-timeout.js` – session handling on the frontend.
- `ui-utils.js` / `loading-utils.js` – shared UI helpers.
- `upload-utils.js` – upload endpoints for profile photo, business images, license docs, job attachments.
- `backend/` – full backend service (see `BACKEND_GUIDE.md` and `backend/API_DOCUMENTATION.md`).

Images:
- `images/abouthero.JPG`, `images/jobhero.JPG`, `images/markethero.JPG`, `images/servicehero.JPG`

---

## Key Pages (Frontend)

**Public/Marketing**
- `index.html` – home + live stats
- `services.html` – service catalog
- `jobs.html` – job listings + job post form
- `consultations.html` – professional consultations listing
- `marketplace.html` – marketplace wall (public listings)
- `findworker.html` – verified artisans search
- `about.html` – company story
- `faq.html`, `terms.html`, `privacypolicy.html`, `contact.html`

**Auth**
- `login.html`, `register.html`

**Dashboards**
- `worker-dashboard.html`
- `employer-dashboard.html`
- `professional-dashboard.html`
- `marketplace-dashboard.html`

**Consultations Flow**
- `consultation-profile.html` – professional profile detail
- `consultation-session.html` – live session (uses Socket.io)
- `consultation-payment.html`, `consultation-verify.html`
- `consultation-pro-register.html`, `consultation-profile-edit.html`

---

## Backend Functions the Frontend Expects

These are the exact endpoints referenced by the frontend JS. Make sure the backend supports them (method + response shape). See `backend/API_DOCUMENTATION.md` for details.

**Auth / Accounts**
- `POST /api/auth/register-worker`
- `POST /api/auth/register-employer`
- `POST /api/auth/register-professional`
- `POST /api/auth/register-merchant`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/merchants/login`

**Jobs + Applications**
- `GET /api/v2/jobs?…` (list jobs)
- `POST /api/jobs` (create job)
- `GET /api/jobs/employer/:employerId`
- `POST /api/applications` (apply to job)
- `GET /api/applications/job/:jobId`
- `POST /api/applications/:applicationId/decision`
- `POST /api/applications/:applicationId/withdraw`

**Workers (Artisans)**
- `GET /api/v2/workers?limit=60`
- `GET /api/dashboard/artisan`
- `GET /api/dashboard/artisan/:workerId`
- `GET /api/profiles/artisan/me`
- `GET /api/profiles/:workerId`

**Employers**
- `GET /api/dashboard/employer`
- `GET /api/profiles/:userId`

**Services**
- `GET /api/services/providers?categoryId=…`
- `GET /api/services/categories`

**Marketplace / Merchants**
- `GET /api/public/listings` (public wall)
- `GET /api/merchants/plan`
- `GET /api/merchants/me`
- `GET /api/marketplace/analytics/:vendorId`

**Uploads (v2)**
- `POST /api/v2/upload/profile-photo`
- `POST /api/v2/upload/business-images`
- `POST /api/v2/upload/license-document`
- `POST /api/v2/upload/job-attachments`

**Consultations (API base is `http://localhost:4000/api`)**
- `GET /consultation/professionals`
- `GET /consultation/professionals/:id`
- `POST /consultation/register`
- `GET|PUT /consultation/professionals/profile`
- `GET /consultation/sessions/:sessionId`
- `POST /consultation/sessions/:sessionId/messages`
- `POST /consultation/sessions/:sessionId/end`
- `POST /consultation/sessions/:sessionId/review`
- `POST /consultation/payment/initialize`
- `GET /consultation/payment/verify?reference=…`
- `GET /consultation/sessions/dashboard/professional?status=…`

**Reviews & Ratings (Needed)**
- `POST /api/reviews` (create review; requires completed job/session + authenticated user)
- `GET /api/reviews?targetType=artisan|professional&targetId=...` (list reviews)
- `GET /api/reviews/summary?targetType=artisan|professional&targetId=...` (avg rating + count)
- Rule: one review per completed job/consultation, verified users only.

**Socket.io Events (Consultations)**
- Connect to `http://localhost:4000`
- Events: `consultation:new-session`, `consultation:message`, `consultation:error`
- Client emits: `consultation:message`

**Analytics / Misc**
- `GET /api/v2/public/stats`
- `POST /api/errors/log`

---

## Contact Form

`contact.html` posts to Formspree: `https://formspree.io/f/xeeadqdn`.

---

## Notes for the Backend Dev

- Frontend pages assume relative `/api/...` routes unless they set `API_URL` (consultations use `http://localhost:4000/api`).
- Keep CORS open for static hosting if frontend is served separately.
- Responses are expected as JSON; most code uses `response.json()` and checks `response.ok`.
- Socket.io is required for live consultation chat.
- Public listings are visible, but profile details + reviews are gated behind login (findworker + consultations profiles).
