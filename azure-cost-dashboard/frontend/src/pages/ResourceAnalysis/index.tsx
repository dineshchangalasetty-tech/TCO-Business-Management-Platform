import React from 'react';
import { Text, Badge, Spinner } from '@fluentui/react-components';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { KPICard } from '../../components/common/KPICard';
import { CostBreakdownDonut } from '../../components/charts/CostBreakdownDonut';
import { RegionHeatMap } from '../../components/charts/RegionHeatMap';
import { DateRangePicker } from '../../components/common/DateRangePicker';
import { ExportButton } from '../../components/common/ExportButton';
import { useCostData } from '../../hooks/useCostData';
import { useFilters } from '../../hooks/useFilters';
import { formatCurrency } from '../../utils/formatters';

/**
 * Resource Analysis page — top resources, service breakdown, region heat map.
 */
const ResourceAnalysis: React.FC = () => {
  const { filter } = useFilters();
  const { topResources, breakdown, costTrend, isLoading, hasError } = useCostData();

  // Derive region data from topResources as a fallback
  const regionData = React.useMemo(() => {
    if (!topResources) return [];
    const map: Record<string, number> = {};
    topResources.forEach((r) => {
      const region = r.location ?? 'unknown';
      map[region] = (map[region] ?? 0) + r.cost;
    });
    return Object.entries(map).map(([region, cost]) => ({ region, cost }));
  }, [topResources]);

  const totalSpend = topResources?.reduce((sum, r) => sum + r.cost, 0) ?? 0;

  return (
    <PageWrapper
      title="Resource Analysis"
      subtitle="Deep-dive into top cost-driving resources, services, and regions"
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Resource Analysis' }]}
      error={hasError ? 'Failed to load resource data.' : null}
      actions={
        <div className="flex items-center gap-2">
          <DateRangePicker compact />
          <ExportButton />
        </div>
      }
    >
      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KPICard
          title="Analyzed Resources"
          value={String(topResources?.length ?? '—')}
          loading={isLoading}
          description="Number of resources in the top-N analysis"
        />
        <KPICard
          title="Top Resources Total"
          value={formatCurrency(totalSpend)}
          loading={isLoading}
          description="Combined cost of top resources for the period"
        />
        <KPICard
          title="Regions Active"
          value={String(regionData.length)}
          loading={isLoading}
          description="Number of Azure regions with active spend"
        />
      </div>

      {/* Service breakdown + region map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <CostBreakdownDonut
          data={breakdown ?? []}
          loading={isLoading}
          dimension="Service"
          height={340}
          title="Cost by Service"
        />
        <RegionHeatMap
          data={regionData}
          loading={isLoading}
          height={340}
        />
      </div>

      {/* Top Resources Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <Text weight="semibold">Top {topResources?.length ?? 0} Resources by Cost</Text>
          <ExportButton size="small" />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner label="Loading resources…" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Resource</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Region</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Resource Group</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Cost</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(topResources ?? []).map((resource) => (
                  <tr key={resource.resourceId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 max-w-[200px]">
                      <Text className="truncate block font-medium" title={resource.resourceName}>
                        {resource.resourceName}
                      </Text>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{resource.resourceType}</td>
                    <td className="px-4 py-3 text-gray-500">{resource.location ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{resource.resourceGroup ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">
                      {formatCurrency(resource.cost)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge appearance="filled" color="informative" size="small">
                        {resource.percentage.toFixed(1)}%
                      </Badge>
                    </td>
                  </tr>
                ))}
                {(!topResources || topResources.length === 0) && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400">
                      No resource data for the selected period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageWrapper>
  );
};

export default ResourceAnalysis;
