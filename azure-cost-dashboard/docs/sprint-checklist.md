# Sprint Checklist — Azure Cost Management Dashboard
> Import into Azure DevOps (Work Items → Import) or Jira (CSV import)

---

## Sprint 1 — Foundation & Infrastructure (Weeks 1–2)

### Epic: Project Setup
- [ ] Create Azure AD App Registration with Cost.Read API permission
- [ ] Configure App Roles: Cost-Dashboard.Admin, Cost-Dashboard.Analyst, Cost-Dashboard.Viewer
- [ ] Set up Azure DevOps project or GitHub repo with branch protection on `main`
- [ ] Configure GitHub Actions CI workflow (`ci.yml`)
- [ ] Create Azure resource group per environment (dev/staging/prod)

### Epic: Infrastructure as Code
- [ ] Review and customize `infrastructure/terraform/variables.tf`
- [ ] Run `terraform init` and `terraform plan` for dev environment
- [ ] Apply Terraform for dev: App Service, SQL, Redis, Key Vault, Storage, App Insights
- [ ] Store Key Vault secrets: DB password, Azure client secret, Redis key
- [ ] Validate Managed Identity has Key Vault Secrets User role assignment

### Epic: Backend Foundation
- [ ] `npm install` in `backend/` — resolve all TypeScript compile errors
- [ ] Configure `.env.local` from `.env.example`
- [ ] Verify `backend/src/app.ts` starts successfully: `npm run dev`
- [ ] Test health endpoint: `GET /api/v1/health` returns `{ status: "ok" }`
- [ ] Verify Azure Cost Management API authentication works (test query endpoint)

---

## Sprint 2 — Core Cost APIs (Weeks 3–4)

### Epic: Cost Query Endpoints
- [ ] `GET /api/v1/costs/kpis` — MTD, YTD, prev month, burn rate, forecast
- [ ] `POST /api/v1/costs/query` — flexible date range + granularity
- [ ] `GET /api/v1/costs/breakdown` — group by ServiceName, RG, Region
- [ ] `GET /api/v1/costs/top-resources` — top N by cost
- [ ] `GET /api/v1/costs/amortized` — amortized cost metric

### Epic: Caching & Performance
- [ ] Verify Redis cache 15-min TTL on cost endpoints (`X-Cache: HIT/MISS` header)
- [ ] Load test: 50 concurrent users, confirm Redis hit rate > 90%
- [ ] Verify graceful Redis degradation: stop Redis, confirm API still responds

### Epic: Auth Middleware
- [ ] Verify JWT validation against Azure AD JWKS
- [ ] Test RBAC: viewer can GET costs but cannot POST budget (403)
- [ ] Test RBAC: analyst can POST budget
- [ ] Verify JWKS cached 1hr in Redis

---

## Sprint 3 — Budget, Forecast & Reservation APIs (Weeks 5–6)

### Epic: Budget Endpoints
- [ ] `GET /api/v1/budgets` — list with enriched status (on_track/at_risk/exceeded)
- [ ] `POST /api/v1/budgets` — create budget via Azure Cost Management API
- [ ] `PUT /api/v1/budgets/:name` — update amount/thresholds
- [ ] `DELETE /api/v1/budgets/:name` — delete budget
- [ ] `GET /api/v1/budgets/summary` — aggregate utilization metrics

### Epic: Forecast & Reservation
- [ ] `GET /api/v1/forecasts` — 30/60/90 day ahead with confidence bounds
- [ ] `GET /api/v1/reservations/summary` — RI coverage, utilization %, underutilized count
- [ ] Verify forecast caches 30 min, reservation caches 1 hour

### Epic: Export
- [ ] `POST /api/v1/exports` format=csv — verify CSV download with correct headers
- [ ] `POST /api/v1/exports` format=xlsx — verify Excel with summary sheet
- [ ] `POST /api/v1/exports` format=json — verify JSON structure

---

## Sprint 4 — Frontend Shell & Overview Dashboard (Weeks 7–8)

