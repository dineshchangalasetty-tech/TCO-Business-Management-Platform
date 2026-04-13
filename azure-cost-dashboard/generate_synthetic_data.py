"""
Synthetic Azure Cost Data Generator
====================================
Generates 16 months (2025-01 to 2026-04) x 100,000 rows = 1,600,000 records
using real nomenclature, IDs, and patterns from the sample CSV file.

Output: azure_cost_synthetic_full.csv
"""

import pandas as pd
import numpy as np
import random
import string
from datetime import datetime, timedelta
import calendar
import os

random.seed(42)
np.random.seed(42)

# ─────────────────────────────────────────────
# 1. REAL NOMENCLATURE FROM SAMPLE DATA
# ─────────────────────────────────────────────

REGIONS = {
    "East US":       {"code": "EA", "location_code": "eastus",      "weight": 0.30},
    "West Europe":   {"code": "WE", "location_code": "westeurope",  "weight": 0.25},
    "Central US":    {"code": "CE", "location_code": "centralus",   "weight": 0.25},
    "North Europe":  {"code": "NO", "location_code": "northeurope", "weight": 0.20},
}

DEPARTMENTS = ["Finance", "HR", "IT", "PC", "LH", "G2"]

APPLICATIONS = ["BW", "LUCA", "DRW", "EDDIE", "TCO"]

ENVIRONMENTS = ["Prod", "Dev", "Test", "Staging"]
ENV_WEIGHTS  = [0.50,   0.20,  0.20,  0.10]

BILLING_ACCOUNT_IDS = [
    "BILL-3466", "BILL-1868", "BILL-1429", "BILL-8563", "BILL-7475",
    "BILL-2241", "BILL-9912", "BILL-4401", "BILL-6630", "BILL-5517",
]

OFFER_IDS = ["MS-AZR-0017P", "MS-AZR-0148P", "MS-AZR-0003P", "MS-AZR-0036P"]

PUBLISHER_NAMES = ["Microsoft", "Microsoft Corporation"]

BILLING_CURRENCY = "USD"

# ─────────────────────────────────────────────
# 2. SERVICE DEFINITIONS (realistic cost models)
# ─────────────────────────────────────────────

