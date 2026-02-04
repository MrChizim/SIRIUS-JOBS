/**
 * Payment Service
 * Handle all payment transactions via Paystack
 */

import { paystackClient, PAYMENT_AMOUNTS, createPaymentMetadata } from '../config/paystack';
import { Payment } from '../models/Payment.model';
import { WorkerProfile } from '../models/WorkerProfile.model';
import { MerchantProfile } from '../models/MerchantProfile.model';
import { ConsultationSession } from '../models/ConsultationSession.model';
import { ProfessionalProfile } from '../models/ProfessionalProfile.model';
import { AccountType } from '../types';
import { generateAnonymousId, generateClientSessionToken } from '../utils/consultationUtils';

/**
 * Initialize worker subscription payment
 * @param userId - User ID
 * @param email - User email
 * @returns Payment initialization data
 */
export const initializeWorkerSubscription = async (userId: string, email: string) => {
  const amount = PAYMENT_AMOUNTS.WORKER_SUBSCRIPTION;
  
  const metadata = createPaymentMetadata(userId, 'worker', 'subscription', {
    duration: 'monthly',
  });
  
  // Initialize Paystack transaction
  const response = await paystackClient.initializeTransaction(email, amount, metadata);
  
  // Create payment record
  await Payment.create({
    userId,
    accountType: 'worker',
    paymentType: 'subscription',
    amount,
    paystackReference: response.data.reference,
    status: 'pending',
    metadata,
  });
  
  return response.data;
};

/**
 * Initialize recommended badge payment
 * @param userId - User ID
 * @param email - User email
 * @param guarantorInfo - Guarantor information
 * @returns Payment initialization data
 */
export const initializeRecommendedBadge = async (
  userId: string,
  email: string,
  guarantorInfo: { name: string; phone: string; email: string }
) => {
  const amount = PAYMENT_AMOUNTS.RECOMMENDED_BADGE;
  
  const metadata = createPaymentMetadata(userId, 'worker', 'recommended_badge', {
    guarantorInfo,
  });
  
  const response = await paystackClient.initializeTransaction(email, amount, metadata);
  
  await Payment.create({
    userId,
    accountType: 'worker',
    paymentType: 'recommended_badge',
    amount,
    paystackReference: response.data.reference,
    status: 'pending',
    metadata,
  });
  
  return response.data;
};

/**
 * Initialize consultation payment
 * @param professionalId - Professional ID
 * @param clientEmail - Client email
 * @param clientName - Client name
 * @returns Payment initialization data
 */
export const initializeConsultation = async (
  professionalId: string,
  clientEmail: string,
  clientName: string
) => {
  const amount = PAYMENT_AMOUNTS.CONSULTATION_FEE;
  
  const metadata = createPaymentMetadata(professionalId, 'professional', 'consultation', {
    clientName,
    clientEmail,
  });
  
  const response = await paystackClient.initializeTransaction(clientEmail, amount, metadata);
  
  await Payment.create({
    userId: professionalId,
    accountType: 'professional',
    paymentType: 'consultation',
    amount,
    paystackReference: response.data.reference,
    status: 'pending',
    metadata,
  });
  
  return response.data;
};

/**
 * Initialize merchant package payment
 * @param userId - User ID
 * @param email - User email
 * @param packageType - Package type (3months, 6months, 12months)
 * @returns Payment initialization data
 */
export const initializeMerchantPackage = async (
  userId: string,
  email: string,
  packageType: '3months' | '6months' | '12months'
) => {
  let amount: number;
  
  switch (packageType) {
    case '3months':
      amount = PAYMENT_AMOUNTS.MERCHANT_3MONTHS;
      break;
    case '6months':
      amount = PAYMENT_AMOUNTS.MERCHANT_6MONTHS;
      break;
    case '12months':
      amount = PAYMENT_AMOUNTS.MERCHANT_12MONTHS;
      break;
    default:
      throw new Error('Invalid package type');
  }
  
  const metadata = createPaymentMetadata(userId, 'merchant', 'merchant_package', {
    packageType,
  });
  
  const response = await paystackClient.initializeTransaction(email, amount, metadata);
  
  await Payment.create({
    userId,
    accountType: 'merchant',
    paymentType: 'merchant_package',
    amount,
    paystackReference: response.data.reference,
    status: 'pending',
    metadata,
  });
  
  return response.data;
};

/**
 * Initialize job post payment (for all user types)
 * @param userId - User ID
 * @param email - User email
 * @param accountType - Account type
 * @returns Payment initialization data
 */
