# Sirius Jobs Backend

Backend API for the Sirius Jobs platform with enhanced consultation system.

## 🎯 Features

### Enhanced Consultation System ✨
- **Anonymous Client Accounts** - Clients create username/password accounts to stay anonymous
- **Flexible Duration** - Select consultation duration (1hr, 2hr, 3hr, etc.)
- **Minimum 1 Hour** - Enforced minimum consultation time
- **Per-Hour Pricing** - Professional sets hourly rate
- **Session Extension** - Extend active sessions with additional payment
- **Real-time Chat** - Socket.IO powered instant messaging
- **Username-Based Chat** - Chat anonymously with chosen username

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- MongoDB
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/MrChizim/SiriusJobsBackEnd.git
cd SiriusJobsBackEnd/backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Copy `.env.example` to `.env` and update with your values:
```env
MONGODB_URI=your-mongodb-uri
JWT_SECRET=your-secret-key
PAYSTACK_SECRET_KEY=your-paystack-key
```

4. **Start development server**
```bash
npm run dev
```

Server runs on `http://localhost:4000`

## 📚 API Endpoints

### Client Authentication
- `POST /api/consultation/auth/register` - Register new client
- `POST /api/consultation/auth/login` - Login client
- `GET /api/consultation/auth/profile` - Get profile

### Consultation Sessions
- `GET /api/consultation/pricing/:professionalId` - Get pricing
- `POST /api/consultation/payment/initialize` - Initialize payment with duration
- `POST /api/consultation/payment/extend` - Extend session
- `GET /api/consultation/payment/verify/:reference` - Verify payment

### Socket.IO Events
- `consultation:message` - Send/receive messages
- `consultation:session-status` - Session status updates
- `consultation:warning` - Expiry warnings
- `consultation:expired` - Session expired

## 🛠️ Tech Stack

- **Runtime:** Node.js v18+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB + Mongoose
- **Real-time:** Socket.IO
- **Auth:** JWT
- **Payment:** Paystack
- **Security:** Helmet, CORS, bcryptjs

## 📁 Project Structure
```
backend/
├── src/
│   ├── models/              # Database models
│   ├── controllers/         # Route controllers
│   ├── routes/              # API routes
│   ├── middleware/          # Custom middleware
│   ├── services/            # Business logic
│   ├── utils/               # Utilities
│   ├── app.ts              # Express setup
│   └── server.ts           # Entry point
├── package.json
└── tsconfig.json
```

## 🔒 Security

- JWT authentication
- Password hashing (bcrypt)
- Rate limiting
- CORS protection
- Input validation
- XSS protection

## 📄 License

Proprietary - Sirius Jobs Platform

---

**Built with ❤️ for Sirius Jobs**