/**
 * Job Applications Routes (Mongoose)
 * Rewritten from Prisma to use Mongoose models
 */

import express from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { JobApplication } from '../models/JobApplication.model';
import { Job } from '../models/Job.model';
import { User } from '../models/User.model';

const router = express.Router();

interface AuthRequest extends express.Request {
  user?: {
    userId: string;
    email: string;
    accountType: string;
  };
}

/**
 * @route   GET /api/applications/:applicationId
 * @desc    Get application by ID
 * @access  Private
 */
router.get('/:applicationId', authenticate, async (req: any, res) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user?.userId;

    const application = await JobApplication.findById(applicationId)
      .populate('workerId', 'name email')
      .populate('jobId', 'title location employerId')
      .lean();

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Check authorization
    const job = await Job.findById(application.jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const isApplicant = application.workerId.toString() === userId;
    const isEmployer = job.employerId.toString() === userId;

    if (!isApplicant && !isEmployer) {
      return res.status(403).json({ message: 'Not authorized to view this application' });
    }

    res.json({ application });
  } catch (error: any) {
    console.error('Get application error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   DELETE /api/applications/:applicationId
 * @desc    Withdraw application
 * @access  Private (Applicant only)
 */
router.delete('/:applicationId/withdraw', authenticate, async (req: any, res) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user?.userId;

    const application = await JobApplication.findById(applicationId);

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Check if user owns this application
    if (application.workerId.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to withdraw this application' });
    }

    // Can only withdraw pending applications
    if (application.status !== 'pending') {
      return res.status(400).json({ message: 'Can only withdraw pending applications' });
    }

    application.status = 'withdrawn';
    await application.save();

    res.json({
      message: 'Application withdrawn successfully',
      application,
    });
  } catch (error: any) {
    console.error('Withdraw application error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

const decisionSchema = z.object({
  decision: z.enum(['accept', 'reject']),
  message: z.string().optional(),
});

/**
 * @route   POST /api/applications/:applicationId/decision
 * @desc    Accept or reject job application
 * @access  Private (Employer only)
 */
router.post('/:applicationId/decision', authenticate, async (req: any, res) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user?.userId;

    const validation = decisionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ errors: validation.error.flatten() });
    }

    const { decision, message } = validation.data;

    const application = await JobApplication.findById(applicationId)
      .populate('jobId', 'title employerId');

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    const job = application.jobId as any;

    // Check if user is the employer
    if (job.employerId.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to make decisions on this application' });
    }

    // Can only decide on pending applications
    if (application.status !== 'pending') {
      return res.status(400).json({ message: 'Can only decide on pending applications' });
    }

    application.status = decision === 'accept' ? 'accepted' : 'rejected';
    if (message) {
      application.employerMessage = message;
    }
    await application.save();

    res.json({
      message: `Application ${decision}ed successfully`,
      application,
    });
  } catch (error: any) {
    console.error('Application decision error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/applications
 * @desc    Get all applications for current user (worker or employer)
 * @access  Private
 */
router.get('/', authenticate, async (req: any, res) => {
  try {
    const userId = req.user?.userId;
    const accountType = req.user?.accountType;

    let applications;

    if (accountType === 'worker') {
      // Worker sees their own applications
      applications = await JobApplication.find({ workerId: userId })
        .populate('jobId', 'title location employerId')
        .sort({ createdAt: -1 })
        .lean();
    } else if (accountType === 'employer') {
      // Employer sees applications to their jobs
      const jobs = await Job.find({ employerId: userId }).select('_id');
      const jobIds = jobs.map(j => j._id);

      applications = await JobApplication.find({ jobId: { $in: jobIds } })
        .populate('workerId', 'name email')
        .populate('jobId', 'title location')
        .sort({ createdAt: -1 })
        .lean();
    } else {
      return res.status(403).json({ message: 'Account type not authorized' });
    }

    res.json({ applications });
  } catch (error: any) {
    console.error('Get applications error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
