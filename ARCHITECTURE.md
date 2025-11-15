# SIRIUS JOBS - System Architecture

Quick reference for understanding how the entire system connects.

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                             │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  HTML Pages  │  │  JavaScript  │  │    Assets    │         │
│  │              │  │   Utilities  │  │   CSS/SVG    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│         │                  │                                    │
│         └──────────────────┘                                    │
│                    │                                            │
│             HTTP Requests                                       │
│          (fetch API calls)                                      │
└─────────────────────────────────────────────────────────────────┘
                     │
                     │ http://localhost:4000/api/*
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND SERVER (Node.js)                     │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │              Middleware Layer                             │ │
│  │  • CORS     • Auth     • Rate Limit    • Error Handler   │ │
│  └───────────────────────────────────────────────────────────┘ │
│                            │                                    │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                  Routes                                   │ │
│  │  /auth  /workers  /jobs  /professionals  /merchants      │ │
│  └───────────────────────────────────────────────────────────┘ │
│                            │                                    │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                 Controllers                               │ │
│  │  Handle HTTP request/response logic                       │ │
│  └───────────────────────────────────────────────────────────┘ │
│                            │                                    │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                  Services                                 │ │
│  │  Business logic, validation, external APIs                │ │
│  └───────────────────────────────────────────────────────────┘ │
│                            │                                    │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                   Models                                  │ │
│  │  Mongoose schemas & database operations                   │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                     │
                     │ MongoDB Driver
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│                      MongoDB DATABASE                           │
│                                                                 │
│  Collections:                                                   │
│  • users              • workers          • employers           │
│  • professionals      • merchants        • jobs                │
│  • applications       • sessions         • payments            │
│  • analytics          • notifications                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Request Flow Diagram

### Example: Worker Views Available Jobs

```
1. USER ACTION
   Worker clicks "Browse Jobs" on dashboard
   ↓

2. FRONTEND (jobs.html)
   JavaScript: fetch('/api/jobs?status=open')
   ↓

3. API.JS
   Converts to: http://localhost:4000/api/jobs?status=open
   ↓

4. BACKEND - MIDDLEWARE (app.ts)
   → helmet() [security headers]
   → cors() [allow frontend origin]
   → morgan() [log request]
   → json() [parse body]
   ↓

5. BACKEND - ROUTES (job.routes.ts)
   Matches: GET /api/jobs
   → No auth required for public jobs
   → Calls: jobController.getJobs
   ↓

6. BACKEND - CONTROLLER (job.controller.ts)
   → Extracts query params: { status: 'open' }
   → Calls: jobService.findJobs({ status: 'open' })
   ↓

7. BACKEND - SERVICE (job.service.ts)
   → Business logic: filter by status
   → Calls: Job.find({ status: 'open' })
   ↓

8. BACKEND - MODEL (Job.ts)
   → Mongoose query to MongoDB
   → Returns array of job documents
   ↓

9. MONGODB
   → Executes query on 'jobs' collection
   → Returns matching documents
   ↓

10. RESPONSE FLOWS BACK
   Model → Service → Controller → Routes → Response
   ↓

11. FRONTEND RECEIVES
   JavaScript: const data = await response.json()
   → data = { success: true, data: [job1, job2, ...] }
   ↓

12. FRONTEND RENDERS
   HTML updates with job list
```

---

## 🔐 Authentication Flow

### Registration & Login

