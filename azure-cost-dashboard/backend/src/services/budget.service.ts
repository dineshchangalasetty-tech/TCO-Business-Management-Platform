import { AzureApiClient } from '../utils/azureApiClient';
import { CacheService } from './cache.service';
import { loadAzureConfig } from '../config/azure.config';
import { logger } from '../utils/logger';
import {
  AzureBudget,
  EnrichedBudget,
  CreateBudgetRequest,
  BudgetNotificationSummary,
} from '../models/budget.model';
import { NotFoundError } from '../utils/errors';

const CACHE_TTL_SECONDS = 5 * 60; // 5-minute cache for budget data

interface AzureBudgetListResponse {
  value: AzureBudget[];
  nextLink?: string;
}

/**
 * Service for managing Azure Cost Management budgets.
 */
export class BudgetService {
  private static instance: BudgetService;
  private readonly apiClient = AzureApiClient.getInstance();
  private readonly cache = CacheService.getInstance();

  public static getInstance(): BudgetService {
    if (!BudgetService.instance) {
      BudgetService.instance = new BudgetService();
    }
    return BudgetService.instance;
  }

  /**
   * List all budgets for a subscription with current spend data.
   */
  public async listBudgets(subscriptionId: string): Promise<EnrichedBudget[]> {
    const cacheKey = `budgets:${subscriptionId}`;

    return this.cache.getOrSet(cacheKey, CACHE_TTL_SECONDS, async () => {
      const config = await loadAzureConfig();
      const url = `/subscriptions/${subscriptionId}/providers/Microsoft.CostManagement/budgets?api-version=${config.costManagementApiVersion}`;

      logger.debug('Fetching budgets', { subscriptionId });
      const response = await this.apiClient.get<AzureBudgetListResponse>(url);
      return response.value.map(this.enrichBudget);
    });
  }

  /**
   * Get a single budget by name.
   */
  public async getBudgetDetails(subscriptionId: string, budgetName: string): Promise<EnrichedBudget> {
    const cacheKey = `budget:${subscriptionId}:${budgetName}`;

    return this.cache.getOrSet(cacheKey, CACHE_TTL_SECONDS, async () => {
      const config = await loadAzureConfig();
      const url = `/subscriptions/${subscriptionId}/providers/Microsoft.CostManagement/budgets/${budgetName}?api-version=${config.costManagementApiVersion}`;

      try {
        const budget = await this.apiClient.get<AzureBudget>(url);
        return this.enrichBudget(budget);
      } catch (error) {
        if ((error as { azureStatusCode?: number }).azureStatusCode === 404) {
          throw new NotFoundError(`Budget '${budgetName}'`);
        }
        throw error;
      }
    });
  }

  /**
   * Create or update a budget.
   */
  public async createOrUpdateBudget(request: CreateBudgetRequest): Promise<EnrichedBudget> {
    const { subscriptionId, name, amount, timeGrain, startDate, endDate, resourceGroups, tags, notifications } = request;
    const config = await loadAzureConfig();
    const url = `/subscriptions/${subscriptionId}/providers/Microsoft.CostManagement/budgets/${name}?api-version=${config.costManagementApiVersion}`;

    const budgetBody: AzureBudget = {
      name,
      properties: {
        category: 'Cost',
        amount,
        timeGrain,
        timePeriod: { startDate, ...(endDate && { endDate }) },
        ...(resourceGroups && { filter: { resourceGroups } }),
        ...(tags && Object.keys(tags).length > 0 && { filter: { tags } }),
        notifications: notifications
          ? Object.fromEntries(
              notifications.map((n, i) => [
                `Alert${i + 1}_${n.threshold}`,
                {
                  enabled: n.enabled,
                  operator: n.operator,
                  threshold: n.threshold,
                  thresholdType: n.thresholdType,
                  contactEmails: n.contactEmails,
                },
              ])
            )
          : undefined,
      },
    };

    logger.info('Creating/updating budget', { subscriptionId, name, amount });
    const result = await this.apiClient.put<AzureBudget>(url, budgetBody);

    // Invalidate cache
    await this.cache.invalidatePattern(`budget*:${subscriptionId}*`);

    return this.enrichBudget(result);
  }

  /**
   * Delete a budget.
   */
  public async deleteBudget(subscriptionId: string, budgetName: string): Promise<void> {
    const config = await loadAzureConfig();
    const url = `/subscriptions/${subscriptionId}/providers/Microsoft.CostManagement/budgets/${budgetName}?api-version=${config.costManagementApiVersion}`;

    await this.apiClient.delete(url);
    await this.cache.invalidatePattern(`budget*:${subscriptionId}*`);
    logger.info('Budget deleted', { subscriptionId, budgetName });
  }

  /**
   * Get budget utilization summary for a subscription (used by Dashboard KPIs).
   */
  public async getBudgetUtilizationSummary(subscriptionId: string): Promise<{
    totalBudget: number;
    totalSpend: number;
    utilizationPercent: number;
    overBudgetCount: number;
    atRiskCount: number;
  }> {
    const budgets = await this.listBudgets(subscriptionId);
    if (budgets.length === 0) return { totalBudget: 0, totalSpend: 0, utilizationPercent: 0, overBudgetCount: 0, atRiskCount: 0 };

    const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
    const totalSpend = budgets.reduce((sum, b) => sum + b.currentSpend, 0);
    const overBudgetCount = budgets.filter((b) => b.status === 'exceeded').length;
    const atRiskCount = budgets.filter((b) => b.status === 'at_risk').length;

    return {
      totalBudget,
      totalSpend,
      utilizationPercent: totalBudget > 0 ? Math.round((totalSpend / totalBudget) * 1000) / 10 : 0,
      overBudgetCount,
      atRiskCount,
    };
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private enrichBudget = (budget: AzureBudget): EnrichedBudget => {
    const amount = budget.properties.amount;
    const currentSpend = budget.properties.currentSpend?.amount ?? 0;
    const forecastedSpend = budget.properties.forecastSpend?.amount ?? 0;
    const utilizationPercent = amount > 0 ? Math.round((currentSpend / amount) * 1000) / 10 : 0;
    const forecastedUtilizationPercent = amount > 0 ? Math.round((forecastedSpend / amount) * 1000) / 10 : 0;

    const status: EnrichedBudget['status'] =
      currentSpend >= amount ? 'exceeded' : utilizationPercent >= 80 ? 'at_risk' : 'on_track';

    const notifications: BudgetNotificationSummary[] = Object.values(
      budget.properties.notifications ?? {}
    ).map((n) => ({
      threshold: n.threshold,
      thresholdType: n.thresholdType,
      enabled: n.enabled,
      contactEmails: n.contactEmails,
    }));

    return {
      id: budget.id ?? budget.name,
      name: budget.name,
      displayName: budget.name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      amount,
      currentSpend,
      forecastedSpend,
      currency: budget.properties.currentSpend?.unit ?? 'USD',
      timeGrain: budget.properties.timeGrain,
      utilizationPercent,
      forecastedUtilizationPercent,
      status,
      notifications,
      timePeriod: budget.properties.timePeriod,
    };
  };
}
