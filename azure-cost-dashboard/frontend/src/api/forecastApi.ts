import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ForecastResult } from '../types/cost.types';
import { ApiResponse } from '../types/api.types';

interface ReservationSummary {
  totalReservations: number;
  averageUtilizationPercent: number;
  underutilizedCount: number;
  estimatedSavings: number;
}

export const forecastApi = createApi({
  reducerPath: 'forecastApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env['VITE_API_BASE_URL'] ?? ''}/api/v1`,
    prepareHeaders: (headers) => {
      const token = sessionStorage.getItem('msal.access.token');
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Forecast', 'Reservation'],
  endpoints: (builder) => ({
    getForecast: builder.query<
      ForecastResult,
      { subscriptionId: string; daysAhead?: number; includeActual?: boolean }
    >({
      query: (params) => ({ url: '/forecasts', params }),
      transformResponse: (response: ApiResponse<ForecastResult>) => response.data,
      providesTags: ['Forecast'],
    }),

    getReservationSummary: builder.query<ReservationSummary, { subscriptionId: string }>({
      query: ({ subscriptionId }) => `/reservations/summary?subscriptionId=${subscriptionId}`,
      transformResponse: (response: ApiResponse<ReservationSummary>) => response.data,
      providesTags: ['Reservation'],
    }),
  }),
});

export const { useGetForecastQuery, useGetReservationSummaryQuery } = forecastApi;
