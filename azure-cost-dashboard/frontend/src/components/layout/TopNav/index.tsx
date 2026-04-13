import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Button,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Text,
  Badge,
  Tooltip,
  Combobox,
  Option,
} from '@fluentui/react-components';
import {
  Alert20Regular,
  ChevronDown20Regular,
  SignOut20Regular,
  Person20Regular,
} from '@fluentui/react-icons';
import { useAppSelector } from '../../../store/store';
import { useFilters } from '../../../hooks/useFilters';

// Safely consume MSAL hooks — when running without MsalProvider (demo mode)
// useMsal throws, so we provide a safe wrapper.
function useMsalSafe() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useMsal, useAccount } = require('@azure/msal-react') as typeof import('@azure/msal-react');
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { instance, accounts } = useMsal();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const account = useAccount(accounts[0] ?? {});
    return { instance, account, enabled: true };
  } catch {
    return { instance: null, account: null, enabled: false };
  }
}

// Subscription type used for the selector
interface Subscription {
  id: string;
  displayName: string;
}

interface TopNavProps {
  subscriptions?: Subscription[];
  onToggleSidebar?: () => void;
  alertCount?: number;
}

const isDemoMode = import.meta.env['VITE_DEMO_MODE'] === 'true';

/**
 * Top navigation bar — subscription selector, user profile menu, alert bell.
 */
export const TopNav: React.FC<TopNavProps> = ({
  subscriptions = [],
  onToggleSidebar,
  alertCount = 0,
}) => {
  const navigate = useNavigate();
  const { filter, setSubscriptionId } = useFilters();
  const [signingOut, setSigningOut] = useState(false);
  const { instance, account } = useMsalSafe();

  const displayName = isDemoMode ? 'Demo User' : (account?.name ?? account?.username ?? 'User');
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase();

  const handleSignOut = useCallback(async () => {
    if (!instance) return; // demo mode — no-op
    setSigningOut(true);
    await instance.logoutRedirect({ postLogoutRedirectUri: window.location.origin });
  }, [instance]);

  const handleSubscriptionChange = useCallback(
    (_: unknown, data: { optionValue?: string }) => {
      if (data.optionValue) {
        setSubscriptionId(data.optionValue);
      }
    },
    [setSubscriptionId]
  );

  const currentSubName =
    subscriptions.find((s) => s.id === filter.subscriptionId)?.displayName ??
    filter.subscriptionId ??
    'Select subscription';

  return (
    <header className="flex items-center justify-between h-14 px-4 bg-white border-b border-gray-200 shadow-sm z-20">
      {/* Left: sidebar toggle + breadcrumb area */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <Button appearance="subtle" size="small" onClick={onToggleSidebar} aria-label="Toggle sidebar">
            ☰
          </Button>
        )}

        {/* Subscription Selector */}
        {subscriptions.length > 0 && (
          <div className="flex items-center gap-2">
            <Text size={200} className="text-gray-500 hidden sm:block">
              Subscription:
            </Text>
            <Combobox
              placeholder="Select subscription"
              value={currentSubName}
              onOptionSelect={handleSubscriptionChange}
              size="small"
              style={{ minWidth: '200px', maxWidth: '320px' }}
            >
              {subscriptions.map((sub) => (
                <Option key={sub.id} value={sub.id}>
                  {sub.displayName}
                </Option>
              ))}
            </Combobox>
          </div>
        )}
      </div>

      {/* Right: alerts + user menu */}
      <div className="flex items-center gap-3">
        {/* Alert Bell */}
        <Tooltip content={`${alertCount} active alerts`} relationship="label">
          <div className="relative">
            <Button
              appearance="subtle"
              icon={<Alert20Regular />}
              aria-label="View alerts"
              onClick={() => navigate('/settings')}
            />
            {alertCount > 0 && (
              <Badge
                appearance="filled"
                color="danger"
                size="extra-small"
                className="absolute -top-1 -right-1"
              >
                {alertCount > 99 ? '99+' : alertCount}
              </Badge>
            )}
          </div>
        </Tooltip>

        {/* User Menu */}
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <MenuButton
              appearance="subtle"
              icon={<ChevronDown20Regular />}
            >
              <div className="flex items-center gap-2">
                <Avatar
                  name={displayName}
                  initials={initials}
                  size={24}
                  color="brand"
                />
                <Text size={200} className="hidden sm:block max-w-[150px] truncate">
                  {displayName}
                </Text>
              </div>
            </MenuButton>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem
                icon={<Person20Regular />}
                disabled
              >
                {account?.username ?? 'Unknown'}
              </MenuItem>
              <MenuItem
                icon={<SignOut20Regular />}
                onClick={handleSignOut}
                disabled={signingOut}
              >
                {signingOut ? 'Signing out…' : 'Sign Out'}
              </MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
      </div>
    </header>
  );
};

export default TopNav;