SERVICES = {
    "Virtual Machines": {
        "weight": 0.30,
        "meter_category": "Compute",
        "resource_type": "Microsoft.Compute/virtualMachines",
        "meter_names": ["D2s v3", "D4s v3", "D8s v3", "E2s v3", "E4s v3",
                        "B2ms", "B4ms", "F4s v2", "F8s v2", "NC6", "NC12"],
        "meter_sub_categories": ["Dv3/DSv3 Series", "Ev3/ESv3 Series",
                                 "Bs Series", "Fsv2 Series", "NC Series"],
        "product_names": ["Virtual Machines DSv3 Series", "Virtual Machines ESv3 Series",
                          "Virtual Machines Bs Series", "Virtual Machines Fsv2 Series"],
        "unit_of_measure": "1 Hour",
        "effective_price_range": (0.096, 3.60),
        "usage_quantity_range": (24, 744),
        "cost_range": (50, 2000),
        "resource_prefix": "vm",
        "resource_name_suffixes": ["prod", "dev", "test", "web", "app", "db", "api", "worker"],
    },
    "Storage": {
        "weight": 0.18,
        "meter_category": "Storage",
        "resource_type": "Microsoft.Storage/storageAccounts",
        "meter_names": ["LRS Data Stored", "GRS Data Stored", "ZRS Data Stored",
                        "Write Operations", "Read Operations", "Data Retrieval"],
        "meter_sub_categories": ["Locally Redundant", "Geo Redundant", "Zone Redundant",
                                 "Cool - LRS", "Hot - LRS"],
        "product_names": ["Azure Blob Storage", "Azure Files", "Azure Queue Storage",
                          "Azure Table Storage"],
        "unit_of_measure": "1 GB/Month",
        "effective_price_range": (0.018, 0.20),
        "usage_quantity_range": (100, 50000),
        "cost_range": (10, 800),
        "resource_prefix": "st",
        "resource_name_suffixes": ["data", "archive", "backup", "logs", "media", "blob"],
    },
    "SQL Database": {
        "weight": 0.20,
        "meter_category": "Database",
        "resource_type": "Microsoft.Sql/servers/databases",
        "meter_names": ["vCore", "DTU", "Backup Storage LRS", "Long Term Retention",
                        "Geo-Replication", "Standard S1", "Premium P1", "General Purpose"],
        "meter_sub_categories": ["General Purpose", "Business Critical",
                                 "Standard", "Premium", "Hyperscale"],
        "product_names": ["SQL Database Single Database General Purpose",
                          "SQL Database Single Database Business Critical",
                          "SQL Database Elastic Pool Standard",
                          "SQL Managed Instance General Purpose"],
        "unit_of_measure": "1 vCore/Hour",
        "effective_price_range": (0.124, 8.50),
        "usage_quantity_range": (24, 744),
        "cost_range": (30, 3000),
        "resource_prefix": "sqldb",
        "resource_name_suffixes": ["prod", "analytics", "reporting", "olap", "oltp", "archive"],
    },
    "App Service": {
        "weight": 0.17,
        "meter_category": "Compute",
        "resource_type": "Microsoft.Web/sites",
        "meter_names": ["P1 v2 App Service Hours", "P2 v2 App Service Hours",
                        "P3 v2 App Service Hours", "B1 App Service Hours",
                        "S1 App Service Hours", "S2 App Service Hours"],
        "meter_sub_categories": ["Premium v2 Plan", "Standard Plan", "Basic Plan",
                                 "Isolated v2 Plan"],
        "product_names": ["Azure App Service Premium v2 Plan",
                          "Azure App Service Standard Plan",
                          "Azure App Service Basic Plan"],
        "unit_of_measure": "1 Hour",
        "effective_price_range": (0.075, 1.60),
        "usage_quantity_range": (24, 744),
        "cost_range": (20, 1200),
        "resource_prefix": "app",
        "resource_name_suffixes": ["api", "web", "portal", "admin", "func", "bot", "svc"],
    },
    "Networking": {
        "weight": 0.15,
        "meter_category": "Networking",
        "resource_type": "Microsoft.Network/virtualNetworks",
        "meter_names": ["Data Transfer Out - Intl", "Data Transfer - VNET Peering",
                        "VPN Gateway S2S Tunnel", "ExpressRoute Premium",
                        "Public IP Address", "Load Balancer", "Application Gateway"],
        "meter_sub_categories": ["Inter-Region", "Intra-Region", "Standard",
                                 "Basic", "WAF v2"],
        "product_names": ["Bandwidth Inter-Region", "VPN Gateway", "ExpressRoute",
                          "Azure Application Gateway", "Azure Load Balancer"],
        "unit_of_measure": "1 GB",
        "effective_price_range": (0.01, 2.80),
        "usage_quantity_range": (10, 100000),
        "cost_range": (5, 1500),
        "resource_prefix": "net",
        "resource_name_suffixes": ["vnet", "gw", "lb", "agw", "pip", "nsg", "fw"],
    },
}

# ─────────────────────────────────────────────
# 3. MONTHLY COST TRENDS (seasonal + growth)
# ─────────────────────────────────────────────

# Monthly cost multipliers — simulates real Azure spend patterns
# Q1 2025: baseline, gradual growth through year, peak Q4, spike in 2026
MONTHLY_MULTIPLIERS = {
    "2025-01": 1.00,
    "2025-02": 1.02,
    "2025-03": 1.05,
    "2025-04": 1.08,
    "2025-05": 1.10,
    "2025-06": 1.12,
    "2025-07": 1.09,  # slight summer dip
    "2025-08": 1.11,
    "2025-09": 1.15,
    "2025-10": 1.20,
    "2025-11": 1.25,
    "2025-12": 1.30,  # year-end peak
    "2026-01": 1.18,  # post-holiday dip
    "2026-02": 1.22,
    "2026-03": 1.28,
    "2026-04": 1.33,  # current month growth
}

# ─────────────────────────────────────────────
# 4. MASTER REFERENCE DATA (fixed pools for FK consistency)
# ─────────────────────────────────────────────

def make_subscription_pool(n=80):
    """Generate a fixed pool of subscription IDs matching real naming pattern."""
    pool = []
    for region_name, rinfo in REGIONS.items():
        rc = rinfo["code"]
        for app in APPLICATIONS:
            for dept in DEPARTMENTS:
                num = str(random.randint(1, 999)).zfill(3)
                sub_id = f"AZ-{rc}-{app}-{dept}-SC-{num}"
                pool.append({
                    "SubscriptionId": sub_id,
                    "SubscriptionName": sub_id,
                    "AccountName": f"Account-{dept}",
                    "Region": region_name,
                    "App": app,
                    "Dept": dept,
                })
    # Trim to target size, shuffle for variety
    random.shuffle(pool)
    return pool[:n]

