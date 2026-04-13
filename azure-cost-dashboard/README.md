# Azure Cost Management Dashboard

A production-ready enterprise **Azure Cost Analysis & TCO/TBM Dashboard** built on Microsoft's Azure Cost Management & Billing APIs.

Modeled after the use cases at [learn.microsoft.com/en-us/azure/cost-management-billing/costs/cost-analysis-common-uses](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/cost-analysis-common-uses).

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                   Azure Active Directory                  │
│              (MSAL Auth, RBAC App Roles)                  │
└────────────────────────┬─────────────────────────────────┘
                         │ JWT Bearer Tokens
┌────────────────────────▼─────────────────────────────────┐
│              React 18 + Vite Frontend                     │
│  Fluent UI v9 · Redux Toolkit + RTK Query · ECharts      │
│  MSAL Browser · react-router-dom v6                      │
│  Deployed: Azure App Service (Linux)                     │
└────────────────────────┬─────────────────────────────────┘
                         │ HTTPS API calls
┌────────────────────────▼─────────────────────────────────┐
│         Node.js 20 + Express Backend (TypeScript)        │
│  Helmet · CORS · Rate-limit · JWT JWKS validation        │
│  RBAC middleware (admin/analyst/viewer hierarchy)        │
│  Deployed: Azure App Service (Linux)                     │
└──────┬──────────────────┬──────────────────┬────────────┘
       │                  │                  │
┌──────▼──────┐  ┌────────▼──────┐  ┌───────▼────────────┐
│ Azure Cost  │  │ Azure SQL DB  │  │  Azure Cache for   │
│ Mgmt API   │  │ (audit logs,  │  │  Redis (15-min TTL)│
│ (2023-11-01)│  │  budget meta) │  │                    │
└─────────────┘  └───────────────┘  └────────────────────┘
       │
┌──────▼──────────────────────────────────────────────────┐
│              Azure Key Vault                             │
│ (secrets: DB password, client secret, Redis key)        │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript 5, Fluent UI v9, Redux Toolkit, RTK Query, Apache ECharts |
| Backend | Node.js 20 LTS, Express.js, TypeScript 5, Zod validation |
| Auth | Azure AD MSAL, JWT JWKS validation, RBAC middleware |
| Caching | Redis (ioredis), 15-min TTL on cost data, 1-hr on JWKS |
| Database | Azure SQL Server (mssql), singleton connection pool |
| IaC | Terraform (`azurerm ~> 3.90`) + Bicep (dual-track) |
| CI/CD | GitHub Actions (ci.yml + cd.yml) |
| Monitoring | Azure Application Insights, Log Analytics |

---

## Quick Start (Local Development)

### Prerequisites

- Node.js 20 LTS
- Docker & Docker Compose
- Azure subscription with Cost Management Reader role
- Azure AD App Registration with required API permissions

### 1. Clone & configure environment

```bash
git clone <repo-url>
cd TCO-Business-Management-Platform/azure-cost-dashboard
cp .env.example .env.local
# Edit .env.local with your Azure credentials
```

### 2. Start with Docker Compose

```bash
docker-compose up -d
```

This starts:
- **Backend** at http://localhost:3001
- **Frontend** at http://localhost:5173 (Vite dev server with HMR)
- **Redis** at localhost:6379
- **SQL Server** at localhost:1433

### 3. Or run individually

**Backend:**
```bash
cd backend
npm install
npm run dev        # ts-node-dev with --respawn
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev        # Vite dev server
```

---

## Pages

| Route | Page | Description |
|---|---|---|
| `/` | Overview | Executive KPI dashboard (MTD, YTD, forecast, budget health) |
| `/cost-explorer` | Cost Explorer | Interactive cost analysis with filters, groupBy, charts, table |
| `/budgets` | Budget Management | Create/manage budgets, gauge cards, threshold alerts |
| `/resources` | Resource Analysis | Top resources, service donut, region heat map |
| `/reservations` | Reservations | RI coverage gauge, utilization trend, savings analysis |
| `/reports` | Reports | Scheduled reports, ad-hoc CSV/Excel/JSON export |
| `/settings` | Settings | Subscription management, RBAC overview, API health check |

---

## API Routes

| Method | Endpoint | Description | Min Role |
|---|---|---|---|
| GET | `/api/v1/health` | Health check | Public |
| GET | `/api/v1/costs/kpis` | Dashboard KPIs | Viewer |
| POST | `/api/v1/costs/query` | Cost query | Viewer |
| GET | `/api/v1/costs/breakdown` | Cost by dimension | Viewer |
| GET | `/api/v1/costs/top-resources` | Top N resources | Viewer |
| GET | `/api/v1/forecasts` | Cost forecast | Viewer |
| GET | `/api/v1/budgets` | List budgets | Viewer |
| POST | `/api/v1/budgets` | Create budget | Analyst |
| DELETE | `/api/v1/budgets/:name` | Delete budget | Analyst |
| POST | `/api/v1/exports` | Export CSV/Excel/JSON | Analyst |
| GET | `/api/v1/reservations/summary` | RI summary | Viewer |

---

## Infrastructure Deployment (Terraform)

```bash
cd infrastructure/terraform
terraform init
terraform workspace new staging
terraform plan -var-file=environments/staging.tfvars
terraform apply
```

See `docs/deployment-guide.md` for full Bicep/Terraform instructions.

---

## Environment Variables

See `.env.example` for all required variables.

Required for production:
- `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`
- `AZURE_KEY_VAULT_URI` (replaces individual secrets in production)
- `DB_SERVER`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `REDIS_URL`
- Frontend: `VITE_AZURE_CLIENT_ID`, `VITE_AZURE_TENANT_ID`, `VITE_API_BASE_URL`

---

## Sprint Plan (12 Weeks)

| Sprint | Focus | Duration |
|---|---|---|
| 1 | Foundation & Auth | Weeks 1–2 |
| 2 | Core Cost APIs | Weeks 3–4 |
| 3 | Budget & Forecast | Weeks 5–6 |
| 4 | Frontend Shell + KPI Dashboard | Weeks 7–8 |
| 5 | Cost Explorer & Resource Analysis | Weeks 8–9 |
| 6 | Reservations, Reports, Export | Weeks 10–11 |
| 7 | IaC, CI/CD, Hardening & Docs | Week 12 |

---

## License

Internal — TCO Business Management Platform
