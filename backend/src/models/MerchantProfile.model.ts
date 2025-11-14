/**
 * Merchant Profile Model
 * For businesses selling products/services on the marketplace
 */

import mongoose, { Schema, Model, Document } from 'mongoose';
import { IMerchantProfile, MerchantPackage, SubscriptionStatus } from '../types';

interface IMerchantProfileDocument extends Document, IMerchantProfile {
  calculateSubscription(packageType: MerchantPackage): {
    amount: number;
    duration: number;
    maxImages: number;
    newsletterEligible: boolean;
  };
  isSubscriptionActive(): boolean;
}

const merchantProfileSchema = new Schema<IMerchantProfileDocument>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      ref: 'User',
    },

    businessName: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Business name too long'],
    },

    businessLogo: {
      type: String,
      default: null,
    },

    businessImages: {
      type: [String],
      default: [],
      validate: {
        validator: function(images: string[]) {
          return images.length <= this.subscription.maxImages;
        },
        message: 'Exceeded maximum allowed images for your subscription',
      },
    },

    description: {
      type: String,
      required: false, // Made optional - to be filled in dashboard
      trim: true,
      maxlength: [2000, 'Description too long'],
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    location: {
      type: String,
      trim: true,
    },

    whatsapp: {
      type: String,
      trim: true,
    },

    instagram: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    website: {
      type: String,
      trim: true,
    },

    subscription: {
      package: {
        type: String,
        enum: ['3months', '6months', '12months'],
        required: false, // Made optional - to be selected in dashboard
      },
      status: {
        type: String,
        enum: ['active', 'expired', 'pending'],
        default: 'pending',
      },
      startDate: Date,
      endDate: Date,
      amount: {
        type: Number,
        required: false, // Made optional - calculated when package is selected
      },
      maxImages: {
        type: Number,
        default: 5,
      },
      newsletterEligible: {
        type: Boolean,
        default: false,
      },
    },

    // CAC registration for recommended badge
    cacNumber: {
      type: String,
      trim: true,
    },

    hasRecommendedBadge: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Note: userId already has unique index from field definition
merchantProfileSchema.index({ category: 1 });
merchantProfileSchema.index({ 'subscription.status': 1 });

/**
 * Calculate subscription details based on package
 */
merchantProfileSchema.methods.calculateSubscription = function(packageType: MerchantPackage) {
  const basePrice = 10000; // ₦10,000 for 3 months

  switch (packageType) {
    case '3months':
      return {
        amount: basePrice,
        duration: 3,
        maxImages: 5,
        newsletterEligible: false,
      };
    case '6months':
      return {
        amount: basePrice * 2 * 0.95, // 5% discount = ₦19,000
        duration: 6,
        maxImages: 10,
        newsletterEligible: false,
      };
    case '12months':
      return {
        amount: basePrice * 4 * 0.90, // 10% discount = ₦36,000
        duration: 12,
        maxImages: 20,
        newsletterEligible: true, // Newsletter once per month
      };
    default:
      return {
        amount: basePrice,
        duration: 3,
        maxImages: 5,
        newsletterEligible: false,
      };
  }
};

/**
 * Check if subscription is active
 */
merchantProfileSchema.methods.isSubscriptionActive = function(): boolean {
  if (this.subscription.status !== 'active') return false;
  if (!this.subscription.endDate) return false;
  return new Date() < this.subscription.endDate;
};

export const MerchantProfile: Model<IMerchantProfileDocument> = mongoose.model<IMerchantProfileDocument>(
  'MerchantProfile',
  merchantProfileSchema
);
