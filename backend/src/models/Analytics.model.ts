/**
 * Analytics Model
 * Comprehensive analytics tracking for all user types
 */

import mongoose, { Schema, Model, Document } from 'mongoose';
import { IAnalytics, AccountType } from '../types';

// Extend the interface with methods
interface IAnalyticsDocument extends Document, Omit<IAnalytics, '_id'> {
  incrementProfileViews(): Promise<void>;
  incrementJobApplications(): Promise<void>;
  incrementHiresReceived(): Promise<void>;
  incrementJobsPosted(): Promise<void>;
  incrementHiresMade(): Promise<void>;
  incrementConsultationUnlocks(): Promise<void>;
  updateEarnings(amount: number): Promise<void>;
  trackImageClick(imageId: string): Promise<void>;
  trackSocialLinkClick(platform: string): Promise<void>;
  incrementNewsletterExposures(): Promise<void>;
}

const analyticsSchema = new Schema<IAnalyticsDocument>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      ref: 'User',
      index: true,
    },

    accountType: {
      type: String,
      required: true,
      enum: ['worker', 'employer', 'professional', 'merchant'],
    },

    metrics: {
      // Common metrics
      profileViews: {
        type: Number,
        default: 0,
      },

      // Worker metrics
      jobApplications: {
        type: Number,
        default: 0,
      },
      hiresReceived: {
        type: Number,
        default: 0,
      },

      // Employer metrics
      jobsPosted: {
        type: Number,
        default: 0,
      },
      hiresMade: {
        type: Number,
        default: 0,
      },

      // Professional metrics
      consultationUnlocks: {
        type: Number,
        default: 0,
      },
      totalEarnings: {
        type: Number,
        default: 0,
      },
      averageRating: {
        type: Number,
        default: 0,
      },

      // Merchant metrics
      imageClicks: {
        type: Map,
        of: Number,
        default: {},
      },
      socialLinkClicks: {
        type: Map,
        of: Number,
        default: {},
      },
      newsletterExposures: {
        type: Number,
        default: 0,
      },
    },

    lastUpdated: {
      type: Date,
      default: Date.now,
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
analyticsSchema.index({ accountType: 1 });

/**
 * Increment profile views
 */
analyticsSchema.methods.incrementProfileViews = async function() {
  this.metrics.profileViews = (this.metrics.profileViews || 0) + 1;
  this.lastUpdated = new Date();
  await this.save();
};

/**
 * Increment job applications (for workers)
 */
analyticsSchema.methods.incrementJobApplications = async function() {
  this.metrics.jobApplications = (this.metrics.jobApplications || 0) + 1;
  this.lastUpdated = new Date();
  await this.save();
};

/**
 * Increment hires received (for workers)
 */
analyticsSchema.methods.incrementHiresReceived = async function() {
  this.metrics.hiresReceived = (this.metrics.hiresReceived || 0) + 1;
  this.lastUpdated = new Date();
  await this.save();
};

/**
 * Increment jobs posted (for employers)
 */
analyticsSchema.methods.incrementJobsPosted = async function() {
  this.metrics.jobsPosted = (this.metrics.jobsPosted || 0) + 1;
  this.lastUpdated = new Date();
  await this.save();
};

/**
 * Increment hires made (for employers)
 */
analyticsSchema.methods.incrementHiresMade = async function() {
  this.metrics.hiresMade = (this.metrics.hiresMade || 0) + 1;
  this.lastUpdated = new Date();
  await this.save();
};

/**
 * Increment consultation unlocks (for professionals)
 */
analyticsSchema.methods.incrementConsultationUnlocks = async function() {
  this.metrics.consultationUnlocks = (this.metrics.consultationUnlocks || 0) + 1;
  this.lastUpdated = new Date();
  await this.save();
};

/**
 * Update earnings (for professionals)
 */
analyticsSchema.methods.updateEarnings = async function(amount: number) {
  this.metrics.totalEarnings = (this.metrics.totalEarnings || 0) + amount;
  this.lastUpdated = new Date();
  await this.save();
};

/**
 * Track image click (for merchants)
 */
analyticsSchema.methods.trackImageClick = async function(imageId: string) {
  if (!this.metrics.imageClicks) {
    this.metrics.imageClicks = new Map();
  }
  const clicks = this.metrics.imageClicks.get(imageId) || 0;
  this.metrics.imageClicks.set(imageId, clicks + 1);
  this.lastUpdated = new Date();
  await this.save();
};

/**
 * Track social link click (for merchants)
 */
analyticsSchema.methods.trackSocialLinkClick = async function(platform: string) {
  if (!this.metrics.socialLinkClicks) {
    this.metrics.socialLinkClicks = new Map();
  }
  const clicks = this.metrics.socialLinkClicks.get(platform) || 0;
  this.metrics.socialLinkClicks.set(platform, clicks + 1);
  this.lastUpdated = new Date();
  await this.save();
};

/**
 * Increment newsletter exposures (for merchants)
 */
analyticsSchema.methods.incrementNewsletterExposures = async function() {
  this.metrics.newsletterExposures = (this.metrics.newsletterExposures || 0) + 1;
  this.lastUpdated = new Date();
  await this.save();
};

export const Analytics: Model<IAnalyticsDocument> = mongoose.model<IAnalyticsDocument>('Analytics', analyticsSchema);
