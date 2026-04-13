/**
 * Cost data models for Azure Cost Management API responses and internal representations.
 */

export type Granularity = 'Daily' | 'Monthly' | 'Quarterly' | 'Yearly' | 'None';
export type CostMetric = 'ActualCost' | 'AmortizedCost' | 'AHUB';
export type TimeframeType = 'BillingMonthToDate' | 'TheLastBillingMonth' | 'TheLastMonth' | 'WeekToDate' | 'MonthToDate' | 'Custom';

export type GroupByDimension =
  | 'ResourceGroupName'
  | 'ServiceName'
  | 'ResourceType'
  | 'ResourceId'
  | 'ResourceLocation'
  | 'SubscriptionId'
  | 'ChargeType'
  | 'InvoiceId'
  | 'MeterCategory'
  | 'MeterSubcategory'
  | 'PricingModel'
  | 'PublisherType';

/** Azure Cost Management API query request body */
export interface CostQueryRequest {
  type: CostMetric;
  timeframe: TimeframeType;
  timePeriod?: {
    from: string; // ISO date string
    to: string;
  };
  dataset: {
    granularity: Granularity;
    aggregation: {
      totalCost: {
        name: string;
        function: 'Sum';
      };
    };
    grouping?: Array<{
      type: 'Dimension' | 'Tag';
      name: string;
    }>;
    filter?: CostFilter;
    sorting?: Array<{
      direction: 'Ascending' | 'Descending';
      name: string;
    }>;
  };
}

export interface CostFilter {
  and?: CostFilter[];
  or?: CostFilter[];
  dimensions?: {
    name: string;
    operator: 'In' | 'Contains';
    values: string[];
  };
  tags?: {
    name: string;
    operator: 'In' | 'Contains';
    values: string[];
  };
}

/** Raw Azure Cost Management API query response */
export interface AzureCostQueryResponse {
  id: string;
  name: string;
  type: string;
  properties: {
    nextLink: string | null;
    columns: Array<{ name: string; type: string }>;
    rows: Array<Array<string | number>>;
  };
}

/** Normalized internal cost data point */
export interface CostDataPoint {
  date: string;
  amount: number;
  currency: string;
  dimension?: string;
  dimensionValue?: string;
}

/** Aggregated cost response returned to frontend */
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

/** Top resource by cost */
export interface TopResource {
  resourceId: string;
  resourceName: string;
  resourceGroup: string;
  serviceType: string;
  location: string;
  cost: number;
  currency: string;
}

/** Cost by dimension breakdown */
export interface CostByDimension {
  dimension: string;
  value: string;
  cost: number;
  currency: string;
  percentage: number;
}

/** Dashboard KPI summary */
export interface DashboardKPIs {
  // Financial KPIs
  totalMonthlyCost: number;
  mtdCost: number;
  forecastedMonthEndCost: number;
  budgetUtilizationPercent: number;
  costVarianceDelta: number;
  costVariancePercent: number | null;
  avgDailyBurnRate: number;
  budgetOverrunRisk: 'low' | 'medium' | 'high';

  // Resource KPIs
  riCoveragePercent: number;
  riUtilizationPercent: number;
  savingsPlanUtilizationPercent: number;
  untaggedResourceSpendPercent: number;

  // Alert KPIs
  activeBudgetAlerts: number;
  costAnomaliesDetected: number;

  currency: string;
  lastUpdated: string;
}
