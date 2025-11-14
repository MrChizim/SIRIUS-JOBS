# DETAILED HARDCODED DATA - CODE SNIPPETS

## 1. INDEX.HTML - EXACT HARDCODED CONTENT

### Statistic #1: Line 150 - "Trusted by 10,000+ Nigerians"
```html
<span>Trusted by 10,000+ Nigerians</span>
```
**Replace with:** Dynamic JavaScript
```javascript
const userCount = await fetch('/api/statistics/users').then(r => r.json());
span.textContent = `Trusted by ${userCount.toLocaleString()}+ Nigerians`;
```

### Statistic #2-4: Lines 178-188 - Quick Stats Section
```html
<div>
    <div class="text-3xl font-black text-gray-900">10K+</div>
    <div class="text-sm text-gray-600">Active Workers</div>
</div>
<div>
    <div class="text-3xl font-black text-gray-900">5K+</div>
    <div class="text-sm text-gray-600">Jobs Done</div>
</div>
<div>
    <div class="text-3xl font-black text-gray-900">98%</div>
    <div class="text-sm text-gray-600">Satisfaction</div>
</div>
```
**Replace with:** Dynamic data from API
```javascript
const stats = await fetch('/api/statistics/dashboard').then(r => r.json());
// stats.activeWorkers = 10000
// stats.jobsDone = 5000
// stats.satisfactionRate = 98
```

### Statistic #5: Line 209 - "200+ professionals"
```html
<p class="text-xs text-gray-600">200+ professionals</p>
```
**Replace with:**
```javascript
const professionals = await fetch('/api/statistics/professionals').then(r => r.json());
p.textContent = `${professionals}+ professionals`;
```

### Statistic #6: Line 297 - Copy with Hardcoded Count
```html
<p class="text-white/80 text-lg leading-relaxed mb-6">
    Search through 10,000+ verified artisans, plumbers, electricians, and more...
</p>
```
**Replace with:** Dynamic HTML insertion from API

---

## 2. CONSULTATIONS.HTML - HARDCODED PROFESSIONALS

### Professional #1: Aliyu Pokiman (Lines 279-291)
```javascript
{
    _id: 'consult-aliyupokiman',
    firstName: 'Aliyu',
    lastName: 'Pokiman',
    profession: 'LAWYER',
    specialization: 'Property, contracts & SME compliance',
    yearsOfExperience: 9,
    totalSessions: 142,
    totalReviews: 48,
    averageRating: 4.9,
    bio: 'Barrister Aliyu advises estate developers and SMEs on contracts, property closings and dispute resolution.',
}
```
**Status:** Used as fallback when API fails (Line 385)
**Fetch Point:** Line 382 - `const response = await fetch('${API_URL}/consultation/professionals');`

### Professional #2: Joshua Ogaraku (Lines 292-304)
```javascript
{
    _id: 'consult-joshuaogaraku',
    firstName: 'Joshua',
    lastName: 'Ogaraku',
    profession: 'DOCTOR',
    specialization: 'Family medicine & wellness planning',
    yearsOfExperience: 11,
    totalSessions: 188,
    totalReviews: 61,
    averageRating: 4.8,
    bio: 'Dr. Joshua supports families with general consultations, follow-ups and personalised wellness plans.',
}
```

### Professional #3: Obinna Chukwuocha (Lines 305-317)
```javascript
{
    _id: 'consult-obinnachukwuocha',
    firstName: 'Obinna',
    lastName: 'Chukwuocha',
    profession: 'DOCTOR',
    specialization: 'Internal medicine & diagnostics',
    yearsOfExperience: 13,
    totalSessions: 205,
    totalReviews: 74,
    averageRating: 4.9,
    bio: 'Dr. Obinna focuses on diagnostics, chronic care management and complex case reviews for adults.',
}
```

