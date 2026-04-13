import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { EnrichedBudget, BudgetUtilizationSummary } from '../../types/budget.types';

interface BudgetState {
  budgets: EnrichedBudget[];
  summary: BudgetUtilizationSummary | null;
  loading: boolean;
  error: string | null;
  selectedBudget: EnrichedBudget | null;
}

const initialState: BudgetState = {
  budgets: [],
  summary: null,
  loading: false,
  error: null,
  selectedBudget: null,
};

export const budgetSlice = createSlice({
  name: 'budget',
  initialState,
  reducers: {
    setBudgets(state, action: PayloadAction<EnrichedBudget[]>) {
      state.budgets = action.payload;
      state.error = null;
    },
    setSummary(state, action: PayloadAction<BudgetUtilizationSummary>) {
      state.summary = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    setSelectedBudget(state, action: PayloadAction<EnrichedBudget | null>) {
      state.selectedBudget = action.payload;
    },
    removeBudget(state, action: PayloadAction<string>) {
      state.budgets = state.budgets.filter((b) => b.id !== action.payload);
    },
    upsertBudget(state, action: PayloadAction<EnrichedBudget>) {
      const idx = state.budgets.findIndex((b) => b.id === action.payload.id);
      if (idx >= 0) {
        state.budgets[idx] = action.payload;
      } else {
        state.budgets.push(action.payload);
      }
    },
  },
});

export const {
  setBudgets,
  setSummary,
  setLoading,
  setError,
  setSelectedBudget,
  removeBudget,
  upsertBudget,
} = budgetSlice.actions;

export default budgetSlice.reducer;
