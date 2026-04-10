import React from 'react';
import { Text, Badge } from '@fluentui/react-components';
import { Savings20Regular } from '@fluentui/react-icons';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { KPICard } from '../../components/common/KPICard';
import { BudgetGauge } from '../../components/charts/BudgetGauge';
import { ReservationUtilChart } from '../../components/charts/ReservationUtilChart';
import { DateRangePicker } from '../../components/common/DateRangePicker';
import { useFilters } from '../../hooks/useFilters';
import { useGetReservationSummaryQuery } from '../../api/forecastApi';
import { formatCurrency } from '../../utils/formatters';

/**
 * Reservations page — RI coverage, utilization trend, and savings analysis.
 */
const Reservations: React.FC = () => {
  const { filter } = useFilters();
  const subscriptionId = filter.subscriptionId ?? '';

  const {
    data: reservationData,
    isLoading,
    isError,
  } = useGetReservationSummaryQuery({ subscriptionId }, { skip: !subscriptionId });

  // Mock utilization trend from summary data
  const utilizationPoints = React.useMemo(() => {
    if (!reservationData) return [];
    // In production this would come from a dedicated utilization trend endpoint
    return Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (11 - i));
      return {
        date: date.toISOString().slice(0, 7) + '-01',
        utilizedHours: Math.round((reservationData.averageUtilizationPercent / 100) * 730 * (0.9 + Math.random() * 0.2)),
        reservedHours: 730,
        utilizationPercent: reservationData.averageUtilizationPercent * (0.9 + Math.random() * 0.2),
      };
    });
  }, [reservationData]);

  return (
    <PageWrapper
      title="Reservations"
      subtitle="Monitor Reserved Instance and Savings Plan utilization"
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Reservations' }]}
      loading={isLoading}
      error={isError ? 'Failed to load reservation data.' : null}
      actions={<DateRangePicker compact />}
    >
      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Avg Utilization"
          value={reservationData ? `${reservationData.averageUtilizationPercent.toFixed(1)}%` : '—'}
          status={
            (reservationData?.averageUtilizationPercent ?? 0) >= 80
              ? 'success'
              : 'warning'
          }
          icon={<Savings20Regular />}
          loading={isLoading}
          description="Average utilization across all active reserved instances"
        />
        <KPICard
          title="Underutilized RIs"
          value={String(reservationData?.underutilizedCount ?? '—')}
          status={(reservationData?.underutilizedCount ?? 0) > 0 ? 'danger' : 'success'}
          loading={isLoading}
          description="Reservations with <80% average utilization"
          invertTrendColor
        />
        <KPICard
          title="Estimated Savings"
          value={reservationData ? formatCurrency(reservationData.estimatedSavings ?? 0) : '—'}
          status="success"
          trend="down"
          invertTrendColor={false}
          loading={isLoading}
          description="Cost savings vs on-demand pricing from active reservations"
        />
        <KPICard
          title="Total Reservations"
          value={String(reservationData?.totalReservations ?? '—')}
          loading={isLoading}
          description="Active reserved instances and savings plans"
        />
      </div>

      {/* Coverage Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <Text weight="semibold" size={400} className="block mb-2">
              RI Coverage
            </Text>
            <BudgetGauge
              utilizationPercent={reservationData?.averageUtilizationPercent ?? 0}
              budgetName="Utilization"
              spent={`${(reservationData?.averageUtilizationPercent ?? 0).toFixed(1)}% used`}
              limit="100% target"
              height={220}
              loading={isLoading}
            />
            <div className="text-center mt-2">
              {(reservationData?.averageUtilizationPercent ?? 0) >= 80 ? (
                <Badge color="success" appearance="filled">Healthy utilization</Badge>
              ) : (
                <Badge color="warning" appearance="filled">Consider rightsizing</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Utilization Trend Chart */}
        <div className="lg:col-span-2">
          <ReservationUtilChart
            data={utilizationPoints}
            loading={isLoading}
            height={280}
            utilizationThreshold={80}
          />
        </div>
      </div>

      {/* Recommendation banner */}
      {(reservationData?.underutilizedCount ?? 0) > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <Savings20Regular className="text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <Text weight="semibold" className="text-yellow-800">
              Optimization Opportunity
            </Text>
            <Text size={200} className="text-yellow-700 block mt-1">
              {reservationData?.underutilizedCount} reservation(s) are underutilized (below 80%). 
              Consider exchanging for smaller SKUs or selling in the Azure Reservation Marketplace.
            </Text>
          </div>
        </div>
      )}
    </PageWrapper>
  );
};

export default Reservations;
