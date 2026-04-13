import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { EnrichedBudget, BudgetUtilizationSummary, CreateBudgetFormData } from '../types/budget.types';
import { ApiResponse } from '../types/api.types';

export const budgetApi = createApi({
  reducerPath: 'budgetApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env['VITE_API_BASE_URL'] ?? ''}/api/v1`,
    prepareHeaders: (headers) => {
      const token = sessionStorage.getItem('msal.access.token');
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Budget'],
  endpoints: (builder) => ({
    listBudgets: builder.query<EnrichedBudget[], { subscriptionId: string }>({
      query: ({ subscriptionId }) => `/budgets?subscriptionId=${subscriptionId}`,
      transformResponse: (response: ApiResponse<EnrichedBudget[]>) => response.data,
      providesTags: ['Budget'],
    }),

    getBudget: builder.query<EnrichedBudget, { subscriptionId: string; budgetName: string }>({
      query: ({ subscriptionId, budgetName }) =>
        `/budgets/${budgetName}?subscriptionId=${subscriptionId}`,
      transformResponse: (response: ApiResponse<EnrichedBudget>) => response.data,
      providesTags: ['Budget'],
    }),

    getBudgetSummary: builder.query<BudgetUtilizationSummary, { subscriptionId: string }>({
      query: ({ subscriptionId }) => `/budgets/summary?subscriptionId=${subscriptionId}`,
      transformResponse: (response: ApiResponse<BudgetUtilizationSummary>) => response.data,
      providesTags: ['Budget'],
    }),

    createBudget: builder.mutation<EnrichedBudget, CreateBudgetFormData>({
      query: (body) => ({
        url: '/budgets',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiResponse<EnrichedBudget>) => response.data,
      invalidatesTags: ['Budget'],
    }),

    updateBudget: builder.mutation<EnrichedBudget, { subscriptionId: string; budgetName: string; data: Partial<CreateBudgetFormData> }>({
      query: ({ subscriptionId, budgetName, data }) => ({
        url: `/budgets/${budgetName}?subscriptionId=${subscriptionId}`,
        method: 'PUT',
        body: data,
      }),
      transformResponse: (response: ApiResponse<EnrichedBudget>) => response.data,
      invalidatesTags: ['Budget'],
    }),

    deleteBudget: builder.mutation<void, { subscriptionId: string; budgetName: string }>({
      query: ({ subscriptionId, budgetName }) => ({
        url: `/budgets/${budgetName}?subscriptionId=${subscriptionId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Budget'],
    }),
  }),
});

export const {
  useListBudgetsQuery,
  useGetBudgetQuery,
  useGetBudgetSummaryQuery,
  useCreateBudgetMutation,
  useUpdateBudgetMutation,
  useDeleteBudgetMutation,
} = budgetApi;
