/**
 * Dashboard Routes (Mongoose)
 * Rewritten from Prisma to use Mongoose models
 */

import express from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { User } from '../models/User.model';
import { WorkerProfile } from '../models/WorkerProfile.model';
import { EmployerProfile } from '../models/EmployerProfile.model';
import { ProfessionalProfile } from '../models/ProfessionalProfile.model';
import { ConsultationSession } from '../models/ConsultationSession.model';
import { Review } from '../models/Review.model';
import { Job } from '../models/Job.model';
import { JobApplication } from '../models/JobApplication.model';

const router = express.Router();

interface AuthRequest extends express.Request {
  user?: {
    userId: string;
    email: string;
    accountType: string;
  };
}

/**
 * @route   GET /api/dashboard/professional
 * @desc    Get professional dashboard data
 * @access  Private (Professional)
 */
router.get('/professional', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [profile, user, sessions, reviews] = await Promise.all([
      ProfessionalProfile.findOne({ userId }),
      User.findById(userId).select('name email isVerified accountType'),
      ConsultationSession.find({ professionalId: userId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      Review.find({ professionalId: userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    if (!profile) {
      return res.status(404).json({ message: 'Professional profile not found' });
    }

    // Calculate average rating
    const ratingStats = reviews.length > 0
      ? {
          average: reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length,
          count: reviews.length,
        }
      : { average: null, count: 0 };

    const pendingSessions = sessions.filter(s => s.status === 'pending').length;

    res.json({
      profile: {
        ...profile.toJSON(),
        consultationFee: profile.consultationFee || 3000,
        specialization: profile.specialization || null,
        licenseNumber: profile.licenseNumber || null,
        yearsOfExperience: profile.yearsOfExperience || 0,
      },
      user,
      stats: {
        clientsServed: sessions.filter(s => s.status === 'expired').length,
        totalSessions: sessions.length,
        consultationsScheduled: pendingSessions,
        averageRating: ratingStats.average,
        reviewCount: ratingStats.count,
      },
      payoutAccount: {
        bankName: profile.payoutAccount?.bankName || null,
        accountNumber: profile.payoutAccount?.accountNumber || null,
        accountHolder: profile.payoutAccount?.accountHolder || null,
      },
      recentSessions: sessions.slice(0, 10),
      reviews: reviews.slice(0, 10),
    });
  } catch (error: any) {
    console.error('Professional dashboard error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

const payoutSchema = z.object({
  bankName: z.string().min(2),
  accountNumber: z.string().min(6).max(20),
  accountHolder: z.string().min(3),
});

/**
 * @route   POST /api/dashboard/professional/payout-account
 * @desc    Update professional payout account
 * @access  Private (Professional)
 */
router.post('/professional/payout-account', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const validation = payoutSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ errors: validation.error.flatten() });
    }

    const profile = await ProfessionalProfile.findOneAndUpdate(
      { userId },
      {
        bankName: validation.data.bankName,
        accountNumber: validation.data.accountNumber,
        accountHolder: validation.data.accountHolder,
      },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ message: 'Professional profile not found' });
    }

    res.json({ message: 'Payout account updated', profile });
  } catch (error: any) {
    console.error('Update payout error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/dashboard/employer
 * @desc    Get employer dashboard data
 * @access  Private (Employer)
 */
router.get('/employer', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [user, employerProfile, jobs] = await Promise.all([
      User.findById(userId).select('name email accountType'),
      EmployerProfile.findOne({ userId }),
      Job.find({ employerId: userId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ]);

    if (!employerProfile) {
      return res.status(404).json({ message: 'Employer profile not found' });
    }

    // Get job IDs for applications query
    const jobIds = jobs.map(j => j._id);

    const [applications, totalHires] = await Promise.all([
      JobApplication.find({ jobId: { $in: jobIds }, status: 'pending' })
        .populate('applicantId', 'name email')
        .populate('jobId', 'title location')
        .sort({ createdAt: -1 })
        .limit(12)
        .lean(),
      JobApplication.countDocuments({ jobId: { $in: jobIds }, status: 'accepted' }),
    ]);

    const startOfMonth = new Date();
    startOfMonth.setUTCHours(0, 0, 0, 0);
    startOfMonth.setUTCDate(1);

    const hiresThisMonth = await JobApplication.countDocuments({
      jobId: { $in: jobIds },
      status: 'accepted',
      updatedAt: { $gte: startOfMonth },
    });

    const jobsWithCounts = jobs.map(job => {
      const appCount = applications.filter(app => app.jobId.toString() === job._id.toString()).length;
      return {
        ...job,
        applicants: appCount,
        status: job.status || 'open',
      };
    });

    const totalApplicants = await JobApplication.countDocuments({ jobId: { $in: jobIds } });
    const activeListings = jobs.filter(j => j.status === 'open').length;
    const jobsPostedThisMonth = jobs.filter(j => j.createdAt >= startOfMonth).length;

    res.json({
      profile: {
        name: employerProfile.companyName || user?.name || null,
        companyName: employerProfile.companyName || null,
        industry: employerProfile.industry || null,
        location: employerProfile.location || null,
        verified: false, // Verified badge not yet implemented for employers
        contactEmail: user?.email || null,
      },
      stats: {
        jobsPosted: jobs.length,
        totalApplicants,
        totalHires,
        activeListings,
        hiresThisMonth,
      },
      jobs: jobsWithCounts,
      applicants: applications,
      plan: {
        tier: 'FREE',
        freePostsLeft: Math.max(0 - jobsPostedThisMonth, 0),
        freeHiresLeft: Math.max(1 - hiresThisMonth, 0),
        jobsPostedThisMonth,
      },
    });
  } catch (error: any) {
    console.error('Employer dashboard error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/dashboard/artisan
 * @desc    Get worker/artisan dashboard data
 * @access  Private (Worker)
 */
router.get('/artisan', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [user, profile, applications] = await Promise.all([
      User.findById(userId).select('name email accountType'),
      WorkerProfile.findOne({ userId }),
      JobApplication.find({ applicantId: userId })
        .populate('jobId', 'title location employerId')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ]);

    if (!profile) {
      return res.status(404).json({ message: 'Worker profile not found' });
    }

    res.json({
      profile: {
        ...profile.toJSON(),
        user: {
          firstName: user?.name?.split(' ')[0] || '',
          lastName: user?.name?.split(' ').slice(1).join(' ') || '',
        },
      },
      applications,
      stats: {
        totalApplications: applications.length,
        pending: applications.filter(a => a.status === 'pending').length,
        accepted: applications.filter(a => a.status === 'accepted').length,
        rejected: applications.filter(a => a.status === 'rejected').length,
      },
    });
  } catch (error: any) {
    console.error('Artisan dashboard error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
