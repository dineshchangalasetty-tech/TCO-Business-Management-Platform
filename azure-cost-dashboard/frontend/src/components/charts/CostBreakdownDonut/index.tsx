import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Text } from '@fluentui/react-components';
import type { CostByDimension } from '../../../types/cost.types';

interface CostBreakdownDonutProps {
  data: CostByDimension[];
  dimension?: string;
  loading?: boolean;
  height?: number;
  title?: string;
  currency?: string;
}

const PALETTE = [
  '#1677ff', '#ff4d4f', '#52c41a', '#faad14', '#722ed1',
  '#13c2c2', '#fa541c', '#2f54eb', '#eb2f96', '#a0d911',
  '#096dd9', '#d4380d', '#389e0d', '#d48806',
];

/**
 * Donut chart breaking down costs by a single dimension (service, RG, region, etc.).
 * Interactive legend highlights slice on hover.
 */
export const CostBreakdownDonut: React.FC<CostBreakdownDonutProps> = ({
  data,
  dimension = 'Service',
  loading = false,
  height = 320,
  title,
  currency = 'USD',
}) => {
  const currencySymbol = currency === 'USD' ? '$' : currency;

  const formatValue = (val: number) => {
    if (val >= 1_000_000) return `${currencySymbol}${(val / 1_000_000).toFixed(2)}M`;
    if (val >= 1_000) return `${currencySymbol}${(val / 1_000).toFixed(1)}K`;
    return `${currencySymbol}${val.toFixed(2)}`;
  };

  const option = useMemo(() => {
    const pieData = data.slice(0, 14).map((item, idx) => ({
      name: item.name,
      value: item.cost,
      itemStyle: { color: PALETTE[idx % PALETTE.length] },
    }));

    // Aggregate remainder
    if (data.length > 14) {
      const otherCost = data.slice(14).reduce((sum, d) => sum + d.cost, 0);
      pieData.push({
        name: 'Other',
        value: otherCost,
        itemStyle: { color: '#d9d9d9' },
      });
    }

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: { name: string; value: number; percent: number }) =>
          `<b>${params.name}</b><br/>Cost: ${formatValue(params.value)}<br/>Share: ${params.percent.toFixed(1)}%`,
      },
      legend: {
        type: 'scroll',
        orient: 'vertical',
        right: 10,
        top: 20,
        bottom: 20,
        textStyle: { fontSize: 12, color: '#555' },
        formatter: (name: string) => {
          const item = data.find((d) => d.name === name);
          return item ? `${name} (${item.percentage.toFixed(1)}%)` : name;
        },
      },
      series: [
        {
          type: 'pie',
          radius: ['42%', '70%'],
          center: ['38%', '50%'],
          avoidLabelOverlap: true,
          label: { show: false },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold',
              formatter: (params: { name: string; percent: number }) =>
                `${params.name}\n${params.percent.toFixed(1)}%`,
            },
            itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.2)' },
          },
          data: pieData,
        },
      ],
    };
  }, [data, currencySymbol]);

  if (loading) {
    return <div className="animate-pulse bg-gray-100 rounded-lg" style={{ height }} />;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <Text weight="semibold" size={400} className="block mb-2">
        {title ?? `Cost by ${dimension}`}
      </Text>
      {data.length === 0 ? (
        <div
          className="flex items-center justify-center text-gray-400"
          style={{ height }}
        >
          No breakdown data available
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

export default CostBreakdownDonut;
