/**
 * Demo middleware — intercepts all /api/v1/* requests and returns realistic mock data
 * when DEMO_MODE=true. This allows the frontend to be demoed without Azure credentials.
 */

import { Request, Response, NextFunction } from 'express';

const DEMO_SUBSCRIPTION = 'demo-sub-00000000-0000-0000-0000-000000000000';

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0]!;
}

function success<T>(data: T, count?: number) {
  return { success: true, data, ...(count !== undefined ? { count } : {}) };
}

// ── Mock data generators ──────────────────────────────────────────────────────

function mockKPIs() {
  const mtdTotal = 142_380.5;
  const prevMonthTotal = 131_200.0;
  return {
    totalMonthlyCost: prevMonthTotal,
    mtdCost: mtdTotal,
    mtdTotal,
    forecastedMonthEndCost: 165_000,
    forecastedMonthEnd: 165_000,
    budgetUtilizationPercent: 71.2,
    costVarianceDelta: mtdTotal - prevMonthTotal,
    costVariancePercent: ((mtdTotal - prevMonthTotal) / prevMonthTotal) * 100,
    avgDailyBurnRate: 4_746.0,
    dailyBurnRate: 4_746.0,
    budgetOverrunRisk: 'low' as const,
    riskLevel: 'low' as const,
    riCoveragePercent: 54.3,
    riUtilizationPercent: 91.7,
    savingsPlanUtilizationPercent: 88.4,
    untaggedResourceSpendPercent: 12.5,
    activeBudgetAlerts: 2,
    costAnomaliesDetected: 1,
    currency: 'USD',
    lastUpdated: new Date().toISOString(),
    mtdVsPrevMonth: mtdTotal - prevMonthTotal,
    mtdVsPrevMonthPercent: ((mtdTotal - prevMonthTotal) / prevMonthTotal) * 100,
    ytdTotal: 1_042_810.25,
    prevMonthTotal,
    reservationSavings: 23_450.0,
  };
}

function mockCostTrend() {
  const dataPoints = Array.from({ length: 30 }, (_, i) => {
    const base = 4200 + Math.sin(i / 3) * 600;
    const amount = Math.round((base + Math.random() * 400) * 100) / 100;
    return { date: daysAgo(29 - i), amount, cost: amount, currency: 'USD' };
  });
  return {
    subscriptionId: DEMO_SUBSCRIPTION,
    totalCost: dataPoints.reduce((s, d) => s + d.amount, 0),
    currency: 'USD',
    granularity: 'Daily',
    dateRange: { from: daysAgo(29), to: daysAgo(0) },
    dataPoints,
    previousPeriodCost: 121_400,
    percentageChange: 8.4,
  };
}

function mockBreakdown() {
  const services = [
    { name: 'Virtual Machines', pct: 38.4 },
    { name: 'Azure SQL Database', pct: 18.2 },
    { name: 'Azure Kubernetes Service', pct: 14.7 },
    { name: 'Azure Storage', pct: 10.1 },
    { name: 'Azure App Service', pct: 8.6 },
    { name: 'Azure Cosmos DB', pct: 5.3 },
    { name: 'Other', pct: 4.7 },
  ];
  const total = 142_380;
  return services.map((s, i) => ({
    dimension: 'ServiceName',
    value: s.name,
    name: s.name,
    cost: Math.round((total * s.pct) / 100),
    currency: 'USD',
    percentage: s.pct,
  }));
}

