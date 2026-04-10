import React, { useState } from 'react';
import {
  Button,
  Badge,
  Text,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Field,
  Input,
  Select,
  Spinner,
} from '@fluentui/react-components';
import { Add20Regular, Delete20Regular, Edit20Regular } from '@fluentui/react-icons';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { BudgetGauge } from '../../components/charts/BudgetGauge';
import { useBudgets } from '../../hooks/useBudgets';
import { useFilters } from '../../hooks/useFilters';
import { useCreateBudgetMutation, useDeleteBudgetMutation } from '../../api/budgetApi';
import { formatCurrency } from '../../utils/formatters';
import type { EnrichedBudget } from '../../types/budget.types';
import type { CreateBudgetFormData } from '../../types/budget.types';

function statusBadgeColor(status: EnrichedBudget['status']) {
  if (status === 'exceeded') return 'danger';
  if (status === 'at_risk') return 'warning';
  return 'success';
}

function statusLabel(status: EnrichedBudget['status']) {
  if (status === 'exceeded') return 'Over Budget';
  if (status === 'at_risk') return 'At Risk';
  return 'On Track';
}

const EMPTY_FORM: CreateBudgetFormData = {
  name: '',
  amount: 0,
  timeGrain: 'Monthly',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  subscriptionId: '',
  alertThresholds: [
    { threshold: 80, thresholdType: 'Actual', contactEmails: [], enabled: true },
    { threshold: 100, thresholdType: 'Actual', contactEmails: [], enabled: true },
  ],
};

/**
 * Budget Management page — list, creation dialog, gauge cards.
 */
const BudgetManagement: React.FC = () => {
  const { filter } = useFilters();
  const subscriptionId = filter.subscriptionId ?? '';
  const { budgets, summary, isLoading, hasError } = useBudgets(subscriptionId);
  const [createBudget, { isLoading: creating }] = useCreateBudgetMutation();
  const [deleteBudget, { isLoading: deleting }] = useDeleteBudgetMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<CreateBudgetFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!form.name || form.amount <= 0) {
      setFormError('Please provide a name and amount greater than 0.');
      return;
    }
    try {
      await createBudget(form).unwrap();
      setFormOpen(false);
      setForm(EMPTY_FORM);
      setFormError(null);
    } catch {
      setFormError('Failed to create budget. Please try again.');
    }
  };

  const handleDelete = async (budget: EnrichedBudget) => {
    if (!confirm(`Delete budget "${budget.name}"?`)) return;
    await deleteBudget({ subscriptionId, budgetName: budget.name });
  };

  return (
    <PageWrapper
      title="Budget Management"
      subtitle="Create and monitor cost budgets with threshold alerts"
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Budgets' }]}
      loading={isLoading && budgets.length === 0}
      error={hasError ? 'Failed to load budgets.' : null}
      actions={
        <Button
          icon={<Add20Regular />}
          appearance="primary"
          onClick={() => setFormOpen(true)}
        >
          New Budget
        </Button>
      }
    >
      {/* Summary row */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Budgets', value: summary.totalBudgets, color: 'text-gray-900' },
            { label: 'Over Budget', value: summary.overBudgetCount, color: 'text-red-600' },
            { label: 'At Risk', value: summary.atRiskCount, color: 'text-yellow-600' },
            { label: 'On Track', value: summary.onTrackCount, color: 'text-green-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-lg border border-gray-200 p-4 text-center shadow-sm">
              <Text size={700} weight="semibold" className={color}>{value}</Text>
              <Text size={200} className="text-gray-500 block">{label}</Text>
            </div>
          ))}
        </div>
      )}

      {/* Budget gauges */}
      {budgets.length === 0 && !isLoading ? (
        <div className="text-center py-20 text-gray-400">
          <Text size={400}>No budgets configured. Create one to track spending.</Text>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets.map((budget) => (
            <div key={budget.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 pt-4">
                <div>
                  <Text weight="semibold" className="block text-sm">{budget.name}</Text>
                  <Badge
                    color={statusBadgeColor(budget.status)}
                    appearance="filled"
                    size="small"
                    className="mt-1"
                  >
                    {statusLabel(budget.status)}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <Button
                    icon={<Edit20Regular />}
                    appearance="subtle"
                    size="small"
                    aria-label="Edit budget"
                  />
                  <Button
                    icon={<Delete20Regular />}
                    appearance="subtle"
                    size="small"
                    aria-label="Delete budget"
                    onClick={() => handleDelete(budget)}
                    disabled={deleting}
                  />
                </div>
              </div>
              <BudgetGauge
                utilizationPercent={budget.utilizationPercent}
                forecastedPercent={budget.forecastedUtilizationPercent}
                budgetName={`${budget.timeGrain}`}
                spent={formatCurrency(budget.currentSpend ?? 0)}
                limit={formatCurrency(budget.amount ?? 0)}
                height={200}
              />
            </div>
          ))}
        </div>
      )}

      {/* Create Budget Dialog */}
      <Dialog open={formOpen} onOpenChange={(_, d) => setFormOpen(d.open)}>
        <DialogSurface>
          <DialogTitle>Create New Budget</DialogTitle>
          <DialogBody>
            <DialogContent>
              <div className="flex flex-col gap-4">
                {formError && (
                  <Text className="text-red-600 text-sm">{formError}</Text>
                )}
                <Field label="Budget Name" required>
                  <Input
                    value={form.name}
                    onChange={(_, d) => setForm((f) => ({ ...f, name: d.value }))}
                    placeholder="e.g. Production Monthly"
                  />
                </Field>
                <Field label="Amount (USD)" required>
                  <Input
                    type="number"
                    value={String(form.amount)}
                    onChange={(_, d) => setForm((f) => ({ ...f, amount: Number(d.value) }))}
                    contentBefore="$"
                  />
                </Field>
                <Field label="Time Grain">
                  <Select
                    value={form.timeGrain}
                    onChange={(_, d) => setForm((f) => ({ ...f, timeGrain: d.value as CreateBudgetFormData['timeGrain'] }))}
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Annually">Annually</option>
                  </Select>
                </Field>
                <Field label="Start Date">
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(_, d) => setForm((f) => ({ ...f, startDate: d.value }))}
                  />
                </Field>
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button
                appearance="primary"
                onClick={handleCreate}
                disabled={creating}
                icon={creating ? <Spinner size="tiny" /> : undefined}
              >
                {creating ? 'Creating…' : 'Create Budget'}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </PageWrapper>
  );
};

export default BudgetManagement;
