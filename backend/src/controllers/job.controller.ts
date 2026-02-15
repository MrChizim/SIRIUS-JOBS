/**
 * Job Controller
 * Handle all job posting and application requests
 */

import { Response } from 'express';
import { z } from 'zod';
import { Job } from '../models/Job.model';
import { JobApplication } from '../models/JobApplication.model';
import { User } from '../models/User.model';
import { WorkerProfile } from '../models/WorkerProfile.model';
import { sendSuccess, sendError, sendNotFound } from '../utils/response.util';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import * as analyticsService from '../services/analytics.service';
import { sendJobApplicationNotification } from '../services/email.service';
import { AlertSubscription } from '../models/AlertSubscription.model';
import { Notification } from '../models/Notification.model';
import { events } from '../services/event-bus';

/**
 * Create a new job (all user types - pay ₦1,000 per post)
 * POST /api/jobs
 */
export const createJob = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.userId;

  const jobSchema = z.object({
    title: z.string().min(5).max(200),
    description: z.string().min(20).max(5000),
    skills: z.array(z.string()).max(10).optional(),
    budget: z.number().min(0).optional(),
    location: z.string().min(2),
    paymentReference: z.string().optional(), // Paystack payment reference for ₦1,000
  });

  const validation = jobSchema.safeParse(req.body);

  if (!validation.success) {
    return sendError(res, 'Validation failed', 400, validation.error.errors);
  }

  // TODO: Verify payment reference for ₦1,000 job post fee
  // For now, allowing job creation (payment verification will be added)

  // Create job - employerId now can be any user type
  const job = await Job.create({
    employerId: userId,
    title: validation.data.title,
    description: validation.data.description,
    skills: (validation.data.skills || []).map(skill => skill.toLowerCase()),
    budget: validation.data.budget,
    location: validation.data.location,
    status: 'open',
  });

  // Track job posted
  await analyticsService.trackJobPosted(userId);

  // Notify subscribers asynchronously
  notifyJobSubscribers(job).catch(error => {
    console.error('Failed to notify subscribers', error);
  });

  return sendSuccess(res, job, 'Job posted successfully');
});

/**
 * Update a job (employer only)
 * PUT /api/jobs/:id
 */
export const updateJob = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;
  
  const job = await Job.findById(id);
  
  if (!job) {
    return sendNotFound(res, 'Job not found');
  }
  
  // Verify ownership
  if (job.employerId !== userId) {
    return sendError(res, 'You do not have permission to update this job', 403);
  }
  
  const updateSchema = z.object({
    title: z.string().min(5).max(200).optional(),
    description: z.string().min(20).max(5000).optional(),
    skills: z.array(z.string()).max(10).optional(),
    budget: z.number().min(0).optional(),
    location: z.string().min(2).optional(),
    status: z.enum(['open', 'closed', 'filled']).optional(),
  });
  
  const validation = updateSchema.safeParse(req.body);
  
  if (!validation.success) {
    return sendError(res, 'Validation failed', 400, validation.error.errors);
  }
  
  // Update job
  const updatedData = { ...validation.data } as any;
  if (updatedData.skills) {
    updatedData.skills = updatedData.skills.map((skill: string) => skill.toLowerCase());
  }
  Object.assign(job, updatedData);
  await job.save();
  
  return sendSuccess(res, job, 'Job updated successfully');
});

/**
 * Delete a job (employer only)
 * DELETE /api/jobs/:id
 */
export const deleteJob = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;
  
  const job = await Job.findById(id);
  
  if (!job) {
    return sendNotFound(res, 'Job not found');
  }
  
  // Verify ownership
  if (job.employerId !== userId) {
    return sendError(res, 'You do not have permission to delete this job', 403);
  }
  
  // Delete associated applications
  await JobApplication.deleteMany({ jobId: id });
  
  // Delete job
  await Job.findByIdAndDelete(id);
  
  return sendSuccess(res, null, 'Job deleted successfully');
});

/**
 * Get single job by ID (public)
 * GET /api/jobs/:id
 */
export const getJobById = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  
  const job = await Job.findById(id);
  
  if (!job) {
    return sendNotFound(res, 'Job not found');
  }
  
  // Increment view count
  await job.incrementViews();
  
  // Get employer details
  const employer = await User.findById(job.employerId);
  
  return sendSuccess(res, {
    job,
    employer: employer?.toJSON(),
  });
});

