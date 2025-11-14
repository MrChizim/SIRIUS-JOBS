/**
 * Employer Profile Model
 * Extended profile for employers (companies, individuals hiring workers)
 */

import mongoose, { Schema, Model } from 'mongoose';
import { IEmployerProfile } from '../types';

const employerProfileSchema = new Schema<IEmployerProfile>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      ref: 'User',
    },

    companyName: {
      type: String,
      trim: true,
      maxlength: [200, 'Company name too long'],
    },

    companyLogo: {
      type: String,
      default: null,
    },

    industry: {
      type: String,
      trim: true,
    },

    location: {
      type: String,
      trim: true,
    },

    bio: {
      type: String,
      trim: true,
      maxlength: [1000, 'Bio cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Note: userId already has unique index from field definition

export const EmployerProfile: Model<IEmployerProfile> = mongoose.model<IEmployerProfile>(
  'EmployerProfile',
  employerProfileSchema
);
