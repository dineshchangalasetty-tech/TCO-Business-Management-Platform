import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Text, Badge } from '@fluentui/react-components';

interface UtilizationPoint {
  date: string;
  utilizedHours: number;
  reservedHours: number;
  utilizationPercent: number;
}

interface ReservationUtilChartProps {
  data: UtilizationPoint[];
  loading?: boolean;
  height?: number;
  /** If >= 80% average utilization, it's considered healthy */
  utilizationThreshold?: number;
}

/**
 * Stacked bar + line combo chart for Reservation utilization trend.
 * Bars = utilized vs reserved hours; Line = utilization %.
 */
export const ReservationUtilChart: React.FC<ReservationUtilChartProps> = ({
  data,
  loading = false,
  height = 300,
  utilizationThreshold = 80,
}) => {
  const avgUtil = useMemo(() => {
    if (!data.length) return 0;
    return data.reduce((sum, d) => sum + d.utilizationPercent, 0) / data.length;
  }, [data]);

  const option = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        formatter: (params: Array<{ seriesName: string; value: number; axisValue: string }>) => {
          const lines = params.map(
            (p) =>
              `${p.seriesName}: <b>${
                p.seriesName.includes('%') ? `${p.value.toFixed(1)}%` : `${p.value.toFixed(0)} hrs`
              }</b>`
          );
          return `<b>${params[0]?.axisValue}</b><br/>${lines.join('<br/>')}`;
        },
      },
      legend: { data: ['Utilized Hours', 'Reserved Hours', 'Utilization %'], bottom: 0 },
      grid: { left: '3%', right: '8%', bottom: '14%', top: '5%', containLabel: true },
      xAxis: {
        type: 'category',
        data: data.map((d) => d.date.slice(5)),
        axisLabel: { rotate: data.length > 15 ? 30 : 0 },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Hours',
          nameTextStyle: { color: '#888' },
          splitLine: { lineStyle: { color: '#f0f0f0' } },
        },
        {
          type: 'value',
          name: 'Util %',
          min: 0,
          max: 100,
          axisLabel: { formatter: (v: number) => `${v}%` },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: 'Reserved Hours',
          type: 'bar',
          stack: 'total',
          data: data.map((d) => d.reservedHours - d.utilizedHours),
          itemStyle: { color: '#e6f4ff' },
          barMaxWidth: 40,
        },
        {
          name: 'Utilized Hours',
          type: 'bar',
          stack: 'total',
          data: data.map((d) => d.utilizedHours),
          itemStyle: { color: '#1677ff' },
          barMaxWidth: 40,
        },
        {
          name: 'Utilization %',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          data: data.map((d) => d.utilizationPercent),
          lineStyle: { width: 2, color: avgUtil >= utilizationThreshold ? '#52c41a' : '#ff4d4f' },
          itemStyle: { color: avgUtil >= utilizationThreshold ? '#52c41a' : '#ff4d4f' },
          symbol: 'circle',
          symbolSize: 5,
          markLine: {
            data: [{ yAxis: utilizationThreshold, name: 'Threshold' }],
            lineStyle: { color: '#faad14', type: 'dashed' },
            label: { formatter: `${utilizationThreshold}% threshold` },
          },
        },
      ],
    }),
    [data, avgUtil, utilizationThreshold]
  );

  if (loading) {
    return <div className="animate-pulse bg-gray-100 rounded-lg" style={{ height }} />;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <Text weight="semibold" size={400}>
          Reservation Utilization Trend
        </Text>
        <Badge
          color={avgUtil >= utilizationThreshold ? 'success' : 'danger'}
          appearance="filled"
        >
          Avg {avgUtil.toFixed(1)}% utilized
        </Badge>
      </div>
      {data.length === 0 ? (
        <div className="flex items-center justify-center text-gray-400" style={{ height }}>
          No reservation data available
        </div>
      ) : (
        <ReactECharts option={option} style={{ height }} opts={{ renderer: 'svg' }} lazyUpdate />
      )}
    </div>
  );
};

export default ReservationUtilChart;
