/**
 * Core TypeScript Type Definitions
 * Central location for all shared types across the application
 */

export type AccountType = 'worker' | 'employer' | 'professional' | 'merchant';

export type ProfessionalType = 'doctor' | 'lawyer';

export type SubscriptionStatus = 'active' | 'expired' | 'pending';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export type SessionStatus = 'active' | 'expired' | 'pending';

export type JobStatus = 'open' | 'closed' | 'filled';

export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

export type IDType = 'nin' | 'voters_card' | 'drivers_license' | 'international_passport';

export type MerchantPackage = '3months' | '6months' | '12months';
export type AlertType = 'JOB_MATCH';

/**
 * User Interface - Base for all user types
 */
export interface IUser {
  _id?: string;
  name: string;
  email: string;
  password: string;
  accountType: AccountType;
  googleId?: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  refreshToken?: string;
}

/**
 * Worker-specific profile data
 */
export interface IWorkerProfile {
  userId: string;
  skills: string[];
  experience: string;
  profilePhoto?: string;
  governmentId?: {
    type: IDType;
    documentUrl: string;
    verifiedAt?: Date;
  };
  subscription: {
    status: SubscriptionStatus;
    startDate?: Date;
    endDate?: Date;
    amount: number; // ₦1,000
  };
  recommendedBadge: {
    hasRecommendedBadge: boolean;
    guarantorName?: string;
    guarantorPhone?: string;
    guarantorEmail?: string;
    paidAt?: Date;
    amount?: number; // ₦5,000
  };
  location?: string;
  bio?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Employer-specific profile data
 */
export interface IEmployerProfile {
  userId: string;
  companyName?: string;
  companyLogo?: string;
  industry?: string;
  location?: string;
  bio?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Professional (Doctor/Lawyer) profile data
 */
export interface IProfessionalProfile {
  userId: string;
  professionalType: ProfessionalType;
  licenseNumber: string;
  specialization?: string;
  yearsOfExperience?: number;
  profilePhoto?: string;
  bio?: string;
  consultationFee: number; // ₦3,000
  platformFee: number; // ₦500
  professionalEarning: number; // ₦2,500
  totalEarnings: number;
  isVerified: boolean;
  rating?: number;
  totalReviews?: number;
  payoutAccount?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    bankCode?: string; // For Paystack transfer API
  };
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Merchant profile data
 */
export interface IMerchantProfile {
  userId: string;
  businessName: string;
  businessLogo?: string;
  businessImages: string[];
  description: string;
  category: string;
  location?: string;
  whatsapp?: string;
  instagram?: string;
  email?: string;
  website?: string;
  subscription: {
    package: MerchantPackage;
    status: SubscriptionStatus;
    startDate?: Date;
    endDate?: Date;
    amount: number;
    maxImages: number;
    newsletterEligible: boolean;
  };
  cacNumber?: string; // CAC registration for recommended badge
  hasRecommendedBadge?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Job Post Interface
 */
export interface IJob {
  _id?: string;
  employerId: string;
  title: string;
  description: string;
  skills: string[];
  budget?: number;
  location: string;
  status: JobStatus;
  applicationCount?: number;
  viewCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Job Application Interface
 */
export interface IJobApplication {
  _id?: string;
  jobId: string;
  workerId: string;
  coverLetter?: string;
  status: ApplicationStatus;
  employerMessage?: string; // Optional message from employer when accepting/rejecting
  appliedAt?: Date;
  reviewedAt?: Date;
  updatedAt?: Date;
}

/**
 * Professional Consultation Session Interface
 */
export interface IConsultationSession {
  _id?: string;
  professionalId: string;
  clientName: string;
  clientEmail: string;
  clientAnonymousId: string;
  sessionToken: string;
  status: SessionStatus;
  startedAt?: Date | null;
  endsAt?: Date | null;
  lastMessageAt?: Date | null;
  hasUnreadMessages?: boolean;
  paymentId: string;
  amountPaid: number;
  messages?: any[];
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Review/Rating Interface
 */
export interface IReview {
  _id?: string;
  professionalId: string;
  sessionId: string;
  clientName: string;
  rating: number; // 1-5
  comment?: string;
  createdAt?: Date;
}

export interface IAlertSubscription {
  _id?: string;
  userId: string;
  skill: string;
  location?: string | null;
  alertType: AlertType;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface INotification {
  _id?: string;
  userId: string;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  read: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Payment Transaction Interface
 */
export interface IPayment {
  _id?: string;
  userId: string;
  accountType: AccountType;
  paymentType: 'subscription' | 'consultation' | 'recommended_badge' | 'merchant_package';
  amount: number;
  paystackReference: string;
  status: PaymentStatus;
  metadata?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Analytics Interface for tracking user engagement
 */
export interface IAnalytics {
  _id?: string;
  userId: string;
  accountType: AccountType;
  metrics: {
    profileViews?: number;
    jobApplications?: number;
    jobsPosted?: number;
    hiresReceived?: number;
    hiresMade?: number;
    consultationUnlocks?: number;
    totalEarnings?: number;
    averageRating?: number;
    imageClicks?: Map<string, number>; // For merchants
    socialLinkClicks?: Map<string, number>; // For merchants
    newsletterExposures?: number;
  };
  lastUpdated?: Date;
}

/**
 * JWT Payload Interface
 */
export interface IJWTPayload {
  userId: string;
  email: string;
  accountType: AccountType;
  iat?: number;
  exp?: number;
}

/**
 * API Response Interface
 */
export interface IAPIResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: any[];
}

/**
 * Pagination Interface
 */
export interface IPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * File Upload Interface
 */
export interface IFileUpload {
  fieldName: string;
  originalName: string;
  fileName: string;
  url: string;
  size: number;
  mimeType: string;
}
