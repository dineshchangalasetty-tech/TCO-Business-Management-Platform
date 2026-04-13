import React, { useCallback } from 'react';
import {
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
  Button,
  Divider,
  Text,
  Combobox,
  Option,
  ToggleButton,
} from '@fluentui/react-components';
import { Filter20Regular, Dismiss20Regular } from '@fluentui/react-icons';
import { useFilters } from '../../../hooks/useFilters';

const GROUP_BY_OPTIONS = [
  { key: 'ServiceName', label: 'Service Name' },
  { key: 'ResourceGroupName', label: 'Resource Group' },
  { key: 'ResourceLocation', label: 'Region' },
  { key: 'SubscriptionId', label: 'Subscription' },
  { key: 'ResourceId', label: 'Resource' },
  { key: 'TagKey', label: 'Tag' },
  { key: 'MeterCategory', label: 'Meter Category' },
] as const;

type GroupByKey = (typeof GROUP_BY_OPTIONS)[number]['key'];

const AZURE_REGIONS = [
  'eastus', 'westus', 'centralus', 'northeurope', 'westeurope',
  'australiaeast', 'southeastasia', 'uksouth', 'japaneast', 'canadacentral',
];

interface FilterPanelProps {
  /** Whether the panel is open (when used as drawer) */
  open: boolean;
  onClose: () => void;
  /** If false, renders inline instead of as a drawer */
  asDrawer?: boolean;
}

/**
 * Filter panel — subscription, groupBy, metric, service, region.
 * Dispatches to filterSlice via useFilters hook.
 */
export const FilterPanel: React.FC<FilterPanelProps> = ({
  open,
  onClose,
  asDrawer = true,
}) => {
  const {
    filter,
    setGroupBy,
    setMetric,
    setServiceNames,
    setRegions,
    setResourceGroups,
  } = useFilters();

  const handleGroupByChange = useCallback(
    (_: unknown, data: { optionValue?: string }) => {
      setGroupBy(data.optionValue as GroupByKey | undefined);
    },
    [setGroupBy]
  );

  const handleRegionChange = useCallback(
    (_: unknown, data: { selectedOptions: string[] }) => {
      setRegions(data.selectedOptions.length ? data.selectedOptions : undefined);
    },
    [setRegions]
  );

  const content = (
    <div className="flex flex-col gap-4 p-2">
      {/* Metric Toggle */}
      <section>
        <Text size={200} weight="semibold" className="block mb-2 text-gray-600 uppercase tracking-wide">
          Cost Metric
        </Text>
        <div className="flex gap-2">
          <ToggleButton
            checked={filter.metric === 'ActualCost'}
            onClick={() => setMetric('ActualCost')}
            size="small"
          >
            Actual Cost
          </ToggleButton>
          <ToggleButton
            checked={filter.metric === 'AmortizedCost'}
            onClick={() => setMetric('AmortizedCost')}
            size="small"
          >
            Amortized Cost
          </ToggleButton>
        </div>
        <Text size={100} className="text-gray-400 mt-1">
          {filter.metric === 'AmortizedCost'
            ? 'Spreads reservation costs over the usage period'
            : 'Pay-as-you-go costs without reservation spreading'}
        </Text>
      </section>

      <Divider />

      {/* Group By */}
      <section>
        <Text size={200} weight="semibold" className="block mb-2 text-gray-600 uppercase tracking-wide">
          Group By
        </Text>
        <Combobox
          placeholder="Select dimension"
          value={
            GROUP_BY_OPTIONS.find((o) => o.key === filter.groupBy)?.label ?? ''
          }
          onOptionSelect={handleGroupByChange}
          style={{ width: '100%' }}
        >
          {GROUP_BY_OPTIONS.map((opt) => (
            <Option key={opt.key} value={opt.key}>
              {opt.label}
            </Option>
          ))}
        </Combobox>
      </section>

      <Divider />

      {/* Region Filter */}
      <section>
        <Text size={200} weight="semibold" className="block mb-2 text-gray-600 uppercase tracking-wide">
          Regions
        </Text>
        <Combobox
          multiselect
          placeholder="All regions"
          selectedOptions={filter.regions ?? []}
          onOptionSelect={handleRegionChange}
          style={{ width: '100%' }}
        >
          {AZURE_REGIONS.map((region) => (
            <Option key={region} value={region}>
              {region}
            </Option>
          ))}
        </Combobox>
        {(filter.regions?.length ?? 0) > 0 && (
          <Button
            appearance="subtle"
            size="small"
            onClick={() => setRegions(undefined)}
            className="mt-1"
          >
            Clear regions
          </Button>
        )}
      </section>

      <Divider />

      {/* Reset */}
      <Button
        appearance="secondary"
        onClick={() => {
          setGroupBy(undefined);
          setMetric('ActualCost');
          setServiceNames(undefined);
          setRegions(undefined);
          setResourceGroups(undefined);
        }}
      >
        Reset All Filters
      </Button>
    </div>
  );

  if (!asDrawer) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter20Regular className="text-blue-600" />
            <Text weight="semibold">Filters</Text>
          </div>
        </div>
        {content}
      </div>
    );
  }

  return (
    <Drawer type="overlay" open={open} onOpenChange={onClose} position="end" size="small">
      <DrawerHeader>
        <DrawerHeaderTitle
          action={
            <Button
              appearance="subtle"
              aria-label="Close filter panel"
              icon={<Dismiss20Regular />}
              onClick={onClose}
            />
          }
        >
          <Filter20Regular className="mr-2" /> Filters
        </DrawerHeaderTitle>
      </DrawerHeader>
      <DrawerBody>{content}</DrawerBody>
    </Drawer>
  );
};

export default FilterPanel;
