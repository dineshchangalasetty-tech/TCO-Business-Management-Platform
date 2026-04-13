import React, { useState, useCallback } from 'react';
import {
  Button,
  Combobox,
  Option,
  DataGrid,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridBody,
  DataGridRow,
  DataGridCell,
  TableColumnDefinition,
  createTableColumn,
  Text,
  Badge,
} from '@fluentui/react-components';
import { Filter20Regular } from '@fluentui/react-icons';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { DateRangePicker } from '../../components/common/DateRangePicker';
import { FilterPanel } from '../../components/common/FilterPanel';
import { SpendTrendChart } from '../../components/charts/SpendTrendChart';
import { CostBreakdownDonut } from '../../components/charts/CostBreakdownDonut';
import { ExportButton } from '../../components/common/ExportButton';
import { useCostData } from '../../hooks/useCostData';
import { useFilters } from '../../hooks/useFilters';
import { formatCurrency } from '../../utils/formatters';
import type { TopResource } from '../../types/cost.types';

type Granularity = 'Daily' | 'Weekly' | 'Monthly';

const resourceColumns: TableColumnDefinition<TopResource>[] = [
  createTableColumn<TopResource>({
    columnId: 'resourceName',
    compare: (a, b) => a.resourceName.localeCompare(b.resourceName),
    renderHeaderCell: () => 'Resource',
    renderCell: (item) => (
      <div>
        <Text weight="semibold" className="block text-sm truncate max-w-[280px]">
          {item.resourceName}
        </Text>
        <Text size={100} className="text-gray-400">{item.resourceType}</Text>
      </div>
    ),
  }),
  createTableColumn<TopResource>({
    columnId: 'resourceGroup',
    renderHeaderCell: () => 'Resource Group',
    renderCell: (item) => <Text size={200}>{item.resourceGroup ?? '—'}</Text>,
  }),
  createTableColumn<TopResource>({
    columnId: 'location',
    renderHeaderCell: () => 'Region',
    renderCell: (item) => <Text size={200}>{item.location ?? '—'}</Text>,
  }),
  createTableColumn<TopResource>({
    columnId: 'cost',
    compare: (a, b) => b.cost - a.cost,
    renderHeaderCell: () => 'Cost',
    renderCell: (item) => (
      <Text weight="semibold" className="font-mono">
        {formatCurrency(item.cost)}
      </Text>
    ),
  }),
  createTableColumn<TopResource>({
    columnId: 'percentage',
    compare: (a, b) => b.percentage - a.percentage,
    renderHeaderCell: () => 'Share',
    renderCell: (item) => (
      <Badge appearance="filled" color="informative">
        {item.percentage.toFixed(1)}%
      </Badge>
    ),
  }),
];

/**
 * Cost Explorer page — interactive cost analysis with filters, trend, breakdown, and data table.
 */
const CostExplorer: React.FC = () => {
  const [filterOpen, setFilterOpen] = useState(false);
  const [granularity, setGranularity] = useState<Granularity>('Daily');
  const { filter, setGroupBy } = useFilters();
  const { costTrend, breakdown, topResources, isLoading, hasError } = useCostData();

  return (
    <PageWrapper
      title="Cost Explorer"
      subtitle="Explore and analyze Azure costs interactively"
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Cost Explorer' }]}
      error={hasError ? 'Failed to load cost data.' : null}
      actions={
        <div className="flex items-center gap-2">
          <DateRangePicker compact />
          <Button
            icon={<Filter20Regular />}
            onClick={() => setFilterOpen(true)}
            appearance="secondary"
          >
            Filters
          </Button>
          <ExportButton />
        </div>
      }
    >
      <FilterPanel open={filterOpen} onClose={() => setFilterOpen(false)} />

      {/* Group By Selector */}
      <div className="flex items-center gap-3 mb-4">
        <Text size={200} className="text-gray-500 shrink-0">Group by:</Text>
        <Combobox
          value={filter.groupBy ?? 'ServiceName'}
          onOptionSelect={(_, d) => setGroupBy(d.optionValue)}
          size="small"
          style={{ maxWidth: 220 }}
        >
          {[
            ['ServiceName', 'Service'],
            ['ResourceGroupName', 'Resource Group'],
            ['ResourceLocation', 'Region'],
            ['MeterCategory', 'Meter Category'],
            ['SubscriptionId', 'Subscription'],
            ['ResourceId', 'Resource'],
          ].map(([val, label]) => (
            <Option key={val} value={val}>{label}</Option>
          ))}
        </Combobox>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <SpendTrendChart
            dataPoints={costTrend?.dataPoints ?? []}
            loading={isLoading}
            granularity={granularity}
            onGranularityChange={setGranularity}
            height={300}
          />
        </div>
        <div>
          <CostBreakdownDonut
            data={breakdown ?? []}
            loading={isLoading}
            dimension={filter.groupBy ?? 'Service'}
            height={300}
          />
        </div>
      </div>

      {/* Resource Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <Text weight="semibold">Top Cost Resources</Text>
          <ExportButton size="small" />
        </div>
        <DataGrid
          items={topResources ?? []}
          columns={resourceColumns}
          sortable
          getRowId={(item: TopResource) => item.resourceId}
          style={{ maxHeight: '400px', overflowY: 'auto' }}
        >
          <DataGridHeader>
            <DataGridRow>
              {({ renderHeaderCell }) => (
                <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
              )}
            </DataGridRow>
          </DataGridHeader>
          <DataGridBody<TopResource>>
            {({ item, rowId }) => (
              <DataGridRow<TopResource> key={rowId}>
                {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
              </DataGridRow>
            )}
          </DataGridBody>
        </DataGrid>
        {(!topResources || topResources.length === 0) && !isLoading && (
          <div className="text-center py-10 text-gray-400">
            No resource data for the selected period
          </div>
        )}
      </div>
    </PageWrapper>
  );
};

export default CostExplorer;
