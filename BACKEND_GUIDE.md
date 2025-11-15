# Backend Developer Guide

Complete guide for backend developers working on SIRIUS JOBS backend.

---

## 🎯 Backend Overview

The backend is a RESTful API server built with:
- **TypeScript** for type safety
- **Express.js** for HTTP server
- **MongoDB** with Mongoose for data persistence
- **JWT** for authentication
- **Socket.io** for real-time features (consultations)

**Location:** `/backend/`
**Port:** 4000 (configurable via .env)
**Base URL:** `http://localhost:4000`

---

## 📁 Backend File Structure Explained

### Entry Points

```
backend/src/
├── server.ts           # Server startup (connects DB, starts Express)
└── app.ts              # Express app configuration (middleware, routes)
```

**Flow:** `server.ts` imports `app.ts` → connects MongoDB → starts listening on port 4000

### Routes → Controllers → Services → Models

This backend follows the **MVC + Services pattern**:

```
HTTP Request
    ↓
1. ROUTES (backend/src/routes/*.routes.ts)
   - Define endpoints (GET /api/jobs, POST /api/auth/login, etc.)
   - Apply middleware (authentication, validation)
   - Call controller functions
    ↓
2. CONTROLLERS (backend/src/controllers/*.controller.ts)
   - Handle request/response
   - Extract data from req.body, req.params
   - Call service functions
   - Return JSON responses
    ↓
3. SERVICES (backend/src/services/*.service.ts)
   - Business logic
   - Database operations
   - External API calls (payments, emails)
    ↓
4. MODELS (backend/src/models/*.ts)
   - Mongoose schemas
   - Database structure
   - Data validation
    ↓
MongoDB Database
```

---

## 🗂️ Directory Deep Dive

### 1. Routes (`backend/src/routes/`)

Each route file handles one domain:

**File** | **Endpoint Prefix** | **Purpose**
---------|---------------------|-------------
`auth.routes.ts` | `/api/auth/*` | Login, register, logout, verify email
`worker.routes.ts` | `/api/workers/*` | Worker profiles, search, updates
`employer.routes.ts` | `/api/employers/*` | Employer profiles, dashboard
`job.routes.ts` | `/api/jobs/*` | Job CRUD, applications
`professional.routes.ts` | `/api/professionals/*` | Professional profiles, booking
`merchant.routes.ts` | `/api/merchants/*` | Merchant profiles, marketplace
`payment.routes.ts` | `/api/payments/*` | Payment initialization, verification
`services.routes.ts` | `/api/services/*` | Consultation services
`dashboard.routes.ts` | `/api/dashboard/*` | Dashboard stats for all roles
`profiles.routes.ts` | `/api/profiles/*` | Profile management
`applications.routes.ts` | `/api/applications/*` | Job applications
`analytics.routes.ts` | `/api/analytics/*` | Analytics data
`alerts.routes.ts` | `/api/alerts/*` | Notifications
`upload.routes.ts` | `/api/upload/*` | File uploads
`public.routes.ts` | `/api/v2/public/*` | Public data (no auth)

**Example:** `auth.routes.ts`

```typescript
import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes (require authentication)
router.get('/me', authenticate, authController.getMe);
router.post('/logout', authenticate, authController.logout);

export default router;
```

### 2. Controllers (`backend/src/controllers/`)

Controllers handle HTTP request/response logic.

**Responsibilities:**
- Parse request data (`req.body`, `req.params`, `req.query`)
- Call service functions
- Handle errors
- Send responses

**Example:** `auth.controller.ts`

```typescript
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // Call service
    const result = await authService.login(email, password);

    // Set cookie
    res.cookie('token', result.token, { httpOnly: true });

    // Send response
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error); // Pass to error middleware
  }
}
```

### 3. Services (`backend/src/services/`)

Services contain business logic.

**Responsibilities:**
- Database queries
- Data validation
- Business rules
- External API calls

**Example:** `auth.service.ts`

```typescript
export async function login(email: string, password: string) {
  // Find user
  const user = await User.findOne({ email });
  if (!user) throw new Error('Invalid credentials');

  // Check password
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) throw new Error('Invalid credentials');

  // Generate token
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);

  return { token, user };
}
```

### 4. Models (`backend/src/models/`)

Mongoose schemas define database structure.

**Example:** `User.ts`

