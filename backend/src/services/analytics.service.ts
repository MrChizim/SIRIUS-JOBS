/**
 * Analytics Service
 * Track and retrieve analytics for all user types
 */

import { Analytics } from '../models/Analytics.model';
import { Job } from '../models/Job.model';
import { JobApplication } from '../models/JobApplication.model';
import { ConsultationSession } from '../models/ConsultationSession.model';
import { Review } from '../models/Review.model';
import { ProfessionalProfile } from '../models/ProfessionalProfile.model';
import { AccountType } from '../types';

/**
 * Get or create analytics for user
 * @param userId - User ID
 * @param accountType - Account type
 * @returns Analytics document
 */
export const getOrCreateAnalytics = async (userId: string, accountType: AccountType) => {
  let analytics = await Analytics.findOne({ userId });
  
  if (!analytics) {
    analytics = await Analytics.create({
      userId,
      accountType,
      metrics: {},
    });
  }
  
  return analytics;
};

/**
 * Track profile view
 * @param userId - User ID being viewed
 * @param accountType - Account type
 */
export const trackProfileView = async (userId: string, accountType: AccountType) => {
  const analytics = await getOrCreateAnalytics(userId, accountType);
  await analytics.incrementProfileViews();
};

/**
 * Track job application (for workers)
 * @param workerId - Worker ID
 */
export const trackJobApplication = async (workerId: string) => {
  const analytics = await getOrCreateAnalytics(workerId, 'worker');
  await analytics.incrementJobApplications();
};

/**
 * Track hire received (for workers)
 * @param workerId - Worker ID
 */
export const trackHireReceived = async (workerId: string) => {
  const analytics = await getOrCreateAnalytics(workerId, 'worker');
  await analytics.incrementHiresReceived();
};

/**
 * Track job posted (for employers)
 * @param employerId - Employer ID
 */
export const trackJobPosted = async (employerId: string) => {
  const analytics = await getOrCreateAnalytics(employerId, 'employer');
  await analytics.incrementJobsPosted();
};

/**
 * Track hire made (for employers)
 * @param employerId - Employer ID
 */
export const trackHireMade = async (employerId: string) => {
  const analytics = await getOrCreateAnalytics(employerId, 'employer');
  await analytics.incrementHiresMade();
};

/**
 * Track consultation unlock (for professionals)
 * @param professionalId - Professional ID
 */
export const trackConsultationUnlock = async (professionalId: string) => {
  const analytics = await getOrCreateAnalytics(professionalId, 'professional');
  await analytics.incrementConsultationUnlocks();
};

/**
 * Update professional earnings
 * @param professionalId - Professional ID
 * @param amount - Amount earned
 */
export const updateProfessionalEarnings = async (professionalId: string, amount: number) => {
  const analytics = await getOrCreateAnalytics(professionalId, 'professional');
  await analytics.updateEarnings(amount);
};

/**
 * Track image click (for merchants)
 * @param merchantId - Merchant ID
 * @param imageId - Image ID
 */
export const trackImageClick = async (merchantId: string, imageId: string) => {
  const analytics = await getOrCreateAnalytics(merchantId, 'merchant');
  await analytics.trackImageClick(imageId);
};

/**
 * Track social link click (for merchants)
 * @param merchantId - Merchant ID
 * @param platform - Social platform (whatsapp, instagram, email, website)
 */
export const trackSocialLinkClick = async (merchantId: string, platform: string) => {
  const analytics = await getOrCreateAnalytics(merchantId, 'merchant');
  await analytics.trackSocialLinkClick(platform);
};

/**
 * Track newsletter exposure (for merchants)
 * @param merchantId - Merchant ID
 */
export const trackNewsletterExposure = async (merchantId: string) => {
  const analytics = await getOrCreateAnalytics(merchantId, 'merchant');
  await analytics.incrementNewsletterExposures();
};

/**
 * Get comprehensive analytics for worker
 * @param workerId - Worker ID
 * @returns Worker analytics
 */
