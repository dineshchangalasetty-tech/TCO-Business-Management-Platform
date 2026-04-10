/**
 * Budget-related frontend type definitions.
 */

export type BudgetTimeGrain = 'Monthly' | 'Quarterly' | 'Annually' | 'BillingMonth';
export type BudgetStatus = 'on_track' | 'at_risk' | 'exceeded';

export interface BudgetNotificationSummary {
  threshold: number;
  thresholdType: 'Actual' | 'Forecasted';
  enabled: boolean;
  contactEmails: string[];
}

export interface EnrichedBudget {
  id: string;
  name: string;
  displayName: string;
  amount: number;
  currentSpend: number;
  forecastedSpend: number;
  currency: string;
  timeGrain: BudgetTimeGrain;
  utilizationPercent: number;
  forecastedUtilizationPercent: number;
  status: BudgetStatus;
  notifications: BudgetNotificationSummary[];
  timePeriod: {
    startDate: string;
    endDate?: string;
  };
}

export interface BudgetUtilizationSummary {
  totalBudget: number;
  totalBudgets: number;
  totalSpend: number;
  utilizationPercent: number;
  averageUtilizationPercent: number;
  overBudgetCount: number;
  atRiskCount: number;
  onTrackCount: number;
}

export interface CreateBudgetFormData {
  name: string;
  amount: number;
  timeGrain: BudgetTimeGrain;
  startDate: string;
  endDate?: string;
  subscriptionId: string;
  resourceGroups?: string[];
  alertThresholds: Array<{
    threshold: number;
    thresholdType: 'Actual' | 'Forecasted';
    contactEmails: string[];
    enabled: boolean;
  }>;
}
