import React from 'react';
import { Text, Breadcrumb, BreadcrumbItem, BreadcrumbDivider, Spinner } from '@fluentui/react-components';
import { ErrorCircle20Regular } from '@fluentui/react-icons';

export interface BreadcrumbEntry {
  label: string;
  href?: string;
}

interface PageWrapperProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbEntry[];
  loading?: boolean;
  error?: string | null;
  /** Slot for action buttons (rendered top-right of header) */
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Standard page layout wrapper — breadcrumb, title bar, action slot, content area.
 * Handles loading spinner and error state centrally.
 */
export const PageWrapper: React.FC<PageWrapperProps> = ({
  title,
  subtitle,
  breadcrumbs,
  loading = false,
  error,
  actions,
  children,
}) => {
  return (
    <main className="flex flex-col flex-1 min-h-0 bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumb className="mb-2">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.label}>
                {idx > 0 && <BreadcrumbDivider />}
                <BreadcrumbItem>
                  {crumb.href ? (
                    <a href={crumb.href} className="text-blue-600 hover:underline text-sm">
                      {crumb.label}
                    </a>
                  ) : (
                    <Text size={200} className="text-gray-500">
                      {crumb.label}
                    </Text>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            ))}
          </Breadcrumb>
        )}

        <div className="flex items-start justify-between">
          <div>
            <Text as="h1" size={600} weight="semibold" className="text-gray-900">
              {title}
            </Text>
            {subtitle && (
              <Text size={300} className="text-gray-500 mt-1 block">
                {subtitle}
              </Text>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 ml-4">{actions}</div>}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6">
        {error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ErrorCircle20Regular className="text-red-500 w-12 h-12 mb-4" style={{ fontSize: 48 }} />
            <Text size={500} weight="semibold" className="text-gray-700 mb-2">
              Something went wrong
            </Text>
            <Text size={300} className="text-gray-500 max-w-md">
              {error}
            </Text>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-24">
            <Spinner size="large" label="Loading data…" />
          </div>
        ) : (
          children
        )}
      </div>
    </main>
  );
};

export default PageWrapper;
