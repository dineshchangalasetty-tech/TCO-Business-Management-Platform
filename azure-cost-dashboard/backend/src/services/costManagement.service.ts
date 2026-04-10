import { AzureApiClient } from '../utils/azureApiClient';
import { CacheService } from './cache.service';
import { loadAzureConfig } from '../config/azure.config';
import { logger } from '../utils/logger';
import { calculatePercentageChange } from '../utils/currencyFormatter';
import { getPresetDateRange, formatDate, daysBetween } from '../utils/dateHelpers';
import {
  CostQueryRequest,
  AzureCostQueryResponse,
  CostSummary,
  CostDataPoint,
  CostByDimension,
  TopResource,
  DashboardKPIs,
  GroupByDimension,
  CostMetric,
  CostFilter,
} from '../models/cost.model';
import { subMonths } from 'date-fns';

const CACHE_TTL_SECONDS = 15 * 60; // 15-minute cache for cost data

/**
 * Core service for querying Azure Cost Management API.
 * Handles actual costs, amortized costs, forecasts, and aggregations.
 */
export class CostManagementService {
  private static instance: CostManagementService;
  private readonly apiClient = AzureApiClient.getInstance();
  private readonly cache = CacheService.getInstance();

  public static getInstance(): CostManagementService {
    if (!CostManagementService.instance) {
      CostManagementService.instance = new CostManagementService();
    }
    return CostManagementService.instance;
  }

  /**
   * Query actual or amortized costs for a subscription with optional grouping and filters.
   */
  public async queryActualCosts(params: {
    subscriptionId: string;
    from: string;
    to: string;
    granularity?: 'Daily' | 'Monthly' | 'None';
    groupBy?: GroupByDimension | string;
    filter?: CostFilter;
    metric?: CostMetric;
    includePreviousPeriod?: boolean;
  }): Promise<CostSummary> {
    const {
      subscriptionId,
      from,
      to,
      granularity = 'Daily',
      groupBy,
      filter,
      metric = 'ActualCost',
      includePreviousPeriod = false,
    } = params;

    const cacheKey = `cost:${subscriptionId}:${from}:${to}:${granularity}:${groupBy ?? 'none'}:${metric}`;

    return this.cache.getOrSet(cacheKey, CACHE_TTL_SECONDS, async () => {
      const queryBody: CostQueryRequest = {
        type: metric,
        timeframe: 'Custom',
        timePeriod: { from, to },
        dataset: {
          granularity,
          aggregation: {
            totalCost: { name: 'Cost', function: 'Sum' },
          },
          ...(groupBy && {
            grouping: [{ type: 'Dimension', name: groupBy }],
          }),
          ...(filter && { filter }),
          sorting: [{ direction: 'Ascending', name: 'BillingMonth' }],
        },
      };

      const config = await loadAzureConfig();
      const url = `/subscriptions/${subscriptionId}/providers/Microsoft.CostManagement/query?api-version=${config.costManagementApiVersion}`;

      logger.debug('Querying Azure Cost Management', { subscriptionId, from, to, granularity, groupBy });

      const response = await this.apiClient.post<AzureCostQueryResponse>(url, queryBody);
      const dataPoints = this.normalizeQueryResponse(response, groupBy);
      const totalCost = dataPoints.reduce((sum, dp) => sum + dp.amount, 0);

      let previousPeriodCost: number | undefined;
      let percentageChange: number | null | undefined;

      if (includePreviousPeriod) {
        const dayCount = daysBetween(from, to);
        const prevTo = new Date(from);
        prevTo.setDate(prevTo.getDate() - 1);
        const prevFrom = new Date(prevTo);
        prevFrom.setDate(prevFrom.getDate() - dayCount);

        const prevResult = await this.queryActualCosts({
          subscriptionId,
          from: formatDate(prevFrom),
          to: formatDate(prevTo),
          granularity,
          metric,
        });
        previousPeriodCost = prevResult.totalCost;
        percentageChange = calculatePercentageChange(totalCost, previousPeriodCost);
      }

      return {
        subscriptionId,
        totalCost,
        currency: dataPoints[0]?.currency ?? 'USD',
        granularity,
        dateRange: { from, to },
        dataPoints,
        ...(groupBy && { groupBy }),
        ...(previousPeriodCost !== undefined && { previousPeriodCost }),
        ...(percentageChange !== undefined && { percentageChange }),
      };
    });
  }

  /**
   * Get amortized costs (reservation costs spread across the reservation period).
   */
  public async getAmortizedCosts(params: {
    subscriptionId: string;
    from: string;
    to: string;
    granularity?: 'Daily' | 'Monthly';
    groupBy?: GroupByDimension;
  }): Promise<CostSummary> {
    return this.queryActualCosts({ ...params, metric: 'AmortizedCost' });
  }

  /**
   * Get cost breakdown by a specific dimension (service, resource group, region, tag).
   */
  public async getCostByDimension(params: {
    subscriptionId: string;
    from: string;
    to: string;
    dimension: GroupByDimension | string;
    filter?: CostFilter;
  }): Promise<CostByDimension[]> {
    const { subscriptionId, from, to, dimension, filter } = params;
    const cacheKey = `cost:dimension:${subscriptionId}:${from}:${to}:${dimension}`;

    return this.cache.getOrSet(cacheKey, CACHE_TTL_SECONDS, async () => {
      const result = await this.queryActualCosts({
        subscriptionId,
        from,
        to,
        granularity: 'None',
        groupBy: dimension,
        filter,
      });

      const total = result.dataPoints.reduce((sum, dp) => sum + dp.amount, 0);

      return result.dataPoints
        .sort((a, b) => b.amount - a.amount)
        .map((dp) => ({
          dimension,
          value: dp.dimensionValue ?? 'Unknown',
          cost: dp.amount,
          currency: dp.currency,
          percentage: total > 0 ? Math.round((dp.amount / total) * 1000) / 10 : 0,
        }));
    });
  }

