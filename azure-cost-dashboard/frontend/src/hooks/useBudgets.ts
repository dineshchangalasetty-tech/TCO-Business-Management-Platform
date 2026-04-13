import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store/store';
import { useListBudgetsQuery, useGetBudgetSummaryQuery } from '../api/budgetApi';
import { setSelectedBudget } from '../store/slices/budgetSlice';
import type { EnrichedBudget } from '../types/budget.types';

const isDemoMode = import.meta.env['VITE_DEMO_MODE'] === 'true';

/**
 * Hook for budget data — list, summary, and selection management.
 * In demo mode, never skips queries so real CSV data always loads.
 */
export function useBudgets(subscriptionId: string) {
  const dispatch = useDispatch<AppDispatch>();
  const selectedBudget = useSelector((state: RootState) => state.budget.selectedBudget);

  // In demo mode, backend ignores subscriptionId so always query
  const effectiveSub = subscriptionId || (isDemoMode ? 'demo' : '');
  const skip = !effectiveSub;

  const {
    data: budgets = [],
    isLoading: budgetsLoading,
    isError: budgetsError,
    refetch: refetchBudgets,
  } = useListBudgetsQuery({ subscriptionId: effectiveSub }, { skip });

  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
  } = useGetBudgetSummaryQuery({ subscriptionId: effectiveSub }, { skip });

  const selectBudget = (budget: EnrichedBudget | null) => dispatch(setSelectedBudget(budget));

  const overBudgetCount = budgets.filter((b) => b.status === 'exceeded').length;
  const atRiskCount = budgets.filter((b) => b.status === 'at_risk').length;
  const onTrackCount = budgets.filter((b) => b.status === 'on_track').length;

  return {
    budgets,
    summary,
    selectedBudget,
    selectBudget,
    overBudgetCount,
    atRiskCount,
    onTrackCount,
    isLoading: budgetsLoading || summaryLoading,
    hasError: budgetsError || summaryError,
    refetchBudgets,
  };
}