def make_resource_group_pool(subscriptions, rgs_per_sub=3):
    """Generate resource groups tied to subscriptions."""
    pool = []
    for sub in subscriptions:
        rc = REGIONS[sub["Region"]]["code"]
        for i in range(rgs_per_sub):
            num = str(random.randint(1, 999)).zfill(3)
            rg_name = f"{rc}-{sub['App']}-{sub['Dept']}-RG-{num}"
            pool.append({
                "SubscriptionId": sub["SubscriptionId"],
                "ResourceGroup": rg_name,
                "Region": sub["Region"],
                "Dept": sub["Dept"],
                "App": sub["App"],
            })
    return pool

def make_resource_pool(resource_groups, resources_per_rg=5):
    """Generate resources tied to resource groups."""
    pool = []
    for rg in resource_groups:
        for svc_name, svc in SERVICES.items():
            num = str(random.randint(100, 999))
            res_name = f"{svc['resource_prefix']}-{rg['App'].lower()}-{rg['Dept'].lower()}-{num}"
            res_id = (f"/subscriptions/{rg['SubscriptionId']}/resourceGroups/{rg['ResourceGroup']}"
                      f"/providers/{svc['resource_type']}/{res_name}")
            pool.append({
                "SubscriptionId": rg["SubscriptionId"],
                "ResourceGroup": rg["ResourceGroup"],
                "ResourceName": res_name,
                "ResourceId": res_id,
                "ResourceType": svc["resource_type"],
                "ServiceName": svc_name,
                "Region": rg["Region"],
                "Dept": rg["Dept"],
                "App": rg["App"],
            })
    return pool

# ─────────────────────────────────────────────
# 5. ROW GENERATOR
# ─────────────────────────────────────────────

def make_invoice_id():
    return "INV-" + "".join(random.choices(string.digits, k=8))

def make_meter_id():
    return "-".join([
        "".join(random.choices(string.hexdigits[:16].upper(), k=8)),
        "".join(random.choices(string.hexdigits[:16].upper(), k=4)),
        "".join(random.choices(string.hexdigits[:16].upper(), k=4)),
        "".join(random.choices(string.hexdigits[:16].upper(), k=4)),
        "".join(random.choices(string.hexdigits[:16].upper(), k=12)),
    ])

def generate_rows_for_month(year: int, month: int, target_rows: int,
                             resources: list, multiplier: float) -> list:
    month_key = f"{year}-{month:02d}"
    days_in_month = calendar.monthrange(year, month)[1]
    billing_start = f"{year}-{month:02d}-01"
    billing_end   = f"{year}-{month:02d}-{days_in_month:02d}"

    # Pre-compute service weights
    svc_names   = list(SERVICES.keys())
    svc_weights = [SERVICES[s]["weight"] for s in svc_names]

    rows = []
    chosen_resources = random.choices(resources, k=target_rows)

    for res in chosen_resources:
        svc_name = random.choices(svc_names, weights=svc_weights, k=1)[0]
        svc = SERVICES[svc_name]

        day = random.randint(1, days_in_month)
        usage_date = f"{year}-{month:02d}-{day:02d}"

        pricing_model = random.choices(["OnDemand", "Reservation"], weights=[0.55, 0.45])[0]
        environment   = random.choices(ENVIRONMENTS, weights=ENV_WEIGHTS, k=1)[0]

        usage_qty = round(random.uniform(*svc["usage_quantity_range"]), 4)
        eff_price = round(random.uniform(*svc["effective_price_range"]), 4)
        base_cost = round(random.uniform(*svc["cost_range"]) * multiplier, 2)
        # Reservations get ~30% discount
        if pricing_model == "Reservation":
            base_cost = round(base_cost * 0.70, 2)
        base_cost = max(base_cost, 5.00)

        meter_name = random.choice(svc["meter_names"])
        meter_sub  = random.choice(svc["meter_sub_categories"])
        product    = random.choice(svc["product_names"])
        billing_acct = random.choice(BILLING_ACCOUNT_IDS)
        region     = res["Region"]
        loc_code   = REGIONS[region]["location_code"]

        tag_str = (f"Application={res['App']};BusinessUnit={res['Dept']};"
                   f"Environment={environment};CostCenter=CC-{random.randint(1000,9999)}")

        row = {
            "AccountId":               res["SubscriptionId"],
            "AccountName":             f"Account-{res['Dept']}",
            "BillingAccountId":        billing_acct,
            "BillingAccountName":      f"Enterprise-{billing_acct}",
            "BillingCurrency":         BILLING_CURRENCY,
            "BillingPeriodStartDate":  billing_start,
            "BillingPeriodEndDate":    billing_end,
            "ChargeType":              "Usage",
            "ConsumedService":         svc["resource_type"].split("/")[0],
            "Cost":                    base_cost,
            "CostInBillingCurrency":   base_cost,
            "Currency":                BILLING_CURRENCY,
            "Date":                    usage_date,
            "EffectivePrice":          eff_price,
            "Frequency":               "UsageBased",
            "InstanceId":              res["ResourceId"],
            "InvoiceId":               make_invoice_id(),
            "IsAzureCreditEligible":   random.choice([True, False]),
            "Location":                region,
            "MeterCategory":           svc["meter_category"],
            "MeterId":                 make_meter_id(),
            "MeterName":               meter_name,
            "MeterRegion":             region,
            "MeterSubCategory":        meter_sub,
            "OfferId":                 random.choice(OFFER_IDS),
            "PricingModel":            pricing_model,
            "ProductName":             product,
            "Provider":                "Microsoft",
            "PublisherName":           random.choice(PUBLISHER_NAMES),
            "Quantity":                usage_qty,
            "ResourceGroup":           res["ResourceGroup"],
            "ResourceId":              res["ResourceId"],
            "ResourceLocation":        loc_code,
            "ResourceName":            res["ResourceName"],
            "ResourceType":            svc["resource_type"],
            "ServiceName":             svc_name,
            "SubscriptionId":          res["SubscriptionId"],
            "SubscriptionName":        res["SubscriptionId"],
            "Tags":                    tag_str,
            "UnitOfMeasure":           svc["unit_of_measure"],
            "UnitPrice":               round(eff_price * random.uniform(1.0, 1.3), 4),
            "UsageDateTime":           usage_date,
            "UsageQuantity":           usage_qty,
        }
        rows.append(row)

    return rows

