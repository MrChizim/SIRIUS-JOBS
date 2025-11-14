/**
 * Professional Profile Model
 * For Doctors and Lawyers offering consultation services
 */

import mongoose, { Schema, Model, Document } from 'mongoose';
import { IProfessionalProfile, ProfessionalType } from '../types';

interface IProfessionalProfileDocument extends Document, IProfessionalProfile {
  updateRating(newRating: number): Promise<void>;
}

const professionalProfileSchema = new Schema<IProfessionalProfileDocument>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      ref: 'User',
    },

    professionalType: {
      type: String,
      required: false, // Made optional - to be filled in dashboard
      enum: ['doctor', 'lawyer'],
    },

    licenseNumber: {
      type: String,
      required: false, // Made optional - to be filled in dashboard
      unique: true,
      sparse: true, // Allows multiple null values
      trim: true,
    },

    specialization: {
      type: String,
      trim: true,
    },

    yearsOfExperience: {
      type: Number,
      min: 0,
      max: 70,
    },

    profilePhoto: {
      type: String,
      default: null,
    },

    bio: {
      type: String,
      trim: true,
      maxlength: [1000, 'Bio cannot exceed 1000 characters'],
    },

    consultationFee: {
      type: Number,
      default: 3000, // ₦3,000 per session
    },

    platformFee: {
      type: Number,
      default: 500, // ₦500 platform fee
    },

    professionalEarning: {
      type: Number,
      default: 2500, // ₦2,500 professional earning per session
    },

    totalEarnings: {
      type: Number,
      default: 0,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },

    totalReviews: {
      type: Number,
      default: 0,
    },

    payoutAccount: {
      bankName: {
        type: String,
        trim: true,
      },
      accountNumber: {
        type: String,
        trim: true,
      },
      accountHolder: {
        type: String,
        trim: true,
      },
      bankCode: {
        type: String,
        trim: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Note: userId and licenseNumber already have unique indexes from field definitions
professionalProfileSchema.index({ professionalType: 1 });
professionalProfileSchema.index({ rating: -1 });

/**
 * Update rating based on new review
 */
professionalProfileSchema.methods.updateRating = async function(newRating: number) {
  const totalRating = this.rating * this.totalReviews;
  this.totalReviews += 1;
  this.rating = (totalRating + newRating) / this.totalReviews;
  await this.save();
};

export const ProfessionalProfile: Model<IProfessionalProfileDocument> = mongoose.model<IProfessionalProfileDocument>(
  'ProfessionalProfile',
  professionalProfileSchema
);
