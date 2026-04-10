/**
 * Shared frontend type definitions for cost data.
 */

export type Granularity = 'Daily' | 'Monthly' | 'Quarterly' | 'None';
export type CostMetric = 'ActualCost' | 'AmortizedCost';
export type GroupByDimension =
  | 'ResourceGroupName'
  | 'ServiceName'
  | 'ResourceType'
  | 'ResourceId'
  | 'ResourceLocation'
  | 'SubscriptionId'
  | 'MeterCategory'
  | 'PricingModel';

export interface CostDataPoint {
  date: string;
  amount: number;
  cost: number;
  currency: string;
  dimension?: string;
  dimensionValue?: string;
}

export interface CostSummary {
  subscriptionId: string;
  totalCost: number;
  currency: string;
  granularity: Granularity;
  dateRange: { from: string; to: string };
  dataPoints: CostDataPoint[];
  groupBy?: string;
  previousPeriodCost?: number;
  percentageChange?: number | null;
}

export interface TopResource {
  resourceId: string;
  resourceName: string;
  resourceGroup: string;
  serviceType: string;
  resourceType: string;
  location: string;
  cost: number;
  currency: string;
  percentage: number;
}

export interface CostByDimension {
  dimension: string;
  value: string;
  name: string;
  cost: number;
  currency: string;
  percentage: number;
}

export interface DashboardKPIs {
  totalMonthlyCost: number;
  mtdCost: number;
  mtdTotal: number;
  forecastedMonthEndCost: number;
  forecastedMonthEnd: number;
  budgetUtilizationPercent: number;
  costVarianceDelta: number;
  costVariancePercent: number | null;
  avgDailyBurnRate: number;
  dailyBurnRate: number;
  budgetOverrunRisk: 'low' | 'medium' | 'high';
  riskLevel: 'low' | 'medium' | 'high';
  riCoveragePercent: number;
  riUtilizationPercent: number;
  savingsPlanUtilizationPercent: number;
  untaggedResourceSpendPercent: number;
  activeBudgetAlerts: number;
  costAnomaliesDetected: number;
  currency: string;
  lastUpdated: string;
  mtdVsPrevMonth: number;
  mtdVsPrevMonthPercent: number;
  ytdTotal: number;
  prevMonthTotal: number;
  reservationSavings?: number;
}

export interface ForecastDataPoint {
  date: string;
  forecastedAmount: number;
  lowerBound: number;
  upperBound: number;
  isActual: boolean;
}

export interface ForecastResult {
  subscriptionId: string;
  currency: string;
  forecastedTotal: number;
  dataPoints: ForecastDataPoint[];
}
