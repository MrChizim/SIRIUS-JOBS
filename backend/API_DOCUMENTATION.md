# 📚 Sirius Jobs API Documentation

## Base URLs

- **New API (v2)**: `http://localhost:4000/api/v2`
- **Legacy API (v1)**: `http://localhost:4000/api`
- **Health Check**: `http://localhost:4000/health`

---

## 🔐 Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## 📍 API Endpoints

### **Authentication** (`/api/v2/auth`)

#### Register User
```http
POST /api/v2/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "accountType": "worker" // or "employer", "professional", "merchant"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "accountType": "worker",
      "isVerified": false
    },
    "accessToken": "jwt_token...",
    "refreshToken": "refresh_token..."
  }
}
```

#### Login
```http
POST /api/v2/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

#### Get Current User
```http
GET /api/v2/auth/me
Authorization: Bearer <token>
```

#### Logout
```http
POST /api/v2/auth/logout
Authorization: Bearer <token>
```

---

### **Workers** (`/api/v2/workers`)

#### Get All Workers (Public)
```http
GET /api/v2/workers?page=1&limit=20&skills=plumbing,carpentry&location=Lagos
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `skills` (optional): Comma-separated skills
- `location` (optional): Location filter

**Response:**
```json
{
  "success": true,
  "data": {
    "workers": [
      {
        "userId": "user_id",
        "skills": ["plumbing", "carpentry"],
        "experience": "5 years of professional work...",
        "location": "Lagos",
        "profilePhoto": "https://...",
        "subscription": {
          "status": "active",
          "endDate": "2025-12-13"
        },
        "user": {
          "id": "user_id",
          "name": "John Doe"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

#### Get Worker By ID (Public)
```http
GET /api/v2/workers/:id
```

#### Get Own Profile (Protected)
```http
GET /api/v2/workers/profile
Authorization: Bearer <token>
```

#### Update Profile (Protected)
```http
PUT /api/v2/workers/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "skills": ["plumbing", "electrical"],
  "experience": "Updated experience...",
  "location": "Abuja",
  "bio": "Professional plumber with 5+ years..."
}
```

#### Upload Government ID (Protected)
```http
POST /api/v2/workers/upload-id
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "nin", // or "voters_card", "drivers_license", "international_passport"
  "documentUrl": "https://cloudinary.com/..."
}
```

#### Upload Profile Photo (Protected)
```http
POST /api/v2/workers/upload-photo
Authorization: Bearer <token>
Content-Type: application/json

{
  "photoUrl": "https://cloudinary.com/..."
}
```

#### Get Subscription Details (Protected)
```http
GET /api/v2/workers/subscription
Authorization: Bearer <token>
```

#### Check Public Visibility (Protected)
```http
GET /api/v2/workers/can-appear-publicly
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "canAppearPublicly": true,
    "hasActiveSubscription": true,
    "hasGovernmentId": true
  }
}
```

#### Get Analytics (Protected)
```http
GET /api/v2/workers/analytics
Authorization: Bearer <token>
```

#### Add Guarantor (Protected)
```http
POST /api/v2/workers/guarantor
Authorization: Bearer <token>
Content-Type: application/json

{
  "guarantorName": "Jane Doe",
  "guarantorPhone": "+234...",
  "guarantorEmail": "jane@example.com"
}
```

---

### **Analytics** (`/api/v2/analytics`)

#### Get My Analytics (Protected)
```http
GET /api/v2/analytics/my-analytics
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "profileViews": 150,
    "jobApplications": 25,
    "hiresReceived": 5,
    "lastUpdated": "2025-11-13T..."
  }
}
```

#### Track Profile View (Public)
```http
POST /api/v2/analytics/track-view
Content-Type: application/json

{
  "userId": "user_id",
  "accountType": "worker"
}
```

---

## 🔴 Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "errors": [] // Optional detailed errors
}
```

### Common Error Codes

- `400` - Bad Request (validation failed)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (e.g., email already exists)
- `500` - Internal Server Error

---

## 📦 Response Format

All successful responses:

```json
{
  "success": true,
  "message": "Optional success message",
  "data": {
    // Response data here
  }
}
```

---

## 🔒 Account Types

- `worker` - Artisans/skilled workers
- `employer` - Companies/individuals hiring
- `professional` - Doctors/Lawyers for consultations
- `merchant` - Marketplace businesses

---

## 💳 Payment Integration

The backend uses **Paystack** for all payments:

- Worker subscriptions: ₦1,000/month
- Recommended badge: ₦5,000 one-time
- Consultations: ₦3,000/session
- Merchant packages: ₦10,000 - ₦36,000

---

## 📊 Pagination

Paginated endpoints support:

```
?page=1&limit=20
```

Response includes:
```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## 🚀 Rate Limiting

- Default: 100 requests per 15 minutes per IP
- Auth endpoints: More restrictive limits
- Returns `429 Too Many Requests` when exceeded

---

## 🧪 Testing with cURL

### Register and Login
```bash
# Register
curl -X POST http://localhost:4000/api/v2/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@test.com","password":"Test123!@#","accountType":"worker"}'

# Login
TOKEN=$(curl -X POST http://localhost:4000/api/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!@#"}' \
  | jq -r '.data.accessToken')

# Get profile
curl http://localhost:4000/api/v2/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📝 Notes

- All dates are in ISO 8601 format
- Passwords must be at least 8 characters
- Email addresses are case-insensitive
- JWT tokens expire after 15 minutes (access) / 7 days (refresh)

---

## 🆕 Coming Soon

Additional endpoints being developed:
- `/api/v2/employers` - Employer operations
- `/api/v2/professionals` - Professional consultations
- `/api/v2/merchants` - Marketplace operations
- `/api/v2/jobs` - Job postings
- `/api/v2/payments` - Payment operations
