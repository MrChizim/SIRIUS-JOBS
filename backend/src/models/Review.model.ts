/**
 * Review Model
 * Client reviews for professionals after consultation sessions
 */

import mongoose, { Schema, Model } from 'mongoose';
import { IReview } from '../types';

const reviewSchema = new Schema<IReview>(
  {
    professionalId: {
      type: String,
      required: true,
      ref: 'User',
      index: true,
    },

    sessionId: {
      type: String,
      required: true,
      ref: 'ConsultationSession',
      unique: true, // One review per session
    },

    clientName: {
      type: String,
      required: true,
      trim: true,
    },

    rating: {
      type: Number,
      required: true,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },

    comment: {
      type: String,
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Indexes
 */
reviewSchema.index({ professionalId: 1 });
reviewSchema.index({ sessionId: 1 });
reviewSchema.index({ rating: -1 });

export const Review: Model<IReview> = mongoose.model<IReview>('Review', reviewSchema);
