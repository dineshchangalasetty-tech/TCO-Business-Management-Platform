# Assumptions & Design Decisions

## Authentication & Authorization

1. **Azure AD App Registration** — The deployment assumes a single Azure AD App Registration with:
   - App roles defined: `Cost-Dashboard.Admin`, `Cost-Dashboard.Analyst`, `Cost-Dashboard.Viewer`
   - Client credentials flow (client_id + client_secret) for backend → Azure Cost Management API
   - Implicit/auth-code flow for frontend → MSAL browser

2. **MSAL Token Storage** — Access tokens are stored in `sessionStorage` (not `localStorage`) per MSAL security best practices. Tokens expire on browser session close.

3. **JWKS Caching** — Azure AD JSON Web Key Sets are cached in Redis for 1 hour to avoid per-request lookups.

4. **Role Hierarchy** — Admin ≥ Analyst ≥ Viewer. Any role with higher privilege can access lower-privilege endpoints.

## Azure Cost Management API

5. **API Version** — `2023-11-01` for Cost Management (query endpoint). `2023-05-01` for Consumption API (reservation utilization).

6. **Subscription Scope** — All cost queries are scoped to `/subscriptions/{subscriptionId}/`. Management group or billing account scope is not implemented in v1.

7. **Currency** — All amounts are returned in the subscription's billing currency. USD is assumed as default for display formatting. Multi-currency support is a v2 enhancement.

8. **Reservation Data** — Reservation utilization data from the Azure Consumption API (`/reservationSummaries`) is aggregated at the monthly grain. Daily/weekly granularity is available but not exposed in v1.

9. **Forecast** — The Azure Cost Management Forecast API returns 30-day ahead predictions by default. 60/90-day forecasts use the same endpoint with extended date range. Accuracy degrades beyond 30 days.

10. **Rate Limits** — Azure Cost Management API has per-subscription throttling (approx. 800 requests/hour). The Redis cache with 15-minute TTL is critical for staying within limits under heavy usage.

## Backend

11. **Redis Graceful Degradation** — If Redis is unavailable, the backend continues serving requests without caching. This increases Azure API call frequency but prevents outages.

12. **Connection Pool** — MSSQL pool is configured: max 10, min 2 connections. Increase `DB_POOL_MAX` env var for high-concurrency environments.

13. **Export File Size** — Excel exports use ExcelJS streaming for files > 10,000 rows. CSV exports are built in-memory. Large exports (> 100MB) should be offloaded to Azure Blob Storage in v2.

14. **Audit Logging** — All write operations (budget create/update/delete) are logged to Azure SQL `AuditLog` table with user identity, timestamp, and before/after state.

## Frontend

15. **Code Splitting** — Each page is a separate Vite chunk loaded via `React.lazy()`. This results in ~7 async bundles plus 4 vendor chunks (react, fluent, echarts, redux/msal).

16. **MSAL Redirect** — The app uses `loginRedirect()` (not `loginPopup()`) to avoid popup blockers. The redirect URI must be registered in Azure AD App Registration.

17. **Subscription Selection** — In v1, users manually select a subscription from a dropdown populated by the backend. Auto-detection from MSAL account claims is a v2 enhancement.

18. **ECharts SVG Renderer** — All charts use `renderer: 'svg'` for better accessibility and server-side rendering compatibility. Canvas renderer would be faster for very large datasets.

## Infrastructure

19. **Managed Identity** — App Service instances use System-Assigned Managed Identity for Key Vault access. No secrets are stored in App Service configuration.

20. **App Service SKU** — `P1v3` (Linux) is the baseline. Scale up to `P2v3` or `P3v3` under load. Consider Azure Container Apps for dynamic scaling in v2.

21. **Database** — Azure SQL is used for audit logs and budget metadata only. All real-time cost data comes from the Azure Cost Management API. The SQL tier can be as low as `Basic` for small deployments.

22. **Terraform State** — Terraform state file should be stored in Azure Blob Storage with state locking enabled. The `backend "azurerm"` block in `main.tf` is pre-configured for this.

23. **Dual IaC** — Both Terraform and Bicep files are provided. Use Terraform for multi-environment deployments with workspace support. Use Bicep for quick one-off Azure deployments via `az deployment group create`.

## Known Limitations (v1)

- No multi-tenant support
- No management group scope
- No tag-based filtering in the UI (backend supports it via `CostFilter`)
- Scheduled reports are stored in-memory in the frontend demo; a v2 `ReportSchedule` table is planned
- RI exchange recommendations require Azure Advisor API integration (not implemented)
- The region heat map uses a bar chart fallback (ECharts geo map requires an additional `echarts-maps` package)
