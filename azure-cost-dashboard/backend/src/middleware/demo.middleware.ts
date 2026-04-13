/**
 * Demo middleware — intercepts all /api/v1/* requests and returns real data
 * derived from azure_cost_synthetic_full.csv (1.6M rows, 16 months).
 * Activated when DEMO_MODE=true.
 */

import { Request, Response, NextFunction } from 'express';
import {
  KPI_CURRENT_MONTH_COST,
  KPI_PREV_MONTH_COST,
  KPI_YTD_COST,
  KPI_MOM_CHANGE_PCT,
  KPI_OVERALL_BUDGET,
  KPI_BUDGET_UTILIZATION,
  KPI_RI_SAVINGS,
  KPI_RESERVATION_PCT,
  TOTAL_SUBSCRIPTIONS,
  TOTAL_RESOURCE_GROUPS,
  MONTHLY_SPEND_TREND,
  SERVICE_BREAKDOWN,
  REGION_BREAKDOWN,
  DEPT_BREAKDOWN,
  TOP_RESOURCE_GROUPS,
  TOP_RESOURCES,
  SUBSCRIPTIONS,
  BUDGETS,
  FORECAST_NEXT_MONTHS,
  ALERTS,
  PRICING_MODEL_SPLIT,
  CURRENT_MONTH,
} from '../data/csvData';

// ── Helpers ──────────────────────────────────────────────────────────────────

function success<T>(data: T, count?: number) {
  return { success: true, data, ...(count !== undefined ? { count } : {}) };
}

// ── Real-data response builders ───────────────────────────────────────────────

function realKPIs() {
  const dailyBurnRate = KPI_CURRENT_MONTH_COST / 30;
  const forecastedMonthEnd = KPI_CURRENT_MONTH_COST * 1.03;
  return {
    totalMonthlyCost:             KPI_PREV_MONTH_COST,
    mtdCost:                      KPI_CURRENT_MONTH_COST,
    mtdTotal:                     KPI_CURRENT_MONTH_COST,
    forecastedMonthEndCost:       Math.round(forecastedMonthEnd * 100) / 100,
    forecastedMonthEnd:           Math.round(forecastedMonthEnd * 100) / 100,
    budgetUtilizationPercent:     KPI_BUDGET_UTILIZATION,
    costVarianceDelta:            Math.round((KPI_CURRENT_MONTH_COST - KPI_PREV_MONTH_COST) * 100) / 100,
    costVariancePercent:          KPI_MOM_CHANGE_PCT,
    avgDailyBurnRate:             Math.round(dailyBurnRate * 100) / 100,
    dailyBurnRate:                Math.round(dailyBurnRate * 100) / 100,
    budgetOverrunRisk:            KPI_BUDGET_UTILIZATION >= 95 ? 'high' : KPI_BUDGET_UTILIZATION >= 80 ? 'medium' : 'low',
    riskLevel:                    KPI_BUDGET_UTILIZATION >= 95 ? 'high' : KPI_BUDGET_UTILIZATION >= 80 ? 'medium' : 'low',
    riCoveragePercent:            KPI_RESERVATION_PCT,
    riUtilizationPercent:         91.7,
    savingsPlanUtilizationPercent: 88.4,
    untaggedResourceSpendPercent: 12.5,
    activeBudgetAlerts:           2,
    costAnomaliesDetected:        1,
    currency:                     'USD',
    lastUpdated:                  new Date().toISOString(),
    mtdVsPrevMonth:               Math.round((KPI_CURRENT_MONTH_COST - KPI_PREV_MONTH_COST) * 100) / 100,
    mtdVsPrevMonthPercent:        KPI_MOM_CHANGE_PCT,
    ytdTotal:                     KPI_YTD_COST,
    prevMonthTotal:               KPI_PREV_MONTH_COST,
    reservationSavings:           KPI_RI_SAVINGS,
    totalSubscriptions:           TOTAL_SUBSCRIPTIONS,
    totalResourceGroups:          TOTAL_RESOURCE_GROUPS,
  };
}

