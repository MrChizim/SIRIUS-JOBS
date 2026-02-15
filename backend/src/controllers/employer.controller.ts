/**
 * Employer Controller
 * Handle all employer-related requests
 */

import { Response } from 'express';
import { z } from 'zod';
import { EmployerProfile } from '../models/EmployerProfile.model';
import { User } from '../models/User.model';
import { Job } from '../models/Job.model';
import { JobApplication } from '../models/JobApplication.model';
import { WorkerProfile } from '../models/WorkerProfile.model';
import { sendSuccess, sendError, sendNotFound } from '../utils/response.util';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import * as analyticsService from '../services/analytics.service';

/**
 * Get employer profile
 * GET /api/employers/profile
 */
export const getProfile = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.userId;
  
  const user = await User.findById(userId);
  const employerProfile = await EmployerProfile.findOne({ userId });
  
  if (!user) {
    return sendNotFound(res, 'User not found');
  }
  
  // Create employer profile if it doesn't exist
  if (!employerProfile) {
    const newProfile = await EmployerProfile.create({ userId });
    return sendSuccess(res, {
      user: user.toJSON(),
      profile: newProfile,
    });
  }
  
  return sendSuccess(res, {
    user: user.toJSON(),
    profile: employerProfile,
  });
});

/**
 * Update employer profile
 * PUT /api/employers/profile
 */
export const updateProfile = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.userId;
  
  const updateSchema = z.object({
    companyName: z.string().max(200).optional(),
    companyLogo: z.string().url().optional(),
    industry: z.string().optional(),
    location: z.string().optional(),
    bio: z.string().max(1000).optional(),
  });
  
  const validation = updateSchema.safeParse(req.body);
  
  if (!validation.success) {
    return sendError(res, 'Validation failed', 400, validation.error.errors);
  }
  
  let employerProfile = await EmployerProfile.findOne({ userId });
  
  // Create profile if it doesn't exist
  if (!employerProfile) {
    employerProfile = await EmployerProfile.create({ 
      userId,
      ...validation.data 
    });
  } else {
    // Update fields
    Object.assign(employerProfile, validation.data);
    await employerProfile.save();
  }
  
  return sendSuccess(res, employerProfile, 'Profile updated successfully');
});

/**
 * Get employer analytics
 * GET /api/employers/analytics
 */
export const getAnalytics = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.userId;
  
  const analytics = await analyticsService.getEmployerAnalytics(userId);
  
  return sendSuccess(res, analytics);
});

/**
 * Get all employers (public endpoint)
 * GET /api/employers
 */
export const getAllEmployers = asyncHandler(async (req: any, res: Response) => {
  const { page = 1, limit = 20, industry, location } = req.query;
  
  const query: any = {};
  
  // Filter by industry
  if (industry) {
    query.industry = { $regex: industry, $options: 'i' };
  }
  
  // Filter by location
  if (location) {
    query.location = { $regex: location, $options: 'i' };
  }
  
  const employers = await EmployerProfile.find(query)
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit))
    .sort({ createdAt: -1 });
  
  const total = await EmployerProfile.countDocuments(query);
  
  // Get user details for each employer
  const employersWithUsers = await Promise.all(
    employers.map(async (employer) => {
      const user = await User.findById(employer.userId);
      return {
        ...employer.toJSON(),
        user: user?.toJSON(),
      };
    })
  );
  
  return sendSuccess(res, {
    employers: employersWithUsers,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
});

/**
 * Get single employer by ID (public endpoint)
 * GET /api/employers/:id
 */
export const getEmployerById = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  
  const employerProfile = await EmployerProfile.findOne({ userId: id });
  
  if (!employerProfile) {
    return sendNotFound(res, 'Employer not found');
  }
  
  const user = await User.findById(id);
  
  // Track profile view
  await analyticsService.trackProfileView(id, 'employer');
  
  // Get employer's active jobs
  const activeJobs = await Job.find({ 
    employerId: id, 
    status: 'open' 
  }).limit(5);
  
  return sendSuccess(res, {
    user: user?.toJSON(),
    profile: employerProfile,
    activeJobs,
  });
});

/**
 * Get employer's posted jobs
 * GET /api/employers/jobs
 */
