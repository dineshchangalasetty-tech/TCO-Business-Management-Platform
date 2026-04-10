import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireViewer } from '../middleware/rbac.middleware';
import { cacheMiddleware } from '../middleware/cache.middleware';
import { getForecast } from '../controllers/forecast.controller';

export const forecastRoutes = Router();

forecastRoutes.use(authMiddleware, requireViewer);

/**
 * GET /api/v1/forecasts
 * Cost forecast for 30, 60, or 90 days ahead.
 */
forecastRoutes.get('/', cacheMiddleware(30 * 60), getForecast);
