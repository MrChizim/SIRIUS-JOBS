# SiriusJobs — Business & Operations Guide
**Written for:** The owner — no technical background assumed
**Date:** 2026-03-18
**Purpose:** Understand how every part of the platform works, step by step, what it makes, what could go wrong

---

## Table of Contents

1. [The Big Picture — What SiriusJobs Actually Is](#1-the-big-picture)
2. [User Journey — Workers / Artisans](#2-worker-journey)
3. [User Journey — Employers](#3-employer-journey)
4. [User Journey — Professionals (Doctors & Lawyers)](#4-professional-journey)
5. [User Journey — Clients (Consultation Bookers)](#5-client-journey)
6. [User Journey — Merchants](#6-merchant-journey)
7. [How Money Flows — Every Payment Explained](#7-how-money-flows)
8. [Profit Projections — Conservative, Realistic, Optimistic](#8-profit-projections)
9. [What Could Go Wrong — Honest Risk Assessment](#9-risks)
10. [Competition — Who You Are Up Against](#10-competition)
11. [Growth Strategy — How to Get to ₦1M/month](#11-growth-strategy)
12. [Operations — What You Need to Run This Day to Day](#12-operations)
13. [Legal & Compliance — What You Need to Know](#13-legal)

---

## 1. The Big Picture

SiriusJobs is a **multi-sided marketplace** — meaning it connects multiple different groups of people who all need each other. You are not selling one product. You are building a hub where:

- Workers need visibility to get hired
- Employers need workers
- Sick or stressed people need affordable professional advice
- Local businesses need a place to advertise online
- Anyone can post a job

Every group pays to use the platform in a different way. This is smart because it means if one revenue stream is slow, the others keep money coming in.

**The platform is built for Nigeria specifically:**
- Prices are in Naira
- Paystack (Nigeria's leading payment processor) handles all money
- The consultation price (₦3,000) is deliberately affordable for Nigerians
- The worker subscription (₦1,000/month) is priced below a typical daily wage so adoption is low-friction

---

## 2. Worker Journey — Step by Step

Workers are artisans, tradespeople, and service providers. Plumbers, electricians, tailors, mechanics, cleaners, carpenters, drivers — anyone who provides a skilled service.

### How a Worker Gets on the Platform

**Step 1 — Registration**
- Worker goes to `register.html`
- Fills in: name, email, password, selects "Worker / Artisan" as account type
- Account is created immediately
- They land on their dashboard (`worker-dashboard.html`)
- At this point they are NOT visible in the `findworker.html` listings yet

**Step 2 — Complete Profile**
- Dashboard shows a profile completion bar
- Worker adds: profile photo, bio, skill/trade category, location, years of experience
- The more they fill in, the better their listing looks when employers find them

**Step 3 — Subscribe (₦1,000/month)**
- To appear in the `findworker.html` public listings, the worker must have an active subscription
- They click "Subscribe" on their dashboard
- Paystack payment page opens
- They pay ₦1,000
- Payment confirmation arrives via Paystack webhook
- Their `subscription.status` is set to `active` and their `subscription.endDate` is set to 30 days from now
- They now appear in `findworker.html` — employers can see and contact them

**Step 4 — Upload ID (Optional but Recommended)**
- Worker goes to `verify.html`
- Uploads a photo of their government ID (NIN card, passport, driver's licence, or voter's card)
- You review the document manually
- Once approved, their profile shows the **"ID Submitted"** badge (later "ID Verified")
- This badge builds trust with employers and distinguishes them from unverified workers

**Step 5 — Get the Recommended Badge (Optional, ₦5,000 one-time)**
- Worker pays ₦5,000 and provides a guarantor's name, phone, and email
- They receive a **"Recommended"** badge on their profile
- This is a premium trust signal — it means someone vouches for them
- You should call or message the guarantor to confirm before marking it active (manual step)

**Step 6 — Getting Hired**
- An employer sees their profile on `findworker.html` and contacts them directly (phone/WhatsApp shown on profile)
- OR an employer posts a job and the worker applies for it
- When hired, the employer marks the application as "accepted" on their dashboard

**Step 7 — Subscription Renewal**
- After 30 days, their subscription expires
- Their profile disappears from `findworker.html`
- They need to pay another ₦1,000 to reappear
- (Email reminder 7 days before expiry — this feature still needs to be built)

---

## 3. Employer Journey — Step by Step

Employers are businesses or individuals who need to hire workers.

### How an Employer Uses the Platform

**Option A — Browse Workers Directly**

- Goes to `findworker.html`
- Filters by skill, category, location
- Sees worker cards — photo, name, skill, rating, badges
- Clicks a worker to see full profile including phone/WhatsApp
- Contacts them directly — the platform connects them, the actual hiring happens off-platform

**Option B — Post a Job**

**Step 1 — Register**
- Goes to `register.html`, selects "Employer"
- Account created, lands on `employer-dashboard.html`

**Step 2 — Pay to Post a Job (₦1,000)**
- Goes to "Post a Job" section on dashboard
- Fills in: job title, description, location, pay range, skills required
- Paystack opens — pays ₦1,000
- Job is created and appears on `jobs.html`

**Step 3 — Receive Applications**
- Workers browse `jobs.html` and apply
- Employer sees all applications on their dashboard
- Each application shows the worker's profile, skills, and cover note

**Step 4 — Hire or Reject**
- Employer clicks "Accept" on a worker's application
- The worker receives a notification
- Employer rejects others — those workers are notified too

**Note:** The ₦1,000 job post fee is paid per posting, not per hire. If they post 5 jobs they pay ₦5,000 total. This is a common model (Jobberman uses a similar approach). The fee filters out non-serious postings.

---

## 4. Professional Journey — Step by Step

Professionals are **doctors and lawyers** who offer paid consultations to the public. This is the most complex and most valuable part of the platform.

### How a Professional Gets Set Up

**Step 1 — Register**
- Goes to `consultation-pro-register.html`
- Registers with professional type (Doctor or Lawyer) and credentials
- Lands on `professional-dashboard.html`

**Step 2 — Complete Profile**
- Adds: photo, bio, specialisation (e.g. "Family Doctor", "Property Lawyer"), regulatory body (MDCN for doctors, NBA for lawyers)
- Sets their consultation fee (platform default is ₦3,000 — you control this)
- Adds bank account details for receiving payouts

**Step 3 — Verify Bank Account**
- Uses the "Verify Bank Account" button on dashboard
- Paystack's API checks the account number and bank code and returns the account name
- This must match their name before withdrawals are enabled
- **This feature is currently fake (shows "John Doe") — the engineer needs to connect it to Paystack's real API**

**Step 4 — Wait for Clients**
- Their profile appears on `consultations.html`
- Clients can find them, read their profile, and book a session

**Step 5 — Conduct Sessions**
- When a client pays, a consultation session is created
- The session has a unique link/token that only the client and professional can access
- They chat in real-time via Socket.IO (like WhatsApp but built into the platform)
- The session has a timer (based on how long the client paid for — 1 hour, 2 hours, etc.)
- Sessions can include text messages and notes

**Step 6 — Receive Earnings**
- From each ₦3,000 consultation: professional earns ₦2,500, platform keeps ₦500
- Earnings accumulate in their dashboard under "Total Earnings"
- They click "Withdraw" to transfer to their bank account
- **Withdrawal is currently fake — the engineer needs to build a real Paystack transfer payout**

---

## 5. Client Journey — Step by Step

Clients are ordinary people who want to speak to a doctor or lawyer without the stress or cost of a physical visit.

**Step 1 — Browse Professionals**
- Goes to `consultations.html`
- Sees a list of available professionals with their specialisation, brief bio, and session price
- Filters by type (Doctor / Lawyer)

**Step 2 — View Profile**
- Clicks a professional → goes to `consultation-profile.html`
- Reads their full profile, specialisation, and bio

**Step 3 — Pay (₦3,000)**
- Clicks "Book a Consultation"
- Goes to `consultation-payment.html`
- Fills in name and email (no account required for clients to book — they just pay)
- Paystack opens — pays ₦3,000
- Payment is confirmed via webhook

**Step 4 — Receive Session Token**
- After payment, the backend creates a unique session with a one-time token
- That token is emailed to the client (when email is wired up)
- Token allows them to access the chat session

**Step 5 — Enter the Session**
- Goes to `consultation-session.html`
- Uses their session token to join
- Real-time chat with the professional begins
- Session timer counts down
- At the end, they can leave a review

---

## 6. Merchant Journey — Step by Step

Merchants are local businesses — restaurants, shops, salons, pharmacies, hardware stores — who want to be listed and discoverable on the platform's marketplace.

**Step 1 — Register**
- Goes to `marketplace-register.html`
- Fills in: business name, owner name, email, password, business category
- Lands on `marketplace-dashboard.html`

**Step 2 — Choose a Package**
- 3 months — ₦10,000
- 6 months — ₦19,000 (saves ₦1,000/month vs monthly)
- 12 months — ₦36,000 (best value)
- Pays via Paystack

**Step 3 — Build Their Listing**
- Adds: business description, location, WhatsApp number, Instagram link, website
- Uploads business images (number of images allowed depends on package tier)
- Their listing appears on `marketplace.html`

**Step 4 — Get Discovered**
- Customers browse `marketplace.html`
- Click through to merchant's listing
- See photos, description, and contact info
- Contact them directly via WhatsApp or call

**Step 5 — Renewal**
- When the package expires, merchant is prompted to renew
- Their listing disappears from the marketplace if they don't renew

---

## 7. How Money Flows — Every Payment Explained

All payments go through **Paystack**. Here is exactly what happens with each type:

### Worker Subscription (₦1,000/month)

```
Worker pays ₦1,000 via Paystack
        ↓
Paystack deducts their fee (~1.5% + ₦100 = ~₦115 on ₦1,000)
        ↓
You receive ~₦885 in your Paystack balance
        ↓
You withdraw to your bank account whenever you want
        ↓
Worker's subscription is marked active for 30 days
```

**You keep 100% of this minus Paystack fees.**

### Recommended Badge (₦5,000 one-time)

```
Worker pays ₦5,000
        ↓
You receive ~₦4,820 after Paystack fee
        ↓
Badge is added to worker profile
        ↓
Guarantor details stored — you should call/message guarantor to confirm
```

### Job Post Fee (₦1,000 per job)

```
Employer pays ₦1,000 to post a job
        ↓
You receive ~₦885 after Paystack fee
        ↓
Job post is created and goes live on jobs.html
```

### Consultation (₦3,000 per session)

```
Client pays ₦3,000 via Paystack
        ↓
You receive the full ₦3,000 minus Paystack fee (~₦2,925) into your Paystack balance
        ↓
The backend records: professional is owed ₦2,500, platform keeps ₦500
        ↓
Professional requests a withdrawal
        ↓
You manually (or via automated payout) transfer ₦2,500 to their bank account
        ↓
You keep ₦500 (minus any Paystack transfer fee for the payout)
```

**Important:** Right now withdrawals are fake. Until the engineer builds real Paystack payouts, you will need to do professional payouts manually from your Paystack dashboard. Keep track of what each professional is owed.

### Merchant Package

```
Merchant pays ₦10,000 / ₦19,000 / ₦36,000
        ↓
You receive the full amount minus Paystack fee
        ↓
Their listing is activated for the duration they paid for
```

---

## 8. Profit Projections

### Paystack Fees (What Gets Deducted)
Paystack charges 1.5% + ₦100 per transaction, capped at ₦2,000 for local transactions.
- ₦1,000 payment → you receive ~₦885
- ₦3,000 payment → you receive ~₦2,855
- ₦5,000 payment → you receive ~₦4,825
- ₦10,000 payment → you receive ~₦9,750
- ₦36,000 payment → you receive ~₦35,460

---

### Conservative Scenario — First 3 Months After Launch

You launch, nobody has heard of you, you're actively marketing but it's slow.

| Source | Volume | Revenue |
|--------|--------|---------|
| Worker subscriptions | 50 workers × ₦885/month | ₦44,250/month |
| Job post fees | 20 jobs/month × ₦885 | ₦17,700/month |
| Recommended badges | 5 workers × ₦4,825 (one-time) | ₦24,125 total |
| Merchant listings | 5 merchants × avg ₦9,750 (3-month) | ₦48,750 total |
| Consultations | 15/month × ₦500 platform cut | ₦7,500/month |
| **Total monthly** | | **~₦70,000/month** |

After 3 months that is roughly ₦210,000 + ₦72,875 from one-time fees = ~₦283,000 in the first 3 months.

This is enough to cover basic running costs (Render is free tier, Vercel is free tier, MongoDB Atlas is free tier — your infrastructure cost is currently ₦0).

---

### Realistic Scenario — 6–12 Months After Launch

Word of mouth is working, you have a marketing strategy, workers and businesses are joining.

| Source | Volume | Revenue |
|--------|--------|---------|
| Worker subscriptions | 250 workers × ₦885/month | ₦221,250/month |
| Job post fees | 80 jobs/month × ₦885 | ₦70,800/month |
| Recommended badges | 15/month × ₦4,825 | ₦72,375/month |
| Merchant listings | 30 merchants (recurring avg ₦1,500/month each) | ₦45,000/month |
| Consultations | 60/month × ₦500 | ₦30,000/month |
| **Total monthly** | | **~₦439,000/month** |

That is roughly **₦5.3 million/year**.

---

### Optimistic Scenario — Year 2

Platform has reputation, businesses are renewing, workers are spreading the word.

| Source | Volume | Revenue |
|--------|--------|---------|
| Worker subscriptions | 800 workers × ₦885/month | ₦708,000/month |
| Job post fees | 200 jobs/month × ₦885 | ₦177,000/month |
| Recommended badges | 40/month × ₦4,825 | ₦193,000/month |
| Merchant listings | 80 merchants × avg ₦1,500/month | ₦120,000/month |
| Consultations | 150/month × ₦500 | ₦75,000/month |
| **Total monthly** | | **~₦1,273,000/month** |

**That is over ₦1 million per month, ₦15 million/year** — achievable in year 2 with consistent marketing.

---

### What These Numbers Assume
- You are actively marketing (social media, WhatsApp, physical outreach to artisans)
- You have at least 5–10 active professionals on the consultation side
- You have at least 10 active merchants in the marketplace
- Workers see value in the ₦1,000 subscription (this is the hardest part)

---

## 9. What Could Go Wrong — Honest Risk Assessment

### 🔴 Existential Risks (Could Kill the Business)

**Risk 1: Workers don't trust the platform enough to pay ₦1,000/month**
- This is the single biggest risk. Workers in Nigeria are used to free platforms (Facebook, WhatsApp groups).
- Why they might not pay: they don't know how many employers are looking, they aren't getting jobs.
- Solution: Give the first month free. Let them see the results first, then ask them to pay.

**Risk 2: No professionals join the consultation side**
- The platform for consultations is built and ready, but it's empty. Doctors and lawyers need to be recruited manually.
- Without professionals, there is nothing to book.
- Solution: Reach out directly to 10–20 doctors and lawyers in Port Harcourt. Offer them the first 3 months free. They earn ₦2,500 per session — that's a strong incentive.

**Risk 3: Payment disputes / fraud**
- A client books a consultation, pays ₦3,000, then claims the professional didn't show up. Or a professional claims they never received a payout.
- You are in the middle and responsible.
- Solution: Keep detailed records in your database. Build a simple support process — WhatsApp or email complaints resolved within 48 hours.

**Risk 4: Render or Vercel goes down**
- These are free-tier services. Render free tier spins down after 15 minutes of inactivity and takes ~30 seconds to start up again. This feels broken to users.
- Solution: Upgrade to Render's paid plan (starts at ~$7/month = ~₦11,000/month) once you have revenue. This keeps the server always on.

---

### 🟠 Serious Problems (Hurt Growth If Not Fixed)

**Risk 5: Email not working**
- Password reset doesn't work. Consultation session tokens don't arrive. Users get frustrated and leave.
- Solution: Priority fix — engineer sets up Resend.com in week 2 (see go-live checklist).

**Risk 6: Withdrawal for professionals is manual**
- Until real Paystack payouts are built, you have to manually pay each professional from your Paystack dashboard every time they request withdrawal.
- If you miss a payment, or pay late, professionals lose trust and leave.
- Solution: Track all pending withdrawals in a spreadsheet until automated payouts are built. Set a clear payout schedule (e.g. every Friday).

**Risk 7: No admin panel**
- To review uploaded ID documents, you have to log into MongoDB Atlas directly. This is technical and slow.
- Solution: Build a simple admin panel (a single HTML page with a password that shows you pending ID reviews). Not urgent for April launch — but needed within 2 months.

**Risk 8: Consultation sessions list is blank for professionals**
- The endpoint that shows a professional their past sessions does not exist yet (missing backend endpoint).
- A professional who can't see their sessions will think the platform is broken.
- Solution: Engineer builds this endpoint in week 3.

---

### 🟡 Minor Problems (Annoying But Not Business-Breaking)

**Risk 9: Workers get subscriptions but no jobs**
- If workers are paying ₦1,000/month but not getting hired, they will cancel. You need a real employer base first.
- Solution: Build employer base before pushing workers to subscribe.

**Risk 10: Google Sign-In shows "coming soon"**
- Some users prefer Google login. The button exists but does nothing.
- Not urgent — add after launch.

**Risk 11: The Render free tier is slow**
- First API call after 15 minutes of inactivity takes 30 seconds. Every first user of the day will see a loading screen.
- Solution: Upgrade Render when you have revenue.

---

## 10. Competition — Who You Are Up Against

### Workers / Jobs Side

| Platform | Strength | Their Weakness | Your Advantage |
|----------|----------|----------------|----------------|
| **Workpay** | Established payroll/HR platform | Not focused on artisans/tradespeople | You target blue-collar specifically |
| **Jiji.ng** | Huge user base, free listings | No verification, very spammy | Your workers are verified with IDs |
| **WhatsApp groups** | Zero friction, free | No accountability, no payments, no discoverability | You offer trust signals (ID, ratings) |
| **Facebook groups** | Large reach | Same problems as WhatsApp | Structured platform vs chaos |

**Your biggest competitor is WhatsApp.** Most artisan hiring in Nigeria still happens through WhatsApp groups and word of mouth. You are competing against familiarity. Your pitch: "Get verified, be discoverable to employers across your city, not just people in one group."

### Consultation Side

| Platform | Strength | Their Weakness | Your Advantage |
|----------|----------|----------------|----------------|
| **DoktorConnect** | Established telehealth | Higher prices, app-based | ₦3,000 is accessible, no app needed |
| **Helium Health** | Strong in hospitals | B2B focus, not consumer | You are directly consumer-facing |
| **Going to a hospital** | Physical, trusted | Expensive, time-consuming, stressful | Convenience and price |

**The consultation side is your most unique feature.** At ₦3,000 per session, you are significantly cheaper than most Nigerian telehealth services. The legal consultation side (lawyers) is almost untapped — few platforms in Nigeria offer affordable legal advice.

### Marketplace Side

| Platform | Strength | Their Weakness | Your Advantage |
|----------|----------|----------------|----------------|
| **VConnect.com** | Large directory | Outdated, poor UX | Your platform is modern and mobile |
| **Google My Business** | Free, trusted | Not Nigeria-specific, complex | Simple local directory with WhatsApp integration |
| **Yellow Pages Nigeria** | Known brand | Irrelevant to younger users | You target modern businesses |

---

## 11. Growth Strategy — How to Get to ₦1M/month

### Phase 1 — Launch (Month 1–3)
**Goal: Prove the concept works. Get first 50 paying workers, 10 merchants, 5 professionals.**

- **Workers:** Go to trade associations, markets, and skills training centers in Port Harcourt. Explain the platform. Offer 1 free month. Get 50 workers subscribed.
- **Employers:** Post in business WhatsApp groups. Reach out to construction companies, hotels, facilities managers.
- **Professionals:** Personally recruit 5–10 doctors and lawyers. Frame it as passive income — ₦2,500 per consultation, minimum effort.
- **Merchants:** Approach local restaurants, salons, pharmacies. Offer 3 months for ₦7,500 (introductory). Get 10 businesses listed.

### Phase 2 — Grow (Month 4–8)
**Goal: Double numbers. Hit ₦200,000/month.**

- Workers tell other workers. This is the viral loop that makes this work.
- Use testimonials from workers who got hired — post on Instagram, Facebook.
- Approach staffing agencies to use the platform for their candidates.
- Run targeted Facebook/Instagram ads for ₦20,000/month budget (test this only once you're profitable).

### Phase 3 — Scale (Month 9–18)
**Goal: Expand to Lagos and Abuja. Hit ₦500,000/month.**

- Hire a part-time community manager in Lagos to onboard workers and businesses there.
- The platform itself needs no changes — just more users.
- Apply for startup grants (Tony Elumelu Foundation, Seedstars, Google for Startups Africa).

### The Most Important Metric to Watch
**Worker retention rate.** What percentage of subscribed workers renew after month 1? If it is above 60%, you have a healthy business. If it is below 40%, workers aren't seeing value and you need to understand why.

---

## 12. Operations — What You Need to Run Day to Day

### Your Daily Responsibilities (Once Live)

**Every day:**
- Check support messages (WhatsApp/email) — someone might have a problem with payment, login, or a failed transaction
- Check your Paystack dashboard — confirm payments are processing correctly

**Every week:**
- Review newly uploaded ID documents — approve or reject in MongoDB (temporary until admin panel is built)
- Pay out professionals who have requested withdrawals
- Check for new merchant sign-ups — confirm their listings look correct

**Every month:**
- Check subscription expiry — any workers whose subscriptions are about to expire? Send a reminder (can be WhatsApp message manually until automated emails are set up)
- Review platform analytics — how many jobs posted, how many workers subscribed, how many consultations completed?
- Withdraw your Paystack balance to your bank account

### Things That Run Automatically (No Action Needed)
- User registrations
- Payment processing
- Subscription activation after payment
- Consultation session creation after payment
- Worker appearing/disappearing from listings based on subscription status
- Job applications and notifications

### Things That Are Currently Manual (Need Your Attention)
- ID document review — you log into MongoDB Atlas and check uploaded documents
- Professional payouts — you manually transfer from your Paystack dashboard
- Recommended badge guarantor check — you call the guarantor to confirm
- Any customer support — you handle directly until you have a team

---

## 13. Legal & Compliance — What You Need to Know

### Business Registration
- Register your business with the CAC (Corporate Affairs Commission) as a Limited Liability Company
- This protects you personally if something goes wrong
- Cost: ~₦50,000 for a lawyer to handle registration
- You need this before accepting significant money through the platform

### Terms of Service and Privacy Policy
- You already have `terms.html` and `privacypolicy.html` on the site
- Have a lawyer review them — they need to be specific about:
  - What you do with ID documents (store securely, never share)
  - What liability you hold for consultations (you are a facilitator, not a medical/legal advisor)
  - Refund policy for consultations (what happens if the professional doesn't show up)

### Consultation Liability
- **Very important:** SiriusJobs is a platform, not a medical or legal service provider.
- Your terms must clearly state: "SiriusJobs connects clients with independent professionals. SiriusJobs is not responsible for the advice given."
- This is the same protection Uber uses — they are not a taxi company, they provide a platform.
- The professionals are independent contractors, not your employees.

### NDPR (Nigeria Data Protection Regulation)
- You store personal data — names, emails, ID documents, bank account details
- NDPR requires you to have a privacy policy (you have one) and to protect user data
- You must not sell user data to third parties
- ID documents are especially sensitive — store them securely and only access them for verification purposes

### Paystack Registration
- To withdraw large amounts, Paystack requires your business to be KYC-verified
- Register your Paystack account under your business name
- You'll need: CAC registration, director ID, bank account in business name

---

## Summary — The 5 Most Important Things Right Now

1. **Connect MongoDB and set environment variables on Render** — nothing works until this is done
2. **Wire up email (Resend.com)** — without this, consultations can't work and passwords can't be reset
3. **Recruit 5–10 professionals personally** — the consultation side needs real people before it can earn money
4. **Give workers 1 free month** — lower the barrier to adoption, prove value first, then charge
5. **Build a simple manual payout process** — until automated withdrawals are built, track what you owe each professional in a spreadsheet and pay every Friday

---

*Document version 1.0 — 2026-03-18*
*For technical questions about the platform, see PROJECT_STATUS.md and NODE_BACKEND_AUDIT.md*