/**
 * Get all jobs (public with filters)
 * GET /api/jobs
 */
export const getAllJobs = asyncHandler(async (req: any, res: Response) => {
  const { 
    page = 1, 
    limit = 20, 
    status = 'open',
    skills,
    location,
    search,
    minBudget,
    maxBudget,
  } = req.query;
  
  const query: any = {};
  
  // Filter by status
  if (status) {
    query.status = status;
  }
  
  // Filter by skills
  if (skills) {
    query.skills = { $in: (skills as string).split(',').map(skill => skill.toLowerCase()) };
  }
  
  // Filter by location
  if (location) {
    query.location = { $regex: location, $options: 'i' };
  }
  
  // Search by title or description
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }
  
  // Filter by budget range
  if (minBudget || maxBudget) {
    query.budget = {};
    if (minBudget) query.budget.$gte = Number(minBudget);
    if (maxBudget) query.budget.$lte = Number(maxBudget);
  }
  
  const jobs = await Job.find(query)
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit))
    .sort({ createdAt: -1 });
  
  const total = await Job.countDocuments(query);
  
  // Get employer details for each job
  const jobsWithEmployers = await Promise.all(
    jobs.map(async (job) => {
      const employer = await User.findById(job.employerId);
      return {
        ...job.toJSON(),
        employer: employer?.toJSON(),
      };
    })
  );
  
  return sendSuccess(res, {
    jobs: jobsWithEmployers,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
});

/**
 * Apply to a job (worker only)
 * POST /api/jobs/:id/apply
 */
export const applyToJob = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.userId;
  const { id: jobId } = req.params;
  
  const applySchema = z.object({
    coverLetter: z.string().max(2000).optional(),
  });
  
  const validation = applySchema.safeParse(req.body);
  
  if (!validation.success) {
    return sendError(res, 'Validation failed', 400, validation.error.errors);
  }
  
  // Check if job exists
  const job = await Job.findById(jobId);
  
  if (!job) {
    return sendNotFound(res, 'Job not found');
  }
  
  // Check if job is open
  if (job.status !== 'open') {
    return sendError(res, 'This job is no longer accepting applications', 400);
  }
  
  // Check if worker profile exists and subscription is active
  const workerProfile = await WorkerProfile.findOne({ userId });
  
  if (!workerProfile) {
    return sendError(res, 'Worker profile not found', 404);
  }
  
  if (!workerProfile.canAppearPublicly()) {
    return sendError(
      res, 
      'You need an active subscription and government ID to apply for jobs',
      403
    );
  }
  
  // Check if already applied
  const existingApplication = await JobApplication.findOne({ jobId, workerId: userId });
  
  if (existingApplication) {
    return sendError(res, 'You have already applied to this job', 400);
  }
  
  // Create application
  const application = await JobApplication.create({
    jobId,
    workerId: userId,
    coverLetter: validation.data.coverLetter,
    status: 'pending',
  });
  
  // Increment job application count
  await job.incrementApplications();
  
  // Track job application
  await analyticsService.trackJobApplication(userId);
  
  // Send notification to employer
  const employer = await User.findById(job.employerId);
  const worker = await User.findById(userId);
  
  if (employer && worker) {
    await sendJobApplicationNotification(
      employer.email,
      job.title,
      worker.name
    );
  }
  
  return sendSuccess(res, application, 'Application submitted successfully');
});

/**
 * Withdraw job application (worker only)
 * DELETE /api/jobs/applications/:applicationId
 */
export const withdrawApplication = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.userId;
  const { applicationId } = req.params;
  
  const application = await JobApplication.findById(applicationId);
  
  if (!application) {
    return sendNotFound(res, 'Application not found');
  }
  
  // Verify ownership
  if (application.workerId !== userId) {
    return sendError(res, 'You do not have permission to withdraw this application', 403);
  }
  
  // Withdraw application
  await application.withdraw();
  
  return sendSuccess(res, application, 'Application withdrawn successfully');
});

/**
 * Get worker's job applications
 * GET /api/jobs/my-applications
 */
