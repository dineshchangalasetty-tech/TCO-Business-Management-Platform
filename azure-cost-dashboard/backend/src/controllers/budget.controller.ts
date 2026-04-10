import { Request, Response, NextFunction } from 'express';
import { BudgetService } from '../services/budget.service';
import { ValidationError } from '../utils/errors';
import { CreateBudgetRequest } from '../models/budget.model';

const budgetService = BudgetService.getInstance();

/**
 * GET /api/v1/budgets
 * List all budgets for a subscription.
 */
export async function listBudgets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { subscriptionId } = req.query as { subscriptionId?: string };
    if (!subscriptionId) throw new ValidationError('subscriptionId query parameter is required');

    const budgets = await budgetService.listBudgets(subscriptionId);
    res.json({ success: true, data: budgets, count: budgets.length });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/budgets/:budgetName
 * Get details of a specific budget.
 */
export async function getBudget(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { budgetName } = req.params as { budgetName: string };
    const { subscriptionId } = req.query as { subscriptionId?: string };
    if (!subscriptionId) throw new ValidationError('subscriptionId query parameter is required');

    const budget = await budgetService.getBudgetDetails(subscriptionId, budgetName);
    res.json({ success: true, data: budget });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/budgets
 * Create a new budget.
 */
export async function createBudget(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as CreateBudgetRequest;
    if (!body.name) throw new ValidationError('Budget name is required');
    if (!body.amount || body.amount <= 0) throw new ValidationError('Budget amount must be a positive number');
    if (!body.subscriptionId) throw new ValidationError('subscriptionId is required');

    const budget = await budgetService.createOrUpdateBudget(body);
    res.status(201).json({ success: true, data: budget });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v1/budgets/:budgetName
 * Update an existing budget.
 */
export async function updateBudget(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { budgetName } = req.params as { budgetName: string };
    const { subscriptionId } = req.query as { subscriptionId?: string };
    const body = req.body as Partial<CreateBudgetRequest>;

    if (!subscriptionId) throw new ValidationError('subscriptionId is required');

    const budget = await budgetService.createOrUpdateBudget({
      ...body,
      name: budgetName,
      subscriptionId,
    } as CreateBudgetRequest);

    res.json({ success: true, data: budget });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/budgets/:budgetName
 * Delete a budget.
 */
export async function deleteBudget(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { budgetName } = req.params as { budgetName: string };
    const { subscriptionId } = req.query as { subscriptionId?: string };
    if (!subscriptionId) throw new ValidationError('subscriptionId is required');

    await budgetService.deleteBudget(subscriptionId, budgetName);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/budgets/summary
 * Get budget utilization summary KPIs.
 */
export async function getBudgetSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { subscriptionId } = req.query as { subscriptionId?: string };
    if (!subscriptionId) throw new ValidationError('subscriptionId is required');

    const summary = await budgetService.getBudgetUtilizationSummary(subscriptionId);
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
}
