import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import {
  useIsAuthenticated,
  AuthenticatedTemplate,
  UnauthenticatedTemplate,
  useMsal,
} from '@azure/msal-react';
import { Spinner, Text, Button } from '@fluentui/react-components';
import { Sidebar } from './components/layout/Sidebar';
import { TopNav } from './components/layout/TopNav';

// Lazy-load all pages for code splitting (each page is its own chunk via Vite)
const Overview = lazy(() => import('./pages/Overview'));
const CostExplorer = lazy(() => import('./pages/CostExplorer'));
const BudgetManagement = lazy(() => import('./pages/BudgetManagement'));
const ResourceAnalysis = lazy(() => import('./pages/ResourceAnalysis'));
const Reservations = lazy(() => import('./pages/Reservations'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));

const loginRequest = {
  scopes: [
    `api://${import.meta.env['VITE_AZURE_CLIENT_ID']}/Cost.Read`,
  ],
};

/** Full-page loading spinner shown while lazy pages or auth initializes */
function PageLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
      <Spinner size="large" />
      <Text size={300} className="text-gray-500">Loading Azure Cost Dashboard…</Text>
    </div>
  );
}

/** Login prompt shown for unauthenticated users */
function LoginPage() {
  const { instance } = useMsal();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gray-50">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
          TCO
        </div>
        <Text as="h1" size={800} weight="bold" className="text-gray-900 block mb-2">
          Azure Cost Dashboard
        </Text>
        <Text size={300} className="text-gray-500 block mb-6">
          Sign in with your Microsoft account to view and manage your Azure costs.
        </Text>
        <Button
          appearance="primary"
          size="large"
          onClick={() => instance.loginRedirect(loginRequest)}
        >
          Sign in with Microsoft
        </Button>
      </div>
    </div>
  );
}

/** Main app shell — sidebar + top nav + routed page content */
function AppShell({ demoMode = false }: { demoMode?: boolean }) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  const demoSubscriptions = demoMode ? [
    { id: 'demo-sub-00000000-0000-0000-0000-000000000000', displayName: 'Contoso Production (Demo)' },
    { id: 'demo-sub-dev-00000000-0000-0000-0000-000000000001', displayName: 'Contoso Development (Demo)' },
  ] : [];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar collapsed={sidebarCollapsed} />
      <div className="flex flex-col flex-1 min-w-0">
        <TopNav
          onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
          subscriptions={demoSubscriptions}
        />
        <div className="flex-1 overflow-auto">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/cost-explorer" element={<CostExplorer />} />
              <Route path="/budgets" element={<BudgetManagement />} />
              <Route path="/resources" element={<ResourceAnalysis />} />
              <Route path="/reservations" element={<Reservations />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </div>
  );
}

/**
 * Root App component — handles auth gates with MSAL templates.
 * In demo mode (VITE_DEMO_MODE=true) the MSAL wrapper is absent,
 * so we render the AppShell directly without auth checks.
 */
function App({ demoMode = false }: { demoMode?: boolean }) {
  if (demoMode) {
    // Demo: skip auth, render app shell directly
    return <AppShell demoMode />;
  }

  return (
    <>
      <AuthenticatedTemplate>
        <AppShell />
      </AuthenticatedTemplate>
      <UnauthenticatedTemplate>
        <Suspense fallback={<PageLoader />}>
          <LoginPage />
        </Suspense>
      </UnauthenticatedTemplate>
    </>
  );
}

export default App;
