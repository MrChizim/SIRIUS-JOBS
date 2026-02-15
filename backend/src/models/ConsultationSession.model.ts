import { Schema, model, Document, Types } from 'mongoose';

export interface IConsultationSession extends Document {
  _id: Types.ObjectId;
  professionalId: Types.ObjectId;
  clientId: Types.ObjectId; // Reference to ConsultationClient
  clientUsername: string; // For easy access
  
  // Payment details
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentAmount: number; // Total amount paid (including extensions)
  paymentReference: string; // Original payment reference
  paymentMethod: 'paystack' | 'stripe' | 'other';
  paidAt?: Date;
  
  // Session timing - ENHANCED
  status: 'pending' | 'active' | 'expired' | 'completed' | 'cancelled';
  selectedDuration: number; // Duration chosen by client in milliseconds
  currentDuration: number; // Current duration (including extensions)
  durationHours: number; // For easy display (1, 2, 3, etc.)
  pricePerHour: number; // Professional's hourly rate
  minimumDuration: number; // Minimum 1 hour (3600000 ms)
  
  startedAt?: Date;
  endsAt?: Date;
  expiresAt?: Date;
  
  // Extension tracking - NEW
  isExtended: boolean;
  extensionCount: number;
  extensions: Array<{
    extendedAt: Date;
    additionalHours: number;
    additionalAmount: number;
    paymentReference: string;
    newExpiresAt: Date;
  }>;
  
  // Messaging
  lastMessageAt?: Date;
  hasUnreadMessages: boolean;
  messageCount: number;
  
  // Session token for client authentication
  sessionToken: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;

  // Method signatures
    isExpired(): boolean;
      isActive(): boolean;
        getRemainingTime(): number;
          startSession(): void;
            extendSession(additionalHours: number, paymentReference: string): void;
              calculateExtensionCost(additionalHours: number): number;
               addMessage(messageData: any): Promise<void>;
}

const consultationSessionSchema = new Schema<IConsultationSession>(
  {
    professionalId: {
      type: Schema.Types.ObjectId,
      ref: 'Professional',
      required: true,
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'ConsultationClient',
      required: true,
      index: true,
    },
    clientUsername: {
      type: String,
      required: true,
      index: true,
    },
    
    // Payment fields
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
      required: true,
    },
    paymentAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentReference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['paystack', 'stripe', 'other'],
      default: 'paystack',
    },
    paidAt: {
      type: Date,
    },
    
    // Session timing - ENHANCED
    status: {
      type: String,
      enum: ['pending', 'active', 'expired', 'completed', 'cancelled'],
      default: 'pending',
      required: true,
      index: true,
    },
    selectedDuration: {
      type: Number,
      required: true,
      min: 3600000, // Minimum 1 hour
    },
    currentDuration: {
      type: Number,
      required: true,
      min: 3600000,
    },
    durationHours: {
      type: Number,
      required: true,
      min: 1,
    },
    pricePerHour: {
      type: Number,
      required: true,
      min: 0,
    },
    minimumDuration: {
      type: Number,
      default: 3600000, // 1 hour
    },
    
    startedAt: {
      type: Date,
    },
    endsAt: {
      type: Date,
      index: true,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    
    // Extension tracking - NEW
    isExtended: {
      type: Boolean,
      default: false,
    },
    extensionCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    extensions: [{
      extendedAt: {
        type: Date,
        required: true,
      },
      additionalHours: {
        type: Number,
        required: true,
        min: 1,
      },
      additionalAmount: {
        type: Number,
        required: true,
        min: 0,
      },
      paymentReference: {
        type: String,
        required: true,
      },
      newExpiresAt: {
        type: Date,
        required: true,
      },
    }],
    
    // Messaging
    lastMessageAt: {
      type: Date,
    },
    hasUnreadMessages: {
      type: Boolean,
      default: false,
    },
    messageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // Session token
    sessionToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
consultationSessionSchema.index({ professionalId: 1, status: 1 });
consultationSessionSchema.index({ clientId: 1, status: 1 });
consultationSessionSchema.index({ clientUsername: 1, status: 1 });

// Method to check if session is expired
consultationSessionSchema.methods.isExpired = function(): boolean {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

// Method to check if session is active and valid
consultationSessionSchema.methods.isActive = function(): boolean {
  return this.status === 'active' && 
         this.paymentStatus === 'completed' && 
         !this.isExpired();
};

// Method to get remaining time in milliseconds
consultationSessionSchema.methods.getRemainingTime = function(): number {
  if (!this.expiresAt) return 0;
  const remaining = this.expiresAt.getTime() - Date.now();
  return Math.max(0, remaining);
};

// Method to start the session after payment
consultationSessionSchema.methods.startSession = function(): void {
  if (this.paymentStatus !== 'completed') {
    throw new Error('Payment must be completed before starting session');
  }
  
  this.status = 'active';
  this.startedAt = new Date();
  this.expiresAt = new Date(Date.now() + this.currentDuration);
  this.endsAt = this.expiresAt;
};

// Method to extend the session - NEW
consultationSessionSchema.methods.extendSession = function(
  additionalHours: number,
  paymentReference: string
): void {
  if (this.status !== 'active') {
    throw new Error('Only active sessions can be extended');
  }
  
  if (additionalHours < 1) {
    throw new Error('Extension must be at least 1 hour');
  }
  
  const additionalMs = additionalHours * 3600000;
  const additionalAmount = additionalHours * this.pricePerHour;
  const newExpiresAt = new Date((this.expiresAt?.getTime() || Date.now()) + additionalMs);
  
  // Add to extensions array
  this.extensions.push({
    extendedAt: new Date(),
    additionalHours,
    additionalAmount,
    paymentReference,
    newExpiresAt,
  });
  
  // Update session details
  this.isExtended = true;
  this.extensionCount += 1;
  this.currentDuration += additionalMs;
  this.expiresAt = newExpiresAt;
  this.endsAt = newExpiresAt;
  this.paymentAmount += additionalAmount;
};

// Method to calculate extension cost
consultationSessionSchema.methods.calculateExtensionCost = function(
  additionalHours: number
): number {
  return additionalHours * this.pricePerHour;
};

// Static method to expire old sessions
consultationSessionSchema.statics.expireOldSessions = async function() {
  const now = new Date();
  const result = await this.updateMany(
    {
      status: 'active',
      expiresAt: { $lt: now },
    },
    {
      $set: { status: 'expired' },
    }
  );
  
  return result.modifiedCount;
};

export const ConsultationSession = model<IConsultationSession>(
  'ConsultationSession',
  consultationSessionSchema
);