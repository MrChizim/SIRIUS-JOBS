/**
 * Services Routes (v2)
 * Public service discovery endpoints
 */

import { Router } from 'express';
import * as servicesController from '../controllers/services.controller';

const router = Router();

router.get('/categories', servicesController.getServiceCategories);
router.get('/providers', servicesController.getProviders);

export default router;
