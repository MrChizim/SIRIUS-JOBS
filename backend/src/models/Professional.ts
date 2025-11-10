import mongoose, { Schema, Document } from 'mongoose';

export interface IProfessional extends Document {
  userId: string; // References User.id from PostgreSQL
  email: string;
  firstName: string;
  lastName: string;
  profession: 'DOCTOR' | 'LAWYER';
  specialization: string;
  licenseNumber: string;
  regulatoryBody: string;
  yearsOfExperience: number;
  bio?: string;
  isVerified: boolean;
  isActive: boolean;
  averageRating: number;
  totalReviews: number;
  totalSessions: number;
  totalEarnings: number; // In kobo (₦2,500 = 250000 kobo)
  verification?: {
    method: 'LINK' | 'UPLOAD';
    status: 'PENDING_MANUAL_REVIEW' | 'AWAITING_GOVERNMENT_CHECK' | 'VERIFIED' | 'REJECTED';
    submittedAt: Date;
    reviewedAt?: Date;
    reviewerId?: string;
    licenseDocumentLink?: string;
    licenseDocumentFile?: {
      name: string;
      type?: string;
      size?: number;
      data?: string;
    };
    governmentCheck: {
      status: 'NOT_INITIATED' | 'PENDING' | 'VERIFIED' | 'FAILED';
      referenceId?: string;
      provider?: string;
      lastSyncedAt?: Date;
    };
    notes?: string;
  };
  bankDetails?: {
    bankName: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    verified: boolean;
    verifiedAt?: Date;
  };
  withdrawalSettings: {
    minimumAmount: number; // In kobo, default 500000 (₦5,000)
    autoWithdraw: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ProfessionalSchema = new Schema<IProfessional>({
  userId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  profession: { type: String, enum: ['DOCTOR', 'LAWYER'], required: true },
  specialization: { type: String, required: true },
  licenseNumber: { type: String, required: true },
  regulatoryBody: { type: String, required: true, default: 'Not Provided' },
  yearsOfExperience: { type: Number, required: true, min: 0 },
  bio: { type: String, default: '', maxlength: 500 },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  totalReviews: { type: Number, default: 0 },
  totalSessions: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 }, // In kobo
  verification: {
    method: { type: String, enum: ['LINK', 'UPLOAD'], default: 'LINK' },
    status: {
      type: String,
      enum: ['PENDING_MANUAL_REVIEW', 'AWAITING_GOVERNMENT_CHECK', 'VERIFIED', 'REJECTED'],
      default: 'PENDING_MANUAL_REVIEW',
    },
    submittedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date },
    reviewerId: { type: String },
    licenseDocumentLink: { type: String },
    licenseDocumentFile: {
      name: { type: String },
      type: { type: String },
      size: { type: Number },
      data: { type: String },
    },
    governmentCheck: {
      status: {
        type: String,
        enum: ['NOT_INITIATED', 'PENDING', 'VERIFIED', 'FAILED'],
        default: 'NOT_INITIATED',
      },
      referenceId: { type: String },
      provider: { type: String },
      lastSyncedAt: { type: Date },
    }, // Adapter-friendly placeholder for upcoming government verification service
    notes: { type: String },
  },
  bankDetails: {
    bankName: { type: String },
    bankCode: { type: String },
    accountNumber: { type: String },
    accountName: { type: String },
    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date }
  },
  withdrawalSettings: {
    minimumAmount: { type: Number, default: 500000 }, // ₦5,000 in kobo
    autoWithdraw: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

// Indexes for faster queries
ProfessionalSchema.index({ profession: 1, isActive: 1, isVerified: 1 });
ProfessionalSchema.index({ averageRating: -1 });

export const Professional = mongoose.model<IProfessional>('Professional', ProfessionalSchema);
