import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Text, Tooltip } from '@fluentui/react-components';
import {
  Home20Regular,
  MoneyHand20Regular,
  DataTrending20Regular,
  ContentView20Regular,
  Savings20Regular,
  DocumentBulletList20Regular,
  Settings20Regular,
} from '@fluentui/react-icons';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    path: '/',
    label: 'Overview',
    icon: <Home20Regular />,
    description: 'Executive KPI dashboard',
  },
  {
    path: '/cost-explorer',
    label: 'Cost Explorer',
    icon: <DataTrending20Regular />,
    description: 'Explore and analyze costs interactively',
  },
  {
    path: '/budgets',
    label: 'Budgets',
    icon: <MoneyHand20Regular />,
    description: 'Manage budgets and alerts',
  },
  {
    path: '/resources',
    label: 'Resources',
    icon: <ContentView20Regular />,
    description: 'Top resource cost analysis',
  },
  {
    path: '/reservations',
    label: 'Reservations',
    icon: <Savings20Regular />,
    description: 'RI & savings plan utilization',
  },
  {
    path: '/reports',
    label: 'Reports',
    icon: <DocumentBulletList20Regular />,
    description: 'Scheduled and ad-hoc exports',
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: <Settings20Regular />,
    description: 'Subscriptions and user management',
  },
];

interface SidebarProps {
  collapsed?: boolean;
}

/**
 * Left navigation sidebar with collapsible support.
 * Uses react-router NavLink for active state highlighting.
 */
export const Sidebar: React.FC<SidebarProps> = ({ collapsed = false }) => {
  const location = useLocation();

  return (
    <aside
      className={`flex flex-col bg-gray-900 text-white transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-56'
      } min-h-screen py-4 shadow-xl z-10`}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo / App Name */}
      <div className="px-4 mb-6 flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center font-bold text-sm shrink-0">
          TCO
        </div>
        {!collapsed && (
          <Text weight="semibold" className="text-white text-sm leading-tight">
            Cost Management
          </Text>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex flex-col gap-1 px-2 flex-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);

          const linkContent = (
            <NavLink
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );

          return collapsed ? (
            <Tooltip key={item.path} content={item.label} relationship="label" positioning="after">
              {linkContent}
            </Tooltip>
          ) : (
            <React.Fragment key={item.path}>{linkContent}</React.Fragment>
          );
        })}
      </nav>

      {/* Version footer */}
      {!collapsed && (
        <div className="px-4 mt-4">
          <Text size={100} className="text-gray-600">
            v1.0.0 · Azure Cost Dashboard
          </Text>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
