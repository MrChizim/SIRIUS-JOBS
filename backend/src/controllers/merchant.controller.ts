/**
 * Merchant Controller
 * Handle all merchant marketplace-related requests
 */

import { Response } from 'express';
import { z } from 'zod';
import { MerchantProfile } from '../models/MerchantProfile.model';
import { User } from '../models/User.model';
import { sendSuccess, sendError, sendNotFound } from '../utils/response.util';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import * as analyticsService from '../services/analytics.service';
import { getMerchantSubscription } from '../services/subscription.service';

/**
 * Get merchant profile
 * GET /api/merchants/profile
 */
export const getProfile = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.userId;
  
  const user = await User.findById(userId);
  const merchantProfile = await MerchantProfile.findOne({ userId });
  
  if (!user || !merchantProfile) {
    return sendNotFound(res, 'Merchant profile not found');
  }
  
  return sendSuccess(res, {
    user: user.toJSON(),
    profile: merchantProfile,
  });
});

/**
 * Update merchant profile
 * PUT /api/merchants/profile
 */
export const updateProfile = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.userId;
  
  const updateSchema = z.object({
    businessName: z.string().max(200).optional(),
    businessLogo: z.string().url().optional(),
    description: z.string().max(2000).optional(),
    category: z.string().optional(),
    location: z.string().optional(),
    whatsapp: z.string().optional(),
    instagram: z.string().optional(),
    email: z.string().email().optional(),
    website: z.string().url().optional(),
  });
  
  const validation = updateSchema.safeParse(req.body);
  
  if (!validation.success) {
    return sendError(res, 'Validation failed', 400, validation.error.errors);
  }
  
  const merchantProfile = await MerchantProfile.findOne({ userId });
  
  if (!merchantProfile) {
    return sendNotFound(res, 'Merchant profile not found');
  }
  
  // Update fields
  Object.assign(merchantProfile, validation.data);
  await merchantProfile.save();
  
  return sendSuccess(res, merchantProfile, 'Profile updated successfully');
});

/**
 * Subscribe to merchant package
 * POST /api/merchants/subscribe
 */
export const subscribe = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.userId;
  
  const subscribeSchema = z.object({
    packageType: z.enum(['3months', '6months', '12months']),
    businessName: z.string().min(2).max(200),
    description: z.string().min(10).max(2000),
    category: z.string().min(2),
    paystackReference: z.string().min(1), // Payment must be completed first
  });
  
  const validation = subscribeSchema.safeParse(req.body);
  
  if (!validation.success) {
    return sendError(res, 'Validation failed', 400, validation.error.errors);
  }
  
  // Check if merchant profile already exists
  let merchantProfile = await MerchantProfile.findOne({ userId });
  
  if (merchantProfile && merchantProfile.isSubscriptionActive()) {
    return sendError(res, 'You already have an active subscription', 400);
  }
  
  // Calculate subscription details
  const tempProfile = new MerchantProfile({
    userId,
    businessName: validation.data.businessName,
    description: validation.data.description,
    category: validation.data.category,
    subscription: {
      package: validation.data.packageType,
      status: 'pending',
      amount: 0,
      maxImages: 5,
      newsletterEligible: false,
    },
  });
  
  const subscriptionDetails = tempProfile.calculateSubscription(validation.data.packageType);
  
  if (!merchantProfile) {
    // Create new merchant profile
    merchantProfile = await MerchantProfile.create({
      userId,
      businessName: validation.data.businessName,
      description: validation.data.description,
      category: validation.data.category,
      businessImages: [],
      subscription: {
        package: validation.data.packageType,
        status: 'pending',
        amount: subscriptionDetails.amount,
        maxImages: subscriptionDetails.maxImages,
        newsletterEligible: subscriptionDetails.newsletterEligible,
      },
    });
  }
  
  // Note: Payment verification and activation happens in payment webhook
  
  return sendSuccess(res, {
    profile: merchantProfile,
    subscription: subscriptionDetails,
  }, 'Subscription created. Complete payment to activate.');
});

/**
 * Upload business images
 * POST /api/merchants/upload-images
 */
export const uploadBusinessImages = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.userId;
  
  const uploadSchema = z.object({
    imageUrls: z.array(z.string().url()).min(1),
  });
  
  const validation = uploadSchema.safeParse(req.body);
  
  if (!validation.success) {
    return sendError(res, 'Validation failed', 400, validation.error.errors);
  }
  
  const merchantProfile = await MerchantProfile.findOne({ userId });
  
  if (!merchantProfile) {
    return sendNotFound(res, 'Merchant profile not found');
  }
  
  // Check subscription status
  if (!merchantProfile.isSubscriptionActive()) {
    return sendError(res, 'You need an active subscription to upload images', 400);
  }
  
  // Check image limit
  const currentImageCount = merchantProfile.businessImages.length;
  const newImageCount = validation.data.imageUrls.length;
  const totalImages = currentImageCount + newImageCount;
  
  if (totalImages > merchantProfile.subscription.maxImages) {
    return sendError(
      res, 
      `You can only upload ${merchantProfile.subscription.maxImages} images with your current package. You have ${currentImageCount} images.`,
      400
    );
  }
  
  // Add new images
  merchantProfile.businessImages.push(...validation.data.imageUrls);
  await merchantProfile.save();
  
  return sendSuccess(res, merchantProfile, 'Images uploaded successfully');
});