```
REGISTRATION FLOW
─────────────────
1. User fills form → register.html
2. POST /api/auth/register
   { email, password, firstName, lastName, role }
3. Backend creates user (password hashed)
4. Backend sends verification email
5. User clicks email link → verify.html?token=abc123
6. POST /api/auth/verify-email { email, token }
7. Backend marks user.verified = true


LOGIN FLOW
──────────
1. User fills form → login.html
2. POST /api/auth/login { email, password }
3. Backend:
   - Finds user by email
   - Compares password hash
   - Generates JWT token
   - Returns { token, user, roles }
4. Frontend:
   - saveSession({ token, user, roles })
   - Redirects to appropriate dashboard


AUTHENTICATED REQUEST FLOW
───────────────────────────
1. User on dashboard fetches data
2. JavaScript: fetch('/api/dashboard/worker', {
     headers: { Authorization: `Bearer ${token}` }
   })
3. Backend middleware (auth.middleware.ts):
   - Extracts token from header
   - Verifies JWT signature
   - Decodes userId
   - Loads user from database
   - Attaches req.user
4. Controller has access to req.user
5. Returns user-specific data
```

---

## 📊 Data Flow Per Feature

### Feature 1: Job Posting (Employer creates job)

```
employer-dashboard.html
   ↓
   User clicks "Post New Job"
   ↓
POST /api/jobs
Headers: { Authorization: Bearer <token> }
Body: { title, description, category, salary, ... }
   ↓
auth.middleware.ts
   → Verifies token
   → Loads employer user
   ↓
job.routes.ts
   → authenticate → authorize('employer')
   → jobController.createJob
   ↓
job.controller.ts
   → Extracts req.body
   → Validates input
   → Calls jobService.createJob
   ↓
job.service.ts
   → Creates new Job document
   → job.employer = req.user._id
   → job.save()
   ↓
MongoDB
   → Inserts into 'jobs' collection
   ↓
Response: { success: true, data: { job } }
   ↓
Frontend updates UI
```

### Feature 2: Worker Applies for Job

```
jobs.html
   ↓
   Worker clicks "Apply" on job card
   ↓
POST /api/jobs/:jobId/apply
Headers: { Authorization: Bearer <token> }
Body: { coverLetter, resume }
   ↓
auth.middleware.ts
   → Verifies token
   → Loads worker user
   ↓
job.routes.ts
   → authenticate → authorize('worker')
   → jobController.applyForJob
   ↓
job.controller.ts
   → Extracts jobId, coverLetter, resume
   → Calls jobService.applyForJob
   ↓
job.service.ts
   → Finds job by ID
   → Creates Application document
   → application.job = jobId
   → application.applicant = req.user._id
   → application.save()
   → Increments job.applications count
   → Sends notification to employer
   ↓
MongoDB
   → Inserts into 'applications' collection
   → Updates 'jobs' collection
   ↓
Response: { success: true, data: { application } }
   ↓
Frontend shows success message
```

### Feature 3: Client Books Consultation

```
consultations.html
   ↓
   Client clicks "Book Consultation" for professional
   ↓
POST /api/professionals/:professionalId/book
Headers: { Authorization: Bearer <token> }
Body: { date, time, mode: 'video' }
   ↓
auth.middleware.ts
   → Verifies token
   → Loads client user
   ↓
professional.routes.ts
   → professional.controller.bookConsultation
   ↓
professional.controller.ts
   → Extracts professionalId, date, time, mode
   → Calls professionalService.bookConsultation
   ↓
professional.service.ts
   → Finds professional by ID
   → Checks availability
   → Creates Session document
   → Creates Payment record (pending)
   → Returns Paystack payment URL
   ↓
MongoDB
   → Inserts into 'sessions' collection
   → Inserts into 'payments' collection
   ↓
Response: { success: true, data: { session, paymentUrl } }
   ↓
Frontend redirects to payment page
```

---

## 🗂️ Database Relationships

```
User (Base)
   │
   ├──→ Worker (1:1)
   │      │
   │      └──→ Applications (1:many)
   │             │
   │             └──→ Job (many:1)
   │
   ├──→ Employer (1:1)
   │      │
   │      └──→ Jobs (1:many)
   │             │
   │             └──→ Applications (1:many)
   │
   ├──→ Professional (1:1)
   │      │
   │      ├──→ ConsultationServices (1:many)
   │      │
   │      └──→ Sessions (1:many)
   │             │
   │             ├──→ Client (User) (many:1)
   │             │
   │             └──→ Payment (1:1)
   │
   └──→ Merchant (1:1)
          │
          └──→ Products/Services (1:many)


Payment
   │
   ├──→ User (many:1)
   │
   └──→ Session/Job/Subscription (polymorphic)
```

