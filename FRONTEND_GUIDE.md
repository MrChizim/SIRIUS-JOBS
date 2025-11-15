# Frontend Guide

Complete guide to understanding and working with SIRIUS JOBS frontend.

---

## 📁 Frontend Structure

The frontend is a **static HTML/CSS/JavaScript** application (no build process required).

```
/
├── HTML Pages              # User interface
├── JavaScript Utilities    # Helper functions
├── assets/                 # Stylesheets, SVGs
└── images/                 # Static images
```

---

## 🌐 HTML Pages Overview

### 1. Public Pages (No Authentication Required)

**File** | **Purpose** | **Key Features**
---------|-------------|------------------
[index.html](index.html) | Homepage | Hero section, features, call-to-action
[about.html](about.html) | About page | Company info, mission
[services.html](services.html) | Services overview | Job marketplace, consultations, marketplace
[contact.html](contact.html) | Contact page | Contact form
[faq.html](faq.html) | FAQ | Frequently asked questions
[terms.html](terms.html) | Terms of service | Legal terms
[privacypolicy.html](privacypolicy.html) | Privacy policy | Data protection policy

### 2. Authentication Pages

**File** | **Purpose** | **Backend Endpoint**
---------|-------------|---------------------
[login.html](login.html) | Universal login | `POST /api/auth/login`
[register.html](register.html) | Worker/Employer registration | `POST /api/auth/register`
[marketplace-register.html](marketplace-register.html) | Merchant registration | `POST /api/auth/register-merchant`
[consultation-pro-register.html](consultation-pro-register.html) | Professional registration | `POST /api/auth/register-professional`
[verify.html](verify.html) | Email verification | `POST /api/auth/verify-email`

### 3. Dashboard Pages (Authentication Required)

**File** | **User Role** | **Main APIs Used**
---------|---------------|-------------------
[worker-dashboard.html](worker-dashboard.html) | WORKER | `/api/dashboard/worker`, `/api/jobs`, `/api/profiles/worker/me`
[employer-dashboard.html](employer-dashboard.html) | EMPLOYER | `/api/dashboard/employer`, `/api/jobs`, `/api/applications`
[professional-dashboard.html](professional-dashboard.html) | PROFESSIONAL | `/api/dashboard/professional`, `/api/professionals/sessions`
[marketplace-dashboard.html](marketplace-dashboard.html) | MERCHANT | `/api/merchants/me`, `/api/merchants/analytics`
[consultation-dashboard.html](consultation-dashboard.html) | CLIENT | `/api/consultations`, `/api/professionals`

### 4. Feature Pages

**Job Marketplace:**
- [jobs.html](jobs.html) - Browse jobs
- [findworker.html](findworker.html) - Browse workers
- [edit-profile.html](edit-profile.html) - Edit worker profile
- [edit-company.html](edit-company.html) - Edit employer profile

**Consultations:**
- [consultations.html](consultations.html) - Browse professionals
- [consultation-profile.html](consultation-profile.html) - Professional profile
- [consultation-session.html](consultation-session.html) - Live consultation
- [consultation-payment.html](consultation-payment.html) - Payment page
- [consultation-verify.html](consultation-verify.html) - Verify professional license

**Marketplace:**
- [marketplace.html](marketplace.html) - Browse vendors/products

---

## 🔧 JavaScript Utility Files

All utility files are in the **root directory**.

### 1. [api.js](api.js) - API Configuration

**Purpose:** Configures backend API base URL and wraps fetch requests.

**How it works:**
```javascript
// Sets API_BASE to http://localhost:4000
const API_BASE = 'http://localhost:4000';

// Wraps window.fetch to auto-prepend API_BASE
fetch('/api/jobs') → fetch('http://localhost:4000/api/jobs')
```

**When to modify:**
- Change `DEFAULT_BASE` when deploying to production
- Or set `window.SIRIUS_API_BASE` in HTML before loading api.js

**Used by:** Every page that makes API calls

---

### 2. [session-utils.js](session-utils.js) - Session Management

**Purpose:** Manages user authentication state and sessions.

**Key Functions:**

