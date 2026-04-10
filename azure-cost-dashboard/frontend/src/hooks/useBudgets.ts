import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store/store';
import { useListBudgetsQuery, useGetBudgetSummaryQuery } from '../api/budgetApi';
import { setSelectedBudget } from '../store/slices/budgetSlice';
import type { EnrichedBudget } from '../types/budget.types';

/**
 * Hook for budget data — list, summary, and selection management.
 */
export function useBudgets(subscriptionId: string) {
  const dispatch = useDispatch<AppDispatch>();
  const selectedBudget = useSelector((state: RootState) => state.budget.selectedBudget);

  const {
    data: budgets = [],
    isLoading: budgetsLoading,
    isError: budgetsError,
    refetch: refetchBudgets,
  } = useListBudgetsQuery({ subscriptionId }, { skip: !subscriptionId });

  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
  } = useGetBudgetSummaryQuery({ subscriptionId }, { skip: !subscriptionId });

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
