import mongoose, { Schema, Document } from 'mongoose';

export interface IConsultationSession extends Document {
  professionalId: mongoose.Types.ObjectId; // References Professional
  clientAnonymousId: string; // e.g., "ANON-ABC123"
  clientSessionToken: string; // JWT token for client to access session
  paymentReference: string; // Paystack reference
  amountPaid: number; // 300000 kobo (₦3,000)
  professionalEarning: number; // 250000 kobo (₦2,500)
  platformFee: number; // 50000 kobo (₦500)
  status: 'pending' | 'active' | 'ended' | 'expired';
  startedAt: Date | null;
  endsAt: Date | null; // 24 hours from startedAt
  endedAt: Date | null;
  endedBy: 'client' | 'professional' | 'auto' | null;
  hasUnreadMessages: boolean; // For professional
  lastMessageAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ConsultationSessionSchema = new Schema<IConsultationSession>({
  professionalId: { type: Schema.Types.ObjectId, ref: 'Professional', required: true },
  clientAnonymousId: { type: String, required: true },
  clientSessionToken: { type: String, required: true, unique: true },
  paymentReference: { type: String, required: true, unique: true },
  amountPaid: { type: Number, required: true }, // In kobo
  professionalEarning: { type: Number, required: true }, // In kobo
  platformFee: { type: Number, required: true }, // In kobo
  status: { 
    type: String, 
    enum: ['pending', 'active', 'ended', 'expired'], 
    default: 'pending' 
  },
  startedAt: { type: Date, default: null },
  endsAt: { type: Date, default: null },
  endedAt: { type: Date, default: null },
  endedBy: { type: String, enum: ['client', 'professional', 'auto'], default: null },
  hasUnreadMessages: { type: Boolean, default: false },
  lastMessageAt: { type: Date, default: null },
}, { 
  timestamps: true 
});

// Indexes for faster queries
ConsultationSessionSchema.index({ professionalId: 1, status: 1 });
ConsultationSessionSchema.index({ clientSessionToken: 1 });
ConsultationSessionSchema.index({ paymentReference: 1 });
ConsultationSessionSchema.index({ status: 1, endsAt: 1 }); // For auto-close worker

export const ConsultationSession = mongoose.model<IConsultationSession>('ConsultationSession', ConsultationSessionSchema);
