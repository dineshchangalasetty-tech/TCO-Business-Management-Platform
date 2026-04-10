/**
 * Alert data models for Azure Cost Management alerts and anomaly detection.
 */

export type AlertCategory = 'Cost' | 'Usage' | 'Billing' | 'System';
export type AlertType = 'Budget' | 'Invoice' | 'Credit' | 'Quota' | 'General' | 'xCloud' | 'BudgetAlert';
export type AlertStatus = 'Active' | 'Overridden' | 'Resolved' | 'Dismissed';
export type AlertSeverity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';

export interface AzureAlertProperties {
  definition: {
    type: AlertType;
    category: AlertCategory;
    criteria: {
      criteriaType: string;
      operator?: string;
      threshold?: number;
      metricType?: string;
    };
  };
  description: string;
  source: {
    costType: string;
    filter?: unknown;
  };
  details: {
    timeGrainType?: string;
    periodStartDate?: string;
    triggeredBy?: string;
    resourceGroupFilter?: string[];
    amount?: number;
    unit?: string;
    currentSpend?: number;
    contactEmails?: string[];
    contactGroups?: string[];
    contactRoles?: string[];
    overridingAlert?: string;
    departmentId?: string;
    companyName?: string;
    enrollmentNumber?: string;
    enrollmentStartDate?: string;
    enrollmentEndDate?: string;
    invoicedAmount?: number;
    budgetAssociationId?: string;
  };
  costEntityId: string;
  status: AlertStatus;
  creationTime: string;
  closeTime?: string;
  modificationTime: string;
  statusModificationUserName?: string;
  statusModificationTime?: string;
}

export interface AzureAlert {
  id: string;
  name: string;
  type: string;
  properties: AzureAlertProperties;
}

/** Normalized alert for dashboard display */
export interface NormalizedAlert {
  id: string;
  name: string;
  type: AlertType;
  category: AlertCategory;
  severity: AlertSeverity;
  status: AlertStatus;
  description: string;
  amount?: number;
  currentSpend?: number;
  threshold?: number;
  currency?: string;
  createdAt: string;
  modifiedAt: string;
  budgetName?: string;
  resourceGroupFilter?: string[];
}

/** Alert summary for dashboard KPI */
export interface AlertSummary {
  total: number;
  bySeverity: Record<AlertSeverity, number>;
  byStatus: Record<AlertStatus, number>;
  activeCount: number;
  latestAlerts: NormalizedAlert[];
}
