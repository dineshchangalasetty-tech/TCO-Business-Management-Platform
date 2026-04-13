"""
generate_kpi_data.py - reads azure_cost_synthetic_full.csv and writes backend/src/data/csvData.ts
"""
import pandas as pd, json, os

print("Loading CSV...")
df = pd.read_csv("azure_cost_synthetic_full.csv",
    usecols=["Date","Cost","ServiceName","SubscriptionId","SubscriptionName",
             "ResourceGroup","ResourceName","Location","Tags","PricingModel",
             "MeterCategory","ResourceType","AccountName"],
    dtype={"Cost": float})

df["Date"] = pd.to_datetime(df["Date"])
df["Month"] = df["Date"].dt.to_period("M")
print(f"  Loaded {len(df):,} rows")

monthly_totals = df.groupby("Month")["Cost"].sum().reset_index()
monthly_totals["Month"] = monthly_totals["Month"].astype(str)
monthly_list = [{"month": r["Month"], "cost": round(float(r["Cost"]),2)} for _,r in monthly_totals.iterrows()]

cur_month  = "2026-04"
prev_month = "2026-03"
ytd_months = [m for m in monthly_totals["Month"].tolist() if m.startswith("2026")]
cur_cost   = float(monthly_totals[monthly_totals["Month"]==cur_month]["Cost"].values[0])
prev_cost  = float(monthly_totals[monthly_totals["Month"]==prev_month]["Cost"].values[0])
ytd_cost   = float(monthly_totals[monthly_totals["Month"].isin(ytd_months)]["Cost"].sum())
total_cost = float(monthly_totals["Cost"].sum())
mom_pct    = round((cur_cost - prev_cost)/prev_cost*100, 1)

cur_df = df[df["Month"]==cur_month].copy()
by_service = cur_df.groupby("ServiceName")["Cost"].sum().sort_values(ascending=False)
service_breakdown = [{"service":k,"cost":round(float(v),2),"percentage":round(float(v)/cur_cost*100,1)} for k,v in by_service.items()]
by_region = cur_df.groupby("Location")["Cost"].sum().sort_values(ascending=False)
region_breakdown = [{"region":k,"cost":round(float(v),2),"percentage":round(float(v)/cur_cost*100,1)} for k,v in by_region.items()]
by_rg = cur_df.groupby("ResourceGroup")["Cost"].sum().sort_values(ascending=False).head(15)
top_rgs = [{"resourceGroup":k,"cost":round(float(v),2)} for k,v in by_rg.items()]
by_resource = cur_df.groupby(["ResourceName","ServiceName","ResourceGroup"])["Cost"].sum().sort_values(ascending=False).head(20).reset_index()
top_res = [{"resourceName":r["ResourceName"],"serviceName":r["ServiceName"],"resourceGroup":r["ResourceGroup"],"cost":round(float(r["Cost"]),2)} for _,r in by_resource.iterrows()]
by_pricing = cur_df.groupby("PricingModel")["Cost"].sum()
ondemand_cost    = float(by_pricing.get("OnDemand",0))
reservation_cost = float(by_pricing.get("Reservation",0))
reservation_pct  = round(reservation_cost/cur_cost*100,1)
ri_savings       = round(ondemand_cost*0.30,2)
by_dept = cur_df.groupby("AccountName")["Cost"].sum().sort_values(ascending=False)
dept_breakdown = [{"department":k,"cost":round(float(v),2),"percentage":round(float(v)/cur_cost*100,1)} for k,v in by_dept.items()]
sub_cost = cur_df.groupby(["SubscriptionId","SubscriptionName"])["Cost"].sum().sort_values(ascending=False).reset_index()
subscriptions = [{"id":r["SubscriptionId"],"name":r["SubscriptionName"],"currentMonthCost":round(float(r["Cost"]),2)} for _,r in sub_cost.head(20).iterrows()]
overall_budget = round(cur_cost*1.20,2)
overall_util   = round(cur_cost/overall_budget*100,1)
budgets = [{"id":"budget-000","name":"Total Azure Spend Budget","amount":overall_budget,"currentSpend":round(cur_cost,2),"utilization":overall_util,"status":"warning" if overall_util>=75 else "onTrack","service":"All","period":cur_month}]
for i,s in enumerate(service_breakdown):
    ba = round(s["cost"] * 1.25, 2)
    ut = round(s["cost"] / ba * 100, 1)
    svc_name = s["service"]
    budgets.append({
        "id": f"budget-{i+1:03d}",
        "name": f"{svc_name} Monthly Budget",
        "amount": ba,
        "currentSpend": s["cost"],
        "utilization": ut,
        "status": "critical" if ut >= 90 else ("warning" if ut >= 75 else "onTrack"),
        "service": svc_name,
        "period": cur_month,
    })
