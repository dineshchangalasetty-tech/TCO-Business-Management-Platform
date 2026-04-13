import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { CostManagementService } from '../services/costManagement.service';
import { BudgetService } from '../services/budget.service';
import { ValidationError } from '../utils/errors';
import { isValidDate } from '../utils/dateHelpers';
import { GroupByDimension } from '../models/cost.model';

const costService = CostManagementService.getInstance();
const budgetService = BudgetService.getInstance();

/**
 * GET /api/v1/costs/overview
 * Returns dashboard KPI summary for a subscription.
 */
export async function getOverviewKPIs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { subscriptionId } = req.query as { subscriptionId: string };

    if (!subscriptionId) throw new ValidationError('subscriptionId query parameter is required');

    const [kpis, budgetSummary] = await Promise.all([
      costService.getDashboardKPIs(subscriptionId),
      budgetService.getBudgetUtilizationSummary(subscriptionId),
    ]);

    kpis.budgetUtilizationPercent = budgetSummary.utilizationPercent;
    kpis.activeBudgetAlerts = budgetSummary.overBudgetCount + budgetSummary.atRiskCount;

    res.json({ success: true, data: kpis });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/costs/query
 * Query cost data with granularity, grouping, and filter options.
 */
export async function queryCosts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new ValidationError(errors.array()[0]?.msg ?? 'Validation error');

    const {
      subscriptionId,
      from,
      to,
      granularity = 'Daily',
      groupBy,
      metric = 'ActualCost',
      includePreviousPeriod = 'false',
    } = req.query as Record<string, string>;

    if (!isValidDate(from) || !isValidDate(to)) throw new ValidationError('Invalid date format. Use YYYY-MM-DD');
    if (new Date(from) > new Date(to)) throw new ValidationError('"from" must be before "to"');

    const result = await costService.queryActualCosts({
      subscriptionId: subscriptionId ?? '',
      from: from ?? '',
      to: to ?? '',
      granularity: (granularity as 'Daily' | 'Monthly' | 'None') ?? 'Daily',
      ...(groupBy && { groupBy: groupBy as GroupByDimension }),
      metric: (metric as 'ActualCost' | 'AmortizedCost') ?? 'ActualCost',
      includePreviousPeriod: includePreviousPeriod === 'true',
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/costs/breakdown
 * Get cost breakdown by a dimension (service, resource group, region, tag).
 */
export async function getCostBreakdown(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { subscriptionId, from, to, dimension } = req.query as Record<string, string>;

    if (!subscriptionId) throw new ValidationError('subscriptionId is required');
    if (!dimension) throw new ValidationError('dimension is required');
    if (!isValidDate(from ?? '') || !isValidDate(to ?? '')) throw new ValidationError('Invalid date format');

    const result = await costService.getCostByDimension({
      subscriptionId,
      from: from ?? '',
      to: to ?? '',
      dimension: dimension as GroupByDimension,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/costs/top-resources
 * Get top N costliest resources for a subscription.
 */
export async function getTopResources(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { subscriptionId, from, to, topN = '10' } = req.query as Record<string, string>;

    if (!subscriptionId) throw new ValidationError('subscriptionId is required');
    if (!isValidDate(from ?? '') || !isValidDate(to ?? '')) throw new ValidationError('Invalid date format');

    const result = await costService.getTopResources({
      subscriptionId,
      from: from ?? '',
      to: to ?? '',
      topN: parseInt(topN, 10),
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/costs/amortized
 * Get amortized costs (for reservation analysis).
 */
export async function getAmortizedCosts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { subscriptionId, from, to, granularity = 'Monthly' } = req.query as Record<string, string>;

    if (!subscriptionId) throw new ValidationError('subscriptionId is required');
    if (!isValidDate(from ?? '') || !isValidDate(to ?? '')) throw new ValidationError('Invalid date format');

    const result = await costService.getAmortizedCosts({
      subscriptionId,
      from: from ?? '',
      to: to ?? '',
      granularity: (granularity as 'Daily' | 'Monthly') ?? 'Monthly',
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
