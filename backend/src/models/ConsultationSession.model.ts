/**
 * Consultation Session Model
 * 24-hour consultation sessions between clients and professionals
 */

import mongoose, { Schema, Model, Document } from 'mongoose';
import { IConsultationSession, SessionStatus } from '../types';

interface IConsultationSessionDocument extends Document, Omit<IConsultationSession, '_id'> {
  isExpired(): boolean;
  activate(): Promise<void>;
  expire(): Promise<void>;
  addMessage(message: any): Promise<void>;
}

const consultationSessionSchema = new Schema<IConsultationSessionDocument>(
  {
    professionalId: {
      type: String,
      required: true,
      ref: 'User',
      index: true,
    },

    clientName: {
      type: String,
      required: true,
      trim: true,
    },

    clientEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    clientAnonymousId: {
      type: String,
      required: true,
      index: true,
    },

    sessionToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    status: {
      type: String,
      enum: ['pending', 'active', 'expired'],
      default: 'pending',
    },

    startedAt: {
      type: Date,
      default: null,
    },

    endsAt: {
      type: Date,
      default: null,
    },

    lastMessageAt: {
      type: Date,
      default: null,
    },

    hasUnreadMessages: {
      type: Boolean,
      default: false,
    },

    paymentId: {
      type: String,
      required: true,
      ref: 'Payment',
    },

    amountPaid: {
      type: Number,
      default: 3000, // ₦3,000
    },

    messages: {
      type: [Object],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

consultationSessionSchema.index({ professionalId: 1, status: 1 });
consultationSessionSchema.index({ endsAt: 1 });

consultationSessionSchema.methods.isExpired = function(): boolean {
  if (!this.endsAt) return false;
  return new Date() > this.endsAt || this.status === 'expired';
};

consultationSessionSchema.methods.activate = async function(): Promise<void> {
  if (this.status !== 'pending') {
    throw new Error('Session already activated or expired');
  }
  this.status = 'active';
  this.startedAt = new Date();
  this.endsAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await this.save();
};

consultationSessionSchema.methods.expire = async function(): Promise<void> {
  if (this.status === 'expired') return;
  this.status = 'expired';
  await this.save();
};

consultationSessionSchema.methods.addMessage = async function(message: any): Promise<void> {
  this.messages.push(message);
  await this.save();
};

export const ConsultationSession: Model<IConsultationSessionDocument> = mongoose.model<IConsultationSessionDocument>(
  'ConsultationSession',
  consultationSessionSchema
);
