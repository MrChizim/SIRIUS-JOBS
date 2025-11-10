import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  sessionId: mongoose.Types.ObjectId; // References ConsultationSession
  senderId: string; // 'professional' or clientAnonymousId
  senderType: 'professional' | 'client';
  content: string;
  messageType: 'text' | 'system'; // system for "Session started", etc.
  isRead: boolean;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  sessionId: { type: Schema.Types.ObjectId, ref: 'ConsultationSession', required: true },
  senderId: { type: String, required: true },
  senderType: { type: String, enum: ['professional', 'client'], required: true },
  content: { type: String, required: true, maxlength: 2000 },
  messageType: { type: String, enum: ['text', 'system'], default: 'text' },
  isRead: { type: Boolean, default: false },
}, { 
  timestamps: true 
});

// Indexes for faster queries
MessageSchema.index({ sessionId: 1, createdAt: 1 });
MessageSchema.index({ sessionId: 1, isRead: 1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
