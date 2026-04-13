import React, { useState } from 'react';
import {
  Button,
  Text,
  Badge,
  Select,
  Field,
  Input,
  Divider,
  Switch,
  Spinner,
} from '@fluentui/react-components';
import { DocumentAdd20Regular, ArrowDownload20Regular, History20Regular } from '@fluentui/react-icons';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { ExportButton } from '../../components/common/ExportButton';
import { DateRangePicker } from '../../components/common/DateRangePicker';
import { useFilters } from '../../hooks/useFilters';

interface ScheduledReport {
  id: string;
  name: string;
  frequency: 'Daily' | 'Weekly' | 'Monthly';
  format: 'csv' | 'xlsx' | 'json';
  recipients: string[];
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
}

// In a real app this would come from an API
const MOCK_SCHEDULED: ScheduledReport[] = [
  {
    id: '1',
    name: 'Monthly Cost Summary',
    frequency: 'Monthly',
    format: 'xlsx',
    recipients: ['finops@company.com'],
    enabled: true,
    lastRun: '2024-12-01',
    nextRun: '2025-01-01',
  },
  {
    id: '2',
    name: 'Weekly Resource Report',
    frequency: 'Weekly',
    format: 'csv',
    recipients: ['devops@company.com', 'manager@company.com'],
    enabled: true,
    lastRun: '2024-12-16',
    nextRun: '2024-12-23',
  },
];

/**
 * Reports page — scheduled reports and one-time ad-hoc exports.
 */
const Reports: React.FC = () => {
  const { filter } = useFilters();
  const [scheduled, setScheduled] = useState<ScheduledReport[]>(MOCK_SCHEDULED);
  const [newName, setNewName] = useState('');
  const [newFrequency, setNewFrequency] = useState<ScheduledReport['frequency']>('Monthly');
  const [newFormat, setNewFormat] = useState<ScheduledReport['format']>('xlsx');
  const [newRecipients, setNewRecipients] = useState('');

  const handleCreate = () => {
    if (!newName.trim()) return;
    setScheduled((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: newName,
        frequency: newFrequency,
        format: newFormat,
        recipients: newRecipients.split(',').map((e) => e.trim()).filter(Boolean),
        enabled: true,
        nextRun: 'Pending',
      },
    ]);
    setNewName('');
    setNewRecipients('');
  };

  const toggleEnabled = (id: string) => {
    setScheduled((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  return (
    <PageWrapper
      title="Reports"
      subtitle="Configure scheduled reports and export ad-hoc cost data"
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Reports' }]}
      actions={<DateRangePicker compact />}
    >
      {/* Ad-hoc export */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-4">
          <ArrowDownload20Regular className="text-blue-600" />
          <Text weight="semibold" size={400}>One-Time Export</Text>
        </div>
        <Text size={200} className="text-gray-500 mb-4 block">
          Export cost data for the currently selected subscription and date range.
        </Text>
        <div className="flex items-center gap-3 flex-wrap">
          <DateRangePicker />
          <ExportButton size="medium" />
        </div>
      </div>

      <Divider />

      {/* Scheduled reports list */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-4">
          <History20Regular className="text-blue-600" />
          <Text weight="semibold" size={400}>Scheduled Reports</Text>
        </div>

        <div className="flex flex-col gap-3 mb-6">
          {scheduled.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-lg border border-gray-200 px-4 py-3 shadow-sm flex items-center justify-between"
            >
              <div className="flex items-start gap-4">
                <Switch
                  checked={report.enabled}
                  onChange={() => toggleEnabled(report.id)}
                  aria-label={`${report.enabled ? 'Disable' : 'Enable'} ${report.name}`}
                />
                <div>
                  <Text weight="semibold" className="block">{report.name}</Text>
                  <Text size={100} className="text-gray-400">
                    {report.frequency} · {report.format.toUpperCase()} ·{' '}
                    {report.recipients.join(', ')}
                  </Text>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {report.lastRun && (
                  <Text size={100} className="text-gray-400 hidden sm:block">
                    Last run: {report.lastRun}
                  </Text>
                )}
                <Badge
                  color={report.enabled ? 'success' : 'subtle'}
                  appearance="filled"
                  size="small"
                >
                  {report.enabled ? 'Active' : 'Paused'}
                </Badge>
                {report.nextRun && (
                  <Text size={100} className="text-gray-400 hidden md:block">
                    Next: {report.nextRun}
                  </Text>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* New scheduled report form */}
        <div className="bg-gray-50 rounded-lg border border-dashed border-gray-300 p-5">
          <div className="flex items-center gap-2 mb-4">
            <DocumentAdd20Regular className="text-gray-500" />
            <Text weight="semibold">New Scheduled Report</Text>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="Report Name">
              <Input
                value={newName}
                onChange={(_, d) => setNewName(d.value)}
                placeholder="e.g. Monthly Cost Report"
              />
            </Field>
            <Field label="Frequency">
              <Select
                value={newFrequency}
                onChange={(_, d) => setNewFrequency(d.value as ScheduledReport['frequency'])}
              >
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
              </Select>
            </Field>
            <Field label="Format">
              <Select
                value={newFormat}
                onChange={(_, d) => setNewFormat(d.value as ScheduledReport['format'])}
              >
                <option value="xlsx">Excel (.xlsx)</option>
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </Select>
            </Field>
            <Field label="Recipients (comma-separated)">
              <Input
                value={newRecipients}
                onChange={(_, d) => setNewRecipients(d.value)}
                placeholder="email@company.com"
              />
            </Field>
          </div>
          <Button
            appearance="primary"
            onClick={handleCreate}
            className="mt-4"
            disabled={!newName.trim()}
          >
            Create Scheduled Report
          </Button>
        </div>
      </div>
    </PageWrapper>
  );
};

export default Reports;
