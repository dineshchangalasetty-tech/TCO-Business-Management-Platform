import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store/store';
import {
  setSubscriptionId,
  setDateRange,
  setGroupBy,
  setMetric,
  setServiceNames,
  setRegions,
  setResourceGroups,
  resetFilters,
} from '../store/slices/filterSlice';
import type { DateRange } from '../types/api.types';

/**
 * Hook for reading and updating the global filter state.
 */
export function useFilters() {
  const dispatch = useDispatch<AppDispatch>();
  const filter = useSelector((state: RootState) => state.filter);

  return {
    filter,
    dateRange: filter.dateRange,
    setSubscriptionId: (id: string) => dispatch(setSubscriptionId(id)),
    setDateRange: (range: DateRange) => dispatch(setDateRange(range)),
    setGroupBy: (groupBy: string | undefined) => dispatch(setGroupBy(groupBy)),
    setMetric: (metric: 'ActualCost' | 'AmortizedCost') => dispatch(setMetric(metric)),
    setServiceNames: (names: string[] | undefined) => dispatch(setServiceNames(names)),
    setRegions: (regions: string[] | undefined) => dispatch(setRegions(regions)),
    setResourceGroups: (rgs: string[] | undefined) => dispatch(setResourceGroups(rgs)),
    resetFilters: () => dispatch(resetFilters()),
  };
}
