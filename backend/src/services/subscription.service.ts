/**
 * Subscription Service
 * Manage subscriptions for workers and merchants
 */

import { WorkerProfile } from '../models/WorkerProfile.model';
import { MerchantProfile } from '../models/MerchantProfile.model';

/**
 * Check if worker subscription is active
 * @param workerId - Worker user ID
 * @returns true if subscription is active
 */
export const isWorkerSubscriptionActive = async (workerId: string): Promise<boolean> => {
  const workerProfile = await WorkerProfile.findOne({ userId: workerId });
  
  if (!workerProfile) {
    return false;
  }
  
  return workerProfile.isSubscriptionActive();
};

/**
 * Check if merchant subscription is active
 * @param merchantId - Merchant user ID
 * @returns true if subscription is active
 */
export const isMerchantSubscriptionActive = async (merchantId: string): Promise<boolean> => {
  const merchantProfile = await MerchantProfile.findOne({ userId: merchantId });
  
  if (!merchantProfile) {
    return false;
  }
  
  return merchantProfile.isSubscriptionActive();
};

/**
 * Get worker subscription details
 * @param workerId - Worker user ID
 * @returns Subscription details
 */
export const getWorkerSubscription = async (workerId: string) => {
  const workerProfile = await WorkerProfile.findOne({ userId: workerId });
  
  if (!workerProfile) {
    throw new Error('Worker profile not found');
  }
  
  return {
    status: workerProfile.subscription.status,
    startDate: workerProfile.subscription.startDate,
    endDate: workerProfile.subscription.endDate,
    amount: workerProfile.subscription.amount,
    isActive: workerProfile.isSubscriptionActive(),
    daysRemaining: workerProfile.subscription.endDate 
      ? Math.ceil((workerProfile.subscription.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 0,
  };
};

/**
 * Get merchant subscription details
 * @param merchantId - Merchant user ID
 * @returns Subscription details
 */
export const getMerchantSubscription = async (merchantId: string) => {
  const merchantProfile = await MerchantProfile.findOne({ userId: merchantId });
  
  if (!merchantProfile) {
    throw new Error('Merchant profile not found');
  }
  
  return {
    package: merchantProfile.subscription.package,
    status: merchantProfile.subscription.status,
    startDate: merchantProfile.subscription.startDate,
    endDate: merchantProfile.subscription.endDate,
    amount: merchantProfile.subscription.amount,
    maxImages: merchantProfile.subscription.maxImages,
    // newsletterEligible: merchantProfile.subscription.newsletterEligible,
    isActive: merchantProfile.isSubscriptionActive(),
    daysRemaining: merchantProfile.subscription.endDate 
      ? Math.ceil((merchantProfile.subscription.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 0,
  };
};

/**
 * Expire old subscriptions (run this as a cron job)
 */
export const expireOldSubscriptions = async () => {
  const now = new Date();
  
  // Expire worker subscriptions
  await WorkerProfile.updateMany(
    {
      'subscription.status': 'active',
      'subscription.endDate': { $lt: now }
    },
    {
      $set: { 'subscription.status': 'expired' }
    }
  );
  
  // Expire merchant subscriptions
  await MerchantProfile.updateMany(
    {
      'subscription.status': 'active',
      'subscription.endDate': { $lt: now }
    },
    {
      $set: { 'subscription.status': 'expired' }
    }
  );
  
  console.log('✅ Expired old subscriptions');
};

/**
 * Get subscriptions expiring soon (within 7 days)
 * Useful for sending renewal reminders
 */
export const getExpiringSubscriptions = async () => {
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  
  const expiringWorkers = await WorkerProfile.find({
    'subscription.status': 'active',
    'subscription.endDate': {
      $gte: new Date(),
      $lte: sevenDaysFromNow
    }
  }).populate('userId');
  
  const expiringMerchants = await MerchantProfile.find({
    'subscription.status': 'active',
    'subscription.endDate': {
      $gte: new Date(),
      $lte: sevenDaysFromNow
    }
  }).populate('userId');
  
  return {
    workers: expiringWorkers,
    merchants: expiringMerchants,
  };
};
