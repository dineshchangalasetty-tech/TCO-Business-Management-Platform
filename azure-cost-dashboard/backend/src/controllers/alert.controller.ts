import { Request, Response, NextFunction } from 'express';
import { AzureApiClient } from '../utils/azureApiClient';
import { CacheService } from '../services/cache.service';
import { loadAzureConfig } from '../config/azure.config';
import { ValidationError } from '../utils/errors';
import { NormalizedAlert, AlertSummary, AlertSeverity, AlertStatus, AzureAlert } from '../models/alert.model';

const apiClient = AzureApiClient.getInstance();
const cache = CacheService.getInstance();

interface AzureAlertListResponse {
  value: AzureAlert[];
  nextLink?: string;
}

function mapSeverity(type: string): AlertSeverity {
  if (type.toLowerCase().includes('budget') || type.toLowerCase().includes('exceeded')) return 'High';
  if (type.toLowerCase().includes('forecast')) return 'Medium';
  return 'Informational';
}

/**
 * GET /api/v1/alerts
 * Get all cost alerts for a subscription.
 */
export async function getAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { subscriptionId } = req.query as { subscriptionId?: string };
    if (!subscriptionId) throw new ValidationError('subscriptionId is required');

    const cacheKey = `alerts:${subscriptionId}`;
    const config = await loadAzureConfig();

    const data = await cache.getOrSet(cacheKey, 5 * 60, async () => {
      const url = `/subscriptions/${subscriptionId}/providers/Microsoft.CostManagement/alerts?api-version=${config.costManagementApiVersion}`;
      return apiClient.get<AzureAlertListResponse>(url);
    });

    const alerts: NormalizedAlert[] = data.value.map((alert) => ({
      id: alert.id,
      name: alert.name,
      type: alert.properties.definition.type,
      category: alert.properties.definition.category,
      severity: mapSeverity(alert.properties.definition.type),
      status: alert.properties.status,
      description: alert.properties.description,
      amount: alert.properties.details.amount,
      currentSpend: alert.properties.details.currentSpend,
      threshold: alert.properties.details.amount,
      createdAt: alert.properties.creationTime,
      modifiedAt: alert.properties.modificationTime,
    }));

    const summary: AlertSummary = {
      total: alerts.length,
      activeCount: alerts.filter((a) => a.status === 'Active').length,
      bySeverity: alerts.reduce((acc, a) => {
        acc[a.severity] = (acc[a.severity] ?? 0) + 1;
        return acc;
      }, {} as Record<AlertSeverity, number>),
      byStatus: alerts.reduce((acc, a) => {
        acc[a.status] = (acc[a.status] ?? 0) + 1;
        return acc;
      }, {} as Record<AlertStatus, number>),
      latestAlerts: alerts.slice(0, 5),
    };

    res.json({ success: true, data: { alerts, summary } });
  } catch (error) {
    next(error);
  }
}
