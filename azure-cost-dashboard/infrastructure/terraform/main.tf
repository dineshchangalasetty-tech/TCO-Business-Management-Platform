terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.90"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.47"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "tfstatecostdashboard"
    container_name       = "tfstate"
    key                  = "azure-cost-dashboard.terraform.tfstate"
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = false
      recover_soft_deleted_key_vaults = true
    }
    resource_group {
      prevent_deletion_if_contains_resources = true
    }
  }
}

provider "azuread" {}

# ─── Local Values ─────────────────────────────────────────────────────────────
locals {
  name_prefix    = "${var.app_name}-${var.environment}"
  common_tags    = merge(var.tags, { environment = var.environment })
  sql_db_name    = "CostDashboardDB"
}

# ─── Resource Group ───────────────────────────────────────────────────────────
resource "azurerm_resource_group" "main" {
  name     = "${var.resource_group_name}-${var.environment}"
  location = var.location
  tags     = local.common_tags
}

# ─── Log Analytics Workspace ──────────────────────────────────────────────────
resource "azurerm_log_analytics_workspace" "main" {
  name                = "${local.name_prefix}-logs"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 90
  tags                = local.common_tags
}

# ─── Application Insights ─────────────────────────────────────────────────────
resource "azurerm_application_insights" "main" {
  name                = "${local.name_prefix}-appinsights"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  workspace_id        = azurerm_log_analytics_workspace.main.id
  application_type    = "web"
  tags                = local.common_tags
}

# ─── Key Vault ────────────────────────────────────────────────────────────────
resource "azurerm_key_vault" "main" {
  name                        = "${local.name_prefix}-kv"
  location                    = azurerm_resource_group.main.location
  resource_group_name         = azurerm_resource_group.main.name
  tenant_id                   = var.azure_tenant_id
  sku_name                    = "standard"
  soft_delete_retention_days  = 90
  purge_protection_enabled    = true
  enable_rbac_authorization   = true
  tags                        = local.common_tags

  network_acls {
    default_action = "Allow"
    bypass         = "AzureServices"
  }
}

# ─── App Service Plan ─────────────────────────────────────────────────────────
resource "azurerm_service_plan" "main" {
  name                = "${local.name_prefix}-asp"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  os_type             = "Linux"
  sku_name            = var.app_service_sku
  tags                = local.common_tags
}

# ─── Backend App Service (Node.js) ────────────────────────────────────────────
resource "azurerm_linux_web_app" "backend" {
  name                = "${local.name_prefix}-api"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  service_plan_id     = azurerm_service_plan.main.id
  https_only          = true
  tags                = local.common_tags

  identity {
    type = "SystemAssigned"
  }

  site_config {
    always_on        = true
    http2_enabled    = true
    minimum_tls_version = "1.2"

    application_stack {
      node_version = "20-lts"
    }

    cors {
      allowed_origins     = ["https://${local.name_prefix}-web.azurewebsites.net"]
      support_credentials = true
    }
  }

  app_settings = {
    APPLICATIONINSIGHTS_CONNECTION_STRING = azurerm_application_insights.main.connection_string
    ApplicationInsightsAgent_EXTENSION_VERSION = "~3"
    NODE_ENV                              = var.environment
    AZURE_KEY_VAULT_URL                   = azurerm_key_vault.main.vault_uri
    AZURE_TENANT_ID                       = "@Microsoft.KeyVault(VaultName=${azurerm_key_vault.main.name};SecretName=azure-tenant-id)"
    AZURE_CLIENT_ID                       = "@Microsoft.KeyVault(VaultName=${azurerm_key_vault.main.name};SecretName=azure-client-id)"
    AZURE_CLIENT_SECRET                   = "@Microsoft.KeyVault(VaultName=${azurerm_key_vault.main.name};SecretName=azure-client-secret)"
    DATABASE_URL                          = "@Microsoft.KeyVault(VaultName=${azurerm_key_vault.main.name};SecretName=database-connection-string)"
    REDIS_URL                             = "@Microsoft.KeyVault(VaultName=${azurerm_key_vault.main.name};SecretName=redis-connection-string)"
    WEBSITES_PORT                         = "3001"
  }

  logs {
    application_logs {
      file_system_level = "Information"
    }
    http_logs {
      file_system {
        retention_in_days = 7
        retention_in_mb   = 35
      }
    }
  }
}

