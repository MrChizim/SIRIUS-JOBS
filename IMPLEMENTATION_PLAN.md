# Sirius Jobs - Consultation Platform Implementation Plan

## Critical Features to Add

### 1. Footer on All Pages
**Status**: ⏳ In Progress
**Priority**: High
**Pages Needing Footers**:
- consultation-dashboard.html ✅ Next
- worker-dashboard.html
- employer-dashboard.html
- marketplace-dashboard.html
- professional-dashboard.html
- All other dashboard pages

**Modern Footer Design**:
- Dark background (#0f172a)
- 4-column grid layout
- Company info + social links
- Quick links (Services, Jobs, Consultations, Marketplace)
- Support section (Contact, FAQs, WhatsApp, Email)
- Office location
- Copyright + legal links

### 2. Payout/Earnings Management System
**Status**: ⏳ Pending
**Priority**: Critical
**Location**: consultation-dashboard.html

**Features to Add**:
- **Earnings Overview Card**:
  - Total Earnings (₦)
  - Available for Withdrawal
  - Pending Earnings
  - Last Withdrawal Date

- **Bank Account Setup**:
  - Bank Name (dropdown of Nigerian banks)
  - Account Number
  - Account Name (auto-verify via Paystack)
  - Save securely in database

- **Withdrawal Request**:
  - Minimum withdrawal: ₦5,000
  - Processing time: 1-3 business days
  - Transaction history
  - Withdrawal status tracking

- **Implementation Method**:
  - Use **Paystack Transfer API** to send money to bank accounts
  - Automatic payout every 7 days OR manual request
  - Platform keeps ₦500 fee per ₦3,000 session (₦2,500 to professional)

### 3. Professional Profile Edit Page
**Status**: ⏳ Pending
**Priority**: High
**New File**: consultation-profile-edit.html

**Editable Fields**:
- Profile Photo (upload)
- Specialization
- Years of Experience
- Bio (500 characters)
- Hourly Rate (if custom pricing later)
- Availability Status (Active/Inactive)

**Backend Requirements**:
- PUT `/api/consultation/professionals/:id` endpoint
- Update MongoDB Professional collection
- Image upload to cloud storage (Cloudinary recommended)

### 4. Font Change to Sans-Serif
**Status**: ⏳ Pending
**Priority**: Medium
**Current Font**: Inter (already sans-serif!)
**Action**: Confirm all pages use Inter consistently

### 5. Client Session Flow (Consultation Booking)
**Status**: ✅ Already Built (Needs Testing)
**Files**:
- consultation-profile.html (professional's public profile)
- consultation-payment.html (Paystack payment)
- consultation-session.html (chat/call interface)

## Database Schema Updates Needed

### Add to Professional Model (MongoDB):
```javascript
{
  // Existing fields...
  bankDetails: {
    bankName: String,
    accountNumber: String,
    accountName: String,
    verified: Boolean,
    verifiedAt: Date
  },
  withdrawalSettings: {
    minimumAmount: { type: Number, default: 500000 }, // ₦5,000 in kobo
    autoWithdraw: { type: Boolean, default: false }
  }
}
```

### New Collection: Withdrawals (MongoDB):
```javascript
{
  professionalId: ObjectId,
  amount: Number, // in kobo
  bankDetails: {
    bankName: String,
    accountNumber: String,
    accountName: String
  },
  status: 'pending' | 'processing' | 'completed' | 'failed',
  reference: String, // Paystack transfer reference
  requestedAt: Date,
  processedAt: Date,
  failureReason: String
}
```

## API Endpoints to Create

### Payout Management:
- `POST /api/consultation/professionals/bank-account` - Add/update bank details
- `POST /api/consultation/professionals/withdraw` - Request withdrawal
- `GET /api/consultation/professionals/withdrawals` - Get withdrawal history
- `GET /api/consultation/professionals/earnings` - Get earnings breakdown

### Profile Management:
- `PUT /api/consultation/professionals/profile` - Update profile
- `POST /api/consultation/professionals/profile-photo` - Upload photo

## Third-Party Services Needed

### For Payouts:
- **Paystack Transfer API** (already using Paystack for payments)
  - Verify bank account numbers
  - Send money to professional's bank accounts
  - Track transfer status

### For Image Uploads:
- **Cloudinary** (Recommended - Free tier: 25GB)
  - Store professional profile photos
  - Automatic image optimization
  - CDN delivery

## Testing Checklist

### Professional Dashboard:
- [ ] View earnings summary
- [ ] Add bank account
- [ ] Verify bank account with Paystack
- [ ] Request withdrawal
- [ ] View withdrawal history
- [ ] Edit profile information
- [ ] Upload profile photo
- [ ] Toggle availability status

### Client Flow:
- [ ] Browse professionals without login
- [ ] View professional full profile
- [ ] Make payment via Paystack
- [ ] Access session with anonymous token
- [ ] Send text messages
- [ ] Receive messages in real-time
- [ ] Make voice/video call
- [ ] Leave review after session ends

## Performance Optimizations Needed

1. **Image Optimization**: Compress and serve WebP format
2. **Code Splitting**: Load only necessary JavaScript
3. **Lazy Loading**: Load images as user scrolls
4. **CDN**: Use Cloudinary or Cloudflare for static assets
5. **Database Indexing**: Index frequently queried fields
6. **Caching**: Cache professional listings for 5 minutes

## Security Enhancements Needed

1. **Rate Limiting**: Prevent API abuse
2. **Input Validation**: Sanitize all user inputs
3. **XSS Protection**: Escape HTML in chat messages
4. **CSRF Tokens**: Protect state-changing operations
5. **Helmet.js**: Set security headers
6. **Environment Variables**: Never commit secrets to Git

## Deployment Checklist

### Before Going Live:
- [ ] All features complete and tested
- [ ] Mobile responsive on all pages
- [ ] SSL certificate installed
- [ ] Production database backups configured
- [ ] Error monitoring (Sentry.io recommended)
- [ ] Uptime monitoring (UptimeRobot - Free)
- [ ] Google Analytics installed
- [ ] Terms of Service finalized
- [ ] Privacy Policy finalized
- [ ] GDPR compliance check
- [ ] Load testing (handle 100+ concurrent users)

### Domain & Hosting:
- **Domain**: siriusjobs.ng or siriusjobs.com.ng
- **Hosting Options**:
  - **Vercel** (Frontend) + **Railway** (Backend) - Easiest
  - **Digital Ocean** (Full stack) - $20/month
  - **AWS EC2** - Scalable but complex
  - **Local Nigerian hosting** (Whogohost, Qservers) - Better latency

### Estimated Monthly Costs:
- Hosting: $20-50
- Domain: ₦1,200-2,000/month
- SMS (for OTP): ₦5-10,000/month depending on volume
- Email service: $10-20/month
- Cloudinary: Free (start), $89/month (scale)
- **Total**: $50-150/month (~₦75,000-225,000)

## App Development Path

### Phase 1: PWA (1-2 weeks)
- Add manifest.json
- Add service worker for offline support
- Add install prompt
- Push notifications
- **Result**: Works like an app, installable from browser

### Phase 2: React Native App (2-3 months)
- Reuse existing React components if using React
- Add native features (biometric login, native camera)
- Submit to Apple App Store & Google Play
- **Result**: True native app experience

## Timeline Summary

| Phase | Duration | Description |
|-------|----------|-------------|
| **Final Development** | 2-3 weeks | Complete payout, profile edit, footer, testing |
| **Pre-Launch Setup** | 1 week | Domain, hosting, production config |
| **Soft Launch** | 1 week | Limited users, bug fixes |
| **Public Launch** | - | Go live! |
| **PWA Version** | +1-2 weeks | Make it installable |
| **Native Apps** | +2-3 months | iOS & Android apps |

## Next Steps (Priority Order)

1. ✅ Fix consultation dashboard authentication
2. ⏳ Add footer to consultation-dashboard.html
3. ⏳ Create payout/earnings management UI
4. ⏳ Build professional profile edit page
5. ⏳ Add footers to all remaining pages
6. ⏳ Change fonts to consistent sans-serif
7. Test complete client booking flow
8. Implement Paystack Transfer API
9. Add image upload with Cloudinary
10. Security audit
11. Performance testing
12. Deploy to staging environment
13. Final testing
14. Go live!

---

**Last Updated**: Today
**Current Status**: Phase 1 - Critical Features Development
