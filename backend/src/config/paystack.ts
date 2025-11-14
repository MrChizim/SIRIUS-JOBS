/**
 * Paystack Payment Gateway Configuration
 * Handles all payment processing through Paystack API
 */

import axios, { AxiosInstance } from 'axios';
import { env } from './environment';

/**
 * Paystack API client
 */
class PaystackClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.paystack.co',
      headers: {
        Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Initialize a payment transaction
   * @param email - Customer email
   * @param amount - Amount in kobo (₦1 = 100 kobo)
   * @param metadata - Additional transaction data
   * @returns Payment initialization response
   */
  async initializeTransaction(
    email: string,
    amount: number,
    metadata?: any
  ): Promise<any> {
    try {
      const response = await this.client.post('/transaction/initialize', {
        email,
        amount: amount * 100, // Convert to kobo
        metadata,
        callback_url: `${env.FRONTEND_URL}/payment/callback`,
      });

      return response.data;
    } catch (error: any) {
      console.error('Paystack initialization error:', error.response?.data || error.message);
      throw new Error('Failed to initialize payment');
    }
  }

  /**
   * Verify a payment transaction
   * @param reference - Paystack transaction reference
   * @returns Verification response
   */
  async verifyTransaction(reference: string): Promise<any> {
    try {
      const response = await this.client.get(`/transaction/verify/${reference}`);

      return response.data;
    } catch (error: any) {
      console.error('Paystack verification error:', error.response?.data || error.message);
      throw new Error('Failed to verify payment');
    }
  }

  /**
   * List all transactions for a customer
   * @param email - Customer email
   * @returns List of transactions
   */
  async listTransactions(email?: string): Promise<any> {
    try {
      const params = email ? { customer: email } : {};
      const response = await this.client.get('/transaction', { params });

      return response.data;
    } catch (error: any) {
      console.error('Paystack list transactions error:', error.response?.data || error.message);
      throw new Error('Failed to fetch transactions');
    }
  }

  /**
   * Create a customer on Paystack
   * @param email - Customer email
   * @param firstName - Customer first name
   * @param lastName - Customer last name
   * @returns Customer creation response
   */
  async createCustomer(
    email: string,
    firstName: string,
    lastName: string
  ): Promise<any> {
    try {
      const response = await this.client.post('/customer', {
        email,
        first_name: firstName,
        last_name: lastName,
      });

      return response.data;
    } catch (error: any) {
      console.error('Paystack customer creation error:', error.response?.data || error.message);
      throw new Error('Failed to create customer');
    }
  }

  /**
   * Fetch customer details
   * @param emailOrCode - Customer email or code
   * @returns Customer details
   */
  async fetchCustomer(emailOrCode: string): Promise<any> {
    try {
      const response = await this.client.get(`/customer/${emailOrCode}`);

      return response.data;
    } catch (error: any) {
      console.error('Paystack fetch customer error:', error.response?.data || error.message);
      throw new Error('Failed to fetch customer');
    }
  }

  /**
   * Create a subscription plan
   * @param name - Plan name
   * @param amount - Amount in kobo
   * @param interval - Payment interval (daily, weekly, monthly, annually)
   * @returns Plan creation response
   */
  async createPlan(
    name: string,
    amount: number,
    interval: 'daily' | 'weekly' | 'monthly' | 'annually'
  ): Promise<any> {
    try {
      const response = await this.client.post('/plan', {
        name,
        amount: amount * 100, // Convert to kobo
        interval,
      });

      return response.data;
    } catch (error: any) {
      console.error('Paystack plan creation error:', error.response?.data || error.message);
      throw new Error('Failed to create plan');
    }
  }

  /**
   * Subscribe a customer to a plan
   * @param customer - Customer email or code
   * @param plan - Plan code
   * @returns Subscription response
   */
  async createSubscription(customer: string, plan: string): Promise<any> {
    try {
      const response = await this.client.post('/subscription', {
        customer,
        plan,
      });

      return response.data;
    } catch (error: any) {
      console.error('Paystack subscription error:', error.response?.data || error.message);
      throw new Error('Failed to create subscription');
    }
  }
}

/**
 * Export Paystack client instance
 */
export const paystackClient = new PaystackClient();

/**
 * Payment amount constants (in Naira)
 */
export const PAYMENT_AMOUNTS = {
  WORKER_SUBSCRIPTION: 1000, // ₦1,000 monthly
  RECOMMENDED_BADGE: 5000, // ₦5,000 one-time
  CONSULTATION_FEE: 3000, // ₦3,000 per session
  PROFESSIONAL_EARNING: 2500, // ₦2,500 (professional gets this)
  PLATFORM_FEE: 500, // ₦500 (platform keeps this)
  MERCHANT_3MONTHS: 10000, // ₦10,000
  MERCHANT_6MONTHS: 19000, // ₦19,000 (5% discount)
  MERCHANT_12MONTHS: 36000, // ₦36,000 (10% discount)
};

/**
 * Payment metadata helpers
 */
export const createPaymentMetadata = (
  userId: string,
  accountType: string,
  paymentType: string,
  additionalData?: any
) => {
  return {
    userId,
    accountType,
    paymentType,
    ...additionalData,
  };
};
