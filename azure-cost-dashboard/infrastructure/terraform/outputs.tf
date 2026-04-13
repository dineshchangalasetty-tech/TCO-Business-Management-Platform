output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.main.name
}

output "backend_app_url" {
  description = "URL of the backend API App Service"
  value       = "https://${azurerm_linux_web_app.backend.default_hostname}"
}

output "frontend_app_url" {
  description = "URL of the frontend App Service"
  value       = "https://${azurerm_linux_web_app.frontend.default_hostname}"
}

output "sql_server_fqdn" {
  description = "Fully qualified domain name of the SQL Server"
  value       = azurerm_mssql_server.main.fully_qualified_domain_name
}

output "sql_database_name" {
  description = "Name of the SQL database"
  value       = azurerm_mssql_database.main.name
}

output "redis_hostname" {
  description = "Redis Cache hostname"
  value       = azurerm_redis_cache.main.hostname
  sensitive   = true
}

output "key_vault_uri" {
  description = "URI of the Azure Key Vault"
  value       = azurerm_key_vault.main.vault_uri
}

output "storage_account_name" {
  description = "Storage account name for cost exports"
  value       = azurerm_storage_account.exports.name
}

output "app_insights_connection_string" {
  description = "Application Insights connection string"
  value       = azurerm_application_insights.main.connection_string
  sensitive   = true
}

output "app_insights_instrumentation_key" {
  description = "Application Insights instrumentation key"
  value       = azurerm_application_insights.main.instrumentation_key
  sensitive   = true
}

output "log_analytics_workspace_id" {
  description = "Log Analytics Workspace ID"
  value       = azurerm_log_analytics_workspace.main.workspace_id
}
