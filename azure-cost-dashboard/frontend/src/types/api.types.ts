/**
 * Generic API response types and shared request/response interfaces.
 */

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  error?: string;
  code?: string;
  correlationId?: string;
}

export interface ApiError {
  error: string;
  code: string;
  correlationId?: string;
  status?: number;
}

export type DateRangePreset =
  | 'last7days'
  | 'last30days'
  | 'lastMonth'
  | 'last3months'
  | 'last6months'
  | 'ytd'
  | 'last12months'
  | 'custom';

export interface DateRange {
  from: string;
  to: string;
  preset?: DateRangePreset;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

export interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

export interface FilterState {
  subscriptionId: string;
  dateRange: DateRange;
  groupBy?: string;
  tags?: Record<string, string[]>;
  resourceGroups?: string[];
  serviceNames?: string[];
  regions?: string[];
  metric: 'ActualCost' | 'AmortizedCost';
}

export interface Subscription {
  subscriptionId: string;
  displayName: string;
  state: string;
}
