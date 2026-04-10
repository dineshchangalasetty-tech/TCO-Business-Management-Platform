import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FilterState, DateRange } from '../../types/api.types';

const defaultDateRange: DateRange = {
  from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0] ?? '',
  to: new Date().toISOString().split('T')[0] ?? '',
  preset: 'last30days',
};

const initialState: FilterState = {
  subscriptionId: '',
  dateRange: defaultDateRange,
  metric: 'ActualCost',
};

export const filterSlice = createSlice({
  name: 'filter',
  initialState,
  reducers: {
    setSubscriptionId(state, action: PayloadAction<string>) {
      state.subscriptionId = action.payload;
    },
    setDateRange(state, action: PayloadAction<DateRange>) {
      state.dateRange = action.payload;
    },
    setGroupBy(state, action: PayloadAction<string | undefined>) {
      state.groupBy = action.payload;
    },
    setMetric(state, action: PayloadAction<'ActualCost' | 'AmortizedCost'>) {
      state.metric = action.payload;
    },
    setServiceNames(state, action: PayloadAction<string[] | undefined>) {
      state.serviceNames = action.payload;
    },
    setRegions(state, action: PayloadAction<string[] | undefined>) {
      state.regions = action.payload;
    },
    setResourceGroups(state, action: PayloadAction<string[] | undefined>) {
      state.resourceGroups = action.payload;
    },
    resetFilters(state) {
      Object.assign(state, {
        ...initialState,
        subscriptionId: state.subscriptionId, // preserve subscription
      });
    },
  },
});

export const {
  setSubscriptionId,
  setDateRange,
  setGroupBy,
  setMetric,
  setServiceNames,
  setRegions,
  setResourceGroups,
  resetFilters,
} = filterSlice.actions;

export default filterSlice.reducer;
