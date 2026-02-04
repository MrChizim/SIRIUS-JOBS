import mongoose, { Schema, Document } from 'mongoose';

export interface IWithdrawal extends Document {
  professionalId: mongoose.Types.ObjectId; // References Professional
  amount: number; // In kobo
  bankDetails: {
    bankName: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  paystackReference?: string; // Paystack transfer reference
  paystackRecipientCode?: string; // Paystack recipient code
  requestedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WithdrawalSchema = new Schema<IWithdrawal>({
  professionalId: { type: Schema.Types.ObjectId, ref: 'Professional', required: true },
  amount: { type: Number, required: true, min: 500000 }, // Minimum ₦5,000
  bankDetails: {
    bankName: { type: String, required: true },
    bankCode: { type: String, required: true },
    accountNumber: { type: String, required: true },
    accountName: { type: String, required: true }
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  paystackReference: { type: String },
  paystackRecipientCode: { type: String },
  requestedAt: { type: Date, default: Date.now },
  processedAt: { type: Date },
  completedAt: { type: Date },
  failureReason: { type: String }
}, {
  timestamps: true
});

// Indexes for faster queries
WithdrawalSchema.index({ professionalId: 1, status: 1 });
WithdrawalSchema.index({ status: 1, requestedAt: -1 });
WithdrawalSchema.index({ paystackReference: 1 });

export const Withdrawal = mongoose.model<IWithdrawal>('Withdrawal', WithdrawalSchema);