```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roles: string[];
  verified: boolean;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  roles: [{ type: String, enum: ['CLIENT', 'WORKER', 'EMPLOYER', 'PROFESSIONAL', 'MERCHANT'] }],
  verified: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
```

### 5. Middleware (`backend/src/middleware/`)

Middleware functions run before controllers.

**File** | **Purpose**
---------|-------------
`auth.middleware.ts` | JWT verification, role-based access
`error.middleware.ts` | Global error handling
`rateLimiter.ts` | Rate limiting (prevent abuse)
`upload.middleware.ts` | Multer file upload configuration

**Example:** `auth.middleware.ts`

```typescript
export async function authenticate(req, res, next) {
  try {
    // Extract token
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new Error('No token provided');

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user to request
    req.user = await User.findById(decoded.userId);

    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
  }
}

export function authorize(...roles: string[]) {
  return (req, res, next) => {
    if (!roles.some(role => req.user.roles.includes(role))) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    next();
  };
}
```

---

## 🔐 Authentication Flow

### Registration

```
1. Frontend sends: POST /api/auth/register
   {
     email, password, firstName, lastName, role
   }

2. Backend (auth.controller.register):
   - Validates input
   - Hashes password
   - Creates user in database
   - Sends verification email
   - Returns user data (no token yet)

3. User verifies email via link

4. Frontend sends: POST /api/auth/verify-email
   { email, token }

5. Backend marks user.verified = true
```

### Login

```
1. Frontend sends: POST /api/auth/login
   { email, password }

2. Backend (auth.controller.login):
   - Finds user by email
   - Compares hashed password
   - Generates JWT token
   - Sets httpOnly cookie
   - Returns { token, user }

3. Frontend stores token in sessionStorage
```

### Protected Requests

```
1. Frontend sends: GET /api/professionals/dashboard
   Headers: {
     Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   }

2. Backend (auth.middleware.authenticate):
   - Extracts token from header
   - Verifies token with JWT_SECRET
   - Decodes userId from token
   - Loads user from database
   - Attaches req.user
   - Continues to controller

3. Controller has access to req.user
```

---

## 🗄️ Database Schema Reference

### User (Base Model)
```typescript
{
  _id: ObjectId
  email: string (unique)
  password: string (hashed)
  firstName: string
  lastName: string
  roles: string[]  // ['WORKER'], ['EMPLOYER'], ['PROFESSIONAL'], etc.
  verified: boolean
  createdAt: Date
  updatedAt: Date
}
```

### Worker Profile
```typescript
{
  _id: ObjectId
  user: ObjectId → User
  skills: string[]
  category: string  // "Plumber", "Electrician", etc.
  experience: number  // years
  location: {
    state: string
    lga: string
  }
  availability: string
  hourlyRate: number
  portfolio: string[]  // image URLs
  verified: boolean
  rating: number
  reviews: number
}
```

### Employer Profile
```typescript
{
  _id: ObjectId
  user: ObjectId → User
  companyName: string
  industry: string
  companySize: string
  location: {
    state: string
    lga: string
  }
  website: string
  verified: boolean
}
```

### Professional Profile
```typescript
{
  _id: ObjectId
  user: ObjectId → User
  profession: string  // "Doctor", "Lawyer"
  licenseNumber: string
  regulatoryBody: string  // "MDCN", "NBA"
  licenseVerified: boolean
  onboardingPaid: boolean
  profilePublic: boolean
  consultationRate: number
  specialization: string
  yearsOfExperience: number
  bio: string
  rating: number
  reviewCount: number
}
```

### Merchant Profile
```typescript
{
  _id: ObjectId
  user: ObjectId → User
  businessName: string
  category: string
  description: string
  location: string
  contactPhone: string
  instagram: string
  whatsapp: string
  media: Array<{
    type: 'image' | 'video'
    url: string
    thumbnail: string
  }>
  subscription: {
    plan: string
    expiresAt: Date
  }
  clicks: {
    social: number
    images: number
  }
}
```

### Job
```typescript
{
  _id: ObjectId
  employer: ObjectId → User
  title: string
  description: string
  category: string
  skillsRequired: string[]
  location: {
    state: string
    lga: string
  }
  employmentType: 'full-time' | 'part-time' | 'contract'
  salary: {
    min: number
    max: number
    currency: string
  }
  status: 'open' | 'closed' | 'filled'
  applications: number
  views: number
  createdAt: Date
  expiresAt: Date
}
```