### Epic: App Shell
- [ ] `npm install` in `frontend/` — resolve all TypeScript compile errors
- [ ] Configure `frontend/.env.local` (VITE_AZURE_CLIENT_ID, VITE_AZURE_TENANT_ID, VITE_API_BASE_URL)
- [ ] Verify MSAL redirect login flow completes
- [ ] App shell renders: Sidebar + TopNav + page content area
- [ ] Sidebar navigation: all 7 links route correctly
- [ ] Subscription selector populates and dispatches to filterSlice

### Epic: Overview Page
- [ ] KPI cards render for MTD Spend, YTD, Projected Month-End, Budget Utilization
- [ ] Spend Trend line chart renders with daily data points
- [ ] Cost Breakdown donut chart renders by ServiceName
- [ ] Budget Health summary panel renders counts
- [ ] Loading skeletons show while data is fetching
- [ ] Error state renders when API fails

---

## Sprint 5 — Cost Explorer & Resource Analysis (Weeks 8–9)

### Epic: Cost Explorer Page
- [ ] DateRangePicker presets dispatch to filterSlice
- [ ] Group-by selector changes chart dimension
- [ ] FilterPanel drawer opens/closes, dispatches filter state
- [ ] SpendTrendChart updates on filter change
- [ ] CostBreakdownDonut updates on group-by change
- [ ] Top resources DataGrid renders, sortable by Cost and Share
- [ ] ExportButton downloads CSV, Excel, JSON

### Epic: Resource Analysis Page
- [ ] Top N resources table renders with all columns
- [ ] Service donut shows correct breakdown
- [ ] Region bar chart shows correct region costs
- [ ] All data updates when date range changes

---

## Sprint 6 — Budgets, Reservations, Reports (Weeks 10–11)

### Epic: Budget Management
- [ ] Budget gauges render with correct utilization %
- [ ] Color coding: green < 80%, yellow 80–99%, red ≥ 100%
- [ ] Create budget dialog validates name and amount > 0
- [ ] Budget created via API and appears in list
- [ ] Delete budget removes from list
- [ ] Status badges (On Track / At Risk / Over Budget) correct

### Epic: Reservations
- [ ] Average utilization KPI card renders
- [ ] RI coverage gauge shows correct %
- [ ] Utilization trend chart renders 12-month history
- [ ] Optimization recommendation banner shows for underutilized RIs

### Epic: Reports & Settings
- [ ] Scheduled reports list renders with enable/disable toggle
- [ ] New scheduled report form creates entry
- [ ] One-time export downloads correct format
- [ ] Settings page shows subscription list with Set Active button
- [ ] API Health Check runs and shows endpoint status

---

## Sprint 7 — Hardening, CI/CD & Documentation (Week 12)

### Epic: CI/CD
- [ ] CI workflow passes: lint, typecheck, build on PR
- [ ] CD workflow deploys backend to staging App Service on main push
- [ ] CD workflow deploys frontend to staging on main push
- [ ] Smoke test validates `/api/v1/health` and frontend 200 after deploy
- [ ] Manual `workflow_dispatch` to production works

### Epic: Security Hardening
- [ ] Helmet CSP headers correct in production (verify with SecurityHeaders.com)
- [ ] Rate limiting tested: 500/15min global, 100/min API
- [ ] SQL injection: all queries use parameterized mssql queries (no string concat)
- [ ] CORS locked to specific origins in production
- [ ] Dependency audit: `npm audit --production` — no critical vulnerabilities

### Epic: Non-Functional Requirements
- [ ] API response time < 2s for cached endpoints (test with Redis warm)
- [ ] API response time < 8s for cold (Azure API) endpoints
- [ ] Frontend Lighthouse performance score ≥ 80
- [ ] WCAG 2.1 AA: all interactive elements keyboard accessible
- [ ] 99.9% uptime SLA: verify App Service autoheal and alert configured

### Epic: Documentation
- [ ] `README.md` quick start works from scratch on clean machine
- [ ] `ASSUMPTIONS.md` reviewed by architect
- [ ] `docs/api-reference.md` complete
- [ ] `docs/deployment-guide.md` complete
- [ ] `.env.example` has all required variables documented
- [ ] Sprint retrospective completed