function realCostTrend() {
  // Use last 13 months of monthly trend as daily-equivalent data points
  const dataPoints = MONTHLY_SPEND_TREND.slice(-13).map((m: {month: string; cost: number}) => ({
    date:     m.month + '-01',
    amount:   m.cost,
    cost:     m.cost,
    currency: 'USD',
  }));
  return {
    subscriptionId:      SUBSCRIPTIONS[0]?.id ?? 'demo-sub',
    totalCost:           KPI_CURRENT_MONTH_COST,
    currency:            'USD',
    granularity:         'Monthly',
    dateRange:           { from: '2025-04-01', to: CURRENT_MONTH + '-30' },
    dataPoints,
    previousPeriodCost:  KPI_PREV_MONTH_COST,
    percentageChange:    KPI_MOM_CHANGE_PCT,
  };
}

function realBreakdown() {
  return SERVICE_BREAKDOWN.map((s: {service: string; cost: number; percentage: number}) => ({
    dimension:  'ServiceName',
    value:      s.service,
    name:       s.service,
    cost:       s.cost,
    currency:   'USD',
    percentage: s.percentage,
  }));
}

function realTopResources() {
  return TOP_RESOURCES.map((r: {resourceName: string; serviceName: string; resourceGroup: string; cost: number}) => ({
    resourceId:    `/subscriptions/${SUBSCRIPTIONS[0]?.id ?? 'demo'}/resourceGroups/${r.resourceGroup}/providers/Microsoft.Resources/${r.resourceName}`,
    resourceName:  r.resourceName,
    resourceType:  'Microsoft.Resources/resource',
    resourceGroup: r.resourceGroup,
    location:      REGION_BREAKDOWN[0]?.region ?? 'East US',
    serviceName:   r.serviceName,
    serviceType:   'Microsoft',
    cost:          r.cost,
    currency:      'USD',
    percentage:    Math.round((r.cost / KPI_CURRENT_MONTH_COST) * 10000) / 100,
  }));
}

function realBudgets() {
  return BUDGETS.map((b: {id: string; name: string; amount: number; currentSpend: number; utilization: number; status: string; service: string; period: string}) => ({
    id:                          b.id,
    name:                        b.name,
    displayName:                 b.name,
    amount:                      b.amount,
    currentSpend:                b.currentSpend,
    forecastedSpend:             Math.round(b.currentSpend * 1.05 * 100) / 100,
    currency:                    'USD',
    timeGrain:                   'Monthly',
    utilizationPercent:          b.utilization,
    forecastedUtilizationPercent: Math.round(b.utilization * 1.05 * 10) / 10,
    status:                      b.status === 'critical' ? 'at_risk' : b.status === 'warning' ? 'at_risk' : 'on_track',
    notifications:               [{ threshold: 80, thresholdType: 'Actual', enabled: true, contactEmails: ['admin@company.com'] }],
    timePeriod:                  { startDate: '2025-01-01' },
    service:                     b.service,
  }));
}

function realBudgetSummary() {
  const budgets = realBudgets();
  const totalSpend = budgets.reduce((s: number, b: {currentSpend: number}) => s + b.currentSpend, 0);
  const totalBudget = budgets.reduce((s: number, b: {amount: number}) => s + b.amount, 0);
  const atRisk = budgets.filter((b: {status: string}) => b.status === 'at_risk').length;
  return {
    totalBudget,
    totalBudgets:              budgets.length,
    totalSpend:                Math.round(totalSpend * 100) / 100,
    utilizationPercent:        KPI_BUDGET_UTILIZATION,
    averageUtilizationPercent: KPI_BUDGET_UTILIZATION,
    overBudgetCount:           0,
    atRiskCount:               atRisk,
    onTrackCount:              budgets.length - atRisk,
  };
}

function realForecast() {
  const historical = MONTHLY_SPEND_TREND.slice(-6).map((m: {month: string; cost: number}) => ({
    date:              m.month + '-01',
    forecastedAmount:  m.cost,
    lowerBound:        Math.round(m.cost * 0.90 * 100) / 100,
    upperBound:        Math.round(m.cost * 1.10 * 100) / 100,
    isActual:          true,
  }));
  const future = FORECAST_NEXT_MONTHS.map((m: {month: string; cost: number}) => ({
    date:             m.month + '-01',
    forecastedAmount: m.cost,
    lowerBound:       Math.round(m.cost * 0.88 * 100) / 100,
    upperBound:       Math.round(m.cost * 1.12 * 100) / 100,
    isActual:         false,
  }));
  return {
    subscriptionId:  SUBSCRIPTIONS[0]?.id ?? 'demo-sub',
    currency:        'USD',
    forecastedTotal: FORECAST_NEXT_MONTHS[0]?.cost ?? KPI_CURRENT_MONTH_COST * 1.05,
    dataPoints:      [...historical, ...future],
  };
}

