import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { Professional } from '../models/Professional.js';
import { z } from 'zod';

const router = Router();

// Validation schema
const licenseUploadSchema = z.object({
  name: z.string(),
  type: z.string().optional(),
  size: z.number().max(5 * 1024 * 1024, { message: 'Upload must be 5MB or less' }),
  data: z.string().min(20),
});

const professionalRegistrationSchema = z
  .object({
    profession: z.enum(['DOCTOR', 'LAWYER']),
    specialization: z.string().min(3).max(100),
    licenseNumber: z.string().min(5).max(50),
    regulatoryBody: z.string().min(2).max(120),
    yearsOfExperience: z.number().int().min(0).max(60),
    verificationMethod: z.enum(['LINK', 'UPLOAD']),
    licenseDocumentLink: z.string().url().optional(),
    licenseDocumentUpload: licenseUploadSchema.optional(),
    bio: z.string().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.verificationMethod === 'LINK' && !data.licenseDocumentLink) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['licenseDocumentLink'],
        message: 'Provide a secure link to your licence document.',
      });
    }
    if (data.verificationMethod === 'UPLOAD' && !data.licenseDocumentUpload) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['licenseDocumentUpload'],
        message: 'Upload your licence document when choosing the upload option.',
      });
    }
  });

// POST /api/consultation/register - Register as professional
router.post('/register', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    
    // Check if user has DOCTOR or LAWYER role
    if (!user.roles.includes('DOCTOR') && !user.roles.includes('LAWYER')) {
      return res.status(403).json({ error: 'Only doctors and lawyers can register as consultation professionals' });
    }
    
    // Validate request body
    const validation = professionalRegistrationSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: validation.error.errors 
      });
    }
    
    const {
      profession,
      specialization,
      licenseNumber,
      regulatoryBody,
      yearsOfExperience,
      verificationMethod,
      licenseDocumentLink,
      licenseDocumentUpload,
      bio,
    } = validation.data;
    
    // Check if professional profile already exists
    const existingProfile = await Professional.findOne({ userId: user.userId });
    if (existingProfile) {
      return res.status(409).json({ error: 'Professional profile already exists' });
    }
    
    // Create professional profile
    const professional = new Professional({
      userId: user.userId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profession,
      specialization,
      licenseNumber,
      regulatoryBody,
      yearsOfExperience,
      bio: bio ?? '',
      isVerified: false, // Requires manual verification
      isActive: true,
      verification: {
        method: verificationMethod,
        status: 'PENDING_MANUAL_REVIEW',
        submittedAt: new Date(),
        licenseDocumentLink: verificationMethod === 'LINK' ? licenseDocumentLink : undefined,
        licenseDocumentFile:
          verificationMethod === 'UPLOAD'
            ? {
                name: licenseDocumentUpload?.name,
                type: licenseDocumentUpload?.type,
                size: licenseDocumentUpload?.size,
                data: licenseDocumentUpload?.data,
              }
            : undefined,
        governmentCheck: {
          status: 'NOT_INITIATED',
        },
        notes: 'Queued for compliance review before government verification hand-off.',
      },
    });
    
    await professional.save();

    // TODO: When the government verification API is available, enqueue `professional.verification`
    // here so that compliance services can attach the returned referenceId/provider metadata.
    
    res.status(201).json({
      message:
        'Professional profile created successfully. Your documents are pending manual verification before we trigger the government check.',
      professional: {
        id: professional._id,
        profession: professional.profession,
        specialization: professional.specialization,
        isVerified: professional.isVerified,
      },
    });
  } catch (error) {
    console.error('Error registering professional:', error);
    res.status(500).json({ error: 'Failed to register professional profile' });
  }
});

// GET /api/consultation/register/status - Check professional registration status
router.get('/register/status', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    
    const professional = await Professional.findOne({ userId: user.userId })
      .select('profession specialization isVerified isActive totalSessions averageRating')
      .lean();
    
    if (!professional) {
      return res.json({ registered: false });
    }
    
    res.json({
      registered: true,
      professional,
    });
  } catch (error) {
    console.error('Error checking registration status:', error);
    res.status(500).json({ error: 'Failed to check registration status' });
  }
});

export default router;
