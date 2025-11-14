/**
 * Job Model
 * Job postings created by employers
 */

import mongoose, { Schema, Model, Document } from 'mongoose';
import { IJob, JobStatus } from '../types';

interface IJobDocument extends Document, Omit<IJob, '_id'> {
  incrementViews(): Promise<void>;
  incrementApplications(): Promise<void>;
}

const jobSchema = new Schema<IJobDocument>(
  {
    employerId: {
      type: String,
      required: true,
      ref: 'User',
      index: true,
    },

    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },

    description: {
      type: String,
      required: [true, 'Job description is required'],
      trim: true,
      minlength: [20, 'Description must be at least 20 characters'],
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },

    skills: {
      type: [String],
      default: [],
      validate: {
        validator: (skills: string[]) => skills.length <= 10,
        message: 'Maximum 10 skills allowed',
      },
    },

    budget: {
      type: Number,
      min: [0, 'Budget cannot be negative'],
    },

    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },

    status: {
      type: String,
      enum: ['open', 'closed', 'filled'],
      default: 'open',
    },

    applicationCount: {
      type: Number,
      default: 0,
    },

    viewCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Indexes for better performance
 * Note: employerId already has index from field definition
 */
jobSchema.index({ status: 1 });
jobSchema.index({ skills: 1 });
jobSchema.index({ location: 1 });
jobSchema.index({ createdAt: -1 });

/**
 * Increment view count
 */
jobSchema.methods.incrementViews = async function() {
  this.viewCount += 1;
  await this.save();
};

/**
 * Increment application count
 */
jobSchema.methods.incrementApplications = async function() {
  this.applicationCount += 1;
  await this.save();
};

export const Job: Model<IJobDocument> = mongoose.model<IJobDocument>('Job', jobSchema);
