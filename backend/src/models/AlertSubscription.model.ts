/**
 * Alert Subscription Model
 * Stores worker/employer alert preferences for new jobs
 */

import { Schema, model, Model, Document } from 'mongoose';
import { IAlertSubscription } from '../types';

interface IAlertSubscriptionDocument extends Document, Omit<IAlertSubscription, '_id'> {}

const alertSubscriptionSchema = new Schema<IAlertSubscriptionDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
      ref: 'User',
    },
    skill: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
      default: null,
    },
    alertType: {
      type: String,
      default: 'JOB_MATCH',
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

alertSubscriptionSchema.index({ userId: 1, skill: 1, location: 1 }, { unique: true });

export const AlertSubscription: Model<IAlertSubscriptionDocument> = model<IAlertSubscriptionDocument>(
  'AlertSubscription',
  alertSubscriptionSchema
);
