import { Router, Request, Response } from 'express';
import { Professional } from '../models/Professional.js';
import { Withdrawal } from '../models/Withdrawal.js';
import { ConsultationSession } from '../models/ConsultationSession.js';
import { authenticateToken } from '../middleware/auth.js';
import axios from 'axios';

const router = Router();

// Paystack configuration
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// Nigerian bank codes for Paystack
const NIGERIAN_BANKS = [
  { name: 'Access Bank', code: '044' },
  { name: 'Citibank', code: '023' },
  { name: 'Diamond Bank', code: '063' },
  { name: 'Ecobank Nigeria', code: '050' },
  { name: 'Fidelity Bank Nigeria', code: '070' },
  { name: 'First Bank of Nigeria', code: '011' },
  { name: 'First City Monument Bank', code: '214' },
  { name: 'Guaranty Trust Bank', code: '058' },
  { name: 'Heritage Bank Plc', code: '030' },
  { name: 'Jaiz Bank', code: '301' },
  { name: 'Keystone Bank Limited', code: '082' },
  { name: 'Polaris Bank', code: '076' },
  { name: 'Providus Bank Plc', code: '101' },
  { name: 'Stanbic IBTC Bank Nigeria Limited', code: '221' },
  { name: 'Standard Chartered Bank', code: '068' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'Suntrust Bank Nigeria Limited', code: '100' },
  { name: 'Union Bank of Nigeria', code: '032' },
  { name: 'United Bank for Africa', code: '033' },
  { name: 'Unity Bank Plc', code: '215' },
  { name: 'Wema Bank', code: '035' },
  { name: 'Zenith Bank', code: '057' }
];

// Extend Request type to include user
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    roles?: string[];
  };
}