---

## 📁 File to Feature Mapping

### User wants to: Find a worker

**Frontend:**
- [findworker.html](findworker.html) - Browse workers
- [session-utils.js](session-utils.js) - Get current employer session
- [api.js](api.js) - Make API call

**Backend:**
- [worker.routes.ts](backend/src/routes/worker.routes.ts) - `GET /api/workers`
- [worker.controller.ts](backend/src/controllers/worker.controller.ts) - `getWorkers()`
- [Worker.ts](backend/src/models/Worker.ts) - Worker model

**Database:**
- `workers` collection

---

### User wants to: Book a consultation

**Frontend:**
- [consultations.html](consultations.html) - Browse professionals
- [consultation-profile.html](consultation-profile.html) - View professional details
- [consultation-payment.html](consultation-payment.html) - Pay for consultation
- [consultation-session.html](consultation-session.html) - Join live session

**Backend:**
- [professional.routes.ts](backend/src/routes/professional.routes.ts) - Booking endpoints
- [professional.controller.ts](backend/src/controllers/professional.controller.ts) - Booking logic
- [payment.routes.ts](backend/src/routes/payment.routes.ts) - Payment processing
- [Session.ts](backend/src/models/Session.ts) - Session model
- [Payment.ts](backend/src/models/Payment.ts) - Payment model

**Database:**
- `professionals`, `sessions`, `payments` collections

---

### User wants to: Post a job

**Frontend:**
- [employer-dashboard.html](employer-dashboard.html) - Create job form

**Backend:**
- [job.routes.ts](backend/src/routes/job.routes.ts) - `POST /api/jobs`
- [job.controller.ts](backend/src/controllers/job.controller.ts) - `createJob()`
- [Job.ts](backend/src/models/Job.ts) - Job model

**Database:**
- `jobs` collection

---

## 🔧 Environment Setup

### Frontend Environment

```
No build process required!

Just serve static files:
- Python: python -m http.server 8000
- Node: npx http-server -p 8000
- VS Code: Live Server extension

Frontend runs on: http://localhost:8000
```

### Backend Environment

```
Requirements:
- Node.js 18+
- MongoDB running

Setup:
1. cd backend
2. npm install
3. cp .env.example .env
4. Edit .env (set MONGODB_URI, JWT_SECRET, etc.)
5. npm run dev

Backend runs on: http://localhost:4000
```

### Database Setup

**Option 1: Local MongoDB**
```bash
# Install MongoDB
brew install mongodb-community  # macOS
# OR download from mongodb.com

# Start MongoDB
mongod

# .env
MONGODB_URI=mongodb://localhost:27017/sirius-jobs
```

**Option 2: MongoDB Atlas (Cloud)**
```bash
# Create account at mongodb.com/atlas
# Create cluster
# Get connection string

# .env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/sirius-jobs
```

---

## 🚀 Deployment Architecture

### Production Setup

```
                         USERS
                           │
                           ↓
                    ┌──────────────┐
                    │   Domain     │
                    │ siriusjobs.ng│
                    └──────────────┘
                           │
            ┌──────────────┴──────────────┐
            │                             │
            ↓                             ↓
    ┌──────────────┐            ┌──────────────┐
    │   Frontend   │            │   Backend    │
    │   (Vercel/   │            │   (Railway/  │
    │   Netlify)   │            │   Render)    │
    └──────────────┘            └──────────────┘
                                       │
                                       ↓
                              ┌──────────────┐
                              │   MongoDB    │
                              │    Atlas     │
                              └──────────────┘
```

