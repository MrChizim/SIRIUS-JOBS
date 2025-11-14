# HARDCODED DATA FINDINGS - Frontend HTML Files

## SUMMARY
Found significant amounts of hardcoded data across frontend HTML files that should be replaced with API calls or dynamic content. This includes statistics, professional profiles, job listings, and business data.

---

## 1. INDEX.HTML - HARDCODED STATISTICS

### File: /Users/chizim/HELLOworld/index.html

#### Line 150: Trust Badge with User Count
**Content:** "Trusted by 10,000+ Nigerians"
**Type:** Hardcoded statistic
**Replacement:** Should be dynamic from `/api/statistics` or similar endpoint
**Current:** Static HTML text
**Should be:** JavaScript that fetches actual user count from API

#### Lines 178-188: Quick Stats Section
**Hardcoded Content:**
- Line 178: `10K+` Active Workers
- Line 182: `5K+` Jobs Done  
- Line 186: `98%` Satisfaction

**Type:** Hardcoded metrics/KPIs
**Replacement:** Dynamic data from API endpoints:
- `/api/statistics/active-workers`
- `/api/statistics/jobs-completed`
- `/api/statistics/satisfaction-rate`

#### Line 209: Professional Count in Hero Section
**Content:** "200+ professionals"
**Type:** Hardcoded count
**Replacement:** Should fetch from `/api/statistics/professionals` or similar
**Context:** Card in hero section showing service categories

#### Line 297: Copy with Hardcoded Count
**Content:** "Search through 10,000+ verified artisans, plumbers, electricians, and more"
**Type:** Hardcoded count embedded in promotional text
**Replacement:** Should be replaced with dynamic content from API

---

## 2. CONSULTATIONS.HTML - HARDCODED PROFESSIONALS

### File: /Users/chizim/HELLOworld/consultations.html

#### Lines 278-331: Fallback Professional Data

**Hardcoded Professionals Array:**

1. **Aliyu Pokiman** (Lines 279-291)
   - ID: `consult-aliyupokiman`
   - Profession: LAWYER
   - Specialization: "Property, contracts & SME compliance"
   - Years of Experience: 9
   - Total Sessions: 142
   - Total Reviews: 48
   - Rating: 4.9
   - Bio: "Barrister Aliyu advises estate developers and SMEs..."

2. **Joshua Ogaraku** (Lines 292-304)
   - ID: `consult-joshuaogaraku`
   - Profession: DOCTOR
   - Specialization: "Family medicine & wellness planning"
   - Years of Experience: 11
   - Total Sessions: 188
   - Total Reviews: 61
   - Rating: 4.8

3. **Obinna Chukwuocha** (Lines 305-317)
   - ID: `consult-obinnachukwuocha`
   - Profession: DOCTOR
   - Specialization: "Internal medicine & diagnostics"
   - Years of Experience: 13
   - Total Sessions: 205
   - Total Reviews: 74
   - Rating: 4.9

4. **Arthur Iyanu** (Lines 318-330)
   - ID: `consult-arthuriyanu`
   - Profession: DOCTOR
   - Specialization: "Emergency & critical care"
   - Years of Experience: 12
   - Total Sessions: 176
   - Total Reviews: 58
   - Rating: 4.9

**Type:** Fallback data for professional listings
**Current Implementation:** Used when API call fails (Line 385-390)
**Replacement Strategy:**
- Keep as fallback for API failures
- Primary data should come from `/api/consultation/professionals`
- The fallback array itself should be moved to JavaScript configuration or removed entirely

#### Lines 143-144, 203: Hardcoded Pricing
**Content:** 
- "Only ₦3,000 per consultation" (Line 143)
- "start earning ₦2,500 per consultation session" (Line 203)

**Type:** Hardcoded prices
**Replacement:** Should be fetched from `/api/config/pricing` or similar

---

## 3. JOBS.HTML - HARDCODED JOB LISTINGS

### File: /Users/chizim/HELLOworld/jobs.html

#### Lines 255-462: Sample Job Cards (HTML)

