# SIRIUS JOBS

A comprehensive job marketplace and professional consultation platform built for Nigerian businesses and talent.

## 🎯 Project Overview

SIRIUS JOBS is a multi-purpose platform that provides:

1. **Job Marketplace** - Connect employers with workers (artisans, professionals)
2. **Professional Consultations** - Book verified doctors and lawyers for consultations
3. **Marketplace** - Vendor storefront for businesses to showcase products/services

## 🏗️ Architecture

```
SIRIUS-JOBS/
├── Frontend (HTML/JavaScript)     → User interface (runs in browser)
├── Backend (TypeScript/Node.js)   → API server (runs on port 4000)
└── Database (MongoDB)             → Data storage
```

### Technology Stack

**Frontend:**
- HTML5, CSS3 (Tailwind CSS)
- Vanilla JavaScript
- Feather Icons

**Backend:**
- TypeScript
- Node.js + Express
- MongoDB + Mongoose
- Socket.io (real-time features)
- JWT Authentication

**Tools:**
- Git for version control
- npm for package management

---

## 📁 Project Structure

### Root Directory (Frontend)

```
/
├── index.html                  # Homepage
├── about.html, contact.html    # Static pages
├── services.html, faq.html     # Information pages
│
├── Authentication Pages
│   ├── login.html              # Universal login page
│   ├── register.html           # Worker/employer registration
│   ├── marketplace-register.html  # Merchant registration
│   └── consultation-pro-register.html  # Professional registration
│
├── Dashboard Pages
│   ├── worker-dashboard.html      # Worker dashboard
│   ├── employer-dashboard.html    # Employer dashboard
│   ├── professional-dashboard.html # Professional dashboard
│   └── marketplace-dashboard.html  # Merchant dashboard
│
├── Job Features
│   ├── jobs.html               # Browse jobs
│   ├── findworker.html         # Find workers
│   └── edit-profile.html       # Profile editing
│
├── Consultation Features
│   ├── consultations.html      # Browse professionals
│   ├── consultation-dashboard.html  # Client consultations
│   ├── consultation-session.html    # Live session
│   ├── consultation-payment.html    # Payment page
│   └── consultation-profile.html    # Professional profile
│
├── Marketplace Features
│   └── marketplace.html        # Browse vendors
│
├── Utility JavaScript Files
│   ├── api.js                  # API base URL configuration
│   ├── session-utils.js        # Session management
│   ├── error-handler.js        # Error handling
│   ├── loading-utils.js        # Loading states
│   ├── ui-utils.js             # UI helpers
│   ├── upload-utils.js         # File uploads
│   ├── assistant.js            # Chatbot/assistant
│   └── session-timeout.js      # Session timeout
│
├── Static Assets
│   ├── assets/                 # CSS, SVG, site-shell.js
│   └── images/                 # Logos, user images
│
└── Configuration
    ├── package.json            # Root dependencies (minimal)
    ├── .gitignore              # Git ignore rules
    └── .claude/                # Claude Code settings
```

### Backend Directory

```
backend/
├── src/                        # TypeScript source code
│   ├── server.ts               # Server entry point
│   ├── app.ts                  # Express app configuration
│   │
│   ├── routes/                 # API route definitions
│   │   ├── auth.routes.ts      # Authentication endpoints
│   │   ├── worker.routes.ts    # Worker endpoints
│   │   ├── employer.routes.ts  # Employer endpoints
│   │   ├── professional.routes.ts  # Professional endpoints
│   │   ├── merchant.routes.ts  # Merchant endpoints
│   │   ├── job.routes.ts       # Job posting endpoints
│   │   ├── services.routes.ts  # Consultation services
│   │   ├── payment.routes.ts   # Payment processing
│   │   ├── upload.routes.ts    # File upload
│   │   ├── dashboard.routes.ts # Dashboard stats
│   │   ├── profiles.routes.ts  # Profile management
│   │   ├── applications.routes.ts  # Job applications
│   │   ├── analytics.routes.ts # Analytics data
│   │   ├── alerts.routes.ts    # Notifications
│   │   └── public.routes.ts    # Public data
│   │
│   ├── controllers/            # Business logic handlers
│   │   ├── auth.controller.ts
│   │   ├── worker.controller.ts
│   │   ├── employer.controller.ts
│   │   ├── professional.controller.ts
│   │   ├── merchant.controller.ts
│   │   ├── job.controller.ts
│   │   ├── services.controller.ts
│   │   ├── payment.controller.ts
│   │   ├── upload.controller.ts
│   │   └── public.controller.ts
│   │
│   ├── models/                 # MongoDB schemas
│   │   ├── User.ts             # Base user model
│   │   ├── Worker.ts           # Worker profile
│   │   ├── Employer.ts         # Employer profile
│   │   ├── Professional.ts     # Professional profile
│   │   ├── Merchant.ts         # Merchant profile
│   │   ├── Job.ts              # Job postings
│   │   ├── Application.ts      # Job applications
│   │   ├── ConsultationService.ts  # Services offered
│   │   ├── Session.ts          # Consultation sessions
│   │   ├── Payment.ts          # Payment records
│   │   └── Analytics.ts        # Analytics data
│   │
│   ├── middleware/             # Express middleware
│   │   ├── auth.middleware.ts  # JWT authentication
│   │   ├── error.middleware.ts # Error handling
│   │   ├── rateLimiter.ts      # Rate limiting
│   │   └── upload.middleware.ts # File upload handling
│   │
│   ├── services/               # Business logic services
│   │   ├── auth.service.ts
│   │   ├── email.service.ts    # Email sending
│   │   ├── payment.service.ts  # Payment processing
│   │   └── analytics.service.ts
│   │
│   ├── utils/                  # Utility functions
│   │   ├── validators.ts       # Input validation
│   │   ├── helpers.ts          # Helper functions
│   │   └── constants.ts        # Constants
│   │
│   ├── config/                 # Configuration files
│   │   ├── database.ts         # MongoDB connection
│   │   └── env.ts              # Environment variables
│   │
│   ├── types/                  # TypeScript type definitions
│   │   └── index.ts
│   │
│   └── lib/                    # External libraries config
│       └── logger.ts           # Winston logger setup
│
├── scripts/                    # Utility scripts
│   ├── create-test-accounts.ts
│   ├── seed-professionals.ts
│   └── clear-database.ts
│
├── uploads/                    # User uploaded files (gitignored)
├── dist/                       # Compiled JavaScript (gitignored)
├── node_modules/               # Dependencies (gitignored)
│
├── package.json                # Backend dependencies
├── tsconfig.json               # TypeScript configuration
├── .env                        # Environment variables (gitignored)
└── .env.example                # Environment template
```

