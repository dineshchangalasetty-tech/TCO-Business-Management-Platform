import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';

/**
 * Azure service configuration.
 * Secrets are loaded from Azure Key Vault in production; fallback to env vars for development.
 */
export interface AzureConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  subscriptionIds: string[];
  costManagementApiVersion: string;
  consumptionApiVersion: string;
  managementBaseUrl: string;
  tokenScope: string;
}

let cachedConfig: AzureConfig | null = null;

/**
 * Load Azure configuration from environment variables or Azure Key Vault.
 * Uses DefaultAzureCredential for Key Vault access (works with Managed Identity in Azure).
 */
export async function loadAzureConfig(): Promise<AzureConfig> {
  if (cachedConfig) return cachedConfig;

  const keyVaultUrl = process.env['AZURE_KEY_VAULT_URL'];

  if (keyVaultUrl && process.env['NODE_ENV'] === 'production') {
    const credential = new DefaultAzureCredential();
    const secretClient = new SecretClient(keyVaultUrl, credential);

    const [tenantId, clientId, clientSecret] = await Promise.all([
      secretClient.getSecret('azure-tenant-id'),
      secretClient.getSecret('azure-client-id'),
      secretClient.getSecret('azure-client-secret'),
    ]);

    cachedConfig = {
      tenantId: tenantId.value ?? '',
      clientId: clientId.value ?? '',
      clientSecret: clientSecret.value ?? '',
      subscriptionIds: (process.env['AZURE_SUBSCRIPTION_IDS'] ?? '').split(',').filter(Boolean),
      costManagementApiVersion: '2023-11-01',
      consumptionApiVersion: '2023-05-01',
      managementBaseUrl: 'https://management.azure.com',
      tokenScope: 'https://management.azure.com/.default',
    };
  } else {
    // Development fallback — use environment variables directly
    cachedConfig = {
      tenantId: process.env['AZURE_TENANT_ID'] ?? '',
      clientId: process.env['AZURE_CLIENT_ID'] ?? '',
      clientSecret: process.env['AZURE_CLIENT_SECRET'] ?? '',
      subscriptionIds: (process.env['AZURE_SUBSCRIPTION_IDS'] ?? '').split(',').filter(Boolean),
      costManagementApiVersion: '2023-11-01',
      consumptionApiVersion: '2023-05-01',
      managementBaseUrl: 'https://management.azure.com',
      tokenScope: 'https://management.azure.com/.default',
    };
  }

  return cachedConfig;
}

/** Clear the config cache (used in tests). */
export function clearAzureConfigCache(): void {
  cachedConfig = null;
}
