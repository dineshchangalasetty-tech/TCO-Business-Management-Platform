import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireViewer, requireAnalyst } from '../middleware/rbac.middleware';
import { cacheMiddleware } from '../middleware/cache.middleware';
import {
  listBudgets,
  getBudget,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetSummary,
} from '../controllers/budget.controller';

export const budgetRoutes = Router();

budgetRoutes.use(authMiddleware);

// GET routes — available to Viewer+
budgetRoutes.get('/', requireViewer, cacheMiddleware(5 * 60), listBudgets);
budgetRoutes.get('/summary', requireViewer, cacheMiddleware(5 * 60), getBudgetSummary);
budgetRoutes.get('/:budgetName', requireViewer, cacheMiddleware(5 * 60), getBudget);

// Write routes — require Analyst+
budgetRoutes.post('/', requireAnalyst, createBudget);
budgetRoutes.put('/:budgetName', requireAnalyst, updateBudget);
budgetRoutes.delete('/:budgetName', requireAnalyst, deleteBudget);