**6 Hardcoded Job Postings:**

1. **Sample Job 1** (Lines 255-287)
   - Title: "Skilled Electrician Needed"
   - ID: `sample-job-1`
   - Category: Electrician
   - Location: Port Harcourt
   - Type: Full-time
   - Rate: ₦25,000/day
   - Description: "Looking for a certified electrician for residential wiring..."

2. **Sample Job 2** (Lines 290-322)
   - Title: "Plumbing Services"
   - ID: `sample-job-2`
   - Category: Plumber
   - Location: Lagos
   - Type: Contract
   - Rate: ₦18,000/day

3. **Sample Job 3** (Lines 325-357)
   - Title: "Office Cleaner Needed"
   - ID: `sample-job-3`
   - Category: Cleaner
   - Location: Abuja
   - Type: Part-time
   - Rate: ₦15,000/day

4. **Sample Job 4** (Lines 360-392)
   - Title: "Carpentry Work"
   - ID: `sample-job-4`
   - Category: Artisan
   - Location: Enugu
   - Type: Project
   - Rate: ₦30,000/project

5. **Sample Job 5** (Lines 395-427)
   - Title: "AC Technician"
   - ID: `sample-job-5`
   - Category: Technician
   - Location: Kano
   - Type: Contract
   - Rate: ₦22,000/day

6. **Sample Job 6** (Lines 430-462)
   - Title: "Housekeeper Needed"
   - ID: `sample-job-6`
   - Category: Housekeeper
   - Location: Port Harcourt
   - Type: Full-time
   - Rate: ₦80,000/month

**Note:** Same jobs are also duplicated in JavaScript fallback data (Lines 827-906)

#### Lines 827-906: JavaScript Fallback Jobs Array

**Duplicate hardcoded job data:**
```javascript
const fallbackJobs = [
    { id: 'sample-job-1', title: 'Skilled Electrician Needed', ... },
    // 5 more jobs...
]
```

**Type:** Both HTML hardcoded AND JavaScript fallback
**Current Implementation:** 
- HTML cards (Lines 255-462) are visible by default
- JavaScript fallback (Lines 827-906) is used if API fails
- Both contain identical job data

**Replacement Strategy:**
- Remove HTML hardcoded cards
- Keep JavaScript fallback as fallback only
- Primary data from `/api/jobs?status=OPEN`

#### Lines 113, 122, 127, 495, 1095, 1097: Hardcoded Job Posting Price
**Content:** "₦1,000" (mentioned multiple times)
- Line 113: "All job posts cost ₦1,000"
- Line 122: "Post a job (₦1,000)"
- Line 127: Display as "₦1k"

**Type:** Hardcoded price
**Replacement:** `/api/config/job-posting-fee` or similar

---

## 4. MARKETPLACE.HTML - HARDCODED BUSINESS DATA

### File: /Users/chizim/HELLOworld/marketplace.html

#### Lines 145-146: Marketplace Statistics
**Hardcoded Content:**
- "1,500+ products" (Line 145)
- "200+ verified merchants" (Line 146)

**Type:** Hardcoded marketplace metrics
**Replacement:** Should be dynamic from API:
- `/api/statistics/marketplace-products`
- `/api/statistics/marketplace-merchants`

#### Lines 152-172: Hardcoded "Featured" Merchant Card - Dewiss Gadget Hub

**Business Data:**
```
Company Name: Dewiss Gadget Hub
Logo: assets/dewiss-logo.png
Description: "Phones, laptops, wearables and consoles shipped nationwide with repair support"
Category: Tech & Gadgets (implied)
Location: (implied from content)

Highlights:
1. "Smartphones, laptops, gaming consoles & accessories"
2. "Trade-in support and certified diagnostics"
3. "Express delivery hubs in Port Harcourt & Lagos"
```

**Type:** Hardcoded featured merchant profile
**Lines:** 152-172
**Current Implementation:** Static HTML card showing "Dewiss" as example
**Replacement:** Should be:
- Removed as hardcoded example, OR
- Made dynamic from `/api/public/listings?featured=true`

