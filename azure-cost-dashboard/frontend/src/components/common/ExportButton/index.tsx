import React, { useState, useCallback } from 'react';
import {
  Button,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Spinner,
} from '@fluentui/react-components';
import {
  ArrowDownload20Regular,
  DocumentTable20Regular,
  Code20Regular,
} from '@fluentui/react-icons';
import { useFilters } from '../../../hooks/useFilters';

type ExportFormat = 'csv' | 'xlsx' | 'json';

interface ExportButtonProps {
  /** Additional query params to include in the export request */
  extraParams?: Record<string, string>;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
}

/**
 * Split-button that posts to /api/v1/exports and triggers a file download.
 */
export const ExportButton: React.FC<ExportButtonProps> = ({
  extraParams = {},
  disabled = false,
  size = 'medium',
}) => {
  const { filter } = useFilters();
  const [loading, setLoading] = useState<ExportFormat | null>(null);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (loading) return;
      setLoading(format);

      try {
        const token = sessionStorage.getItem('msalAccessToken') ?? '';
        const body = {
          subscriptionId: filter.subscriptionId,
          startDate: filter.dateRange?.from,
          endDate: filter.dateRange?.to,
          granularity: 'Daily',
          groupBy: filter.groupBy ? [filter.groupBy] : undefined,
          metric: filter.metric ?? 'ActualCost',
          format,
          ...extraParams,
        };

        const response = await fetch('/api/v1/exports', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) throw new Error(`Export failed: ${response.statusText}`);

        const blob = await response.blob();
        const ext = format === 'xlsx' ? 'xlsx' : format;
        const filename = `cost-export-${new Date().toISOString().slice(0, 10)}.${ext}`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Export error:', err);
      } finally {
        setLoading(null);
      }
    },
    [filter, loading, extraParams]
  );

  return (
    <Menu>
      <MenuTrigger disableButtonEnhancement>
        <MenuButton
          icon={
            loading ? (
              <Spinner size="tiny" />
            ) : (
              <ArrowDownload20Regular />
            )
          }
          size={size}
          disabled={disabled || !!loading}
          appearance="secondary"
        >
          {loading ? `Exporting ${loading.toUpperCase()}…` : 'Export'}
        </MenuButton>
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          <MenuItem
            icon={<DocumentTable20Regular />}
            onClick={() => handleExport('csv')}
            disabled={!!loading}
          >
            Export as CSV
          </MenuItem>
          <MenuItem
            icon={<DocumentTable20Regular />}
            onClick={() => handleExport('xlsx')}
            disabled={!!loading}
          >
            Export as Excel (.xlsx)
          </MenuItem>
          <MenuItem
            icon={<Code20Regular />}
            onClick={() => handleExport('json')}
            disabled={!!loading}
          >
            Export as JSON
          </MenuItem>
        </MenuList>
      </MenuPopover>
    </Menu>
  );
};

export default ExportButton;
