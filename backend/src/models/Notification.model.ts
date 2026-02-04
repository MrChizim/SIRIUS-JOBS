/**
 * Notification Model
 * Stores in-app notifications for users
 */

import { Schema, model, Model, Document } from 'mongoose';
import { INotification } from '../types';

interface INotificationDocument extends Document, Omit<INotification, '_id'> {}

const notificationSchema = new Schema<INotificationDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
      ref: 'User',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, createdAt: -1 });

export const Notification: Model<INotificationDocument> = model<INotificationDocument>(
  'Notification',
  notificationSchema
);