export const getMyApplications = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.userId;
  const { status, page = 1, limit = 20 } = req.query;
  
  const query: any = { workerId: userId };
  
  if (status) {
    query.status = status;
  }
  
  const applications = await JobApplication.find(query)
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit))
    .sort({ appliedAt: -1 });
  
  const total = await JobApplication.countDocuments(query);
  
  // Get job details for each application
  const applicationsWithJobs = await Promise.all(
    applications.map(async (application) => {
      const job = await Job.findById(application.jobId);
      const employer = job ? await User.findById(job.employerId) : null;
      
      return {
        ...application.toJSON(),
        job,
        employer: employer?.toJSON(),
      };
    })
  );
  
  return sendSuccess(res, {
    applications: applicationsWithJobs,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
});

/**
 * Get application by ID
 * GET /api/jobs/applications/:applicationId
 */
export const getApplicationById = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.userId;
  const { applicationId } = req.params;
  
  const application = await JobApplication.findById(applicationId);
  
  if (!application) {
    return sendNotFound(res, 'Application not found');
  }
  
  // Get job details
  const job = await Job.findById(application.jobId);
  
  if (!job) {
    return sendNotFound(res, 'Job not found');
  }
  
  // Check permission: worker who applied or employer who posted the job
  const isWorker = application.workerId === userId;
  const isEmployer = job.employerId === userId;
  
  if (!isWorker && !isEmployer) {
    return sendError(res, 'You do not have permission to view this application', 403);
  }
  
  // Get worker and employer details
  const worker = await User.findById(application.workerId);
  const workerProfile = await WorkerProfile.findOne({ userId: application.workerId });
  const employer = await User.findById(job.employerId);
  
  return sendSuccess(res, {
    application,
    job,
    worker: worker?.toJSON(),
    workerProfile,
    employer: employer?.toJSON(),
  });
});

/**
 * Get jobs by employer
 * GET /api/jobs/employer/:employerId
 */
export const getJobsByEmployer = asyncHandler(async (req: any, res: Response) => {
  const { employerId } = req.params;
  const { status, page = 1, limit = 20 } = req.query;
  
  const query: any = { employerId };
  
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
 * Get all applicants for a specific job (job poster only)
 * GET /api/applications/job/:jobId
 */
export const getJobApplicants = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.userId;
  const { jobId } = req.params;

  // Check if job exists and user is the employer
  const job = await Job.findById(jobId);

  if (!job) {
    return sendNotFound(res, 'Job not found');
  }

  // Verify ownership
  if (job.employerId !== userId) {
    return sendError(res, 'You do not have permission to view these applications', 403);
  }

  // Get all applications for this job
  const applications = await JobApplication.find({ jobId })
    .sort({ appliedAt: -1 });

  // Get worker details for each application
  const applicationsWithWorkers = await Promise.all(
    applications.map(async (application) => {
      const worker = await User.findById(application.workerId);
      const workerProfile = await WorkerProfile.findOne({ userId: application.workerId });

      return {
        ...application.toJSON(),
        worker: worker?.toJSON(),
        workerProfile,
      };
    })
  );

  return sendSuccess(res, {
    applications: applicationsWithWorkers,
  });
});

/**
 * Notify alert subscribers when new job matches their preferences
 */
const notifyJobSubscribers = async (job: any) => {
  if (!job.skills || job.skills.length === 0) {
    return;
  }

  const subscribers = await AlertSubscription.find({
    active: true,
    skill: { $in: job.skills.map((skill: string) => skill.toLowerCase()) },
  });

  if (subscribers.length === 0) {
    return;
  }

  const title = 'New job opportunity';
  const message = `A new ${job.title} job was posted${job.location ? ` in ${job.location}` : ''}.`;

  await Promise.all(
    subscribers.map(sub =>
      Notification.create({
        userId: sub.userId,
        title,
        message,
        metadata: {
          jobId: job._id?.toString(),
          skill: sub.skill,
          employerId: job.employerId,
        },
      })
    )
  );

  subscribers.forEach(sub =>
    events.emit('notification:new', {
      userId: sub.userId,
      title,
      message,
      metadata: {
        jobId: job._id?.toString(),
        skill: sub.skill,
      },
    })
  );
};
