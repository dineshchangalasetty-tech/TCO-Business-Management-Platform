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

const isDemoMode = import.meta.env['VITE_DEMO_MODE'] === 'true';

/**
 * Overview page — executive KPI dashboard (KPI-F01 to KPI-F07).
 */
const Overview: React.FC = () => {
  const { filter } = useFilters();
  const { kpis, costTrend: trend, breakdown, isLoading, hasError: error } = useCostData();
  const { summary: budgetSummary, isLoading: budgetLoading } = useBudgets(
    filter.subscriptionId ?? ''
  );

  // In demo mode always render — data auto-loads without subscription selection
  const isReady = isDemoMode || !!filter.subscriptionId;

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
      {(budgetSummary || isLoading) && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-3">
            <Text weight="semibold" size={400}>Budget Health</Text>
            <div className="flex gap-2">
              {(budgetSummary?.overBudgetCount ?? 0) > 0 && (
                <Badge color="danger" appearance="filled">
                  {budgetSummary!.overBudgetCount} Over Budget
                </Badge>
              )}
              {(budgetSummary?.atRiskCount ?? 0) > 0 && (
                <Badge color="warning" appearance="filled">
                  {budgetSummary!.atRiskCount} At Risk
                </Badge>
              )}
              {(budgetSummary?.onTrackCount ?? 0) > 0 && (
                <Badge color="success" appearance="filled">
                  {budgetSummary!.onTrackCount} On Track
                </Badge>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <Text size={700} weight="semibold" className="text-gray-900 block">
                {budgetSummary?.totalBudgets ?? '—'}
              </Text>
              <Text size={200} className="text-gray-500 block">Total Budgets</Text>
            </div>
            <div>
              <Text size={700} weight="semibold" className="text-red-600 block">
                {budgetSummary?.overBudgetCount ?? 0}
              </Text>
              <Text size={200} className="text-gray-500 block">Over Budget</Text>
            </div>
            <div>
              <Text size={700} weight="semibold" className="text-yellow-600 block">
                {budgetSummary?.atRiskCount ?? 0}
              </Text>
              <Text size={200} className="text-gray-500 block">At Risk</Text>
            </div>
            <div>
              <Text size={700} weight="semibold" className="text-green-600 block">
                {budgetSummary?.onTrackCount ?? 0}
              </Text>
              <Text size={200} className="text-gray-500 block">On Track</Text>
            </div>
          </div>
        </div>
      )}

      {/* Cost by Region & Dept breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Region breakdown */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <Text weight="semibold" size={400} className="mb-3 block">
            Cost by Region — {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
          </Text>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {(breakdown ?? []).slice(0, 6).map((item: any, idx: number) => {
                const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-red-500', 'bg-indigo-500'];
                const pct = item.percentage ?? 0;
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-28 text-xs text-gray-600 truncate">{item.name ?? item.value}</div>
                    <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-3 rounded-full ${colors[idx % colors.length]}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <div className="w-20 text-xs text-right font-medium text-gray-700">
                      {formatCurrency(item.cost ?? 0, 'USD', 1)}
                    </div>
                    <div className="w-10 text-xs text-right text-gray-400">{pct.toFixed(1)}%</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top KPI summary panel */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <Text weight="semibold" size={400} className="mb-3 block">
            Cost Intelligence Summary
          </Text>
          <div className="space-y-3">
            {[
              { label: 'Total Subscriptions',     value: kpis ? String((kpis as any).totalSubscriptions ?? 80) : '80',   color: 'text-blue-600' },
              { label: 'Total Resource Groups',   value: kpis ? String((kpis as any).totalResourceGroups ?? 240) : '240', color: 'text-purple-600' },
              { label: 'Reservation Coverage',    value: kpis ? `${kpis.riCoveragePercent?.toFixed(1)}%` : '—',           color: 'text-green-600' },
              { label: 'RI Utilization',          value: kpis ? `${kpis.riUtilizationPercent?.toFixed(1)}%` : '—',        color: 'text-green-700' },
              { label: 'Savings Plan Util.',      value: kpis ? `${kpis.savingsPlanUtilizationPercent?.toFixed(1)}%` : '—', color: 'text-teal-600' },
              { label: 'Daily Burn Rate',         value: kpis ? formatCurrency(kpis.dailyBurnRate ?? 0) : '—',             color: 'text-orange-600' },
              { label: 'Reservation Savings',     value: kpis ? formatCurrency(kpis.reservationSavings ?? 0) : '—',        color: 'text-emerald-600' },
              { label: 'Active Budget Alerts',    value: kpis ? String(kpis.activeBudgetAlerts ?? 0) : '—',               color: 'text-red-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                <Text size={200} className="text-gray-500">{label}</Text>
                <Text size={300} weight="semibold" className={color}>{value}</Text>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default Overview;
