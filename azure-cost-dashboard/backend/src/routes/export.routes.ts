import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireViewer } from '../middleware/rbac.middleware';
import { generateExport } from '../controllers/export.controller';

export const exportRoutes = Router();

exportRoutes.use(authMiddleware, requireViewer);

/**
 * POST /api/v1/exports
 * Generate a cost data export (CSV, Excel, JSON).
 * Note: POST is used (not GET) because filters/body can be large.
 */
exportRoutes.post('/', generateExport);