last3=[r["cost"] for r in monthly_list[-3:]]
avg_growth=(last3[-1]-last3[0])/2
forecast=[{"month":"2026-05","cost":round(last3[-1]+avg_growth,2),"type":"forecast"},{"month":"2026-06","cost":round(last3[-1]+avg_growth*2,2),"type":"forecast"},{"month":"2026-07","cost":round(last3[-1]+avg_growth*3,2),"type":"forecast"}]
alerts=[{"id":"alert-001","name":"Monthly Spend Threshold","severity":"warning","message":f"Current spend is at {overall_util:.0f}% of monthly budget","resource":"All Subscriptions","timestamp":"2026-04-13T09:00:00Z","status":"active"},{"id":"alert-002","name":"VM Cost Spike","severity":"critical","message":f"VM spend increased {mom_pct}% MoM","resource":"Virtual Machines","timestamp":"2026-04-12T14:30:00Z","status":"active"},{"id":"alert-003","name":"Storage Budget Alert","severity":"info","message":"Storage costs trending 8% above forecast","resource":"Storage Accounts","timestamp":"2026-04-11T08:00:00Z","status":"acknowledged"},{"id":"alert-004","name":"Unused Reservations","severity":"warning","message":"3 reserved instances under 60% utilization","resource":"Reserved Instances","timestamp":"2026-04-10T11:00:00Z","status":"active"}]

out_dir = os.path.join("backend","src","data")
os.makedirs(out_dir, exist_ok=True)
out_file = os.path.join(out_dir, "csvData.ts")

def jstr(obj): return json.dumps(obj, indent=2, default=str)

lines = [
    '/** AUTO-GENERATED from azure_cost_synthetic_full.csv (1.6M rows, 16 months). DO NOT EDIT. */',
    f'export const CURRENT_MONTH = "{cur_month}";',
    f'export const PREV_MONTH    = "{prev_month}";',
    f'export const KPI_CURRENT_MONTH_COST  = {round(cur_cost,2)};',
    f'export const KPI_PREV_MONTH_COST     = {round(prev_cost,2)};',
    f'export const KPI_YTD_COST            = {round(ytd_cost,2)};',
    f'export const KPI_TOTAL_COST_ALL_TIME = {round(total_cost,2)};',
    f'export const KPI_MOM_CHANGE_PCT      = {mom_pct};',
    f'export const KPI_OVERALL_BUDGET      = {overall_budget};',
    f'export const KPI_BUDGET_UTILIZATION  = {overall_util};',
    f'export const KPI_RI_SAVINGS          = {round(ri_savings,2)};',
    f'export const KPI_RESERVATION_PCT     = {reservation_pct};',
    f'export const TOTAL_SUBSCRIPTIONS     = {len(sub_cost)};',
    f'export const TOTAL_RESOURCE_GROUPS   = {cur_df["ResourceGroup"].nunique()};',
    f'export const MONTHLY_SPEND_TREND = {jstr(monthly_list)};',
    f'export const SERVICE_BREAKDOWN   = {jstr(service_breakdown)};',
    f'export const REGION_BREAKDOWN    = {jstr(region_breakdown)};',
    f'export const DEPT_BREAKDOWN      = {jstr(dept_breakdown)};',
    f'export const TOP_RESOURCE_GROUPS = {jstr(top_rgs)};',
    f'export const TOP_RESOURCES       = {jstr(top_res)};',
    f'export const SUBSCRIPTIONS       = {jstr(subscriptions)};',
    f'export const BUDGETS             = {jstr(budgets)};',
    f'export const FORECAST_NEXT_MONTHS= {jstr(forecast)};',
    f'export const ALERTS              = {jstr(alerts)};',
    'export const PRICING_MODEL_SPLIT = {',
    f'  onDemand:       {round(ondemand_cost,2)},',
    f'  reservation:    {round(reservation_cost,2)},',
    f'  onDemandPct:    {round(ondemand_cost/cur_cost*100,1)},',
    f'  reservationPct: {reservation_pct},',
    '};',
]

with open(out_file,"w") as f: f.write("\n".join(lines))
print(f"Written: {os.path.abspath(out_file)}")
print(f"  cur_cost={cur_cost/1e6:.2f}M  ytd={ytd_cost/1e6:.2f}M  mom={mom_pct}%  budget_util={overall_util}%  subs={len(sub_cost)}")
