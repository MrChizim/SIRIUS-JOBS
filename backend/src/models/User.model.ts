/**
 * User Model
 * Base model for all user types (Worker, Employer, Professional, Merchant)
 */

import mongoose, { Schema, Model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser, AccountType } from '../types';

// Extend interface with methods
interface IUserDocument extends Document, Omit<IUser, '_id'> {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

/**
 * User Schema Definition
 */
const userSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },

    password: {
      type: String,
      required: function(this: IUserDocument) {
        // Password not required if using Google sign-in
        return !this.googleId;
      },
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Don't return password in queries by default
    },

    accountType: {
      type: String,
      required: [true, 'Account type is required'],
      enum: {
        values: ['worker', 'employer', 'professional', 'merchant'],
        message: '{VALUE} is not a valid account type',
      },
    },

    googleId: {
      type: String,
      sparse: true, // Allow null values but ensure uniqueness when present
      unique: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    refreshToken: {
      type: String,
      select: false, // Don't return refresh token in queries
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt
  }
);

/**
 * Indexes for better query performance
 * Note: email and googleId already have unique indexes from field definitions
 */
userSchema.index({ accountType: 1 });

/**
 * Pre-save middleware to hash password
 */
userSchema.pre('save', async function(this: IUserDocument & { password?: string }, next) {
  // Only hash password if it's modified
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

/**
 * Instance method to compare password
 * @param candidatePassword - Password to compare
 * @returns Promise<boolean>
 */
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

/**
 * Instance method to convert user to JSON (exclude sensitive fields)
 */
userSchema.methods.toJSON = function() {
  const user = this.toObject();

  // Remove sensitive fields
  delete user.password;
  delete user.refreshToken;
  delete user.__v;

  return user;
};

/**
 * Static method to find user by email
 * @param email - User email
 * @returns Promise<IUser | null>
 */
userSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase() }).select('+password');
};

/**
 * Static method to find user by Google ID
 * @param googleId - Google OAuth ID
 * @returns Promise<IUser | null>
 */
userSchema.statics.findByGoogleId = function(googleId: string) {
  return this.findOne({ googleId });
};

/**
 * Export User Model
 */
export const User: Model<IUserDocument> = mongoose.model<IUserDocument>('User', userSchema);
