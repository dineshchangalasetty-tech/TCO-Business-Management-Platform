@description('Azure region for all resources')
param location string = resourceGroup().location

@description('Environment name (dev, staging, prod)')
@allowed(['dev', 'staging', 'prod'])
param environment string

@description('Base application name')
param appName string = 'azure-cost-dashboard'

@description('Azure AD Tenant ID')
param tenantId string

@description('Azure AD Client ID for MSAL')
param clientId string

@description('SQL administrator username')
@secure()
param sqlAdminUsername string

@description('SQL administrator password')
@secure()
param sqlAdminPassword string

@description('Alert notification email')
param alertEmail string

// ─── Variables ────────────────────────────────────────────────────────────────
var namePrefix = '${appName}-${environment}'
var commonTags = {
  project: 'azure-cost-dashboard'
  environment: environment
  managedBy: 'bicep'
  costcenter: 'IT-FinOps'
}

// ─── Log Analytics Workspace ──────────────────────────────────────────────────
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${namePrefix}-logs'
  location: location
  tags: commonTags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 90
  }
}

// ─── Application Insights ─────────────────────────────────────────────────────
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${namePrefix}-appinsights'
  location: location
  kind: 'web'
  tags: commonTags
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
    RetentionInDays: 90
  }
}

// ─── Key Vault ────────────────────────────────────────────────────────────────
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: '${namePrefix}-kv'
  location: location
  tags: commonTags
  properties: {
    tenantId: tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true
  }
}

// ─── App Service Plan ─────────────────────────────────────────────────────────
resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: '${namePrefix}-asp'
  location: location
  tags: commonTags
  kind: 'linux'
  sku: {
    name: environment == 'prod' ? 'P1v3' : 'B2'
    tier: environment == 'prod' ? 'PremiumV3' : 'Basic'
  }
  properties: {
    reserved: true
  }
}

// ─── Backend App Service ──────────────────────────────────────────────────────
resource backendApp 'Microsoft.Web/sites@2023-01-01' = {
  name: '${namePrefix}-api'
  location: location
  tags: commonTags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      alwaysOn: true
      http20Enabled: true
      minTlsVersion: '1.2'
      appSettings: [
        { name: 'NODE_ENV', value: environment }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsights.properties.ConnectionString }
        { name: 'AZURE_KEY_VAULT_URL', value: keyVault.properties.vaultUri }
        { name: 'WEBSITES_PORT', value: '3001' }
      ]
      cors: {
        allowedOrigins: ['https://${namePrefix}-web.azurewebsites.net']
        supportCredentials: true
      }
    }
  }
}

// ─── Frontend App Service ─────────────────────────────────────────────────────
resource frontendApp 'Microsoft.Web/sites@2023-01-01' = {
  name: '${namePrefix}-web'
  location: location
  tags: commonTags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      alwaysOn: true
      http20Enabled: true
      minTlsVersion: '1.2'
      appSettings: [
        { name: 'VITE_API_BASE_URL', value: 'https://${namePrefix}-api.azurewebsites.net' }
        { name: 'VITE_AZURE_CLIENT_ID', value: clientId }
        { name: 'VITE_AZURE_TENANT_ID', value: tenantId }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsights.properties.ConnectionString }
      ]
    }
  }
}

// ─── SQL Server & Database ────────────────────────────────────────────────────
resource sqlServer 'Microsoft.Sql/servers@2023-05-01-preview' = {
  name: '${namePrefix}-sqlsrv'
  location: location
  tags: commonTags
  properties: {
    administratorLogin: sqlAdminUsername
    administratorLoginPassword: sqlAdminPassword
    minimalTlsVersion: '1.2'
  }
}

resource sqlDatabase 'Microsoft.Sql/servers/databases@2023-05-01-preview' = {
  parent: sqlServer
  name: 'CostDashboardDB'
  location: location
  tags: commonTags
  sku: {
    name: environment == 'prod' ? 'S3' : 'S1'
    tier: 'Standard'
  }
  properties: {
    collation: 'SQL_Latin1_General_CP1_CI_AS'
    maxSizeBytes: environment == 'prod' ? 268435456000 : 32212254720
  }
}

resource sqlFirewallAzureServices 'Microsoft.Sql/servers/firewallRules@2023-05-01-preview' = {
  parent: sqlServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// ─── Redis Cache ──────────────────────────────────────────────────────────────
resource redisCache 'Microsoft.Cache/redis@2023-08-01' = {
  name: '${namePrefix}-redis'
  location: location
  tags: commonTags
  properties: {
    sku: {
      name: 'Standard'
      family: 'C'
      capacity: 1
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
    redisConfiguration: {
      'maxmemory-policy': 'allkeys-lru'
    }
  }
}

// ─── Storage Account for Exports ──────────────────────────────────────────────
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: 'costexports${uniqueString(resourceGroup().id)}'
  location: location
  tags: commonTags
  sku: {
    name: environment == 'prod' ? 'Standard_GRS' : 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}

resource exportContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: '${storageAccount.name}/default/cost-exports'
  properties: {
    publicAccess: 'None'
  }
}

// ─── RBAC: Backend → Key Vault ────────────────────────────────────────────────
resource backendKvRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, backendApp.id, 'KeyVaultSecretsUser')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
    principalId: backendApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// ─── Outputs ──────────────────────────────────────────────────────────────────
output backendAppUrl string = 'https://${backendApp.properties.defaultHostName}'
output frontendAppUrl string = 'https://${frontendApp.properties.defaultHostName}'
output keyVaultUri string = keyVault.properties.vaultUri
output appInsightsConnectionString string = appInsights.properties.ConnectionString
output sqlServerFqdn string = sqlServer.properties.fullyQualifiedDomainName
output storageAccountName string = storageAccount.name
