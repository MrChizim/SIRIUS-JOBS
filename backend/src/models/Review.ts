import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
  sessionId: mongoose.Types.ObjectId; // References ConsultationSession
  professionalId: mongoose.Types.ObjectId; // References Professional
  clientAnonymousId: string;
  rating: number; // 1-5 stars
  reviewText: string;
  createdAt: Date;
}

const ReviewSchema = new Schema<IReview>({
  sessionId: { type: Schema.Types.ObjectId, ref: 'ConsultationSession', required: true, unique: true },
  professionalId: { type: Schema.Types.ObjectId, ref: 'Professional', required: true },
  clientAnonymousId: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  reviewText: { type: String, required: true, maxlength: 500 },
}, { 
  timestamps: true 
});

// Indexes for faster queries
ReviewSchema.index({ professionalId: 1, createdAt: -1 });

export const Review = mongoose.model<IReview>('Review', ReviewSchema);