export const getWorkerAnalytics = async (workerId: string) => {
  const analytics = await Analytics.findOne({ userId: workerId });
  
  // Get additional data
  const totalApplications = await JobApplication.countDocuments({ workerId });
  const acceptedApplications = await JobApplication.countDocuments({ 
    workerId, 
    status: 'accepted' 
  });
  
  return {
    profileViews: analytics?.metrics.profileViews || 0,
    jobApplications: totalApplications,
    hiresReceived: acceptedApplications,
    withdrawnApplications: await JobApplication.countDocuments({ 
      workerId, 
      status: 'withdrawn' 
    }),
  };
};

/**
 * Get comprehensive analytics for employer
 * @param employerId - Employer ID
 * @returns Employer analytics
 */
export const getEmployerAnalytics = async (employerId: string) => {
  const analytics = await Analytics.findOne({ userId: employerId });
  
  const jobs = await Job.find({ employerId });
  const totalApplications = await JobApplication.countDocuments({
    jobId: { $in: jobs.map(j => j._id) }
  });
  const hiresMade = await JobApplication.countDocuments({
    jobId: { $in: jobs.map(j => j._id) },
    status: 'accepted'
  });
  
  // Job-specific analytics
  const jobAnalytics = await Promise.all(
    jobs.map(async (job) => ({
      jobId: job._id,
      title: job.title,
      views: job.viewCount || 0,
      applications: await JobApplication.countDocuments({ jobId: job._id }),
      status: job.status,
    }))
  );
  
  return {
    totalJobsPosted: jobs.length,
    openJobs: jobs.filter(j => j.status === 'open').length,
    totalApplications,
    hiresMade,
    jobAnalytics,
  };
};

/**
 * Get comprehensive analytics for professional
 * @param professionalId - Professional ID
 * @returns Professional analytics
 */
export const getProfessionalAnalytics = async (professionalId: string) => {
  const analytics = await Analytics.findOne({ userId: professionalId });
  const professionalProfile = await ProfessionalProfile.findOne({ userId: professionalId });
  
  const totalSessions = await ConsultationSession.countDocuments({ professionalId });
  const activeSessions = await ConsultationSession.countDocuments({ 
    professionalId, 
    status: 'active' 
  });
  const expiredSessions = await ConsultationSession.countDocuments({ 
    professionalId, 
    status: 'expired' 
  });
  
  const reviews = await Review.find({ professionalId });
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;
  
  return {
    profileViews: analytics?.metrics.profileViews || 0,
    consultationUnlocks: totalSessions,
    activeSessions,
    expiredSessions,
    totalEarnings: professionalProfile?.totalEarnings || 0,
    totalReviews: reviews.length,
    averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
  };
};

/**
 * Get comprehensive analytics for merchant
 * @param merchantId - Merchant ID
 * @returns Merchant analytics
 */
export const getMerchantAnalytics = async (merchantId: string) => {
  const analytics = await Analytics.findOne({ userId: merchantId });
  
  if (!analytics) {
    return {
      profileViews: 0,
      imageClicks: {},
      socialLinkClicks: {},
      newsletterExposures: 0,
    };
  }
  
  // Convert Map to Object for JSON serialization
  const imageClicks: Record<string, number> = {};
  if (analytics.metrics.imageClicks) {
    analytics.metrics.imageClicks.forEach((value, key) => {
      imageClicks[key] = value;
    });
  }
  
  const socialLinkClicks: Record<string, number> = {};
  if (analytics.metrics.socialLinkClicks) {
    analytics.metrics.socialLinkClicks.forEach((value, key) => {
      socialLinkClicks[key] = value;
    });
  }
  
  return {
    profileViews: analytics.metrics.profileViews || 0,
    imageClicks,
    socialLinkClicks,
    newsletterExposures: analytics.metrics.newsletterExposures || 0,
    totalCustomerContacts: Object.values(socialLinkClicks).reduce((a, b) => a + b, 0),
  };
};