---

## 🔄 How Frontend Connects to Backend

### API Communication Flow

```
Frontend (Browser)
    ↓
api.js (configures base URL: http://localhost:4000)
    ↓
fetch('/api/endpoint') → Automatically becomes http://localhost:4000/api/endpoint
    ↓
Backend Express Server (port 4000)
    ↓
Routes → Controllers → Services → Models
    ↓
MongoDB Database
```

### Example: User Login Flow

1. **Frontend:** User fills login form in `login.html`
2. **JavaScript:** Form submits via `fetch('/api/auth/login', {...})`
3. **api.js:** Converts to `http://localhost:4000/api/auth/login`
4. **Backend:** `auth.routes.ts` → `auth.controller.ts` → `auth.service.ts`
5. **Database:** Query MongoDB for user credentials
6. **Response:** JWT token sent back to frontend
7. **Frontend:** Token stored in `sessionStorage` via `session-utils.js`
8. **All future requests:** Include token in `Authorization` header

---

## 🚀 Quick Start for Developers

### Prerequisites

- Node.js (v18+)
- MongoDB (running locally or MongoDB Atlas)
- npm or yarn

### 1. Clone & Install

```bash
# Clone repository
git clone https://github.com/MrChizim/SIRIUS-JOBS.git
cd HELLOworld

# Install root dependencies (minimal - just Anthropic SDK)
npm install

# Install backend dependencies
cd backend
npm install
```

### 2. Configure Environment

```bash
# In backend/ folder, create .env file
cp .env.example .env

# Edit .env with your values:
# - MONGODB_URI
# - JWT_SECRET
# - PORT (default: 4000)
# - CLIENT_ORIGIN (frontend URL)
```

### 3. Run the Application

```bash
# Terminal 1: Start MongoDB (if local)
mongod

# Terminal 2: Start Backend Server
cd backend
npm run dev
# Server runs on http://localhost:4000

# Terminal 3: Serve Frontend (use any static server)
# Option 1: Python
python -m http.server 8000

# Option 2: Node.js
npx http-server -p 8000

# Frontend accessible at http://localhost:8000
```

### 4. Verify Setup

- Backend health check: http://localhost:4000/health
- Frontend: http://localhost:8000/index.html
- Try logging in with test accounts (see backend/scripts/)

---

## 🔐 Authentication & Authorization

### User Roles

The platform supports multiple user types:

1. **CLIENT** - Regular users booking consultations
2. **WORKER** - Artisans, skilled workers
3. **EMPLOYER** - Companies hiring workers
4. **PROFESSIONAL** - Doctors, lawyers (consultation providers)
5. **MERCHANT** - Marketplace vendors

### How Auth Works

1. **Registration:** User registers via `/api/auth/register-{role}`
2. **Login:** User logs in via `/api/auth/login`
3. **Token:** Server returns JWT token
4. **Storage:** Frontend stores token in `sessionStorage`
5. **Protected Routes:** Frontend sends token in `Authorization: Bearer {token}` header
6. **Backend Validation:** `auth.middleware.ts` validates token on protected routes

---

## 📡 API Endpoints Overview

All backend APIs are prefixed with `/api/`

