import { Router } from 'express';
import { Professional } from '../models/Professional.js';
import { Review } from '../models/Review.js';

const router = Router();

// GET /api/consultation/professionals - List all professionals
router.get('/', async (req, res) => {
  try {
    const { profession } = req.query;
    
    const filter: any = { isActive: true, isVerified: true };
    if (profession && (profession === 'DOCTOR' || profession === 'LAWYER')) {
      filter.profession = profession;
    }
    
    const professionals = await Professional.find(filter)
      .select('firstName lastName profession specialization yearsOfExperience bio averageRating totalReviews totalSessions')
      .sort({ averageRating: -1, totalSessions: -1 })
      .lean();
    
    res.json(professionals);
  } catch (error) {
    console.error('Error fetching professionals:', error);
    res.status(500).json({ error: 'Failed to fetch professionals' });
  }
});

// GET /api/consultation/professionals/:id - Get professional details + reviews
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const professional = await Professional.findById(id)
      .select('firstName lastName profession specialization yearsOfExperience bio averageRating totalReviews totalSessions')
      .lean();
    
    if (!professional) {
      return res.status(404).json({ error: 'Professional not found' });
    }
    
    // Get reviews for this professional
    const reviews = await Review.find({ professionalId: id })
      .select('clientAnonymousId rating reviewText createdAt')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    
    res.json({
      professional,
      reviews,
    });
  } catch (error) {
    console.error('Error fetching professional details:', error);
    res.status(500).json({ error: 'Failed to fetch professional details' });
  }
});

export default router;
