import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Text } from '@fluentui/react-components';

interface RegionCostItem {
  region: string;
  cost: number;
  displayName?: string;
}

interface RegionHeatMapProps {
  data: RegionCostItem[];
  loading?: boolean;
  height?: number;
  currency?: string;
}

/** Maps Azure internal region names to display labels */
const REGION_LABELS: Record<string, string> = {
  eastus: 'East US',
  eastus2: 'East US 2',
  westus: 'West US',
  westus2: 'West US 2',
  centralus: 'Central US',
  northeurope: 'North Europe',
  westeurope: 'West Europe',
  uksouth: 'UK South',
  ukwest: 'UK West',
  australiaeast: 'Australia East',
  southeastasia: 'SE Asia',
  eastasia: 'East Asia',
  japaneast: 'Japan East',
  canadacentral: 'Canada Central',
  brazilsouth: 'Brazil South',
  southindia: 'South India',
};

/**
 * Renders cost-by-region as a horizontal bar chart (map chart fallback for ECharts without geo module).
 * Sorted descending by cost.
 */
export const RegionHeatMap: React.FC<RegionHeatMapProps> = ({
  data,
  loading = false,
  height = 320,
  currency = 'USD',
}) => {
  const currencySymbol = currency === 'USD' ? '$' : currency;

  const formatValue = (val: number) => {
    if (val >= 1_000_000) return `${currencySymbol}${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `${currencySymbol}${(val / 1_000).toFixed(1)}K`;
    return `${currencySymbol}${val.toFixed(0)}`;
  };

  const sorted = useMemo(
    () => [...data].sort((a, b) => b.cost - a.cost).slice(0, 12),
    [data]
  );

  const maxCost = sorted[0]?.cost ?? 1;

  const option = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: Array<{ name: string; value: number }>) =>
          `<b>${params[0].name}</b>: ${formatValue(params[0].value)}`,
      },
      grid: { left: '2%', right: '6%', bottom: '3%', top: '3%', containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: { formatter: (val: number) => formatValue(val) },
        splitLine: { lineStyle: { color: '#f0f0f0' } },
      },
      yAxis: {
        type: 'category',
        data: sorted.map((d) => REGION_LABELS[d.region] ?? d.displayName ?? d.region),
        inverse: true,
        axisLabel: { fontSize: 12 },
      },
      series: [
        {
          type: 'bar',
          data: sorted.map((d) => ({
            value: d.cost,
            itemStyle: {
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 1, y2: 0,
                colorStops: [
                  { offset: 0, color: `rgba(22,119,255,${0.3 + 0.7 * (d.cost / maxCost)})` },
                  { offset: 1, color: `rgba(22,119,255,${0.6 + 0.4 * (d.cost / maxCost)})` },
                ],
              },
            },
          })),
          barMaxWidth: 40,
          label: {
            show: true,
            position: 'right',
            formatter: (params: { value: number }) => formatValue(params.value),
            color: '#555',
            fontSize: 11,
          },
        },
      ],
    }),
    [sorted, maxCost, currencySymbol]
  );

  if (loading) {
    return <div className="animate-pulse bg-gray-100 rounded-lg" style={{ height }} />;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <Text weight="semibold" size={400} className="block mb-3">
        Cost by Region
      </Text>
      {data.length === 0 ? (
        <div className="flex items-center justify-center text-gray-400" style={{ height }}>
          No region data available
        </div>
      ) : (
        <ReactECharts option={option} style={{ height }} opts={{ renderer: 'svg' }} lazyUpdate />
      )}
    </div>
  );
};

export default RegionHeatMap;