function mockTopResources() {
  const resources = [
    { resourceName: 'prod-aks-cluster-01', resourceType: 'Microsoft.ContainerService/managedClusters', resourceGroup: 'rg-prod-aks', location: 'eastus', cost: 28_400 },
    { resourceName: 'prod-sql-server-primary', resourceType: 'Microsoft.Sql/servers', resourceGroup: 'rg-prod-data', location: 'eastus', cost: 18_200 },
    { resourceName: 'prod-vm-scale-set-api', resourceType: 'Microsoft.Compute/virtualMachineScaleSets', resourceGroup: 'rg-prod-compute', location: 'eastus', cost: 15_750 },
    { resourceName: 'prod-storage-account-logs', resourceType: 'Microsoft.Storage/storageAccounts', resourceGroup: 'rg-prod-storage', location: 'eastus2', cost: 9_800 },
    { resourceName: 'prod-cosmos-db-main', resourceType: 'Microsoft.DocumentDB/databaseAccounts', resourceGroup: 'rg-prod-data', location: 'eastus', cost: 7_540 },
    { resourceName: 'prod-app-service-plan', resourceType: 'Microsoft.Web/serverfarms', resourceGroup: 'rg-prod-web', location: 'eastus', cost: 6_200 },
    { resourceName: 'prod-redis-cache', resourceType: 'Microsoft.Cache/Redis', resourceGroup: 'rg-prod-cache', location: 'eastus', cost: 4_100 },
    { resourceName: 'prod-key-vault', resourceType: 'Microsoft.KeyVault/vaults', resourceGroup: 'rg-prod-security', location: 'eastus', cost: 1_200 },
  ];
  const total = resources.reduce((s, r) => s + r.cost, 0);
  return resources.map((r, i) => ({
    resourceId: `/subscriptions/${DEMO_SUBSCRIPTION}/resourceGroups/${r.resourceGroup}/providers/${r.resourceType}/${r.resourceName}`,
    ...r,
    serviceType: r.resourceType.split('/')[0] ?? r.resourceType,
    currency: 'USD',
    percentage: Math.round((r.cost / total) * 1000) / 10,
  }));
}

function mockBudgets() {
  return [
    {
      id: 'budget-prod-monthly',
      name: 'prod-monthly-200k',
      displayName: 'Production Monthly Budget',
      amount: 200_000,
      currentSpend: 142_380,
      forecastedSpend: 165_000,
      currency: 'USD',
      timeGrain: 'Monthly',
      utilizationPercent: 71.2,
      forecastedUtilizationPercent: 82.5,
      status: 'on_track',
      notifications: [{ threshold: 80, thresholdType: 'Actual', enabled: true, contactEmails: ['admin@contoso.com'] }],
      timePeriod: { startDate: '2024-01-01' },
    },
    {
      id: 'budget-dev-monthly',
      name: 'dev-monthly-30k',
      displayName: 'Development Monthly Budget',
      amount: 30_000,
      currentSpend: 27_400,
      forecastedSpend: 31_200,
      currency: 'USD',
      timeGrain: 'Monthly',
      utilizationPercent: 91.3,
      forecastedUtilizationPercent: 104.0,
      status: 'at_risk',
      notifications: [{ threshold: 90, thresholdType: 'Forecasted', enabled: true, contactEmails: ['dev@contoso.com'] }],
      timePeriod: { startDate: '2024-01-01' },
    },
  ];
}

function mockBudgetSummary() {
  return {
    totalBudget: 230_000,
    totalBudgets: 2,
    totalSpend: 169_780,
    utilizationPercent: 73.8,
    averageUtilizationPercent: 73.8,
    overBudgetCount: 0,
    atRiskCount: 1,
    onTrackCount: 1,
  };
}

function mockForecast() {
  const dataPoints = Array.from({ length: 45 }, (_, i) => {
    const isPast = i < 30;
    const base = 4200 + Math.sin(i / 4) * 400;
    const forecasted = Math.round((base + 500) * 100) / 100;
    return {
      date: daysAgo(29 - i),
      forecastedAmount: forecasted,
      lowerBound: forecasted * 0.88,
      upperBound: forecasted * 1.12,
      isActual: isPast,
    };
  });
  return {
    subscriptionId: DEMO_SUBSCRIPTION,
    currency: 'USD',
    forecastedTotal: 165_000,
    dataPoints,
  };
}

function mockAlerts() {
  return [
    {
      id: 'alert-001',
      name: 'Dev Budget At Risk',
      type: 'Budget',
      category: 'Cost',
      severity: 'Medium',
      status: 'Active',
      description: 'Development budget is at 91% utilization, forecasted to exceed by month-end.',
      resourceId: `/subscriptions/${DEMO_SUBSCRIPTION}`,
      createdAt: daysAgo(2),
      modifiedAt: daysAgo(0),
    },
    {
      id: 'alert-002',
      name: 'AKS Cluster Spend Anomaly',
      type: 'Anomaly',
      category: 'Cost',
      severity: 'Low',
      status: 'Active',
      description: 'AKS cluster cost increased 34% over the prior 7-day average.',
      resourceId: `/subscriptions/${DEMO_SUBSCRIPTION}/resourceGroups/rg-prod-aks`,
      createdAt: daysAgo(1),
      modifiedAt: daysAgo(0),
    },
  ];
}