function realAlerts() {
  return ALERTS.map((a: {id: string; name: string; severity: string; message: string; resource: string; timestamp: string; status: string}) => ({
    id:          a.id,
    name:        a.name,
    type:        'Budget',
    category:    'Cost',
    severity:    a.severity === 'critical' ? 'High' : a.severity === 'warning' ? 'Medium' : 'Low',
    status:      a.status === 'active' ? 'Active' : 'Acknowledged',
    description: a.message,
    resourceId:  `/subscriptions/${SUBSCRIPTIONS[0]?.id ?? 'demo'}`,
    createdAt:   a.timestamp,
    modifiedAt:  a.timestamp,
  }));
}

function realReservations() {
  return {
    summary: {
      totalReservations:  18,
      totalSavings:       KPI_RI_SAVINGS,
      avgUtilization:     91.7,
      coveragePercent:    KPI_RESERVATION_PCT,
      currency:           'USD',
    },
    reservations: [
      { id: 'ri-001', displayName: 'VM Reserved Instances (3-Year)', sku: 'Standard_D8s_v3', quantity: 45, utilization: 94.2, savings: Math.round(KPI_RI_SAVINGS * 0.55), expiresAt: '2027-12-31' },
      { id: 'ri-002', displayName: 'SQL Database Reserved Capacity', sku: 'GP_Gen5_8',      quantity: 20, utilization: 88.7, savings: Math.round(KPI_RI_SAVINGS * 0.25), expiresAt: '2026-12-31' },
      { id: 'ri-003', displayName: 'App Service Plan Reservations', sku: 'P2v3',            quantity: 15, utilization: 85.4, savings: Math.round(KPI_RI_SAVINGS * 0.15), expiresAt: '2026-09-30' },
      { id: 'ri-004', displayName: 'Storage Reserved Capacity',     sku: 'LRS-Hot',         quantity: 10, utilization: 79.1, savings: Math.round(KPI_RI_SAVINGS * 0.05), expiresAt: '2026-06-30' },
    ],
  };
}

function realSubscriptions() {
  return SUBSCRIPTIONS.map((s: {id: string; name: string; currentMonthCost: number}) => ({
    subscriptionId:  s.id,
    displayName:     s.name,
    state:           'Enabled',
    currentMonthCost: s.currentMonthCost,
    currency:        'USD',
  }));
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

  const delay = Math.floor(Math.random() * 150) + 50;
  setTimeout(() => {
    switch (route) {
      case 'health':
        res.json({ status: 'ok', mode: 'demo', dataSource: 'synthetic-csv-1.6M-rows', timestamp: new Date().toISOString() });
        break;
      case 'overview':
        res.json(success(realKPIs()));
        break;
      case 'costTrend':
        res.json(success(realCostTrend()));
        break;
      case 'breakdown':
        res.json(success(realBreakdown(), realBreakdown().length));
        break;
      case 'topResources':
        res.json(success(realTopResources(), realTopResources().length));
        break;
      case 'budgets':
        if (req.method === 'POST') {
          res.status(201).json(success({ ...realBudgets()[0], id: `budget-${Date.now()}` }));
        } else if (req.method === 'DELETE') {
          res.status(204).send();
        } else {
          res.json(success(realBudgets(), realBudgets().length));
        }
        break;
      case 'budgetSummary':
        res.json(success(realBudgetSummary()));
        break;
      case 'forecast':
        res.json(success(realForecast()));
        break;
      case 'alerts':
        res.json(success(realAlerts(), realAlerts().length));
        break;
      case 'reservations':
        res.json(success(realReservations()));
        break;
      case 'subscriptions':
        res.json(success(realSubscriptions(), realSubscriptions().length));
        break;
      default:
        next();
    }
  }, delay);
}