/**
 * Delete business image
 * DELETE /api/merchants/images/:imageIndex
 */
export const deleteBusinessImage = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.userId;
  const { imageIndex } = req.params;
  
  const merchantProfile = await MerchantProfile.findOne({ userId });
  
  if (!merchantProfile) {
    return sendNotFound(res, 'Merchant profile not found');
  }
  
  const index = parseInt(imageIndex);
  
  if (isNaN(index) || index < 0 || index >= merchantProfile.businessImages.length) {
    return sendError(res, 'Invalid image index', 400);
  }
  
  // Remove image
  merchantProfile.businessImages.splice(index, 1);
  await merchantProfile.save();
  
  return sendSuccess(res, merchantProfile, 'Image deleted successfully');
});

/**
 * Get merchant subscription details
 * GET /api/merchants/subscription
 */
export const getSubscription = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.userId;
  
  const subscription = await getMerchantSubscription(userId);
  
  return sendSuccess(res, subscription);
});

/**
 * Get merchant analytics
 * GET /api/merchants/analytics
 */
export const getAnalytics = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.userId;
  
  const analytics = await analyticsService.getMerchantAnalytics(userId);
  
  return sendSuccess(res, analytics);
});

/**
 * Get all merchants (public endpoint)
 * GET /api/merchants
 */
export const getMerchants = asyncHandler(async (req: any, res: Response) => {
  const { page = 1, limit = 20, category, location, search } = req.query;
  
  const query: any = {
    'subscription.status': 'active',
  };
  
  // Filter by category
  if (category) {
    query.category = { $regex: category, $options: 'i' };
  }
  
  // Filter by location
  if (location) {
    query.location = { $regex: location, $options: 'i' };
  }
  
  // Search by business name
  if (search) {
    query.businessName = { $regex: search, $options: 'i' };
  }
  
  const merchants = await MerchantProfile.find(query)
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit))
    .sort({ createdAt: -1 });
  
  const total = await MerchantProfile.countDocuments(query);
  
  // Get user details for each merchant
  const merchantsWithUsers = await Promise.all(
    merchants.map(async (merchant) => {
      const user = await User.findById(merchant.userId);
      return {
        ...merchant.toJSON(),
        user: user?.toJSON(),
      };
    })
  );
  
  return sendSuccess(res, {
    merchants: merchantsWithUsers,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
});

/**
 * Get single merchant by ID (public endpoint)
 * GET /api/merchants/:id
 */
export const getMerchantById = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  
  const merchantProfile = await MerchantProfile.findOne({ userId: id });
  
  if (!merchantProfile) {
    return sendNotFound(res, 'Merchant not found');
  }
  
  const user = await User.findById(id);
  
  // Track profile view
  await analyticsService.trackProfileView(id, 'merchant');
  
  return sendSuccess(res, {
    user: user?.toJSON(),
    profile: merchantProfile,
  });
});

/**
 * Track social link click (public endpoint)
 * POST /api/merchants/:id/track-click
 */
export const trackSocialClick = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const { platform } = req.body; // whatsapp, instagram, email, website
  
  if (!platform) {
    return sendError(res, 'Platform is required', 400);
  }
  
  const validPlatforms = ['whatsapp', 'instagram', 'email', 'website'];
  
  if (!validPlatforms.includes(platform)) {
    return sendError(res, 'Invalid platform', 400);
  }
  
  // Track the click
  await analyticsService.trackSocialLinkClick(id, platform);
  
  return sendSuccess(res, null, 'Click tracked');
});

/**
 * Track image click (public endpoint)
 * POST /api/merchants/:id/track-image
 */
export const trackImageClick = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const { imageIndex } = req.body;
  
  if (imageIndex === undefined || imageIndex === null) {
    return sendError(res, 'Image index is required', 400);
  }
  
  // Track the image click
  await analyticsService.trackImageClick(id, imageIndex.toString());
  
  return sendSuccess(res, null, 'Image click tracked');
});

/**
 * Get merchant dashboard stats
 * GET /api/merchants/dashboard
 */
export const getDashboardStats = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.userId;
  
  const merchantProfile = await MerchantProfile.findOne({ userId });
  
  if (!merchantProfile) {
    return sendNotFound(res, 'Merchant profile not found');
  }
  
  const analytics = await analyticsService.getMerchantAnalytics(userId);
  const subscription = await getMerchantSubscription(userId);
  
  return sendSuccess(res, {
    subscription,
    analytics,
    profile: {
      businessName: merchantProfile.businessName,
      imageCount: merchantProfile.businessImages.length,
      maxImages: merchantProfile.subscription.maxImages,
    },
  });
});