# ─────────────────────────────────────────────
# 6. MAIN GENERATION LOOP
# ─────────────────────────────────────────────

def main():
    print("🔧 Building reference data pools...")
    subscriptions = make_subscription_pool(n=80)
    resource_groups = make_resource_group_pool(subscriptions, rgs_per_sub=3)
    resources = make_resource_pool(resource_groups, resources_per_rg=5)
    print(f"   Subscriptions: {len(subscriptions)}")
    print(f"   Resource Groups: {len(resource_groups)}")
    print(f"   Resources: {len(resources)}")

    # Months to generate: 2025-01 to 2026-04
    months = []
    for y, m in [(2025, i) for i in range(1, 13)] + [(2026, i) for i in range(1, 5)]:
        months.append((y, m))

    target_rows_per_month = 100_000
    output_file = "azure_cost_synthetic_full.csv"

    print(f"\n📅 Generating {len(months)} months x {target_rows_per_month:,} rows = "
          f"{len(months)*target_rows_per_month:,} total records...")
    print(f"📁 Output: {output_file}\n")

    first = True
    total = 0

    for idx, (year, month) in enumerate(months):
        month_key = f"{year}-{month:02d}"
        multiplier = MONTHLY_MULTIPLIERS.get(month_key, 1.0)

        print(f"  [{idx+1:02d}/{len(months)}] {month_key}  (multiplier={multiplier:.2f})", end="", flush=True)

        rows = generate_rows_for_month(year, month, target_rows_per_month,
                                       resources, multiplier)
        df_month = pd.DataFrame(rows)
        total += len(df_month)

        # Write header only for first chunk
        df_month.to_csv(output_file, mode='a' if not first else 'w',
                        header=first, index=False)
        first = False

        cost_sum = df_month["Cost"].sum()
        print(f"  →  rows={len(df_month):,}  total_cost=${cost_sum:,.0f}")

    print(f"\n✅ Done! Total rows written: {total:,}")
    print(f"📦 File: {os.path.abspath(output_file)}")
    size_mb = os.path.getsize(output_file) / 1024 / 1024
    print(f"💾 File size: {size_mb:.1f} MB")

    # Quick summary stats
    print("\n📊 Quick validation...")
    df_check = pd.read_csv(output_file, usecols=["Date", "Cost", "ServiceName", "SubscriptionId"])
    df_check["Date"] = pd.to_datetime(df_check["Date"])
    monthly = df_check.groupby(df_check["Date"].dt.to_period("M"))["Cost"].agg(["sum","count"])
    monthly.columns = ["Total Cost ($)", "Row Count"]
    monthly["Total Cost ($)"] = monthly["Total Cost ($)"].map("{:,.0f}".format)
    print(monthly.to_string())
    print(f"\n  Unique Subscriptions: {df_check['SubscriptionId'].nunique()}")
    print(f"  Services: {df_check['ServiceName'].nunique()}")

if __name__ == "__main__":
    main()