**Frontend Deploy:**
- Host: Vercel, Netlify, or any static host
- Set `window.SIRIUS_API_BASE = 'https://api.siriusjobs.ng'`

**Backend Deploy:**
- Host: Railway, Render, DigitalOcean, AWS
- Set environment variables
- Configure domain

**Database:**
- MongoDB Atlas (managed cloud database)

---

## 📝 API Endpoint Summary

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout
- `POST /api/auth/verify-email` - Verify email

### Workers
- `GET /api/workers` - List workers
- `GET /api/workers/:id` - Get worker profile
- `PUT /api/workers/profile` - Update worker profile (auth)
- `GET /api/dashboard/worker` - Worker dashboard (auth)

### Employers
- `GET /api/employers/:id` - Get employer profile
- `PUT /api/employers/profile` - Update employer profile (auth)
- `GET /api/dashboard/employer` - Employer dashboard (auth)

### Jobs
- `GET /api/jobs` - List jobs
- `GET /api/jobs/:id` - Get job details
- `POST /api/jobs` - Create job (auth: employer)
- `PUT /api/jobs/:id` - Update job (auth: employer)
- `DELETE /api/jobs/:id` - Delete job (auth: employer)
- `POST /api/jobs/:id/apply` - Apply for job (auth: worker)

### Applications
- `GET /api/applications/me` - My applications (auth)
- `GET /api/applications/:id` - Get application (auth)
- `PUT /api/applications/:id/status` - Update status (auth: employer)

### Professionals
- `GET /api/professionals` - List professionals
- `GET /api/professionals/:id` - Get professional profile
- `POST /api/professionals/:id/book` - Book consultation (auth)
- `GET /api/dashboard/professional` - Professional dashboard (auth)

### Merchants
- `GET /api/merchants` - List merchants
- `GET /api/merchants/me` - Get my merchant profile (auth)
- `PUT /api/merchants/profile` - Update merchant profile (auth)
- `POST /api/merchants/subscribe` - Subscribe to plan (auth)

### Payments
- `POST /api/payments/initialize` - Initialize payment
- `GET /api/payments/verify/:reference` - Verify payment

### Uploads
- `POST /api/upload` - Upload file (auth)

---

## 🛡️ Security Measures

```
Frontend Security:
✓ No sensitive data in code
✓ Tokens in sessionStorage (not localStorage)
✓ HTTPS only in production
✓ Input validation before submit

Backend Security:
✓ Helmet.js (security headers)
✓ CORS (restrict origins)
✓ Rate limiting (prevent abuse)
✓ JWT authentication
✓ Password hashing (bcrypt)
✓ Input validation (Zod)
✓ SQL injection prevention (Mongoose)
✓ XSS prevention
✓ File upload restrictions
```

---

## 📈 Scalability Considerations

**Current Architecture:**
- Single backend server
- Direct MongoDB connection
- Monolithic application

**Future Improvements:**
- Load balancer (multiple backend instances)
- Redis caching (reduce database queries)
- CDN for static assets
- Microservices (split by domain)
- Message queue (background jobs)
- WebSocket server separation

---

## 🎯 Key Takeaways for Developers

1. **Frontend is simple:** Plain HTML/JS, no build process
2. **Backend follows MVC + Services:** Routes → Controllers → Services → Models
3. **Authentication is JWT-based:** Token in header for protected routes
4. **Database is MongoDB:** NoSQL, document-based
5. **API is RESTful:** Standard HTTP methods, JSON responses
6. **Real-time uses Socket.io:** For live consultations
7. **Multi-role system:** One user can have multiple roles
8. **All documented:** README, BACKEND_GUIDE, FRONTEND_GUIDE

---

**Start here:** [README.md](README.md)
**Backend details:** [BACKEND_GUIDE.md](BACKEND_GUIDE.md)
**Frontend details:** [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md)