```javascript
// Get current session
const session = getSession();
// Returns: { token: 'jwt...', user: {...}, roles: ['WORKER'] }

// Save session after login
saveSession({ token, user, roles });

// Clear session on logout
clearSession();

// Check if user has role
hasRole('EMPLOYER');

// Get auth headers for API calls
const headers = withAuth({ 'Content-Type': 'application/json' });
// Returns: { 'Content-Type': 'application/json', 'Authorization': 'Bearer jwt...' }
```

**Storage:** Uses `sessionStorage` (clears when browser closes)

**Used by:** Dashboard pages, any protected routes

---

### 3. [error-handler.js](error-handler.js) - Error Handling

**Purpose:** Global error handling and user feedback.

**Key Functions:**

```javascript
// Display error to user
showError('Login failed. Please try again.');

// Handle API errors
fetch('/api/endpoint')
  .catch(error => handleApiError(error));

// Clear errors
clearErrors();
```

**Used by:** All pages that make API calls

---

### 4. [loading-utils.js](loading-utils.js) - Loading States

**Purpose:** Show/hide loading spinners during async operations.

**Key Functions:**

```javascript
// Show loading spinner
showLoading();

// Hide loading spinner
hideLoading();

// Show loading on specific element
showLoadingOn('#submit-btn');
hideLoadingOn('#submit-btn');
```

**Used by:** Forms, data fetching pages

---

### 5. [ui-utils.js](ui-utils.js) - UI Helpers

**Purpose:** Common UI operations.

**Key Functions:**

```javascript
// Show/hide elements
show('#modal');
hide('#modal');

// Toggle classes
toggleClass('#menu', 'open');

// Format currency
formatCurrency(50000); // "₦50,000"

// Format dates
formatDate(new Date()); // "Nov 15, 2024"
```

**Used by:** All pages

---

### 6. [upload-utils.js](upload-utils.js) - File Upload

**Purpose:** Handle image/file uploads to backend.

**Usage:**

```javascript
// Upload profile photo
uploadFile(fileInput.files[0], 'profile-photo')
  .then(url => {
    // url = backend URL to uploaded file
    console.log('Uploaded to:', url);
  });
```

**Backend Endpoint:** `POST /api/upload`

**Used by:** Profile pages, job postings

---

### 7. [session-timeout.js](session-timeout.js) - Auto Logout

**Purpose:** Automatically logout user after inactivity.

**How it works:**
- Tracks user activity (clicks, keyboard)
- After 30 minutes of inactivity → shows warning
- After 35 minutes → auto logout

**Used by:** Dashboard pages

---

### 8. [assistant.js](assistant.js) - Chatbot

**Purpose:** AI chatbot/assistant for user help.

**Features:**
- Floating chat widget
- Answers common questions
- Can be connected to backend AI endpoint

**Used by:** Most pages (footer section)

---

## 🔄 How Frontend Connects to Backend

### Step-by-Step API Call Example

**Scenario:** User logs in

1. **User enters credentials** in [login.html](login.html)

2. **JavaScript extracts data:**
```javascript
const form = document.getElementById('loginForm');
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
```

3. **Call backend API:**
```javascript
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
```

4. **api.js converts URL:**
```
/api/auth/login → http://localhost:4000/api/auth/login
```

5. **Backend processes request** (see [BACKEND_GUIDE.md](BACKEND_GUIDE.md))

6. **Frontend receives response:**
```javascript
  const data = await response.json();

  if (data.success) {
    // Save session
    saveSession({
      token: data.data.token,
      user: data.data.user,
      roles: data.data.roles
    });

    // Redirect based on role
    if (hasRole('WORKER')) {
      window.location.href = '/worker-dashboard.html';
    } else if (hasRole('EMPLOYER')) {
      window.location.href = '/employer-dashboard.html';
    }
  } else {
    showError(data.message);
  }
});
```

---

## 🔐 Authentication Flow

### Login Process

```
1. User submits login form
   ↓
2. fetch('/api/auth/login', { email, password })
   ↓
3. Backend validates credentials
   ↓
4. Backend returns: { token, user, roles }
   ↓
5. saveSession({ token, user, roles })
   ↓
6. Redirect to dashboard
```

