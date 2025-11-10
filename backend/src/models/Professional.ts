import mongoose, { Schema, Document } from 'mongoose';

export interface IProfessional extends Document {
  userId: string; // References User.id from PostgreSQL
  email: string;
  firstName: string;
  lastName: string;
  profession: 'DOCTOR' | 'LAWYER';
  specialization: string;
  licenseNumber: string;
  yearsOfExperience: number;
  bio: string;
  isVerified: boolean;
  isActive: boolean;
  averageRating: number;
  totalReviews: number;
  totalSessions: number;
  totalEarnings: number; // In kobo (₦2,500 = 250000 kobo)
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
  yearsOfExperience: { type: Number, required: true, min: 0 },
  bio: { type: String, required: true, maxlength: 500 },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  totalReviews: { type: Number, default: 0 },
  totalSessions: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 }, // In kobo
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