function mockReservations() {
  return {
    summary: {
      totalReservations: 12,
      totalSavings: 23_450,
      avgUtilization: 91.7,
      coveragePercent: 54.3,
      currency: 'USD',
    },
    reservations: [
      { id: 'ri-001', displayName: 'VM Reserved Instances - Prod', sku: 'Standard_D8s_v3', quantity: 10, utilization: 94.2, savings: 12_800, expiresAt: '2025-12-31' },
      { id: 'ri-002', displayName: 'SQL Database Reserved Capacity', sku: 'GP_Gen5_8', quantity: 4, utilization: 88.7, savings: 7_200, expiresAt: '2025-06-30' },
      { id: 'ri-003', displayName: 'AKS Node Pool Reserved', sku: 'Standard_D4s_v3', quantity: 6, utilization: 96.1, savings: 3_450, expiresAt: '2026-01-31' },
    ],
  };
}

// ── Route matcher ─────────────────────────────────────────────────────────────

function matchRoute(url: string): string | null {
  const path = url.split('?')[0] ?? url;
  if (path === '/api/v1/health') return 'health';
  if (path === '/api/v1/costs/overview') return 'overview';
  if (path === '/api/v1/costs/query') return 'costTrend';
  if (path === '/api/v1/costs/breakdown') return 'breakdown';
  if (path === '/api/v1/costs/top-resources') return 'topResources';
  if (path.match(/^\/api\/v1\/budgets\/[^/]+\/summary$/)) return 'budgetSummary';
  if (path.match(/^\/api\/v1\/budgets\/[^/]+$/)) return 'budgets';
  if (path.match(/^\/api\/v1\/forecasts\/[^/]+$/)) return 'forecast';
  if (path.match(/^\/api\/v1\/alerts\/[^/]+$/)) return 'alerts';
  if (path.match(/^\/api\/v1\/reservations\/[^/]+$/)) return 'reservations';
  if (path.match(/^\/api\/v1\/subscriptions/)) return 'subscriptions';
  return null;
}

// ── Middleware ────────────────────────────────────────────────────────────────

export function demoMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (process.env['DEMO_MODE'] !== 'true') {
    next();
    return;
  }

  const route = matchRoute(req.url);
  if (!route) {
    next();
    return;
  }

  // Simulate slight latency for realism
  const delay = Math.floor(Math.random() * 200) + 50;
  setTimeout(() => {
    switch (route) {
      case 'health':
        res.json({ status: 'ok', mode: 'demo', timestamp: new Date().toISOString() });
        break;
      case 'overview':
        res.json(success(mockKPIs()));
        break;
      case 'costTrend':
        res.json(success(mockCostTrend()));
        break;
      case 'breakdown':
        res.json(success(mockBreakdown(), mockBreakdown().length));
        break;
      case 'topResources':
        res.json(success(mockTopResources(), mockTopResources().length));
        break;
      case 'budgets':
        if (req.method === 'POST') {
          res.status(201).json(success({ ...mockBudgets()[0], id: `budget-${Date.now()}` }));
        } else if (req.method === 'DELETE') {
          res.status(204).send();
        } else {
          res.json(success(mockBudgets(), mockBudgets().length));
        }
        break;
      case 'budgetSummary':
        res.json(success(mockBudgetSummary()));
        break;
      case 'forecast':
        res.json(success(mockForecast()));
        break;
      case 'alerts':
        res.json(success(mockAlerts(), mockAlerts().length));
        break;
      case 'reservations':
        res.json(success(mockReservations()));
        break;
      case 'subscriptions':
        res.json(success([
          { subscriptionId: DEMO_SUBSCRIPTION, displayName: 'Contoso Production (Demo)', state: 'Enabled' },
          { subscriptionId: 'demo-sub-dev-00000000-0000-0000-0000-000000000001', displayName: 'Contoso Development (Demo)', state: 'Enabled' },
        ], 2));
        break;
      default:
        next();
    }
  }, delay);
}
