import { configureStore } from '@reduxjs/toolkit';
import { costApi } from '../api/costApi';
import { budgetApi } from '../api/budgetApi';
import { forecastApi } from '../api/forecastApi';
import filterReducer from './slices/filterSlice';
import budgetReducer from './slices/budgetSlice';

export const store = configureStore({
  reducer: {
    filter: filterReducer,
    budget: budgetReducer,
    [costApi.reducerPath]: costApi.reducer,
    [budgetApi.reducerPath]: budgetApi.reducer,
    [forecastApi.reducerPath]: forecastApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      costApi.middleware,
      budgetApi.middleware,
      forecastApi.middleware
    ),
  devTools: import.meta.env.MODE !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks — import these everywhere instead of plain useDispatch/useSelector
import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
