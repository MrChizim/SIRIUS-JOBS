/**
 * Job Application Model
 * Worker applications to jobs posted by employers
 */

import mongoose, { Schema, Model, Document } from 'mongoose';
import { IJobApplication, ApplicationStatus } from '../types';

interface IJobApplicationDocument extends Document, Omit<IJobApplication, '_id'> {
  withdraw(): Promise<void>;
  accept(): Promise<void>;
  reject(): Promise<void>;
}

const jobApplicationSchema = new Schema<IJobApplicationDocument>(
  {
    jobId: {
      type: String,
      required: true,
      ref: 'Job',
      index: true,
    },

    workerId: {
      type: String,
      required: true,
      ref: 'User',
      index: true,
    },

    coverLetter: {
      type: String,
      trim: true,
      maxlength: [2000, 'Cover letter cannot exceed 2000 characters'],
    },

    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
      default: 'pending',
    },

    employerMessage: {
      type: String,
      trim: true,
      maxlength: [1000, 'Employer message cannot exceed 1000 characters'],
    },

    appliedAt: {
      type: Date,
      default: Date.now,
    },

    reviewedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Compound indexes
 */
jobApplicationSchema.index({ jobId: 1, workerId: 1 }, { unique: true }); // Prevent duplicate applications
jobApplicationSchema.index({ workerId: 1, status: 1 });
jobApplicationSchema.index({ jobId: 1, status: 1 });

/**
 * Withdraw application
 */
jobApplicationSchema.methods.withdraw = async function() {
  if (this.status === 'withdrawn') {
    throw new Error('Application already withdrawn');
  }
  if (this.status !== 'pending') {
    throw new Error('Cannot withdraw non-pending application');
  }
  this.status = 'withdrawn';
  await this.save();
};

/**
 * Accept application
 */
jobApplicationSchema.methods.accept = async function() {
  if (this.status !== 'pending') {
    throw new Error('Can only accept pending applications');
  }
  this.status = 'accepted';
  this.reviewedAt = new Date();
  await this.save();
};

/**
 * Reject application
 */
jobApplicationSchema.methods.reject = async function() {
  if (this.status !== 'pending') {
    throw new Error('Can only reject pending applications');
  }
  this.status = 'rejected';
  this.reviewedAt = new Date();
  await this.save();
};

export const JobApplication: Model<IJobApplicationDocument> = mongoose.model<IJobApplicationDocument>(
  'JobApplication',
  jobApplicationSchema
);
