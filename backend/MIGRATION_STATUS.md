# Backend Migration Status _(Mongo v2)_

## ✅ What’s Done
- All feature controllers now run through **Mongoose models** only; every legacy Prisma route/service has been removed from `src/`.
- New Express routers (`auth`, `workers`, `jobs`, `employers`, `professionals`, `merchants`, `payments`, `services`, `alerts`, `analytics`) are exposed under `/api/v2/*`.
- `server.ts` is Mongo-only (Socket.IO + notifications still work) and the Prisma worker queue was deleted.

## 🚀 How to Run (MongoDB Atlas)
1. Create a MongoDB Atlas cluster (or reuse an existing one).
2. Grab the SRV connection string and set it in `.env`:
   ```
   MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority
   ```
3. `cd backend && npm install && npm run dev` (or `npm run build && npm start` for production).

## 🆕 Available v2 Endpoints
- `POST /api/v2/auth/register|login|logout|me`
- `GET/PUT /api/v2/workers/profile`, subscriptions, analytics, etc.
- `GET|POST /api/v2/jobs` for job board + applications.
- `GET|PUT /api/v2/employers/*` for company dashboards and applicant management.
- `GET|PUT /api/v2/professionals/*` for consultation profiles, sessions, reviews.
- `GET|PUT /api/v2/merchants/*` for marketplace storefronts and analytics.
- `POST /api/v2/payments/*` for worker subscriptions, merchant packages, and consultation unlocks (Paystack).

> `.env` and `.env.example` still include both `MONGODB_URI` (Atlas) and `POSTGRES_URI` (Neon) placeholders so you can keep the connection URLs handy, even though Postgres is no longer used in code.

## 📋 Next Ideas (Optional)
- Re-implement licence re-checks on Mongo if you still need scheduled verification.
- Expand automated tests for the new `/api/v2` routers.
