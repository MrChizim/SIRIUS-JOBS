import { Router } from 'express';
import * as publicController from '../controllers/public.controller';

const router = Router();

router.get('/stats', publicController.getOverviewStats);

export default router;
