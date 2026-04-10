import { Router } from 'express';
import { query } from 'express-validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireViewer } from '../middleware/rbac.middleware';
import { cacheMiddleware } from '../middleware/cache.middleware';
import {
  getOverviewKPIs,
  queryCosts,
  getCostBreakdown,
  getTopResources,
  getAmortizedCosts,
} from '../controllers/cost.controller';

export const costRoutes = Router();

// All cost routes require authentication + viewer role
costRoutes.use(authMiddleware, requireViewer);

/**
 * GET /api/v1/costs/overview
 * Dashboard KPI summary — cached 5 minutes
 */
costRoutes.get(
  '/overview',
  cacheMiddleware(5 * 60),
  getOverviewKPIs
);

/**
 * GET /api/v1/costs/query
 * Flexible cost query with granularity, groupBy, metric
 */
costRoutes.get(
  '/query',
  [
    query('subscriptionId').notEmpty().withMessage('subscriptionId is required'),
    query('from').notEmpty().isISO8601().withMessage('from must be a valid ISO 8601 date'),
    query('to').notEmpty().isISO8601().withMessage('to must be a valid ISO 8601 date'),
    query('granularity').optional().isIn(['Daily', 'Monthly', 'None']).withMessage('Invalid granularity'),
    query('metric').optional().isIn(['ActualCost', 'AmortizedCost']).withMessage('Invalid metric'),
  ],
  cacheMiddleware(15 * 60),
  queryCosts
);

/**
 * GET /api/v1/costs/breakdown
 * Cost breakdown by dimension — cached 15 minutes
 */
costRoutes.get(
  '/breakdown',
  [
    query('subscriptionId').notEmpty(),
    query('dimension').notEmpty(),
    query('from').notEmpty().isISO8601(),
    query('to').notEmpty().isISO8601(),
  ],
  cacheMiddleware(15 * 60),
  getCostBreakdown
);

/**
 * GET /api/v1/costs/top-resources
 * Top N costliest resources — cached 15 minutes
 */
costRoutes.get(
  '/top-resources',
  [
    query('subscriptionId').notEmpty(),
    query('from').notEmpty().isISO8601(),
    query('to').notEmpty().isISO8601(),
    query('topN').optional().isInt({ min: 1, max: 50 }),
  ],
  cacheMiddleware(15 * 60),
  getTopResources
);

/**
 * GET /api/v1/costs/amortized
 * Amortized costs (reservation spread) — cached 30 minutes
 */
costRoutes.get(
  '/amortized',
  [
    query('subscriptionId').notEmpty(),
    query('from').notEmpty().isISO8601(),
    query('to').notEmpty().isISO8601(),
  ],
  cacheMiddleware(30 * 60),
  getAmortizedCosts
);
