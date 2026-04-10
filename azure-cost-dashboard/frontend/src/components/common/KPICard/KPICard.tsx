import React from 'react';
import { Card, Text, Badge, Tooltip } from '@fluentui/react-components';
import {
  ArrowTrending20Regular,
  ArrowTrendingDown20Regular,
  SubtractCircle20Regular,
  Info20Regular,
} from '@fluentui/react-icons';
import clsx from 'clsx';

export type KPITrend = 'up' | 'down' | 'neutral';
export type KPIStatus = 'success' | 'warning' | 'danger' | 'neutral';

export interface KPICardProps {
  /** Main KPI label */
  title: string;
  /** Formatted primary value (e.g. "$1.23M") */
  value: string;
  /** Optional secondary comparison text (e.g. "vs last month") */
  comparisonLabel?: string;
  /** Formatted change value (e.g. "+$12,400") */
  changeValue?: string;
  /** Percentage change (e.g. "+5.2%") */
  changePercent?: string;
  /** Direction of the trend */
  trend?: KPITrend;
  /** Color-coded status */
  status?: KPIStatus;
  /** Optional icon to display */
  icon?: React.ReactNode;
  /** Optional tooltip description */
  description?: string;
  /** Whether data is loading */
  loading?: boolean;
  /** Whether the higher value is worse (e.g. cost variance) — inverts color coding */
  invertTrendColor?: boolean;
  /** Optional click handler */
  onClick?: () => void;
}

const statusColors: Record<KPIStatus, string> = {
  success: 'border-l-green-500',
  warning: 'border-l-yellow-500',
  danger: 'border-l-red-500',
  neutral: 'border-l-blue-500',
};

const trendIcons: Record<KPITrend, React.ReactNode> = {
  up: <ArrowTrending20Regular />,
  down: <ArrowTrendingDown20Regular />,
  neutral: <SubtractCircle20Regular />,
};

function getTrendColor(trend: KPITrend, invertTrendColor: boolean): string {
  if (trend === 'neutral') return 'text-gray-500';
  const isPositive = trend === 'up';
  const isGood = invertTrendColor ? !isPositive : isPositive;
  return isGood ? 'text-green-600' : 'text-red-600';
}

/**
 * Reusable KPI Card component for displaying a single financial or operational metric.
 * Aligns with Fluent UI design language.
 */
export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  comparisonLabel,
  changeValue,
  changePercent,
  trend = 'neutral',
  status = 'neutral',
  icon,
  description,
  loading = false,
  invertTrendColor = false,
  onClick,
}) => {
  const trendColor = getTrendColor(trend, invertTrendColor);

  if (loading) {
    return (
      <Card className="p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
      </Card>
    );
  }

  return (
    <Card
      className={clsx(
        'p-4 border-l-4 transition-shadow hover:shadow-md',
        statusColors[status],
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1">
          <Text size={200} className="text-gray-500 font-medium uppercase tracking-wide">
            {title}
          </Text>
          {description && (
            <Tooltip content={description} relationship="label">
              <Info20Regular className="text-gray-400 cursor-help" />
            </Tooltip>
          )}
        </div>
        {icon && <div className="text-blue-600">{icon}</div>}
      </div>

      <Text
        size={700}
        weight="semibold"
        className="block text-gray-900 font-mono mb-1"
        aria-label={`${title}: ${value}`}
      >
        {value}
      </Text>

      {(changeValue !== undefined || changePercent !== undefined) && (
        <div className={clsx('flex items-center gap-1 mt-1', trendColor)}>
          {trendIcons[trend]}
          <Text size={200} className="font-medium">
            {changeValue && <span>{changeValue}</span>}
            {changePercent && <span className="ml-1">({changePercent})</span>}
          </Text>
          {comparisonLabel && (
            <Text size={100} className="text-gray-400 ml-1">
              {comparisonLabel}
            </Text>
          )}
        </div>
      )}

      {status !== 'neutral' && (
        <div className="mt-2">
          <Badge
            appearance="filled"
            color={
              status === 'success' ? 'success' : status === 'danger' ? 'danger' : 'warning'
            }
            size="small"
          >
            {status === 'success' ? 'On Track' : status === 'danger' ? 'Over Budget' : 'At Risk'}
          </Badge>
        </div>
      )}
    </Card>
  );
};

export default KPICard;