export const initializeJobPost = async (
  userId: string,
  email: string,
  accountType: AccountType
) => {
  const amount = PAYMENT_AMOUNTS.JOB_POST;

  const metadata = createPaymentMetadata(userId, accountType, 'job_post', {});

  const response = await paystackClient.initializeTransaction(email, amount, metadata);

  await Payment.create({
    userId,
    accountType,
    paymentType: 'job_post',
    amount,
    paystackReference: response.data.reference,
    status: 'pending',
    metadata,
  });

  return response.data;
};

/**
 * Verify payment and process based on type
 * This is called from the webhook
 * @param reference - Paystack reference
 */
export const verifyAndProcessPayment = async (reference: string) => {
  // Verify with Paystack
  const verification = await paystackClient.verifyTransaction(reference);
  
  if (verification.data.status !== 'success') {
    throw new Error('Payment verification failed');
  }
  
  // Find payment record
  const payment = await Payment.findOne({ paystackReference: reference });
  
  if (!payment) {
    throw new Error('Payment record not found');
  }
  
  // Mark payment as completed
  await payment.complete();
  
  // Process based on payment type
  switch (payment.paymentType) {
    case 'subscription':
      await processWorkerSubscription(payment);
      break;
    case 'recommended_badge':
      await processRecommendedBadge(payment);
      break;
    case 'consultation':
      await processConsultation(payment);
      break;
    case 'merchant_package':
      await processMerchantPackage(payment);
      break;
    case 'job_post':
      // Job post payment verified - no additional processing needed
      // Frontend will check payment status before allowing job creation
      break;
  }
  
  return payment;
};

/**
 * Process worker subscription
 */
const processWorkerSubscription = async (payment: any) => {
  const workerProfile = await WorkerProfile.findOne({ userId: payment.userId });
  
  if (!workerProfile) {
    throw new Error('Worker profile not found');
  }
  
  // Update subscription
  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription
  
  workerProfile.subscription.status = 'active';
  workerProfile.subscription.startDate = startDate;
  workerProfile.subscription.endDate = endDate;
  
  await workerProfile.save();
};

/**
 * Process recommended badge
 */
const processRecommendedBadge = async (payment: any) => {
  const workerProfile = await WorkerProfile.findOne({ userId: payment.userId });
  
  if (!workerProfile) {
    throw new Error('Worker profile not found');
  }
  
  // Update recommended badge
  workerProfile.recommendedBadge.hasRecommendedBadge = true;
  workerProfile.recommendedBadge.guarantorName = payment.metadata.guarantorInfo.name;
  workerProfile.recommendedBadge.guarantorPhone = payment.metadata.guarantorInfo.phone;
  workerProfile.recommendedBadge.guarantorEmail = payment.metadata.guarantorInfo.email;
  workerProfile.recommendedBadge.paidAt = new Date();
  
  await workerProfile.save();
};

/**
 * Process consultation payment
 */
const processConsultation = async (payment: any) => {
  const professionalProfile = await ProfessionalProfile.findOne({ userId: payment.userId });
  
  if (!professionalProfile) {
    throw new Error('Professional profile not found');
  }
  
  // Create consultation session
  const clientAnonymousId = generateAnonymousId();
  const session = await ConsultationSession.create({
    professionalId: payment.userId,
    clientName: payment.metadata.clientName,
    clientEmail: payment.metadata.clientEmail,
    clientAnonymousId,
    sessionToken: '',
    status: 'pending',
    paymentId: payment._id!.toString(),
    amountPaid: payment.amount,
  });

  const sessionToken = generateClientSessionToken(session._id.toString(), clientAnonymousId);
  session.sessionToken = sessionToken;
  await session.save();
  
  // Update professional earnings
  professionalProfile.totalEarnings += PAYMENT_AMOUNTS.PROFESSIONAL_EARNING;
  await professionalProfile.save();
  
  return session;
};

/**
 * Process merchant package
 */
const processMerchantPackage = async (payment: any) => {
  const merchantProfile = await MerchantProfile.findOne({ userId: payment.userId });
  
  if (!merchantProfile) {
    throw new Error('Merchant profile not found');
  }
  
  // Calculate subscription details based on package
  const packageDetails = merchantProfile.calculateSubscription(payment.metadata.packageType);
  
  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + packageDetails.duration);
  
  merchantProfile.subscription.status = 'active';
  merchantProfile.subscription.startDate = startDate;
  merchantProfile.subscription.endDate = endDate;
  merchantProfile.subscription.maxImages = packageDetails.maxImages;
  merchantProfile.subscription.newsletterEligible = packageDetails.newsletterEligible;
  
  await merchantProfile.save();
};

/**
 * Get payment history for user
 * @param userId - User ID
 * @returns Payment history
 */
export const getPaymentHistory = async (userId: string) => {
  return await Payment.find({ userId }).sort({ createdAt: -1 }).limit(50);
};
