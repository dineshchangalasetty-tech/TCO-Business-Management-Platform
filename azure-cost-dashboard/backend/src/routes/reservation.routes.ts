import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireViewer } from '../middleware/rbac.middleware';
import { cacheMiddleware } from '../middleware/cache.middleware';
import { getReservationSummary } from '../controllers/reservation.controller';

export const reservationRoutes = Router();

reservationRoutes.use(authMiddleware, requireViewer);

/**
 * GET /api/v1/reservations
 * Reservation utilization summary — cached 1 hour.
 */
reservationRoutes.get('/', cacheMiddleware(60 * 60), getReservationSummary);
