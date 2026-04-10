import React, { useCallback } from 'react';
import {
  Dropdown,
  Option,
  Button,
  Divider,
  Text,
} from '@fluentui/react-components';
import { CalendarLtr20Regular } from '@fluentui/react-icons';
import { useFilters } from '../../../hooks/useFilters';
import type { DateRange } from '../../../types/api.types';

export type DatePreset =
  | 'last7days'
  | 'last30days'
  | 'lastMonth'
  | 'last3months'
  | 'last6months'
  | 'ytd'
  | 'last12months';

const PRESET_LABELS: Record<DatePreset, string> = {
  last7days: 'Last 7 Days',
  last30days: 'Last 30 Days',
  lastMonth: 'Last Month',
  last3months: 'Last 3 Months',
  last6months: 'Last 6 Months',
  ytd: 'Year to Date',
  last12months: 'Last 12 Months',
};

function presetToDateRange(preset: DatePreset): DateRange {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);

  const startMap: Record<DatePreset, Date> = {
    last7days: new Date(Date.now() - 7 * 86400000),
    last30days: new Date(Date.now() - 30 * 86400000),
    lastMonth: (() => {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d;
    })(),
    last3months: new Date(Date.now() - 90 * 86400000),
    last6months: new Date(Date.now() - 180 * 86400000),
    ytd: new Date(now.getFullYear(), 0, 1),
    last12months: new Date(Date.now() - 365 * 86400000),
  };

  return { from: startMap[preset].toISOString().slice(0, 10), to: end };
}

const PRESET_ORDER: DatePreset[] = [
  'last7days',
  'last30days',
  'lastMonth',
  'last3months',
  'last6months',
  'ytd',
  'last12months',
];

interface DateRangePickerProps {
  /** Compact mode renders just a dropdown, otherwise shows buttons */
  compact?: boolean;
}

/**
 * Date range selector with quick preset buttons and a dropdown.
 * Dispatches selected range directly to filterSlice via useFilters.
 */
export const DateRangePicker: React.FC<DateRangePickerProps> = ({ compact = false }) => {
  const { dateRange, setDateRange } = useFilters();
  const [activePreset, setActivePreset] = React.useState<DatePreset | null>('last30days');

  const handlePreset = useCallback(
    (preset: DatePreset) => {
      setActivePreset(preset);
      setDateRange(presetToDateRange(preset));
    },
    [setDateRange]
  );

  const handleDropdownChange = useCallback(
    (_: unknown, data: { optionValue?: string }) => {
      if (data.optionValue) {
        handlePreset(data.optionValue as DatePreset);
      }
    },
    [handlePreset]
  );

  if (compact) {
    return (
      <Dropdown
        placeholder="Select date range"
        value={activePreset ? PRESET_LABELS[activePreset] : 'Custom'}
        onOptionSelect={handleDropdownChange}
        button={
          <span>
            <CalendarLtr20Regular /> {activePreset ? PRESET_LABELS[activePreset] : 'Select range'}
          </span>
        }
      >
        {PRESET_ORDER.map((preset) => (
          <Option key={preset} value={preset}>
            {PRESET_LABELS[preset]}
          </Option>
        ))}
      </Dropdown>
    );
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <CalendarLtr20Regular className="text-gray-500" />
      {PRESET_ORDER.map((preset, idx) => (
        <React.Fragment key={preset}>
          {idx === 3 && <Divider vertical style={{ height: '24px' }} />}
          <Button
            appearance={activePreset === preset ? 'primary' : 'subtle'}
            size="small"
            onClick={() => handlePreset(preset)}
            aria-pressed={activePreset === preset}
          >
            {PRESET_LABELS[preset]}
          </Button>
        </React.Fragment>
      ))}

      {dateRange && (
        <Text size={100} className="text-gray-400 ml-2">
          {dateRange.from} → {dateRange.to}
        </Text>
      )}
    </div>
  );
};

export default DateRangePicker;
