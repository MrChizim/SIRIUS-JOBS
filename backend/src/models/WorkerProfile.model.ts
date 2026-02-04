/**
 * Worker Profile Model
 * Extended profile for workers (artisans, skilled workers)
 */

import mongoose, { Schema, Model, Document } from 'mongoose';
import { IWorkerProfile, IDType, SubscriptionStatus } from '../types';

interface IWorkerProfileDocument extends Document, IWorkerProfile {
  isSubscriptionActive(): boolean;
  canAppearPublicly(): boolean;
}

/**
 * Worker Profile Schema
 */
const workerProfileSchema = new Schema<IWorkerProfileDocument>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      ref: 'User',
    },

    skills: {
      type: [String],
      default: [],
      validate: {
        validator: (skills: string[]) => skills.length <= 20,
        message: 'Maximum 20 skills allowed',
      },
    },

    experience: {
      type: String,
      trim: true,
      maxlength: [2000, 'Experience description too long'],
    },

    profilePhoto: {
      type: String,
      default: null,
    },

    governmentId: {
      type: {
        type: String,
        enum: ['nin', 'voters_card', 'drivers_license', 'international_passport'],
      },
      documentUrl: String,
      verifiedAt: Date,
    },

    subscription: {
      status: {
        type: String,
        enum: ['active', 'expired', 'pending'],
        default: 'pending',
      },
      startDate: Date,
      endDate: Date,
      amount: {
        type: Number,
        default: 1000, // ₦1,000 monthly
      },
    },

    recommendedBadge: {
      hasRecommendedBadge: {
        type: Boolean,
        default: false,
      },
      guarantorName: String,
      guarantorPhone: String,
      guarantorEmail: String,
      paidAt: Date,
      amount: {
        type: Number,
        default: 5000, // ₦5,000 one-time
      },
    },

    location: {
      type: String,
      trim: true,
    },

    bio: {
      type: String,
      trim: true,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Indexes
 * Note: userId already has unique index from field definition
 */
workerProfileSchema.index({ 'subscription.status': 1 });
workerProfileSchema.index({ skills: 1 });

/**
 * Check if subscription is active
 */
workerProfileSchema.methods.isSubscriptionActive = function(): boolean {
  if (this.subscription.status !== 'active') return false;
  if (!this.subscription.endDate) return false;
  return new Date() < this.subscription.endDate;
};

/**
 * Check if worker can appear publicly
 */
workerProfileSchema.methods.canAppearPublicly = function(): boolean {
  return this.isSubscriptionActive() && !!this.governmentId?.documentUrl;
};

export const WorkerProfile: Model<IWorkerProfileDocument> = mongoose.model<IWorkerProfileDocument>(
  'WorkerProfile',
  workerProfileSchema
);
