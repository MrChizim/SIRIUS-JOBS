# SiriusJobs — Team Debrief
**Date:** 2026-03-18
**To:** Node.js Engineer, Python Engineer
**From:** Project Owner

---

## What Was Supposed to Happen

The backend was split into two clear lanes:

| Engineer | Responsibility |
|----------|---------------|
| **Python Engineer** | Workers, Merchants, Employers, Regular customer accounts, Jobs, Applications |
| **Node.js Engineer** | Consultations ONLY — professional accounts, client quick booking, Paystack payments, real-time chat (Socket.IO) |

These were meant to be **completely separate concerns**. No overlap.

---

## What Actually Happened

### Node.js Engineer

You built the entire platform — not just consultations.

**What you were supposed to build:**
- Consultation client registration (quick account for booking)
- Professional profiles
- Consultation booking & Paystack payments
- Real-time consultation chat (Socket.IO)
- Consultation session management & reviews

**What you also built that was outside your scope:**
- Full worker registration, profiles, subscriptions, analytics
- Full employer registration, profiles, dashboard
- Full merchant registration, profiles, subscriptions, image uploads
- Full jobs system — create, search, filter, apply, withdraw
- Full job applications — accept, reject, track
- General auth for all 5 account types
- Services & categories
- Job alerts & notifications
- Dashboard for workers, employers, professionals

You essentially built the **entire backend** on your own, which is impressive — but it created a conflict with the Python engineer who was doing the same thing.

---

### Python Engineer

You built your assigned scope correctly, but the Node.js engineer had already covered the same ground.

**What you built (correctly within scope):**
- Worker routes and profiles
- Employer routes and profiles
- Merchant routes and profiles
- Jobs & applications
- Auth/registration
- Public stats
- Marketplace listings

**Critical issues in your code:**

1. **Production database password committed to public GitHub**
   File: `sjbackend/create_tables.py`, line 6
   The actual live database password is sitting in the public GitHub repository.
   Anyone who has seen that repo link can access the production database right now.
   **You need to go to Render and rotate that password immediately.**

2. **App crashes on startup** — syntax error in `config.py` line 91: `raisepython` instead of `raise`

3. **All users get logged out on every server restart** — `SECRET_KEY` was set to regenerate randomly on each startup, which invalidates every JWT token

4. **Salary search returns wrong results** — the min/max salary filter logic was inverted in `jobs.py`

5. **Worker model file is completely empty** — worker routes would crash immediately

6. **Subscription model file is completely empty**

7. **Analytics router file is completely empty** — no routes despite being imported

8. **30 lines of dead unreachable code** in the register endpoint in `auth.py` — code after a return statement that can never run

---

## Why We Are Keeping Node.js and Archiving Python

This is not a judgement on either engineer's ability. It is purely a practical decision based on what is complete and what the platform needs.

### Node.js has everything. Python has gaps in the most critical areas.

| Feature | Node.js | Python |
|---------|---------|--------|
| Auth — all 5 account types | ✅ Done | ✅ Done |
| Workers | ✅ Done | ❌ Model is empty |
| Employers | ✅ Done | ✅ Done |
| Merchants | ✅ Done | ✅ Done |
| Jobs & Applications | ✅ Done | ✅ Done |
| **Consultations** | ✅ Done | ❌ Not built |
| **Paystack Payments** | ✅ Done | ❌ Not built |
| **Real-time chat (Socket.IO)** | ✅ Done | ❌ Not built |
| Subscriptions | ✅ Done | ❌ Model is empty |
| Analytics | ✅ Done | ❌ Router is empty |
| Email notifications | ⚠️ Wired, needs SMTP config | ❌ Not built |

Consultations, payments, and real-time chat are the most complex and most valuable features on this platform. They only exist in Node.js. Rebuilding them in Python would mean starting over on the hardest parts.

The Node.js backend also already has:
- The frontend pointing at it
- Paystack webhook verification
- Rate limiting on all endpoints
- Role-based access control
- Global error handling
- JWT refresh token flow
- MongoDB fully integrated

### Can the Python backend be used for anything?

Possibly, later. If the platform grows and there is a need to split services, the Python backend could handle a read-heavy public API (job search, worker discovery, public stats) while Node.js handles transactional operations. But that is a future architecture decision. For now, it would introduce unnecessary complexity — two databases, two auth systems, two deployments to maintain.

**The Python work is not wasted.** The logic, schemas, and database design are valuable references. But running two backends simultaneously right now creates more problems than it solves.

---

## Current Status After Code Review

### Fixes already applied (done by code reviewer):

| Fix | File | What Was Fixed |
|-----|------|----------------|
| Node.js | `job.controller.ts` | Authorization bypass — ObjectId vs string comparison. Anyone could edit or delete anyone else's jobs. Fixed in 4 places. |
| Python | `config.py` | Removed duplicate `DATABASE_URL` field that broke Pydantic on startup |
| Python | `config.py` | Fixed `raisepython` syntax error — app was crashing immediately |
| Python | `config.py` | `SECRET_KEY` now reads from environment variable instead of regenerating |
| Python | `auth.py` | Removed 30 lines of dead unreachable code from register endpoint |
| Python | `jobs.py` | Fixed inverted salary filter — search was returning wrong results |

### What still needs to be done (Node.js engineer):

1. Set all environment variables on Render (MongoDB URI, JWT secrets, Paystack keys, CORS origin)
2. Fix consultation session timer — currently hardcoded to 24 hours regardless of what was paid
3. Enforce the ₦1,000 job post fee — currently anyone can post jobs for free
4. Configure SMTP so password reset and email verification actually send
5. Fix the marketplace analytics URL mismatch between frontend and backend

---

## Next Steps

**Python engineer:** Rotate the database password on Render right now. Then stand by — your work may be referenced or partially merged in later.

**Node.js engineer:** Focus on the remaining items listed above. The full detailed audit of what works and what still needs fixing is in a separate document.

---

