import React from 'react';
import { Text, Badge } from '@fluentui/react-components';
import {
  Money20Regular,
  DataTrending20Regular,
  Warning20Regular,
  Savings20Regular,
  CalendarLtr20Regular,
  Globe20Regular,
  Tag20Regular,
} from '@fluentui/react-icons';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { KPICard } from '../../components/common/KPICard';
import { DateRangePicker } from '../../components/common/DateRangePicker';
import { SpendTrendChart } from '../../components/charts/SpendTrendChart';
import { CostBreakdownDonut } from '../../components/charts/CostBreakdownDonut';
import { BudgetGauge } from '../../components/charts/BudgetGauge';
import { useCostData } from '../../hooks/useCostData';
import { useBudgets } from '../../hooks/useBudgets';
import { useFilters } from '../../hooks/useFilters';
import { formatCurrency, formatPercentage, formatDelta } from '../../utils/formatters';

/**
 * Overview page — executive KPI dashboard (KPI-F01 to KPI-F07).
 */
const Overview: React.FC = () => {
  const { filter } = useFilters();
  const { kpis, costTrend: trend, breakdown, isLoading, hasError: error } = useCostData();
  const { summary: budgetSummary, isLoading: budgetLoading } = useBudgets(
    filter.subscriptionId ?? ''
  );

  const isReady = !!filter.subscriptionId;

  if (!isReady) {
    return (
      <PageWrapper title="Overview" subtitle="Executive cost dashboard">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Globe20Regular className="text-blue-400" style={{ fontSize: 48 }} />
          <Text size={500} weight="semibold" className="mt-4 text-gray-700">
            Select a subscription to get started
          </Text>
          <Text size={300} className="text-gray-400 mt-2">
            Choose a subscription from the dropdown in the top navigation bar.
          </Text>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Overview"
      subtitle="Executive cost dashboard — month-to-date, YTD, and trend analysis"
      breadcrumbs={[{ label: 'Home' }, { label: 'Overview' }]}
      loading={false}
      error={error ? 'Failed to load cost data. Please try again.' : null}
      actions={<DateRangePicker compact />}
    >
      {/* KPI Row 1 — MTD & Budget */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="MTD Spend"
          value={kpis ? formatCurrency(kpis.mtdTotal) : '—'}
          changeValue={kpis ? formatDelta(kpis.mtdVsPrevMonth) : undefined}
          changePercent={kpis ? formatPercentage(kpis.mtdVsPrevMonthPercent) : undefined}
          trend={kpis && kpis.mtdVsPrevMonth < 0 ? 'down' : 'up'}
          status={kpis && kpis.riskLevel === 'high' ? 'danger' : kpis?.riskLevel === 'medium' ? 'warning' : 'neutral'}
          icon={<Money20Regular />}
          description="Total actual cost spent in the current billing month"
          loading={isLoading}
          invertTrendColor
        />
        <KPICard
          title="YTD Spend"
          value={kpis ? formatCurrency(kpis.ytdTotal) : '—'}
          trend="neutral"
          icon={<CalendarLtr20Regular />}
          description="Total spend from the start of the current year"
          loading={isLoading}
        />
        <KPICard
          title="Projected Month-End"
          value={kpis ? formatCurrency(kpis.forecastedMonthEnd) : '—'}
          comparisonLabel="at current burn rate"
          trend={
            kpis && kpis.forecastedMonthEnd > kpis.prevMonthTotal ? 'up' : 'down'
          }
          icon={<DataTrending20Regular />}
          description="Forecasted cost by end of billing period based on daily burn rate"
          loading={isLoading}
          invertTrendColor
        />
        <KPICard
          title="Budget Utilization"
          value={
            budgetSummary ? `${budgetSummary.averageUtilizationPercent?.toFixed(0)}%` : '—'
          }
          status={
            (budgetSummary?.overBudgetCount ?? 0) > 0
              ? 'danger'
              : (budgetSummary?.atRiskCount ?? 0) > 0
              ? 'warning'
              : 'success'
          }
          icon={<Warning20Regular />}
          description="Average utilization across all active budgets"
          loading={budgetLoading}
        />
      </div>

      {/* KPI Row 2 — Prev month & savings */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KPICard
          title="Previous Month"
          value={kpis ? formatCurrency(kpis.prevMonthTotal) : '—'}
          trend="neutral"
          loading={isLoading}
          description="Total actual cost in the previous billing month"
        />
        <KPICard
          title="Daily Burn Rate"
          value={kpis ? formatCurrency(kpis.dailyBurnRate) : '—'}
          trend="neutral"
          loading={isLoading}
          description="Average spend per day this month"
        />
        <KPICard
          title="Reservation Savings"
          value={kpis ? formatCurrency(kpis.reservationSavings ?? 0) : '—'}
          trend="down"
          invertTrendColor={false}
          status="success"
          icon={<Savings20Regular />}
          loading={isLoading}
          description="Estimated savings from reserved instances vs on-demand pricing"
        />
      </div>

      {/* Main charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <SpendTrendChart
            dataPoints={trend?.dataPoints ?? []}
            loading={isLoading}
            title="Spend Trend (Daily)"
            height={320}
          />
        </div>
        <div>
          <CostBreakdownDonut
            data={breakdown ?? []}
            loading={isLoading}
            dimension="Service"
            height={320}
          />
        </div>
      </div>

      {/* Budget status row */}
      {budgetSummary && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <Text weight="semibold" size={400}>Budget Health</Text>
            <div className="flex gap-2">
              {budgetSummary.overBudgetCount > 0 && (
                <Badge color="danger" appearance="filled">
                  {budgetSummary.overBudgetCount} Over Budget
                </Badge>
              )}
              {budgetSummary.atRiskCount > 0 && (
                <Badge color="warning" appearance="filled">
                  {budgetSummary.atRiskCount} At Risk
                </Badge>
              )}
              {budgetSummary.onTrackCount > 0 && (
                <Badge color="success" appearance="filled">
                  {budgetSummary.onTrackCount} On Track
                </Badge>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <Text size={700} weight="semibold" className="text-gray-900">
                {budgetSummary.totalBudgets}
              </Text>
              <Text size={200} className="text-gray-500 block">Total Budgets</Text>
            </div>
            <div>
              <Text size={700} weight="semibold" className="text-red-600">
                {budgetSummary.overBudgetCount}
              </Text>
              <Text size={200} className="text-gray-500 block">Over Budget</Text>
            </div>
            <div>
              <Text size={700} weight="semibold" className="text-yellow-600">
                {budgetSummary.atRiskCount}
              </Text>
              <Text size={200} className="text-gray-500 block">At Risk</Text>
            </div>
            <div>
              <Text size={700} weight="semibold" className="text-green-600">
                {budgetSummary.onTrackCount}
              </Text>
              <Text size={200} className="text-gray-500 block">On Track</Text>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
};

export default Overview;
