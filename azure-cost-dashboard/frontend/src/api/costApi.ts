import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { DashboardKPIs, CostSummary, CostByDimension, TopResource } from '../types/cost.types';
import { ApiResponse } from '../types/api.types';

const baseQuery = fetchBaseQuery({
  baseUrl: `${import.meta.env['VITE_API_BASE_URL'] ?? ''}/api/v1`,
  prepareHeaders: async (headers) => {
    // MSAL token injection — handled by msalInterceptor in the app setup
    const token = sessionStorage.getItem('msal.access.token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithRefresh: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  const result = await baseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    // Token refresh will be handled by MSAL interceptor — reload to trigger re-auth
    window.location.href = '/';
  }

  return result;
};

export const costApi = createApi({
  reducerPath: 'costApi',
  baseQuery: baseQueryWithRefresh,
  tagTypes: ['CostData', 'KPIs', 'TopResources', 'Breakdown'],
  endpoints: (builder) => ({
    getOverviewKPIs: builder.query<DashboardKPIs, { subscriptionId: string }>({
      query: ({ subscriptionId }) => `/costs/overview?subscriptionId=${subscriptionId}`,
      transformResponse: (response: ApiResponse<DashboardKPIs>) => response.data,
      providesTags: ['KPIs'],
    }),

    queryCosts: builder.query<
      CostSummary,
      {
        subscriptionId: string;
        from: string;
        to: string;
        granularity?: string;
        groupBy?: string;
        metric?: string;
        includePreviousPeriod?: boolean;
      }
    >({
      query: (params) => ({
        url: '/costs/query',
        params,
      }),
      transformResponse: (response: ApiResponse<CostSummary>) => response.data,
      providesTags: ['CostData'],
    }),

    getCostBreakdown: builder.query<
      CostByDimension[],
      { subscriptionId: string; from: string; to: string; dimension: string }
    >({
      query: (params) => ({ url: '/costs/breakdown', params }),
      transformResponse: (response: ApiResponse<CostByDimension[]>) => response.data,
      providesTags: ['Breakdown'],
    }),

    getTopResources: builder.query<
      TopResource[],
      { subscriptionId: string; from: string; to: string; topN?: number }
    >({
      query: (params) => ({ url: '/costs/top-resources', params }),
      transformResponse: (response: ApiResponse<TopResource[]>) => response.data,
      providesTags: ['TopResources'],
    }),

    getAmortizedCosts: builder.query<
      CostSummary,
      { subscriptionId: string; from: string; to: string; granularity?: string }
    >({
      query: (params) => ({ url: '/costs/amortized', params }),
      transformResponse: (response: ApiResponse<CostSummary>) => response.data,
      providesTags: ['CostData'],
    }),
  }),
});

export const {
  useGetOverviewKPIsQuery,
  useQueryCostsQuery,
  useGetCostBreakdownQuery,
  useGetTopResourcesQuery,
  useGetAmortizedCostsQuery,
} = costApi;
