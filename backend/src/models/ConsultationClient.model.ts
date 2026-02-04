import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IConsultationClient extends Document {
  _id: Types.ObjectId;
  username: string;
  password: string;
  email?: string; // Optional - only needed for payment receipts
  
  // Profile (all optional for anonymity)
  displayName?: string;
  avatar?: string;
  
  // Account status
  isActive: boolean;
  isVerified: boolean;
  
  // Sessions
  totalSessions: number;
  activeSessions: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const consultationClientSchema = new Schema<IConsultationClient>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 20,
      match: /^[a-zA-Z0-9_]+$/, // Only alphanumeric and underscore
      index: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    email: {
      type: String,
      sparse: true, // Allows multiple null values
      lowercase: true,
      trim: true,
      match: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    avatar: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    totalSessions: {
      type: Number,
      default: 0,
      min: 0,
    },
    activeSessions: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
consultationClientSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Method to compare passwords
consultationClientSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Don't return password in JSON
consultationClientSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export const ConsultationClient = model<IConsultationClient>(
  'ConsultationClient',
  consultationClientSchema
);