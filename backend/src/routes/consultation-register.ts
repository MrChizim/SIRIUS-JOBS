import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { Professional } from '../models/Professional.js';
import { z } from 'zod';

const router = Router();

// Validation schema
const professionalRegistrationSchema = z.object({
  profession: z.enum(['DOCTOR', 'LAWYER']),
  specialization: z.string().min(3).max(100),
  licenseNumber: z.string().min(5).max(50),
  yearsOfExperience: z.number().int().min(0).max(60),
  bio: z.string().min(50).max(500),
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
    
    const { profession, specialization, licenseNumber, yearsOfExperience, bio } = validation.data;
    
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
      yearsOfExperience,
      bio,
      isVerified: false, // Requires manual verification
      isActive: true,
    });
    
    await professional.save();
    
    res.status(201).json({
      message: 'Professional profile created successfully. Your profile is pending verification.',
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
