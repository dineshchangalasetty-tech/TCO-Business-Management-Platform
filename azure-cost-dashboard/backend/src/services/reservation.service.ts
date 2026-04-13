import { AzureApiClient } from '../utils/azureApiClient';
import { CacheService } from './cache.service';
import { loadAzureConfig } from '../config/azure.config';
import { logger } from '../utils/logger';

export interface ReservationSummary {
  reservationOrderId: string;
  reservationId: string;
  skuName: string;
  reservedHours: number;
  usedHours: number;
  minUtilizationPercentage: number;
  maxUtilizationPercentage: number;
  avgUtilizationPercentage: number;
  purchasedQuantity: number;
  remainingQuantity: number;
  totalReservedQuantity: number;
  usedQuantity: number;
  utilizedPercentage: number;
}

export interface ReservationPortfolioSummary {
  totalReservations: number;
  avgUtilizationPercent: number;
  coveragePercent: number;
  potentialSavingsMonthly: number;
  underutilizedCount: number;
  currency: string;
  reservations: ReservationSummary[];
}

interface AzureReservationSummaryResponse {
  value: Array<{
    id: string;
    name: string;
    properties: {
      reservationOrderId: string;
      reservationId: string;
      skuName: string;
      reservedHours: number;
      usedHours: number;
      minUtilizationPercentage: number;
      maxUtilizationPercentage: number;
      avgUtilizationPercentage: number;
      purchasedQuantity: number;
      remainingQuantity: number;
      totalReservedQuantity: number;
      usedQuantity: number;
      utilizedPercentage: number;
    };
  }>;
}

const CACHE_TTL_SECONDS = 60 * 60; // 1-hour cache for reservation data

/**
 * Service for querying Azure Reservation utilization data.
 */
export class ReservationService {
  private static instance: ReservationService;
  private readonly apiClient = AzureApiClient.getInstance();
  private readonly cache = CacheService.getInstance();

  public static getInstance(): ReservationService {
    if (!ReservationService.instance) {
      ReservationService.instance = new ReservationService();
    }
    return ReservationService.instance;
  }

  /**
   * Get reservation utilization summaries for a billing scope.
   */
  public async getReservationSummary(params: {
    subscriptionId: string;
    grain?: 'Daily' | 'Monthly';
    from?: string;
    to?: string;
  }): Promise<ReservationPortfolioSummary> {
    const { subscriptionId, grain = 'Monthly', from, to } = params;
    const cacheKey = `reservations:${subscriptionId}:${grain}:${from ?? 'default'}`;

    return this.cache.getOrSet(cacheKey, CACHE_TTL_SECONDS, async () => {
      const config = await loadAzureConfig();

      let filter = `grain eq '${grain}'`;
      if (from && to) {
        filter += ` and properties/usageDate ge ${from} and properties/usageDate le ${to}`;
      }

      const url = `/subscriptions/${subscriptionId}/providers/Microsoft.Consumption/reservationSummaries?api-version=${config.consumptionApiVersion}&$filter=${encodeURIComponent(filter)}`;

      logger.debug('Fetching reservation summaries', { subscriptionId, grain });

      const response = await this.apiClient.get<AzureReservationSummaryResponse>(url);

      const reservations = response.value.map((item) => ({
        reservationOrderId: item.properties.reservationOrderId,
        reservationId: item.properties.reservationId,
        skuName: item.properties.skuName,
        reservedHours: item.properties.reservedHours,
        usedHours: item.properties.usedHours,
        minUtilizationPercentage: item.properties.minUtilizationPercentage,
        maxUtilizationPercentage: item.properties.maxUtilizationPercentage,
        avgUtilizationPercentage: item.properties.avgUtilizationPercentage,
        purchasedQuantity: item.properties.purchasedQuantity,
        remainingQuantity: item.properties.remainingQuantity,
        totalReservedQuantity: item.properties.totalReservedQuantity,
        usedQuantity: item.properties.usedQuantity,
        utilizedPercentage: item.properties.utilizedPercentage,
      }));

      const totalCount = reservations.length;
      const avgUtil = totalCount > 0
        ? reservations.reduce((sum, r) => sum + r.avgUtilizationPercentage, 0) / totalCount
        : 0;
      const underutilized = reservations.filter((r) => r.avgUtilizationPercentage < 80).length;

      return {
        totalReservations: totalCount,
        avgUtilizationPercent: Math.round(avgUtil * 10) / 10,
        coveragePercent: Math.round(avgUtil * 10) / 10,
        potentialSavingsMonthly: 0, // Computed from pricing data in a future phase
        underutilizedCount: underutilized,
        currency: 'USD',
        reservations,
      };
    });
  }
}
