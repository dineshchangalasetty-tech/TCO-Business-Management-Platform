import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireViewer } from '../middleware/rbac.middleware';
import { cacheMiddleware } from '../middleware/cache.middleware';
import { getAlerts } from '../controllers/alert.controller';

export const alertRoutes = Router();

alertRoutes.use(authMiddleware, requireViewer);

/**
 * GET /api/v1/alerts
 * Get all cost alerts for a subscription — cached 5 minutes.
 */
alertRoutes.get('/', cacheMiddleware(5 * 60), getAlerts);
