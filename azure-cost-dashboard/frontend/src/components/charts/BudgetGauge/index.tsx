import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Text } from '@fluentui/react-components';

interface BudgetGaugeProps {
  utilizationPercent: number;
  budgetName: string;
  spent: string;
  limit: string;
  forecastedPercent?: number;
  loading?: boolean;
  height?: number;
}

/**
 * Animated circular gauge showing budget utilization.
 * Colors: green <80%, yellow 80–99%, red ≥100%.
 */
export const BudgetGauge: React.FC<BudgetGaugeProps> = ({
  utilizationPercent,
  budgetName,
  spent,
  limit,
  forecastedPercent,
  loading = false,
  height = 220,
}) => {
  const clampedUtil = Math.min(utilizationPercent, 150); // cap display at 150%
  const gaugeColor =
    utilizationPercent >= 100
      ? '#d13438'
      : utilizationPercent >= 80
      ? '#ffd335'
      : '#107c10';

  const option = useMemo(
    () => ({
      animation: true,
      series: [
        {
          type: 'gauge',
          startAngle: 210,
          endAngle: -30,
          min: 0,
          max: 150,
          radius: '88%',
          center: ['50%', '60%'],
          splitNumber: 3,
          axisLine: {
            lineStyle: {
              width: 14,
              color: [
                [80 / 150, '#107c10'],
                [100 / 150, '#ffd335'],
                [1, '#d13438'],
              ],
            },
          },
          pointer: {
            icon: 'path://M12.8,0.7l12.3,30.1H0.5L12.8,0.7z',
            length: '60%',
            width: 8,
            offsetCenter: [0, '-5%'],
            itemStyle: { color: gaugeColor },
          },
          axisTick: { show: false },
          splitLine: { length: 10, lineStyle: { width: 2, color: '#fff' } },
          axisLabel: {
            distance: -30,
            color: '#999',
            fontSize: 10,
            formatter: (val: number) => `${Math.round((val / 150) * 100)}%`,
          },
          title: { offsetCenter: [0, '30%'], fontSize: 13, color: '#333' },
          detail: {
            valueAnimation: true,
            formatter: (val: number) => `${Math.round((val / 150) * 100)}%`,
            color: gaugeColor,
            fontSize: 24,
            fontWeight: 'bold',
            offsetCenter: [0, '10%'],
          },
          data: [{ value: clampedUtil, name: budgetName }],
        },
        // Forecasted tick (optional)
        ...(forecastedPercent !== undefined
          ? [
              {
                type: 'gauge',
                startAngle: 210,
                endAngle: -30,
                min: 0,
                max: 150,
                radius: '88%',
                center: ['50%', '60%'],
                pointer: { show: false },
                axisTick: { show: false },
                splitLine: { show: false },
                axisLabel: { show: false },
                axisLine: { show: false },
                markPoint: {
                  symbol: 'triangle',
                  symbolSize: 10,
                  data: [
                    {
                      value: Math.min(forecastedPercent, 150),
                      itemStyle: { color: '#ff7a00' },
                    },
                  ],
                },
                title: { show: false },
                detail: { show: false },
                data: [{ value: Math.min(forecastedPercent, 150) }],
              },
            ]
          : []),
      ],
    }),
    [clampedUtil, gaugeColor, budgetName, forecastedPercent]
  );

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-100 rounded-lg" style={{ height }} />
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm text-center">
      <ReactECharts option={option} style={{ height }} opts={{ renderer: 'svg' }} />
      <div className="flex justify-between mt-1 text-sm text-gray-500">
        <span>Spent: <strong className="text-gray-800">{spent}</strong></span>
        <span>Budget: <strong className="text-gray-800">{limit}</strong></span>
      </div>
      {forecastedPercent !== undefined && (
        <Text size={100} className="text-orange-500 mt-1">
          Forecasted: {forecastedPercent.toFixed(0)}% utilization
        </Text>
      )}
    </div>
  );
};

export default BudgetGauge;
