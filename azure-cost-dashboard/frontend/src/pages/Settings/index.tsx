import React, { useState } from 'react';
import {
  Button,
  Text,
  Badge,
  Input,
  Field,
  Select,
  Divider,
  Switch,
  Spinner,
} from '@fluentui/react-components';
import {
  Settings20Regular,
  Add20Regular,
  Delete20Regular,
  HeartPulse20Regular,
} from '@fluentui/react-icons';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { useFilters } from '../../hooks/useFilters';

interface SubscriptionEntry {
  id: string;
  displayName: string;
  environment: 'Production' | 'Development' | 'Staging';
  enabled: boolean;
}

const MOCK_SUBS: SubscriptionEntry[] = [
  { id: 'sub-001', displayName: 'Production – Core', environment: 'Production', enabled: true },
  { id: 'sub-002', displayName: 'Development', environment: 'Development', enabled: true },
  { id: 'sub-003', displayName: 'Staging', environment: 'Staging', enabled: false },
];

interface ApiHealthResult {
  endpoint: string;
  status: 'healthy' | 'degraded' | 'down';
  latencyMs?: number;
}

const HEALTH_ENDPOINTS = [
  '/api/v1/health',
  '/api/v1/costs',
  '/api/v1/budgets',
  '/api/v1/forecasts',
];

/**
 * Settings page — subscription management, RBAC info, API health check.
 */
const Settings: React.FC = () => {
  const { filter, setSubscriptionId } = useFilters();
  const [subs, setSubs] = useState<SubscriptionEntry[]>(MOCK_SUBS);
  const [healthResults, setHealthResults] = useState<ApiHealthResult[]>([]);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [newSubId, setNewSubId] = useState('');
  const [newSubName, setNewSubName] = useState('');

  const handleHealthCheck = async () => {
    setCheckingHealth(true);
    const token = sessionStorage.getItem('msalAccessToken') ?? '';
    const results: ApiHealthResult[] = await Promise.all(
      HEALTH_ENDPOINTS.map(async (endpoint) => {
        const start = Date.now();
        try {
          const res = await fetch(endpoint, {
            headers: { Authorization: `Bearer ${token}` },
          });
          return {
            endpoint,
            status: res.ok ? 'healthy' : 'degraded',
            latencyMs: Date.now() - start,
          } as ApiHealthResult;
        } catch {
          return { endpoint, status: 'down', latencyMs: Date.now() - start } as ApiHealthResult;
        }
      })
    );
    setHealthResults(results);
    setCheckingHealth(false);
  };

  const toggleSub = (id: string) =>
    setSubs((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));

  const addSub = () => {
    if (!newSubId.trim() || !newSubName.trim()) return;
    setSubs((prev) => [
      ...prev,
      { id: newSubId, displayName: newSubName, environment: 'Development', enabled: true },
    ]);
    setNewSubId('');
    setNewSubName('');
  };

  const removeSub = (id: string) => setSubs((prev) => prev.filter((s) => s.id !== id));

  return (
    <PageWrapper
      title="Settings"
      subtitle="Manage subscriptions, roles, and API connectivity"
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Settings' }]}
    >
      {/* Subscription Management */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings20Regular className="text-blue-600" />
          <Text weight="semibold" size={400}>Subscription Management</Text>
        </div>

        <div className="flex flex-col gap-2 mb-4">
          {subs.map((sub) => (
            <div
              key={sub.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center gap-3">
                <Switch
                  checked={sub.enabled}
                  onChange={() => toggleSub(sub.id)}
                  aria-label={`${sub.enabled ? 'Disable' : 'Enable'} ${sub.displayName}`}
                />
                <div>
                  <Text weight="semibold" className="text-sm">{sub.displayName}</Text>
                  <Text size={100} className="text-gray-400 block">{sub.id}</Text>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  color={
                    sub.environment === 'Production'
                      ? 'danger'
                      : sub.environment === 'Staging'
                      ? 'warning'
                      : 'success'
                  }
                  appearance="tint"
                  size="small"
                >
                  {sub.environment}
                </Badge>
                {sub.enabled && (
                  <Button
                    appearance="subtle"
                    size="small"
                    onClick={() => setSubscriptionId(sub.id)}
                    disabled={filter.subscriptionId === sub.id}
                  >
                    {filter.subscriptionId === sub.id ? 'Active' : 'Set Active'}
                  </Button>
                )}
                <Button
                  icon={<Delete20Regular />}
                  appearance="subtle"
                  size="small"
                  onClick={() => removeSub(sub.id)}
                  aria-label="Remove subscription"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Add subscription */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Subscription ID">
            <Input
              value={newSubId}
              onChange={(_, d) => setNewSubId(d.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              size="small"
            />
          </Field>
          <Field label="Display Name">
            <Input
              value={newSubName}
              onChange={(_, d) => setNewSubName(d.value)}
              placeholder="e.g. My Subscription"
              size="small"
            />
          </Field>
          <Field label=" ">
            <Button
              icon={<Add20Regular />}
              appearance="secondary"
              onClick={addSub}
              size="small"
            >
              Add
            </Button>
          </Field>
        </div>
      </div>

      <Divider />

      {/* RBAC Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mt-6 mb-6">
        <Text weight="semibold" size={400} className="block mb-3">Access Control (RBAC)</Text>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              role: 'Viewer',
              color: 'informative',
              desc: 'Read-only access to cost data and dashboards.',
              azureRole: 'Cost-Dashboard.Viewer',
            },
            {
              role: 'Analyst',
              color: 'warning',
              desc: 'Can manage budgets and export reports.',
              azureRole: 'Cost-Dashboard.Analyst',
            },
            {
              role: 'Admin',
              color: 'danger',
              desc: 'Full access including subscription and user management.',
              azureRole: 'Cost-Dashboard.Admin',
            },
          ].map(({ role, color, desc, azureRole }) => (
            <div key={role} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <Badge color={color as 'informative' | 'warning' | 'danger'} appearance="filled" className="mb-2">
                {role}
              </Badge>
              <Text size={200} className="text-gray-600 block mb-1">{desc}</Text>
              <Text size={100} className="text-gray-400 font-mono">{azureRole}</Text>
            </div>
          ))}
        </div>
      </div>

      <Divider />

      {/* API Health Check */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <HeartPulse20Regular className="text-blue-600" />
            <Text weight="semibold" size={400}>API Health Check</Text>
          </div>
          <Button
            onClick={handleHealthCheck}
            disabled={checkingHealth}
            icon={checkingHealth ? <Spinner size="tiny" /> : undefined}
          >
            {checkingHealth ? 'Checking…' : 'Run Health Check'}
          </Button>
        </div>

        {healthResults.length > 0 && (
          <div className="flex flex-col gap-2">
            {healthResults.map((result) => (
              <div
                key={result.endpoint}
                className="flex items-center justify-between p-3 bg-gray-50 rounded border"
              >
                <Text size={200} className="font-mono">{result.endpoint}</Text>
                <div className="flex items-center gap-3">
                  {result.latencyMs !== undefined && (
                    <Text size={100} className="text-gray-400">{result.latencyMs}ms</Text>
                  )}
                  <Badge
                    color={
                      result.status === 'healthy'
                        ? 'success'
                        : result.status === 'degraded'
                        ? 'warning'
                        : 'danger'
                    }
                    appearance="filled"
                    size="small"
                  >
                    {result.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {healthResults.length === 0 && !checkingHealth && (
          <Text size={200} className="text-gray-400">
            Click "Run Health Check" to verify API connectivity.
          </Text>
        )}
      </div>
    </PageWrapper>
  );
};

export default Settings;