### Application
```typescript
{
  _id: ObjectId
  job: ObjectId → Job
  applicant: ObjectId → User (Worker)
  coverLetter: string
  resume: string  // file URL
  status: 'pending' | 'reviewed' | 'shortlisted' | 'rejected' | 'hired'
  appliedAt: Date
  reviewedAt: Date
}
```

### Consultation Session
```typescript
{
  _id: ObjectId
  professional: ObjectId → User (Professional)
  client: ObjectId → User (Client)
  service: ObjectId → ConsultationService
  scheduledFor: Date
  duration: number  // minutes
  mode: 'video' | 'phone' | 'chat'
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled'
  payment: {
    amount: number
    reference: string
    status: 'pending' | 'paid' | 'refunded'
  }
  rating: number
  review: string
  createdAt: Date
}
```

### Payment
```typescript
{
  _id: ObjectId
  user: ObjectId → User
  type: 'consultation' | 'onboarding' | 'subscription'
  amount: number
  reference: string  // Paystack reference
  status: 'pending' | 'success' | 'failed'
  metadata: Object
  paidAt: Date
}
```

---

## 🔧 Environment Variables

Create `backend/.env` file:

```bash
# Server
NODE_ENV=development
PORT=4000

# Database
MONGODB_URI=mongodb://localhost:27017/sirius-jobs
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sirius-jobs

# JWT
JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRE=7d

# Client
CLIENT_ORIGIN=http://localhost:8000

# Email (for verification, notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Payment (Paystack)
PAYSTACK_SECRET_KEY=sk_test_xxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxx

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880  # 5MB in bytes

# Socket.io
SOCKET_CORS_ORIGIN=http://localhost:8000
```

---

## 🚀 Running the Backend

### Development Mode

```bash
cd backend
npm run dev
```

This runs `tsx watch src/server.ts` which:
- Compiles TypeScript on the fly
- Auto-restarts on file changes
- Shows console logs

### Production Build

```bash
cd backend
npm run build    # Compiles to backend/dist/
npm start        # Runs compiled code
```

---

## 🛠️ Common Development Tasks

### Add a New API Endpoint

**Example: Add GET /api/workers/:id/reviews**

1. **Create route** in `backend/src/routes/worker.routes.ts`:
```typescript
router.get('/:id/reviews', workerController.getReviews);
```

2. **Create controller** in `backend/src/controllers/worker.controller.ts`:
```typescript
export async function getReviews(req, res, next) {
  try {
    const { id } = req.params;
    const reviews = await Review.find({ worker: id })
      .populate('client', 'firstName lastName')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: reviews });
  } catch (error) {
    next(error);
  }
}
```

3. **Test:**
```bash
curl http://localhost:4000/api/workers/123/reviews
```

### Add Database Migration/Seed Data

Use scripts in `backend/scripts/`:

```typescript
// backend/scripts/create-sample-workers.ts
import mongoose from 'mongoose';
import Worker from '../src/models/Worker';

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);

  await Worker.create({
    // ...worker data
  });

  console.log('Seed complete');
  process.exit(0);
}

seed();
```

Run: `npx tsx backend/scripts/create-sample-workers.ts`

### Debug a Request

Add logging in controller:

```typescript
export async function getJobs(req, res, next) {
  console.log('📥 Request query:', req.query);
  console.log('👤 Authenticated user:', req.user);

  // ... rest of code
}
```

---

## 🐛 Troubleshooting

### "MongooseError: Cannot connect to MongoDB"

**Check:**
1. MongoDB is running: `mongod` or check MongoDB Atlas
2. `MONGODB_URI` in `.env` is correct
3. Network access allowed (Atlas: add IP whitelist)

### "JsonWebTokenError: invalid signature"

**Check:**
1. `JWT_SECRET` matches between frontend/backend
2. Token hasn't expired
3. Token format is `Bearer <token>` in Authorization header

### "Error: Cannot find module"

**Solution:**
```bash
cd backend
npm install
```

### "Port 4000 already in use"

**Solution:**
```bash
# Find process using port 4000
lsof -i :4000

# Kill it
kill -9 <PID>

# OR change port in .env
PORT=4001
```

