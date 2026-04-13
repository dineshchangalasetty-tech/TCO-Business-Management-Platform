import { AzureApiClient } from '../utils/azureApiClient';
import { CacheService } from './cache.service';
import { loadAzureConfig } from '../config/azure.config';
import { logger } from '../utils/logger';

export interface ForecastResult {
  subscriptionId: string;
  currency: string;
  forecastedTotal: number;
  dataPoints: Array<{
    date: string;
    forecastedAmount: number;
    lowerBound: number;
    upperBound: number;
    isActual: boolean;
  }>;
}

interface AzureForecastResponse {
  properties: {
    columns: Array<{ name: string; type: string }>;
    rows: Array<Array<string | number>>;
    nextLink: string | null;
  };
}

const CACHE_TTL_SECONDS = 30 * 60; // 30-minute cache for forecasts

/**
 * Service for querying Azure Cost Management forecast API.
 */
export class ForecastService {
  private static instance: ForecastService;
  private readonly apiClient = AzureApiClient.getInstance();
  private readonly cache = CacheService.getInstance();

  public static getInstance(): ForecastService {
    if (!ForecastService.instance) {
      ForecastService.instance = new ForecastService();
    }
    return ForecastService.instance;
  }

  /**
   * Get a 30, 60, or 90-day cost forecast for a subscription.
   */
  public async getForecast(params: {
    subscriptionId: string;
    daysAhead?: 30 | 60 | 90;
    includeActualToDate?: boolean;
  }): Promise<ForecastResult> {
    const { subscriptionId, daysAhead = 30, includeActualToDate = true } = params;
    const cacheKey = `forecast:${subscriptionId}:${daysAhead}`;

    return this.cache.getOrSet(cacheKey, CACHE_TTL_SECONDS, async () => {
      const config = await loadAzureConfig();
      const url = `/subscriptions/${subscriptionId}/providers/Microsoft.CostManagement/forecast?api-version=${config.costManagementApiVersion}`;

      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const startDate = includeActualToDate
        ? new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]!
        : today.toISOString().split('T')[0]!;

      const endDate = futureDate.toISOString().split('T')[0]!;

      const forecastBody = {
        type: 'ActualCost',
        timeframe: 'Custom',
        timePeriod: { from: startDate, to: endDate },
        dataset: {
          granularity: 'Daily',
          aggregation: {
            totalCost: { name: 'Cost', function: 'Sum' },
          },
        },
        includeActualCost: includeActualToDate,
        includeFreshPartialCost: true,
      };

      logger.debug('Querying forecast', { subscriptionId, daysAhead });

      const response = await this.apiClient.post<AzureForecastResponse>(url, forecastBody);
      const colIndex = response.properties.columns.reduce<Record<string, number>>((acc, col, idx) => {
        acc[col.name] = idx;
        return acc;
      }, {});

      const todayStr = today.toISOString().split('T')[0]!;

      const dataPoints = response.properties.rows.map((row) => {
        const rawDate = String(row[colIndex['UsageDate'] ?? colIndex['BillingMonth'] ?? 0] ?? '');
        const dateStr = rawDate.length === 8
          ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
          : rawDate;
        const amount = Number(row[colIndex['Cost'] ?? colIndex['PreTaxCost'] ?? 1] ?? 0);
        const confidence = Number(row[colIndex['ConfidenceLevelsLow'] ?? -1] ?? amount * 0.9);
        const confidenceHigh = Number(row[colIndex['ConfidenceLevelsHigh'] ?? -1] ?? amount * 1.1);

        return {
          date: dateStr,
          forecastedAmount: amount,
          lowerBound: confidence,
          upperBound: confidenceHigh,
          isActual: dateStr <= todayStr,
        };
      });

      const forecastedTotal = dataPoints
        .filter((dp) => !dp.isActual)
        .reduce((sum, dp) => sum + dp.forecastedAmount, 0);

      const currency = String(
        response.properties.rows[0]?.[colIndex['Currency'] ?? 2] ?? 'USD'
      );

      return { subscriptionId, currency, forecastedTotal, dataPoints };
    });
  }
}
