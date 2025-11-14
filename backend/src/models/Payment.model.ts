/**
 * Payment Model
 * Tracks all payment transactions via Paystack
 */

import mongoose, { Schema, Model, Document } from 'mongoose';
import { IPayment, PaymentStatus, AccountType } from '../types';

// Extend interface with methods
interface IPaymentDocument extends Document, Omit<IPayment, '_id'> {
  complete(): Promise<void>;
  fail(): Promise<void>;
  refund(): Promise<void>;
}

const paymentSchema = new Schema<IPaymentDocument>(
  {
    userId: {
      type: String,
      required: true,
      ref: 'User',
      index: true,
    },

    accountType: {
      type: String,
      required: true,
      enum: ['worker', 'employer', 'professional', 'merchant'],
    },

    paymentType: {
      type: String,
      required: true,
      enum: ['subscription', 'consultation', 'recommended_badge', 'merchant_package'],
    },

    amount: {
      type: Number,
      required: true,
      min: [0, 'Amount cannot be negative'],
    },

    paystackReference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Indexes
 * Note: userId and paystackReference already have indexes from field definitions
 */
paymentSchema.index({ userId: 1, status: 1 }); // Compound index for queries
paymentSchema.index({ createdAt: -1 });

/**
 * Mark payment as completed
 */
paymentSchema.methods.complete = async function() {
  if (this.status === 'completed') return;
  this.status = 'completed';
  await this.save();
};

/**
 * Mark payment as failed
 */
paymentSchema.methods.fail = async function() {
  if (this.status === 'failed') return;
  this.status = 'failed';
  await this.save();
};

/**
 * Refund payment
 */
paymentSchema.methods.refund = async function() {
  if (this.status !== 'completed') {
    throw new Error('Can only refund completed payments');
  }
  this.status = 'refunded';
  await this.save();
};

export const Payment: Model<IPaymentDocument> = mongoose.model<IPaymentDocument>('Payment', paymentSchema);