  /**
   * Get top N most expensive resources.
   */
  public async getTopResources(params: {
    subscriptionId: string;
    from: string;
    to: string;
    topN?: number;
  }): Promise<TopResource[]> {
    const { subscriptionId, from, to, topN = 10 } = params;
    const cacheKey = `cost:topresources:${subscriptionId}:${from}:${to}:${topN}`;

    return this.cache.getOrSet(cacheKey, CACHE_TTL_SECONDS, async () => {
      const config = await loadAzureConfig();
      const queryBody: CostQueryRequest = {
        type: 'ActualCost',
        timeframe: 'Custom',
        timePeriod: { from, to },
        dataset: {
          granularity: 'None',
          aggregation: { totalCost: { name: 'Cost', function: 'Sum' } },
          grouping: [
            { type: 'Dimension', name: 'ResourceId' },
            { type: 'Dimension', name: 'ResourceGroupName' },
            { type: 'Dimension', name: 'ServiceName' },
            { type: 'Dimension', name: 'ResourceLocation' },
          ],
          sorting: [{ direction: 'Descending', name: 'Cost' }],
        },
      };

      const url = `/subscriptions/${subscriptionId}/providers/Microsoft.CostManagement/query?api-version=${config.costManagementApiVersion}`;
      const response = await this.apiClient.post<AzureCostQueryResponse>(url, queryBody);

      const colIndex = this.buildColumnIndex(response.properties.columns);
      return response.properties.rows.slice(0, topN).map((row) => ({
        resourceId: String(row[colIndex['ResourceId'] ?? 0] ?? ''),
        resourceName: this.extractResourceName(String(row[colIndex['ResourceId'] ?? 0] ?? '')),
        resourceGroup: String(row[colIndex['ResourceGroupName'] ?? 1] ?? ''),
        serviceType: String(row[colIndex['ServiceName'] ?? 2] ?? ''),
        location: String(row[colIndex['ResourceLocation'] ?? 3] ?? ''),
        cost: Number(row[colIndex['Cost'] ?? 4] ?? 0),
        currency: String(row[colIndex['Currency'] ?? 5] ?? 'USD'),
      }));
    });
  }

  /**
   * Get dashboard KPI summary combining multiple API calls.
   */
  public async getDashboardKPIs(subscriptionId: string): Promise<DashboardKPIs> {
    const cacheKey = `cost:kpis:${subscriptionId}`;

    return this.cache.getOrSet(cacheKey, 5 * 60, async () => {
      const now = new Date();
      const mtdRange = getPresetDateRange('last30days');
      const ytdRange = getPresetDateRange('ytd');

      const [mtdCost, ytdCost, prevMonthCost] = await Promise.all([
        this.queryActualCosts({ subscriptionId, ...mtdRange, granularity: 'None' }),
        this.queryActualCosts({ subscriptionId, ...ytdRange, granularity: 'Monthly' }),
        this.queryActualCosts({
          subscriptionId,
          from: formatDate(subMonths(now, 2)),
          to: formatDate(subMonths(now, 1)),
          granularity: 'None',
        }),
      ]);

      const daysElapsed = new Date().getDate();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const avgDailyBurnRate = daysElapsed > 0 ? mtdCost.totalCost / daysElapsed : 0;
      const forecastedMonthEndCost = avgDailyBurnRate * daysInMonth;
      const percentageChange = calculatePercentageChange(mtdCost.totalCost, prevMonthCost.totalCost);

      const budgetOverrunRisk: 'low' | 'medium' | 'high' =
        percentageChange !== null && percentageChange > 20
          ? 'high'
          : percentageChange !== null && percentageChange > 10
            ? 'medium'
            : 'low';

      return {
        totalMonthlyCost: ytdCost.totalCost,
        mtdCost: mtdCost.totalCost,
        forecastedMonthEndCost,
        budgetUtilizationPercent: 0, // Populated by BudgetService
        costVarianceDelta: mtdCost.totalCost - prevMonthCost.totalCost,
        costVariancePercent: percentageChange,
        avgDailyBurnRate,
        budgetOverrunRisk,
        riCoveragePercent: 0, // Populated by ReservationService
        riUtilizationPercent: 0,
        savingsPlanUtilizationPercent: 0,
        untaggedResourceSpendPercent: 0,
        activeBudgetAlerts: 0,
        costAnomaliesDetected: 0,
        currency: mtdCost.currency,
        lastUpdated: new Date().toISOString(),
      };
    });
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private normalizeQueryResponse(
    response: AzureCostQueryResponse,
    groupBy?: string
  ): CostDataPoint[] {
    const colIndex = this.buildColumnIndex(response.properties.columns);

    return response.properties.rows.map((row) => ({
      date: String(row[colIndex['BillingMonth'] ?? colIndex['UsageDate'] ?? 0] ?? ''),
      amount: Number(row[colIndex['Cost'] ?? colIndex['PreTaxCost'] ?? 1] ?? 0),
      currency: String(row[colIndex['Currency'] ?? 2] ?? 'USD'),
      ...(groupBy && {
        dimension: groupBy,
        dimensionValue: String(row[colIndex[groupBy] ?? 3] ?? ''),
      }),
    }));
  }

  private buildColumnIndex(columns: Array<{ name: string; type: string }>): Record<string, number> {
    return columns.reduce<Record<string, number>>((acc, col, idx) => {
      acc[col.name] = idx;
      return acc;
    }, {});
  }

  private extractResourceName(resourceId: string): string {
    const parts = resourceId.split('/');
    return parts[parts.length - 1] ?? resourceId;
  }
}