### Professional #4: Arthur Iyanu (Lines 318-330)
```javascript
{
    _id: 'consult-arthuriyanu',
    firstName: 'Arthur Onishe',
    lastName: 'Iyanu',
    profession: 'DOCTOR',
    specialization: 'Emergency & critical care',
    yearsOfExperience: 12,
    totalSessions: 176,
    totalReviews: 58,
    averageRating: 4.9,
    bio: 'Dr. Arthur delivers urgent response support, clinic triage training and telehealth follow-ups.',
}
```

**Recommendation:** Keep as minimal fallback (maybe 1 professional) not 4 full profiles.

### Hardcoded Pricing: Lines 143-144, 203
```html
<!-- Line 143 -->
<div class="text-3xl font-black text-gray-900">₦3,000</div>
<div class="text-sm text-gray-600">Per Session</div>

<!-- Line 203 -->
<p class="text-xl text-blue-100">
    Join our platform and start earning ₦2,500 per consultation session.
</p>
```
**Replace with:** Dynamic pricing from API

---

## 3. JOBS.HTML - HARDCODED JOB LISTINGS

### HTML Hardcoded Jobs (Lines 255-462)

#### Job Card 1: Sample Job 1 (Lines 255-287)
```html
<div class="job-card" data-job-id="sample-job-1" data-job-title="Skilled Electrician Needed">
    <div class="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
        <i data-feather="zap" class="text-primary w-7 h-7"></i>
    </div>

    <h3 class="text-xl font-black text-gray-900 mb-2">Skilled Electrician Needed</h3>
    <p class="text-gray-600 mb-4 text-sm leading-relaxed">
        Looking for a certified electrician for residential wiring in Port Harcourt. Must have 3+ years experience.
    </p>

    <div class="flex flex-wrap gap-2 mb-4">
        <span class="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-bold px-3 py-1.5 rounded-full">
            <i data-feather="tag" class="w-3 h-3"></i>
            Electrician
        </span>
        <span class="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-full">
            <i data-feather="map-pin" class="w-3 h-3"></i>
            Port Harcourt
        </span>
        <span class="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-full">
            <i data-feather="clock" class="w-3 h-3"></i>
            Full-time
        </span>
    </div>

    <div class="flex justify-between items-center pt-4 border-t border-gray-100">
        <span class="text-2xl font-black text-primary">₦25,000<span class="text-sm font-medium text-gray-500">/day</span></span>
        <a href="#" class="applyJobLink">Apply</a>
    </div>
</div>
```
**Data:** Title, Description, Category, Location, Type, Rate - ALL HARDCODED
**Status:** Visible by default, appears as real job listings
**Should be:** Removed from HTML, rendered dynamically from API

#### Job Card 2: Plumbing Services (Lines 290-322)
```html
<!-- Similar structure with hardcoded data:
- Title: "Plumbing Services"
- Description: "Urgent need for a plumber to fix broken pipes in a commercial building in Lagos..."
- Category: Plumber
- Location: Lagos
- Type: Contract
- Rate: ₦18,000/day
-->
```

#### Job Card 3: Office Cleaner Needed (Lines 325-357)
```html
<!-- Data:
- Title: "Office Cleaner Needed"
- Description: "Looking for a reliable cleaner for daily office maintenance in Abuja..."
- Category: Cleaner
- Location: Abuja
- Type: Part-time
- Rate: ₦15,000/day
-->
```

#### Job Card 4: Carpentry Work (Lines 360-392)
```html
<!-- Data:
- Title: "Carpentry Work"
- Description: "Need an experienced carpenter for furniture making and installation in Enugu..."
- Category: Artisan
- Location: Enugu
- Type: Project
- Rate: ₦30,000/project
-->
```

#### Job Card 5: AC Technician (Lines 395-427)
```html
<!-- Data:
- Title: "AC Technician"
- Description: "Looking for a certified AC technician for installation and maintenance in Kano..."
- Category: Technician
- Location: Kano
- Type: Contract
- Rate: ₦22,000/day
-->
```