### Accessing Protected Pages

```
1. User visits worker-dashboard.html
   ↓
2. Page loads, checks: const session = getSession()
   ↓
3. If no session → redirect to login.html
   ↓
4. If session exists → fetch('/api/dashboard/worker', {
     headers: { Authorization: `Bearer ${session.token}` }
   })
   ↓
5. Backend validates token
   ↓
6. Returns dashboard data
   ↓
7. Page renders data
```

### Logout

```
1. User clicks logout button
   ↓
2. clearSession()  // Clears sessionStorage
   ↓
3. Optional: fetch('/api/auth/logout')  // Invalidate token on backend
   ↓
4. window.location.href = '/login.html'
```

---

## 📊 Common Page Patterns

### Pattern 1: List Page (jobs.html, findworker.html)

```javascript
// 1. Fetch data from backend
async function loadJobs() {
  showLoading();

  try {
    const response = await fetch('/api/jobs?status=open');
    const data = await response.json();

    if (data.success) {
      renderJobs(data.data);
    }
  } catch (error) {
    handleApiError(error);
  } finally {
    hideLoading();
  }
}

// 2. Render to DOM
function renderJobs(jobs) {
  const container = document.getElementById('jobs-container');
  container.innerHTML = jobs.map(job => `
    <div class="job-card">
      <h3>${job.title}</h3>
      <p>${job.description}</p>
      <a href="/job-details.html?id=${job._id}">View Details</a>
    </div>
  `).join('');
}

// 3. Load on page ready
document.addEventListener('DOMContentLoaded', loadJobs);
```

### Pattern 2: Dashboard Page

```javascript
// 1. Check authentication
const session = getSession();
if (!session) {
  window.location.href = '/login.html';
}

// 2. Fetch dashboard stats
async function loadDashboard() {
  const response = await fetch('/api/dashboard/worker', {
    headers: withAuth()  // Adds Authorization header
  });

  const data = await response.json();

  // Render stats
  document.getElementById('total-applications').textContent = data.data.applications;
  document.getElementById('active-jobs').textContent = data.data.activeJobs;
}

loadDashboard();
```

### Pattern 3: Form Submission

```javascript
const form = document.getElementById('profileForm');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // 1. Extract form data
  const formData = {
    firstName: document.getElementById('firstName').value,
    lastName: document.getElementById('lastName').value,
    skills: Array.from(document.querySelectorAll('input[name="skills"]:checked'))
      .map(input => input.value)
  };

  // 2. Submit to backend
  showLoading();

  try {
    const response = await fetch('/api/profiles/worker/me', {
      method: 'PUT',
      headers: withAuth({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(formData)
    });

    const data = await response.json();

    if (data.success) {
      showSuccess('Profile updated successfully!');
    } else {
      showError(data.message);
    }
  } catch (error) {
    handleApiError(error);
  } finally {
    hideLoading();
  }
});
```

---

## 🎨 Styling

### CSS Framework

**Tailwind CSS** (CDN version loaded in HTML):

```html
<script src="https://cdn.tailwindcss.com"></script>
```

**Custom Styles:** [assets/site-shell.css](assets/site-shell.css)

### Common Classes

```html
<!-- Buttons -->
<button class="bg-blue-600 text-white px-4 py-2 rounded">Submit</button>

<!-- Cards -->
<div class="bg-white shadow-md rounded-lg p-6">...</div>

<!-- Grid -->
<div class="grid grid-cols-1 md:grid-cols-3 gap-6">...</div>

<!-- Responsive -->
<div class="hidden md:block">Desktop only</div>
```

---

## 🔍 Debugging Frontend

### Check if API is reachable

```javascript
// In browser console
fetch('http://localhost:4000/health')
  .then(r => r.json())
  .then(console.log);
// Should log: { status: 'ok', timestamp: '...' }
```

### Check current session

```javascript
// In browser console
console.log(getSession());
```

### Check API calls

1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter: XHR/Fetch
4. Perform action
5. Click request → Preview tab to see response

### Common Issues

