import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import {
  useGetOverviewKPIsQuery,
  useQueryCostsQuery,
  useGetCostBreakdownQuery,
  useGetTopResourcesQuery,
} from '../api/costApi';

/**
 * Composite hook that provides all cost data needed for the dashboard,
 * using the global filter state from Redux.
 */
export function useCostData() {
  const filter = useSelector((state: RootState) => state.filter);
  const { subscriptionId, dateRange, groupBy, metric } = filter;

  const skipQuery = !subscriptionId;

  const {
    data: kpis,
    isLoading: kpisLoading,
    isError: kpisError,
    refetch: refetchKPIs,
  } = useGetOverviewKPIsQuery({ subscriptionId }, { skip: skipQuery });

  const {
    data: costTrend,
    isLoading: trendLoading,
    isError: trendError,
  } = useQueryCostsQuery(
    {
      subscriptionId,
      from: dateRange.from,
      to: dateRange.to,
      granularity: 'Daily',
      metric,
    },
    { skip: skipQuery }
  );

  const {
    data: breakdown,
    isLoading: breakdownLoading,
    isError: breakdownError,
  } = useGetCostBreakdownQuery(
    {
      subscriptionId,
      from: dateRange.from,
      to: dateRange.to,
      dimension: groupBy ?? 'ServiceName',
    },
    { skip: skipQuery }
  );

  const {
    data: topResources,
    isLoading: topResourcesLoading,
    isError: topResourcesError,
  } = useGetTopResourcesQuery(
    {
      subscriptionId,
      from: dateRange.from,
      to: dateRange.to,
      topN: 10,
    },
    { skip: skipQuery }
  );

  const isLoading = kpisLoading || trendLoading || breakdownLoading || topResourcesLoading;
  const hasError = kpisError || trendError || breakdownError || topResourcesError;

  return {
    kpis,
    costTrend,
    breakdown,
    topResources,
    isLoading,
    hasError,
    refetchKPIs,
    filter,
  };
}
