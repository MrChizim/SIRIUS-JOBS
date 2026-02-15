/**
 * Profiles Routes (Mongoose)
 * Rewritten from Prisma to use Mongoose models
 */

import express from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { User } from '../models/User.model';
import { WorkerProfile } from '../models/WorkerProfile.model';
import { EmployerProfile } from '../models/EmployerProfile.model';
import { ProfessionalProfile } from '../models/ProfessionalProfile.model';
import { MerchantProfile } from '../models/MerchantProfile.model';

const router = express.Router();

interface AuthRequest extends express.Request {
  user?: {
    userId: string;
    email: string;
    accountType: string;
  };
}

/**
 * @route   GET /api/profiles/:userId
 * @desc    Get user profile by ID (public)
 * @access  Public
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('name email accountType isVerified createdAt');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let profile = null;

    switch (user.accountType) {
      case 'worker':
        profile = await WorkerProfile.findOne({ userId });
        break;
      case 'employer':
        profile = await EmployerProfile.findOne({ userId });
        break;
      case 'professional':
        profile = await ProfessionalProfile.findOne({ userId });
        break;
      case 'merchant':
        profile = await MerchantProfile.findOne({ userId });
        break;
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        accountType: user.accountType,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
      profile,
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

const workerProfileSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  serviceCategoryId: z.string().optional(),
  headline: z.string().optional(),
  location: z.string().optional(),
  bio: z.string().optional(),
  yearsExperience: z.number().min(0).max(60).optional(),
  photo: z.string().url().optional().nullable(),
});

/**
 * @route   PUT /api/profiles/artisan/me
 * @desc    Update worker/artisan profile
 * @access  Private (Worker)
 */
router.put('/artisan/me', authenticate, async (req: any, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const validation = workerProfileSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ errors: validation.error.flatten() });
    }

    const data = validation.data;

    // Update user name if provided
    if (data.firstName || data.lastName) {
      const name = `${data.firstName || ''} ${data.lastName || ''}`.trim();
      await User.findByIdAndUpdate(userId, { name });
    }

    // Update profile
    const updateData: any = {};
    if (data.serviceCategoryId) updateData.serviceCategoryId = data.serviceCategoryId;
    if (data.headline) updateData.headline = data.headline;
    if (data.location) updateData.location = data.location;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.yearsExperience !== undefined) updateData.yearsExperience = data.yearsExperience;
    if (data.photo !== undefined) updateData.showcaseMediaUrl = data.photo;

    const profile = await WorkerProfile.findOneAndUpdate(
      { userId },
      updateData,
      { new: true, upsert: true }
    );

    const user = await User.findById(userId).select('name email');

    res.json({
      message: 'Profile updated successfully',
      profile,
      user,
    });
  } catch (error: any) {
    console.error('Update artisan profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

const professionalProfileSchema = z.object({
  specialization: z.string().optional(),
  consultationFee: z.number().min(0).optional(),
  licenseNumber: z.string().optional(),
  yearsOfExperience: z.number().min(0).optional(),
  bio: z.string().optional(),
  licenseDocumentUrl: z.string().url().optional(),
});

/**
 * @route   PUT /api/profiles/professional/me
 * @desc    Update professional profile
 * @access  Private (Professional)
 */
router.put('/professional/me', authenticate, async (req: any, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const validation = professionalProfileSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ errors: validation.error.flatten() });
    }

    const profile = await ProfessionalProfile.findOneAndUpdate(
      { userId },
      validation.data,
      { new: true, upsert: true }
    );

    res.json({
      message: 'Profile updated successfully',
      profile,
    });
  } catch (error: any) {
    console.error('Update professional profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/profiles/professional/completion
 * @desc    Get professional profile completion status
 * @access  Private (Professional)
 */
router.get('/professional/completion', authenticate, async (req: any, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const profile = await ProfessionalProfile.findOne({ userId });

    if (!profile) {
      return res.json({
        completed: false,
        missingFields: ['specialization', 'consultationFee', 'licenseNumber', 'bio'],
        percentage: 0,
      });
    }

    const requiredFields = ['specialization', 'consultationFee', 'licenseNumber', 'bio'];
    const completedFields = requiredFields.filter(field => profile[field as keyof typeof profile]);
    const missingFields = requiredFields.filter(field => !profile[field as keyof typeof profile]);

    res.json({
      completed: missingFields.length === 0,
      missingFields,
      percentage: Math.round((completedFields.length / requiredFields.length) * 100),
    });
  } catch (error: any) {
    console.error('Profile completion check error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

const employerProfileSchema = z.object({
  companyName: z.string().optional(),
  industry: z.string().optional(),
  location: z.string().optional(),
  companySize: z.string().optional(),
  website: z.string().url().optional(),
  description: z.string().optional(),
});

/**
 * @route   PUT /api/profiles/employer/me
 * @desc    Update employer profile
 * @access  Private (Employer)
 */
router.put('/employer/me', authenticate, async (req: any, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const validation = employerProfileSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ errors: validation.error.flatten() });
    }

    const profile = await EmployerProfile.findOneAndUpdate(
      { userId },
      validation.data,
      { new: true, upsert: true }
    );

    res.json({
      message: 'Profile updated successfully',
      profile,
    });
  } catch (error: any) {
    console.error('Update employer profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
