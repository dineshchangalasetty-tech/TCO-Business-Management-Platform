import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Button, Text, ToggleButton } from '@fluentui/react-components';
import type { CostDataPoint } from '../../../types/cost.types';

type Granularity = 'Daily' | 'Weekly' | 'Monthly';

interface SpendTrendChartProps {
  dataPoints: CostDataPoint[];
  forecastPoints?: CostDataPoint[];
  loading?: boolean;
  granularity?: Granularity;
  onGranularityChange?: (g: Granularity) => void;
  height?: number;
  title?: string;
  currency?: string;
}

/**
 * Spend trend line/area chart using Apache ECharts.
 * Renders actual spend as a filled area, overlaid with optional forecast as a dashed line.
 */
export const SpendTrendChart: React.FC<SpendTrendChartProps> = ({
  dataPoints,
  forecastPoints = [],
  loading = false,
  granularity = 'Daily',
  onGranularityChange,
  height = 320,
  title,
  currency = 'USD',
}) => {
  const [localGranularity, setLocalGranularity] = React.useState<Granularity>(granularity);

  const currencySymbol = currency === 'USD' ? '$' : currency;

  const formatValue = (val: number) => {
    if (val >= 1_000_000) return `${currencySymbol}${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `${currencySymbol}${(val / 1_000).toFixed(1)}K`;
    return `${currencySymbol}${val.toFixed(0)}`;
  };

  const option = useMemo(() => {
    const actualDates = dataPoints.map((d) => d.date);
    const actualValues = dataPoints.map((d) => d.cost);
    const forecastDates = forecastPoints.map((d) => d.date);
    const forecastValues = forecastPoints.map((d) => d.cost);

    const allDates = Array.from(new Set([...actualDates, ...forecastDates])).sort();

    return {
      animation: true,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross', label: { backgroundColor: '#6a7985' } },
        formatter: (params: Array<{ seriesName: string; value: number; axisValue: string }>) => {
          const lines = params.map(
            (p) => `${p.seriesName}: <strong>${formatValue(p.value)}</strong>`
          );
          return `<div><b>${params[0]?.axisValue}</b><br/>${lines.join('<br/>')}</div>`;
        },
      },
      legend: {
        data: ['Actual Spend', ...(forecastPoints.length ? ['Forecast'] : [])],
        bottom: 0,
        textStyle: { color: '#666' },
      },
      grid: { left: '3%', right: '4%', bottom: '12%', top: '8%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: allDates,
        axisLabel: {
          rotate: allDates.length > 20 ? 30 : 0,
          formatter: (val: string) => val.slice(5), // MM-DD
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: (val: number) => formatValue(val) },
        splitLine: { lineStyle: { color: '#f0f0f0' } },
      },
      series: [
        {
          name: 'Actual Spend',
          type: 'line',
          smooth: true,
          data: allDates.map((d) => {
            const idx = actualDates.indexOf(d);
            return idx >= 0 ? actualValues[idx] : null;
          }),
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(22, 119, 255, 0.3)' },
                { offset: 1, color: 'rgba(22, 119, 255, 0.02)' },
              ],
            },
          },
          lineStyle: { width: 2, color: '#1677ff' },
          itemStyle: { color: '#1677ff' },
          symbol: 'circle',
          symbolSize: 4,
          connectNulls: false,
        },
        ...(forecastPoints.length
          ? [
              {
                name: 'Forecast',
                type: 'line',
                smooth: true,
                data: allDates.map((d) => {
                  const idx = forecastDates.indexOf(d);
                  return idx >= 0 ? forecastValues[idx] : null;
                }),
                lineStyle: { width: 2, type: 'dashed', color: '#ff7a00' },
                itemStyle: { color: '#ff7a00' },
                symbol: 'none',
                connectNulls: false,
              },
            ]
          : []),
      ],
    };
  }, [dataPoints, forecastPoints, currencySymbol]);

  const handleGranularity = (g: Granularity) => {
    setLocalGranularity(g);
    onGranularityChange?.(g);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <Text weight="semibold" size={400}>
          {title ?? 'Spend Trend'}
        </Text>
        {onGranularityChange && (
          <div className="flex gap-1">
            {(['Daily', 'Weekly', 'Monthly'] as Granularity[]).map((g) => (
              <ToggleButton
                key={g}
                checked={localGranularity === g}
                onClick={() => handleGranularity(g)}
                size="small"
                appearance="subtle"
              >
                {g.charAt(0)}
              </ToggleButton>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div
          className="animate-pulse bg-gray-100 rounded"
          style={{ height }}
          aria-label="Loading chart data"
        />
      ) : dataPoints.length === 0 ? (
        <div
          className="flex items-center justify-center text-gray-400"
          style={{ height }}
        >
          No data available for the selected period
        </div>
      ) : (
        <ReactECharts
          option={option}
          style={{ height }}
          opts={{ renderer: 'svg' }}
          lazyUpdate
        />
      )}
    </div>
  );
};

export default SpendTrendChart;
