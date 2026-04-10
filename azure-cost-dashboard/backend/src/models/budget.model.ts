/**
 * Budget data models for Azure Cost Management budgets.
 */

export type BudgetTimeGrain = 'Monthly' | 'Quarterly' | 'Annually' | 'BillingMonth' | 'BillingQuarter' | 'BillingAnnual';
export type BudgetOperatorType = 'In';
export type BudgetCategory = 'Cost';
export type NotificationOperator = 'EqualTo' | 'GreaterThan' | 'GreaterThanOrEqualTo';
export type ContactType = 'Email' | 'Role' | 'ActionGroup';

export interface BudgetTimePeriod {
  startDate: string; // YYYY-MM-DD
  endDate?: string;
}

export interface BudgetFilter {
  dimensions?: {
    name: string;
    operator: BudgetOperatorType;
    values: string[];
  };
  tags?: Record<string, string[]>;
  resourceGroups?: string[];
  resources?: string[];
}

export interface BudgetNotification {
  enabled: boolean;
  operator: NotificationOperator;
  threshold: number; // percentage 0-100
  thresholdType: 'Actual' | 'Forecasted';
  contactEmails: string[];
  contactRoles?: string[];
  contactGroups?: string[];
  locale?: string;
}

/** Azure Budget API request/response shape */
export interface AzureBudget {
  id?: string;
  name: string;
  type?: string;
  properties: {
    category: BudgetCategory;
    amount: number;
    timeGrain: BudgetTimeGrain;
    timePeriod: BudgetTimePeriod;
    filter?: BudgetFilter;
    notifications?: Record<string, BudgetNotification>;
    currentSpend?: {
      amount: number;
      unit: string;
    };
    forecastSpend?: {
      amount: number;
      unit: string;
    };
  };
}

/** Enriched budget with computed fields for the dashboard */
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
  status: 'on_track' | 'at_risk' | 'exceeded';
  notifications: BudgetNotificationSummary[];
  timePeriod: BudgetTimePeriod;
}

export interface BudgetNotificationSummary {
  threshold: number;
  thresholdType: 'Actual' | 'Forecasted';
  enabled: boolean;
  contactEmails: string[];
}

/** Budget creation/update request DTO */
export interface CreateBudgetRequest {
  name: string;
  amount: number;
  timeGrain: BudgetTimeGrain;
  startDate: string;
  endDate?: string;
  subscriptionId: string;
  resourceGroups?: string[];
  tags?: Record<string, string[]>;
  notifications?: BudgetNotification[];
}