#### Job Card 6: Housekeeper Needed (Lines 430-462)
```html
<!-- Data:
- Title: "Housekeeper Needed"
- Description: "Seeking a reliable housekeeper for a residential home in Port Harcourt..."
- Category: Housekeeper
- Location: Port Harcourt
- Type: Full-time
- Rate: ₦80,000/month
-->
```

### JavaScript Fallback Jobs (Lines 827-906)
```javascript
const fallbackJobs = [
    {
        id: 'sample-job-1',
        title: 'Skilled Electrician Needed',
        description: 'Looking for a certified electrician for residential wiring in Port Harcourt...',
        category: 'Electrician',
        location: 'Port Harcourt',
        jobType: 'Full-time',
        rateLabel: '₦25,000',
        rateUnit: 'day',
        company: 'Delta Homes',
        experienceLabel: '3-5 Years',
        icon: 'zap'
    },
    // 5 more jobs with full hardcoded details...
];
```

**Problem:** Same job data duplicated in both HTML (Lines 255-462) AND JavaScript (Lines 827-906)

### Job Posting Price (Multiple Locations)
- Line 113: `All job posts cost ₦1,000`
- Line 122: `Post a job (₦1,000)`
- Line 127: `<p class="text-3xl font-black text-white">₦1k</p>`
- Line 495: `paid ₦1,000 post credit`
- Line 1095: `Locked – verify & pay ₦1,000`
- Line 1097: `settle the ₦1,000 post fee`

**Replace with:** Dynamic pricing constant from API

---

## 4. MARKETPLACE.HTML - HARDCODED BUSINESS DATA

### Marketplace Statistics (Lines 145-146)
```html
<p class="text-sm text-white/80">
    <span class="font-bold text-yellow-300">1,500+ products</span> from
    <span class="font-bold text-green-300">200+ verified merchants</span> nationwide
</p>
```
**Replace with:**
```javascript
const marketplaceStats = await fetch('/api/statistics/marketplace').then(r => r.json());
// stats.totalProducts = 1500
// stats.totalMerchants = 200
```

### Featured Merchant: Dewiss Gadget Hub (Lines 152-172)
```html
<div class="w-72 float-animation">
    <div class="bg-white rounded-3xl p-6 shadow-2xl transform rotate-3 hover:rotate-0 transition-all duration-500 card-3d border border-gray-100">
        <div class="bg-gradient-to-br from-primary/10 via-white to-blue-100 rounded-2xl h-40 mb-4 flex flex-col items-center justify-center text-center px-4">
            <img src="assets/dewiss-logo.png" alt="Dewiss logo" class="w-16 h-16 object-contain mb-2" onerror="this.style.display='none';">
            <p class="text-xs font-semibold text-primary uppercase tracking-[0.3em]">Trusted partner</p>
        </div>
        <div class="space-y-3 text-left">
            <h4 class="font-black text-2xl text-gray-900">Dewiss Gadget Hub</h4>
            <p class="text-sm text-gray-600">Phones, laptops, wearables and consoles shipped nationwide with repair support.</p>
            <ul class="text-sm text-gray-700 space-y-2">
                <li class="flex items-center gap-2"><i data-feather="check" class="w-4 h-4 text-primary"></i>Smartphones, laptops, gaming consoles & accessories</li>
                <li class="flex items-center gap-2"><i data-feather="check" class="w-4 h-4 text-primary"></i>Trade-in support and certified diagnostics</li>
                <li class="flex items-center gap-2"><i data-feather="check" class="w-4 h-4 text-primary"></i>Express delivery hubs in Port Harcourt & Lagos</li>
            </ul>
            <a href="#merchant-wall" class="inline-flex items-center justify-center gap-2 text-primary font-semibold text-sm">
                View Dewiss profile
                <i data-feather="arrow-up-right" class="w-4 h-4"></i>
            </a>
        </div>
    </div>
</div>
```
**Status:** Hardcoded featured merchant example
**Should be:** Either removed or made dynamic from API
**Replace with:**
```javascript
const featuredMerchant = await fetch('/api/public/listings?featured=true&limit=1').then(r => r.json());
// Render dynamic merchant card instead of static Dewiss
```