export const getMyJobs = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.userId;
  const { page = 1, limit = 20, status } = req.query;
  
  const query: any = { employerId: userId };
  
  if (status) {
    query.status = status;
  }
  
  const jobs = await Job.find(query)
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit))
    .sort({ createdAt: -1 });
  
  const total = await Job.countDocuments(query);
  
  return sendSuccess(res, {
    jobs,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
});

/**
 * Get applicants for a specific job
 * GET /api/employers/jobs/:jobId/applicants
 */
export const getJobApplicants = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.userId;
  const { jobId } = req.params;
  
  // Verify the job belongs to this employer
  const job = await Job.findById(jobId);
  
  if (!job) {
    return sendNotFound(res, 'Job not found');
  }
  
  if (job.employerId !== userId) {
    return sendError(res, 'You do not have permission to view these applicants', 403);
  }
  
  // Get all applications for this job
  const applications = await JobApplication.find({ jobId })
    .sort({ appliedAt: -1 });
  
  // Get worker details for each application
  const applicantsWithDetails = await Promise.all(
    applications.map(async (application) => {
      const worker = await User.findById(application.workerId);
      const workerProfile = await WorkerProfile.findOne({ userId: application.workerId });
      
      // Track that employer viewed this worker's profile
      await analyticsService.trackProfileView(application.workerId, 'worker');
      
      return {
        application: application.toJSON(),
        worker: worker?.toJSON(),
        workerProfile: workerProfile?.toJSON(),
      };
    })
  );
  
  return sendSuccess(res, {
    job,
    applicants: applicantsWithDetails,
    totalApplicants: applications.length,
  });
});

/**
 * Accept a job application (hire worker)
 * POST /api/employers/applications/:applicationId/accept
 */
export const acceptApplication = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.userId;
  const { applicationId } = req.params;
  
  const application = await JobApplication.findById(applicationId);
  
  if (!application) {
    return sendNotFound(res, 'Application not found');
  }
  
  // Verify the job belongs to this employer
  const job = await Job.findById(application.jobId);
  
  if (!job || job.employerId !== userId) {
    return sendError(res, 'You do not have permission to accept this application', 403);
  }
  
  // Accept the application
  await application.accept();
  
  // Track hire analytics
  await analyticsService.trackHireMade(userId);
  await analyticsService.trackHireReceived(application.workerId);
  
  return sendSuccess(res, application, 'Application accepted successfully');
});

/**
 * Reject a job application
 * POST /api/employers/applications/:applicationId/reject
 */
export const rejectApplication = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.userId;
  const { applicationId } = req.params;
  
  const application = await JobApplication.findById(applicationId);
  
  if (!application) {
    return sendNotFound(res, 'Application not found');
  }
  
  // Verify the job belongs to this employer
  const job = await Job.findById(application.jobId);
  
  if (!job || job.employerId !== userId) {
    return sendError(res, 'You do not have permission to reject this application', 403);
  }
  
  // Reject the application
  await application.reject();
  
  return sendSuccess(res, application, 'Application rejected');
});

/**
 * Get employer dashboard stats
 * GET /api/employers/dashboard
 */
export const getDashboardStats = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.userId;
  
  // Get all jobs
  const totalJobs = await Job.countDocuments({ employerId: userId });
  const openJobs = await Job.countDocuments({ employerId: userId, status: 'open' });
  const closedJobs = await Job.countDocuments({ employerId: userId, status: 'closed' });
  
  // Get all applications
  const jobs = await Job.find({ employerId: userId });
  const jobIds = jobs.map(j => j._id);
  
  const totalApplications = await JobApplication.countDocuments({ jobId: { $in: jobIds } });
  const pendingApplications = await JobApplication.countDocuments({ 
    jobId: { $in: jobIds },
    status: 'pending' 
  });
  const acceptedApplications = await JobApplication.countDocuments({ 
    jobId: { $in: jobIds },
    status: 'accepted' 
  });
  
  return sendSuccess(res, {
    jobs: {
      total: totalJobs,
      open: openJobs,
      closed: closedJobs,
    },
    applications: {
      total: totalApplications,
      pending: pendingApplications,
      hired: acceptedApplications,
    },
  });
});