// PUT /api/consultation/professionals/profile - Update professional profile
router.put('/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { specialization, yearsOfExperience, bio, isActive } = req.body;

    // Validation
    if (bio && bio.length > 500) {
      return res.status(400).json({ error: 'Bio must be 500 characters or less' });
    }

    if (yearsOfExperience !== undefined && (yearsOfExperience < 0 || yearsOfExperience > 99)) {
      return res.status(400).json({ error: 'Years of experience must be between 0 and 99' });
    }

    // Find and update professional
    const professional = await Professional.findOne({ userId });
    if (!professional) {
      return res.status(404).json({ error: 'Professional profile not found' });
    }

    // Update fields
    if (specialization !== undefined) professional.specialization = specialization;
    if (yearsOfExperience !== undefined) professional.yearsOfExperience = yearsOfExperience;
    if (bio !== undefined) professional.bio = bio;
    if (isActive !== undefined) professional.isActive = isActive;

    await professional.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      professional: {
        specialization: professional.specialization,
        yearsOfExperience: professional.yearsOfExperience,
        bio: professional.bio,
        isActive: professional.isActive
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// GET /api/consultation/professionals/profile - Get current professional's profile
router.get('/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const professional = await Professional.findOne({ userId }).lean();
    if (!professional) {
      return res.status(404).json({ error: 'Professional profile not found' });
    }

    res.json({ success: true, professional });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// POST /api/consultation/professionals/verify-bank - Verify bank account with Paystack
router.post('/verify-bank', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { bankCode, accountNumber } = req.body;

    if (!bankCode || !accountNumber) {
      return res.status(400).json({ error: 'Bank code and account number are required' });
    }

    // Validate account number (should be 10 digits)
    if (!/^\d{10}$/.test(accountNumber)) {
      return res.status(400).json({ error: 'Account number must be 10 digits' });
    }

    // Call Paystack API to verify account
    try {
      const response = await axios.get(
        `${PAYSTACK_BASE_URL}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.status && response.data.data) {
        const { account_name, account_number } = response.data.data;
        return res.json({
          success: true,
          accountName: account_name,
          accountNumber: account_number
        });
      } else {
        return res.status(400).json({ error: 'Could not verify account' });
      }
    } catch (paystackError: any) {
      console.error('Paystack verification error:', paystackError.response?.data || paystackError.message);
      return res.status(400).json({
        error: paystackError.response?.data?.message || 'Failed to verify bank account'
      });
    }
  } catch (error) {
    console.error('Error verifying bank account:', error);
    res.status(500).json({ error: 'Failed to verify bank account' });
  }
});

// POST /api/consultation/professionals/bank-account - Save bank account details
router.post('/bank-account', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { bankName, bankCode, accountNumber, accountName } = req.body;

    if (!bankName || !bankCode || !accountNumber || !accountName) {
      return res.status(400).json({ error: 'All bank details are required' });
    }

    // Find professional
    const professional = await Professional.findOne({ userId });
    if (!professional) {
      return res.status(404).json({ error: 'Professional profile not found' });
    }

    // Update bank details
    professional.bankDetails = {
      bankName,
      bankCode,
      accountNumber,
      accountName,
      verified: true,
      verifiedAt: new Date()
    };

    await professional.save();

    res.json({
      success: true,
      message: 'Bank account saved successfully',
      bankDetails: {
        bankName: professional.bankDetails.bankName,
        accountNumber: professional.bankDetails.accountNumber,
        accountName: professional.bankDetails.accountName
      }
    });
  } catch (error) {
    console.error('Error saving bank account:', error);
    res.status(500).json({ error: 'Failed to save bank account' });
  }
});

// GET /api/consultation/professionals/earnings - Get earnings breakdown
router.get('/earnings', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Find professional
    const professional = await Professional.findOne({ userId });
    if (!professional) {
      return res.status(404).json({ error: 'Professional profile not found' });
    }

    // Get pending earnings from active sessions
    const activeSessions = await ConsultationSession.find({
      professionalId: professional._id,
      status: 'active'
    });

    const pendingEarnings = activeSessions.reduce((sum, session) => sum + session.professionalEarning, 0);

    // Get total withdrawn
    const completedWithdrawals = await Withdrawal.find({
      professionalId: professional._id,
      status: 'completed'
    });

    const totalWithdrawn = completedWithdrawals.reduce((sum, w) => sum + w.amount, 0);

    // Calculate available to withdraw
    const availableToWithdraw = professional.totalEarnings - pendingEarnings - totalWithdrawn;

    // Get withdrawal count
    const withdrawalCount = await Withdrawal.countDocuments({ professionalId: professional._id });

    res.json({
      success: true,
      earnings: {
        totalEarnings: professional.totalEarnings,
        pendingEarnings,
        totalWithdrawn,
        availableToWithdraw: Math.max(0, availableToWithdraw),
        withdrawalCount
      }
    });
  } catch (error) {
    console.error('Error fetching earnings:', error);
    res.status(500).json({ error: 'Failed to fetch earnings' });
  }
});

// POST /api/consultation/professionals/withdraw - Request withdrawal
router.post('/withdraw', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { amount } = req.body; // Amount in kobo

    if (!amount || amount < 500000) {
      return res.status(400).json({ error: 'Minimum withdrawal amount is ₦5,000' });
    }

    // Find professional
    const professional = await Professional.findOne({ userId });
    if (!professional) {
      return res.status(404).json({ error: 'Professional profile not found' });
    }

    // Check if bank account is set up
    if (!professional.bankDetails || !professional.bankDetails.verified) {
      return res.status(400).json({ error: 'Please add and verify your bank account first' });
    }

    // Get pending earnings
    const activeSessions = await ConsultationSession.find({
      professionalId: professional._id,
      status: 'active'
    });
    const pendingEarnings = activeSessions.reduce((sum, session) => sum + session.professionalEarning, 0);

    // Get total withdrawn
    const completedWithdrawals = await Withdrawal.find({
      professionalId: professional._id,
      status: 'completed'
    });
    const totalWithdrawn = completedWithdrawals.reduce((sum, w) => sum + w.amount, 0);

    // Calculate available balance
    const availableBalance = professional.totalEarnings - pendingEarnings - totalWithdrawn;

    if (amount > availableBalance) {
      return res.status(400).json({
        error: `Insufficient balance. Available: ₦${(availableBalance / 100).toLocaleString()}`
      });
    }

    // Create withdrawal request
    const withdrawal = new Withdrawal({
      professionalId: professional._id,
      amount,
      bankDetails: {
        bankName: professional.bankDetails.bankName,
        bankCode: professional.bankDetails.bankCode,
        accountNumber: professional.bankDetails.accountNumber,
        accountName: professional.bankDetails.accountName
      },
      status: 'pending',
      requestedAt: new Date()
    });

    await withdrawal.save();

    res.json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      withdrawal: {
        id: withdrawal._id,
        amount: withdrawal.amount,
        status: withdrawal.status,
        requestedAt: withdrawal.requestedAt
      }
    });

    // TODO: Process withdrawal asynchronously with Paystack Transfer API
    // This would be done in a background job/worker
  } catch (error) {
    console.error('Error requesting withdrawal:', error);
    res.status(500).json({ error: 'Failed to request withdrawal' });
  }
});

// GET /api/consultation/professionals/withdrawals - Get withdrawal history
router.get('/withdrawals', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Find professional
    const professional = await Professional.findOne({ userId });
    if (!professional) {
      return res.status(404).json({ error: 'Professional profile not found' });
    }

    // Get withdrawal history
    const withdrawals = await Withdrawal.find({ professionalId: professional._id })
      .sort({ requestedAt: -1 })
      .limit(50)
      .lean();

    res.json({
      success: true,
      withdrawals: withdrawals.map(w => ({
        id: w._id,
        amount: w.amount,
        status: w.status,
        requestedAt: w.requestedAt,
        processedAt: w.processedAt,
        completedAt: w.completedAt,
        failureReason: w.failureReason,
        reference: w.paystackReference || `WD-${w._id.toString().slice(-8).toUpperCase()}`
      }))
    });
  } catch (error) {
    console.error('Error fetching withdrawals:', error);
    res.status(500).json({ error: 'Failed to fetch withdrawal history' });
  }
});

export default router;