### Marketplace Pricing Plans (Lines 404-510)

#### Plan 1: Starter (Lines 404-407)
```html
<div class="flex items-baseline gap-2">
    <p class="text-5xl font-black text-white">₦30,000</p>
</div>
<p class="text-sm text-white/70 font-medium mt-2">₦10,000 per month, billed upfront</p>
```

#### Plan 2: Growth - Most Popular (Lines 444-448)
```html
<div class="flex items-baseline gap-2">
    <p class="text-5xl font-black text-gray-900">₦57,000</p>
</div>
<p class="text-sm text-gray-500 font-medium mt-2">Save 5% when you pay upfront</p>
```

#### Plan 3: Premium+ (Lines 481-485)
```html
<div class="flex items-baseline gap-2">
    <p class="text-5xl font-black text-white">₦108,000</p>
</div>
<p class="text-sm text-white/70 font-medium mt-2">Save 10% when you stay all year</p>
```

**Replace with:** Dynamic pricing from API
```javascript
const marketplacePlans = await fetch('/api/config/marketplace-plans').then(r => r.json());
// plans[0].price = 30000
// plans[1].price = 57000
// plans[2].price = 108000
```

---

## 5. SERVICES.HTML - FALLBACK DATA (Lines 684-790)

```javascript
const fallbackCategories = [
    {
        id: 'fallback-plumbers',
        label: 'Plumbers',
        icon: 'droplet',
        providers: [
            { name: 'Plumber 1', location: 'Lagos', rating: 4.8 },
            // ... more providers
        ]
    },
    {
        id: 'fallback-electricians',
        label: 'Electricians',
        icon: 'zap',
        providers: [
            // ... providers
        ]
    },
    {
        id: 'fallback-cleaners',
        label: 'Cleaners',
        icon: 'home',
        providers: [
            // ... providers
        ]
    },
    {
        id: 'fallback-doctors',
        label: 'Doctors',
        icon: 'activity',
        providers: [
            // ... providers
        ]
    }
];
```

**Status:** Used as fallback when API fails (Line 864-865)
**Should be:** Drastically reduced or removed. Keep only 1 minimal placeholder

---

## SUMMARY: TOTAL HARDCODED CONTENT

Total Hardcoded Items Found: **28+**

### By Category:
- Statistics: 5 instances
- Professionals: 4 full profiles
- Job Listings: 6 HTML + 6 JS (duplicated)
- Business Data: 1 featured merchant
- Pricing Plans: 8 hardcoded prices
- Fallback Data: 4+ service categories

### By Priority to Fix:
1. **CRITICAL:** Job listings HTML (6 cards, lines 255-462)
2. **CRITICAL:** Marketplace Dewiss featured card (lines 152-172)
3. **HIGH:** Index.html statistics (5 instances)
4. **HIGH:** Pricing hardcoding (₦1,000, ₦3,000, ₦30,000, etc.)
5. **MEDIUM:** Consultations fallback professionals (4 profiles)
6. **MEDIUM:** Services fallback categories
7. **LOW:** Cleanup duplicate fallback data

---

## REPLACEMENT WORKFLOW

1. Create API endpoints:
   - `/api/statistics/*`
   - `/api/config/pricing`
   - `/api/config/job-posting-fee`
   - `/api/config/marketplace-plans`

2. Update each HTML file:
   - Remove hardcoded HTML content
   - Replace with dynamic JavaScript rendering
   - Keep minimal fallback data for API failures

3. Testing:
   - Test with API available
   - Test with API down (fallback)
   - Verify data updates reflect backend changes
