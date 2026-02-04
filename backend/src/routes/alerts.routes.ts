/**
 * Alerts Routes (v2)
 * Job alert subscriptions & notifications
 */

import { Router } from 'express';
import * as alertsController from '../controllers/alerts.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/subscriptions', authenticate, alertsController.getSubscriptions);
router.post('/subscriptions', authenticate, alertsController.subscribe);
router.delete('/subscriptions/:id', authenticate, alertsController.deleteSubscription);

router.get('/notifications', authenticate, alertsController.getNotifications);
router.patch('/notifications/:id/read', authenticate, alertsController.markNotificationRead);

export default router;