---

## 📊 API Response Format

All API responses follow this structure:

### Success Response
```json
{
  "success": true,
  "data": {
    // Actual data here
  },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE",
  "details": {}  // Optional validation errors
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 145,
    "pages": 8
  }
}
```

---

## 🧪 Testing

Currently no automated tests. To add:

```bash
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest
```

Create `backend/src/__tests__/auth.test.ts`:

```typescript
import request from 'supertest';
import app from '../app';

describe('POST /api/auth/register', () => {
  it('should create a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'WORKER'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});
```

---

## 📦 Dependencies Explained

**Production Dependencies:**

- `express` - HTTP server framework
- `mongoose` - MongoDB ORM
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT token generation/verification
- `dotenv` - Environment variables
- `cors` - Cross-origin resource sharing
- `helmet` - Security headers
- `morgan` - HTTP request logger
- `winston` - Application logger
- `multer` - File upload handling
- `socket.io` - Real-time websockets
- `axios` - HTTP client (for external APIs)
- `validator` - Input validation
- `zod` - Schema validation
- `cookie-parser` - Cookie parsing
- `express-rate-limit` - Rate limiting
- `nodemailer` - Email sending

**Dev Dependencies:**

- `typescript` - TypeScript compiler
- `tsx` - TypeScript execution & watch mode
- `@types/*` - TypeScript type definitions

---

## 🔄 Request Lifecycle Example

**Scenario:** Worker updates their profile

```
1. Frontend (edit-profile.html)
   ↓
   fetch('/api/workers/profile', {
     method: 'PUT',
     headers: { Authorization: 'Bearer abc123...' },
     body: JSON.stringify({ skills: ['Plumbing', 'Electrical'] })
   })

2. api.js
   ↓
   Converts to: http://localhost:4000/api/workers/profile

3. Backend (app.ts)
   ↓
   Receives request → Runs middleware:
   - helmet (security headers)
   - cors (allow frontend origin)
   - json parser (parse body)
   - morgan (log request)

4. Routes (worker.routes.ts)
   ↓
   Matches: PUT /api/workers/profile
   Middleware: authenticate → Verifies JWT, loads user
   Calls: workerController.updateProfile

5. Controller (worker.controller.ts)
   ↓
   Extracts: req.body.skills
   Calls: workerService.updateProfile(req.user.id, data)

6. Service (worker.service.ts)
   ↓
   Finds worker: Worker.findOne({ user: userId })
   Updates: worker.skills = skills
   Saves: worker.save()
   Returns: updated worker

7. Controller
   ↓
   Sends: res.json({ success: true, data: worker })

8. Frontend
   ↓
   Receives: { success: true, data: { skills: [...] } }
   Updates UI
```

---

## 📝 Code Style Guide

### File Naming
- Routes: `*.routes.ts`
- Controllers: `*.controller.ts`
- Services: `*.service.ts`
- Models: Capitalized (e.g., `User.ts`, `Job.ts`)

### Function Naming
- Controllers: `async function getJobs(req, res, next)`
- Services: `async function findJobById(id: string)`
- Models: Use Mongoose methods

### Error Handling
Always use try-catch with next():

```typescript
export async function controllerFunction(req, res, next) {
  try {
    // Logic here
  } catch (error) {
    next(error);  // Pass to error middleware
  }
}
```

### TypeScript
- Define interfaces for all data structures
- Use proper types (avoid `any`)
- Export types from `backend/src/types/`

---

## 🚢 Deployment Checklist

- [ ] Set `NODE_ENV=production` in .env
- [ ] Use strong `JWT_SECRET` (32+ characters)
- [ ] Use MongoDB Atlas (not local MongoDB)
- [ ] Set proper `CLIENT_ORIGIN` (production frontend URL)
- [ ] Configure SMTP for emails
- [ ] Set up Paystack production keys
- [ ] Enable SSL/HTTPS
- [ ] Set up process manager (PM2, systemd)
- [ ] Configure reverse proxy (Nginx)
- [ ] Set up logging (Winston → file/service)
- [ ] Enable rate limiting
- [ ] Backup database regularly

See [DEPLOYMENT_GUIDE.md](backend/DEPLOYMENT_GUIDE.md) for detailed deployment instructions.

---

**Questions? Check the main [README.md](../README.md) or ask the team!**
