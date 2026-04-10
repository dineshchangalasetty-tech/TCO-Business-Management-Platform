variable "resource_group_name" {
  description = "Name of the Azure Resource Group"
  type        = string
  default     = "rg-azure-cost-dashboard"
}

variable "location" {
  description = "Azure region for all resources"
  type        = string
  default     = "East US"
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "app_name" {
  description = "Base name for all application resources"
  type        = string
  default     = "azure-cost-dashboard"
}

variable "app_service_sku" {
  description = "App Service Plan SKU (e.g. B1, P1v3, P2v3)"
  type        = string
  default     = "P1v3"
}

variable "sql_admin_username" {
  description = "SQL Server administrator login username"
  type        = string
  sensitive   = true
}

variable "sql_admin_password" {
  description = "SQL Server administrator login password"
  type        = string
  sensitive   = true
}

variable "redis_capacity" {
  description = "Redis Cache capacity (0=250MB, 1=1GB, 2=2.5GB)"
  type        = number
  default     = 1
}

variable "redis_family" {
  description = "Redis Cache family (C=Basic/Standard, P=Premium)"
  type        = string
  default     = "C"
}

variable "redis_sku" {
  description = "Redis Cache SKU (Basic, Standard, Premium)"
  type        = string
  default     = "Standard"
}

variable "azure_tenant_id" {
  description = "Azure AD Tenant ID"
  type        = string
  sensitive   = true
}

variable "azure_client_id" {
  description = "Azure AD Application (Client) ID for MSAL authentication"
  type        = string
  sensitive   = true
}

variable "azure_subscription_ids" {
  description = "List of Azure Subscription IDs to monitor"
  type        = list(string)
}

variable "alert_email" {
  description = "Email address for infrastructure alerts"
  type        = string
}

variable "tags" {
  description = "Common tags applied to all resources"
  type        = map(string)
  default = {
    project     = "azure-cost-dashboard"
    managed_by  = "terraform"
    costcenter  = "IT-FinOps"
  }
}