# ─── Frontend App Service (React/Static) ──────────────────────────────────────
resource "azurerm_linux_web_app" "frontend" {
  name                = "${local.name_prefix}-web"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  service_plan_id     = azurerm_service_plan.main.id
  https_only          = true
  tags                = local.common_tags

  identity {
    type = "SystemAssigned"
  }

  site_config {
    always_on        = true
    http2_enabled    = true
    minimum_tls_version = "1.2"

    application_stack {
      node_version = "20-lts"
    }
  }

  app_settings = {
    APPLICATIONINSIGHTS_CONNECTION_STRING        = azurerm_application_insights.main.connection_string
    ApplicationInsightsAgent_EXTENSION_VERSION   = "~3"
    VITE_API_BASE_URL                            = "https://${local.name_prefix}-api.azurewebsites.net"
    VITE_AZURE_CLIENT_ID                         = var.azure_client_id
    VITE_AZURE_TENANT_ID                         = var.azure_tenant_id
  }
}

# ─── Azure SQL Server ─────────────────────────────────────────────────────────
resource "azurerm_mssql_server" "main" {
  name                         = "${local.name_prefix}-sqlsrv"
  resource_group_name          = azurerm_resource_group.main.name
  location                     = azurerm_resource_group.main.location
  version                      = "12.0"
  administrator_login          = var.sql_admin_username
  administrator_login_password = var.sql_admin_password
  minimum_tls_version          = "1.2"
  tags                         = local.common_tags

  azuread_administrator {
    login_username = "AzureAD Admin"
    object_id      = var.azure_client_id
  }
}

resource "azurerm_mssql_database" "main" {
  name                 = local.sql_db_name
  server_id            = azurerm_mssql_server.main.id
  collation            = "SQL_Latin1_General_CP1_CI_AS"
  sku_name             = var.environment == "prod" ? "S3" : "S1"
  max_size_gb          = var.environment == "prod" ? 250 : 32
  zone_redundant       = var.environment == "prod"
  geo_backup_enabled   = true
  tags                 = local.common_tags
}

resource "azurerm_mssql_firewall_rule" "allow_azure_services" {
  name             = "AllowAzureServices"
  server_id        = azurerm_mssql_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# ─── Azure Redis Cache ────────────────────────────────────────────────────────
resource "azurerm_redis_cache" "main" {
  name                = "${local.name_prefix}-redis"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  capacity            = var.redis_capacity
  family              = var.redis_family
  sku_name            = var.redis_sku
  enable_non_ssl_port = false
  minimum_tls_version = "1.2"
  tags                = local.common_tags

  redis_configuration {
    maxmemory_reserved = 10
    maxmemory_delta    = 2
    maxmemory_policy   = "allkeys-lru"
  }
}

# ─── Azure Blob Storage (Exports) ─────────────────────────────────────────────
resource "random_string" "storage_suffix" {
  length  = 6
  special = false
  upper   = false
}

resource "azurerm_storage_account" "exports" {
  name                     = "costexports${random_string.storage_suffix.result}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = var.environment == "prod" ? "GRS" : "LRS"
  min_tls_version          = "TLS1_2"
  allow_nested_items_to_be_public = false
  tags                     = local.common_tags
}

resource "azurerm_storage_container" "cost_exports" {
  name                  = "cost-exports"
  storage_account_name  = azurerm_storage_account.exports.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "cost_reports" {
  name                  = "cost-reports"
  storage_account_name  = azurerm_storage_account.exports.name
  container_access_type = "private"
}

# ─── Key Vault Secrets (RBAC) ────────────────────────────────────────────────
resource "azurerm_role_assignment" "backend_kv_secrets" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_linux_web_app.backend.identity[0].principal_id
}

resource "azurerm_role_assignment" "frontend_kv_secrets" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_linux_web_app.frontend.identity[0].principal_id
}

# ─── Action Group for Alerts ──────────────────────────────────────────────────
resource "azurerm_monitor_action_group" "main" {
  name                = "${local.name_prefix}-alerts-ag"
  resource_group_name = azurerm_resource_group.main.name
  short_name          = "costdash"
  tags                = local.common_tags

  email_receiver {
    name                    = "PlatformAdminEmail"
    email_address           = var.alert_email
    use_common_alert_schema = true
  }
}

# ─── App Service Availability Alert ───────────────────────────────────────────
resource "azurerm_monitor_metric_alert" "backend_availability" {
  name                = "${local.name_prefix}-api-availability"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [azurerm_linux_web_app.backend.id]
  description         = "Alert when backend API availability drops below 99%"
  severity            = 1
  frequency           = "PT5M"
  window_size         = "PT15M"
  tags                = local.common_tags

  criteria {
    metric_namespace = "Microsoft.Web/sites"
    metric_name      = "Availability"
    aggregation      = "Average"
    operator         = "LessThan"
    threshold        = 99
  }

  action {
    action_group_id = azurerm_monitor_action_group.main.id
  }
}