**Issue:** "Failed to fetch"
- **Cause:** Backend not running
- **Fix:** Start backend: `cd backend && npm run dev`

**Issue:** "CORS error"
- **Cause:** Backend CORS not configured for frontend origin
- **Fix:** Add frontend URL to `CLIENT_ORIGIN` in backend/.env

**Issue:** "401 Unauthorized"
- **Cause:** Invalid or missing token
- **Fix:** Check `getSession()`, re-login if needed

**Issue:** "Session lost on page reload"
- **Cause:** Using `localStorage` instead of `sessionStorage`
- **Fix:** Verify [session-utils.js](session-utils.js) uses `sessionStorage`

---

## 📱 Responsive Design

All pages are mobile-responsive using Tailwind CSS.

**Breakpoints:**
- `sm:` - 640px+
- `md:` - 768px+
- `lg:` - 1024px+
- `xl:` - 1280px+

**Example:**
```html
<div class="w-full md:w-1/2 lg:w-1/3">
  <!-- Full width on mobile, half on tablet, third on desktop -->
</div>
```

---

## ⚡ Performance Tips

### Optimize Images
```html
<!-- Use appropriate image sizes -->
<img src="logo.png" width="200" height="50" loading="lazy">
```

### Lazy Load Data
```javascript
// Only fetch data when needed
document.getElementById('showMore').addEventListener('click', loadMoreJobs);
```

### Cache API Responses
```javascript
let cachedJobs = null;

async function getJobs(forceFetch = false) {
  if (cachedJobs && !forceFetch) {
    return cachedJobs;
  }

  const response = await fetch('/api/jobs');
  cachedJobs = await response.json();
  return cachedJobs;
}
```

---

## 🚀 Adding a New Page

### Example: Create "My Applications" page

1. **Create HTML file:** `my-applications.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My Applications</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="api.js"></script>
  <script src="session-utils.js"></script>
  <script src="error-handler.js"></script>
</head>
<body>
  <div id="applications-container"></div>

  <script>
    // Check auth
    const session = getSession();
    if (!session) window.location.href = '/login.html';

    // Load applications
    async function loadApplications() {
      const res = await fetch('/api/applications/me', {
        headers: withAuth()
      });
      const data = await res.json();

      document.getElementById('applications-container').innerHTML =
        data.data.map(app => `
          <div class="border p-4">
            <h3>${app.job.title}</h3>
            <p>Status: ${app.status}</p>
          </div>
        `).join('');
    }

    loadApplications();
  </script>
</body>
</html>
```

2. **Backend endpoint already exists:** `GET /api/applications/me`

3. **Add link in dashboard:**

```html
<a href="/my-applications.html">View My Applications</a>
```

---

## 📚 File Dependencies

**Every page needs:**
- [api.js](api.js) - For API calls

**Protected pages need:**
- [session-utils.js](session-utils.js) - For auth

**Pages with forms need:**
- [error-handler.js](error-handler.js) - For error display
- [loading-utils.js](loading-utils.js) - For loading states

**Upload pages need:**
- [upload-utils.js](upload-utils.js) - For file uploads

---

## 🔗 External Dependencies

**Loaded via CDN:**

```html
<!-- Tailwind CSS -->
<script src="https://cdn.tailwindcss.com"></script>

<!-- Feather Icons -->
<script src="https://unpkg.com/feather-icons"></script>
<script>feather.replace();</script>

<!-- Paystack (payment) -->
<script src="https://js.paystack.co/v1/inline.js"></script>

<!-- Socket.io (real-time) -->
<script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
```

---

## ✅ Checklist for New Developers

- [ ] Understand HTML page structure
- [ ] Know which utility files do what
- [ ] Understand how `api.js` works
- [ ] Know how to use `session-utils.js`
- [ ] Can make authenticated API calls
- [ ] Can handle errors with `error-handler.js`
- [ ] Understand responsive design with Tailwind
- [ ] Know where to find backend API endpoints
- [ ] Can debug using browser DevTools

---

**Need more info? Check [README.md](README.md) or [BACKEND_GUIDE.md](BACKEND_GUIDE.md)**