### Authentication (`/api/auth/`)
- `POST /register` - Register any user type
- `POST /register-professional` - Register professional
- `POST /register-merchant` - Register merchant
- `POST /login` - Login
- `GET /me` - Get current user (requires auth)
- `POST /logout` - Logout
- `POST /verify-email` - Verify email
- `POST /extend-role` - Add additional role to account

### Workers (`/api/workers/`)
- `GET /` - List all workers
- `GET /:id` - Get worker details
- `PUT /profile` - Update worker profile

### Employers (`/api/employers/`)
- `GET /dashboard` - Employer dashboard stats
- `POST /jobs` - Create job posting

### Jobs (`/api/jobs/`)
- `GET /` - List all jobs
- `GET /:id` - Get job details
- `POST /` - Create job (employer only)
- `POST /:id/apply` - Apply for job

### Professionals (`/api/professionals/`)
- `GET /` - List all professionals
- `GET /:id` - Get professional details
- `GET /dashboard` - Professional dashboard
- `POST /:id/book` - Book consultation
- `POST /:id/review` - Submit review

### Merchants (`/api/merchants/`)
- `GET /` - List all merchants
- `GET /me` - Get merchant profile
- `PUT /profile` - Update merchant profile
- `POST /subscribe` - Subscribe to plan

### Payments (`/api/payments/`)
- `POST /initialize` - Initialize payment
- `GET /verify/:reference` - Verify payment

### Dashboard (`/api/dashboard/`)
- `GET /worker` - Worker dashboard stats
- `GET /employer` - Employer dashboard stats
- `GET /professional` - Professional dashboard stats

See [backend/API_DOCUMENTATION.md](backend/API_DOCUMENTATION.md) for full API reference.

---

## 🗄️ Database Models

### User Model (Base)
All user types extend from the base User model:
```typescript
{
  email: string
  password: string (hashed)
  firstName: string
  lastName: string
  roles: string[]  // Can have multiple roles
  verified: boolean
  createdAt: Date
}
```

### Worker Profile
```typescript
{
  user: ObjectId → User
  skills: string[]
  experience: string
  location: string
  availability: string
}
```

### Professional Profile
```typescript
{
  user: ObjectId → User
  profession: string
  licenseNumber: string
  regulatoryBody: string
  licenseVerified: boolean
  onboardingPaid: boolean
  consultationRate: number
}
```

### Job Posting
```typescript
{
  employer: ObjectId → User
  title: string
  description: string
  category: string
  location: string
  salary: number
  applications: ObjectId[] → Application
}
```

---

## 📝 Key Files to Understand

### Frontend Core Files

1. **[api.js](api.js)** - Configures API base URL, wraps fetch
2. **[session-utils.js](session-utils.js)** - Manages user sessions, tokens
3. **[error-handler.js](error-handler.js)** - Global error handling
4. **[loading-utils.js](loading-utils.js)** - Loading state management

### Backend Core Files

1. **[backend/src/server.ts](backend/src/server.ts)** - Server entry point
2. **[backend/src/app.ts](backend/src/app.ts)** - Express app setup, routes
3. **[backend/src/middleware/auth.middleware.ts](backend/src/middleware/auth.middleware.ts)** - Auth logic
4. **[backend/src/config/database.ts](backend/src/config/database.ts)** - MongoDB connection

---

## 🛠️ Development Workflow

### Adding a New Feature

1. **Backend:**
   - Create model in `backend/src/models/`
   - Create controller in `backend/src/controllers/`
   - Create routes in `backend/src/routes/`
   - Register routes in `backend/src/app.ts`

2. **Frontend:**
   - Create/update HTML page
   - Use `fetch('/api/your-endpoint')` to call backend
   - Handle response with error-handler.js

### Testing Changes

```bash
# Backend: Restart dev server (auto-reload with tsx watch)
cd backend
npm run dev

# Frontend: Refresh browser
# No build step needed - plain HTML/JS
```

---

## 🐛 Common Issues & Solutions

### "Cannot connect to backend"
- Check backend is running on port 4000
- Verify `api.js` has correct API_BASE URL
- Check CORS settings in `backend/src/app.ts`

### "Authentication failed"
- Check JWT_SECRET is set in backend/.env
- Verify token is being sent in Authorization header
- Check token hasn't expired

### "Database connection failed"
- Verify MongoDB is running
- Check MONGODB_URI in backend/.env
- Ensure network access (if using MongoDB Atlas)

---

## 📚 Additional Documentation

- [Backend API Documentation](backend/API_DOCUMENTATION.md)
- [Deployment Guide](backend/DEPLOYMENT_GUIDE.md)
- [Environment Variables](backend/.env.example)

---

## 👥 Contributing

When working on this project:

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Test thoroughly
4. Commit: `git commit -m "feat: description"`
5. Push: `git push origin feature/your-feature`
6. Create Pull Request

---

## 📞 Support

For questions or issues, contact the development team.

---

**Built for Nigerian businesses & talent** 🇳🇬