#### Lines 404-510: Hardcoded Marketplace Pricing Plans

**Plan 1 - Starter (3-Month Launch)**
- Price: ₦30,000
- Details: ₦10,000/month
- Location: Lines 404-407

**Plan 2 - Growth (6-Month Spotlight)** [Most Popular]
- Price: ₦57,000
- Details: Save 5%
- Location: Lines 444-448

**Plan 3 - Premium+ (12-Month Residency)**
- Price: ₦108,000
- Details: Save 10%
- Location: Lines 481-485

**Type:** Hardcoded pricing plans
**Replacement:** Should be from `/api/config/marketplace-plans` or similar
**Note:** These are pricing plans, not merchant data, but still hardcoded and should be configurable

---

## 5. SERVICES.HTML - HARDCODED SERVICE DATA

### File: /Users/chizim/HELLOworld/services.html

#### Lines 684-790: Fallback Service Categories Array

**Hardcoded Categories with Sample Providers:**

The file contains fallback data for service categories when API fails. This includes:
- `fallback-plumbers` (ID structure shows sample data)
- `fallback-electricians`
- `fallback-cleaners`
- `fallback-doctors`

**Type:** Fallback service provider data
**Current Implementation:** Used when API `/api/services` fails
**Replacement Strategy:**
- Keep minimal fallback only
- Actual data should come from `/api/services/categories`

---

## SUMMARY TABLE

| File | Type | Count | Content | Lines | API Endpoint Needed |
|------|------|-------|---------|-------|-------------------|
| index.html | Statistics | 5 | User counts, satisfaction rate, job counts | 150,178,182,186,209,297 | `/api/statistics/*` |
| consultations.html | Professionals | 4 | Doctor/lawyer profiles with ratings | 278-331 | `/api/consultation/professionals` |
| consultations.html | Pricing | 2 | Session rates (₦3,000, ₦2,500) | 143,203 | `/api/config/pricing` |
| jobs.html | Job Listings | 6 (HTML) + 6 (JS) | Full job postings with details | 255-462 + 827-906 | `/api/jobs?status=OPEN` |
| jobs.html | Pricing | 1 | Job posting fee (₦1,000) | 113,122,127,495 | `/api/config/job-posting-fee` |
| marketplace.html | Statistics | 2 | Product/merchant counts | 145-146 | `/api/statistics/marketplace*` |
| marketplace.html | Business | 1 | Dewiss Gadget Hub featured merchant | 152-172 | `/api/public/listings?featured=true` |
| marketplace.html | Pricing | 3 | Marketplace advertising plans | 404-510 | `/api/config/marketplace-plans` |
| services.html | Services | 4+ | Fallback service categories | 684-790 | `/api/services/categories` |

---

## REPLACEMENT RECOMMENDATIONS

### Priority 1: Remove Visible Hardcoded Data (High Impact)
1. **index.html statistics** - Users see outdated numbers
2. **jobs.html HTML cards** - Sample jobs appear as real listings
3. **marketplace.html Dewiss card** - Appears as featured real merchant
4. **marketplace.html pricing** - Should reflect current plans

### Priority 2: Clean Up Fallback Data
1. **consultations.html professionals** - Keep minimal fallback, not 4 full profiles
2. **services.html categories** - Reduce size of fallback data
3. **jobs.html fallbackJobs** - Simplify or remove

### Priority 3: Configuration Management
1. **Pricing (₦1,000, ₦3,000, etc.)** - Move to API configuration
2. **Marketplace plans** - Fetch from backend
3. **Statistics** - Implement real-time stats endpoint

---

## IMPLEMENTATION NOTES

1. **Keep Fallback Data Small**: Fallback data should be minimal (maybe 1-2 items) for testing, not full datasets
2. **Conditional Rendering**: Use JavaScript to detect if data is from API or fallback
3. **Cache Busting**: Implement cache headers for statistics to update regularly
4. **Loading States**: Show loading indicators while fetching from API
5. **Error Handling**: Improve fallback UI when API is unavailable
