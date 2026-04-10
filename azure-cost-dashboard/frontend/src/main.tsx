import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { PublicClientApplication, EventType } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { store } from './store/store';
import App from './App';
import './index.css';

const isDemoMode = import.meta.env['VITE_DEMO_MODE'] === 'true';

function renderApp(msalInstance?: PublicClientApplication) {
  const container = document.getElementById('root');
  if (!container) throw new Error('Root element #root not found in index.html');

  const root = ReactDOM.createRoot(container);

  const appTree = (
    <React.StrictMode>
      <Provider store={store}>
        <BrowserRouter>
          <FluentProvider theme={webLightTheme}>
            <App demoMode={isDemoMode} />
          </FluentProvider>
        </BrowserRouter>
      </Provider>
    </React.StrictMode>
  );

  root.render(
    msalInstance ? (
      <MsalProvider instance={msalInstance}>{appTree}</MsalProvider>
    ) : (
      appTree
    )
  );
}

if (isDemoMode) {
  // Demo mode — skip MSAL entirely, render immediately
  renderApp();
} else {
  // Production — initialize MSAL before rendering
  const tenantId = import.meta.env['VITE_AZURE_TENANT_ID'] as string;
  const clientId = import.meta.env['VITE_AZURE_CLIENT_ID'] as string;
  const msalConfig = {
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
      redirectUri: window.location.origin,
      postLogoutRedirectUri: window.location.origin,
      navigateToLoginRequestUrl: true,
    },
    cache: {
      cacheLocation: 'sessionStorage' as const,
      storeAuthStateInCookie: false,
    },
    system: {
      loggerOptions: {
        loggerCallback: (_level: number, message: string, containsPii: boolean) => {
          if (!containsPii && import.meta.env.DEV) {
            console.debug('[MSAL]', message);
          }
        },
      },
    },
  };

  const msalInstance = new PublicClientApplication(msalConfig);

  msalInstance.initialize().then(() => {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      msalInstance.setActiveAccount(accounts[0] ?? null);
    }

    msalInstance.addEventCallback((event) => {
      if (
        event.eventType === EventType.LOGIN_SUCCESS ||
        event.eventType === EventType.ACQUIRE_TOKEN_SUCCESS
      ) {
        const payload = event.payload as { account?: Parameters<typeof msalInstance.setActiveAccount>[0] };
        if (payload?.account) {
          msalInstance.setActiveAccount(payload.account);
        }
      }
    });

    renderApp(msalInstance);
  });
}
