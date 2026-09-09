import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ErrorState, LoadingState, PageHeader, Stat } from "@/components/page";
import { DemandBadge, MatrixBadge, Panel, PriorityBadge, StatusBadge, Trend } from "@/components/signals";
import { Button } from "@/components/ui/button";
import { useInventory } from "@/lib/data";
import { days, decimal, money, num, shortDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/products/$id")({
  head: () => ({
    meta: [
      { title: "Product intelligence — AI Inventory Intelligence" },
      { name: "description", content: "Demand, coverage, forecast and the recommended action for this product." },
      { property: "og:title", content: "Product intelligence — AI Inventory Intelligence" },
      { property: "og:description", content: "A full analysis of one product's demand and stock position." },
    ],
  }),
  component: ProductDetail,
});

function ProductDetail() {
  const { id } = Route.useParams();
  const { snapshot, isLoading, error } = useInventory();

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error instanceof Error ? error.message : "Unknown error"} />;
  const item = snapshot?.byId[id];
  if (!snapshot || !item)
    return (
      <ErrorState message="This product no longer exists. It may have been deleted." />
    );

  const c = snapshot.currency;
  const p = item.product;
  const rec = item.recommendation;

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3">
        <Link to="/products" search={{}}>
          <ArrowLeft className="size-4" /> All products
        </Link>
      </Button>
      <PageHeader
        title={p.name}
        subtitle={`${p.sku} · ${p.category} · ${p.supplier} · added ${shortDate(p.created_at)}`}
        actions={
          <>
            <StatusBadge status={item.status} />
            <DemandBadge level={item.demandLevel} />
            <MatrixBadge cls={item.matrixClass} />
          </>
        }
      />

      <Panel className="border border-primary/30">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="label-mono">Recommended action</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-primary">{rec.action}</h2>
          </div>
          <PriorityBadge priority={rec.priority} />
        </div>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground">{rec.reason}</p>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-faint">
          <span>Problem: {rec.problem}</span>
          {rec.impact ? <span>Impact: {rec.impact}</span> : null}
        </div>
      </Panel>

      <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {[
          ["Current stock", num(p.current_stock), `min ${p.min_stock} / max ${p.max_stock}`],
          ["Units sold", num(item.unitsSold), `${num(item.units30)} in last 30 days`],
          ["Revenue", money(item.revenue, c), `${item.revenueShare.toFixed(1)}% of total`],
          ["Cost value", money(item.inventoryValue, c), `${money(item.retailValue, c)} at retail`],
          ["Estimated profit", money(item.profit, c), `${money(p.selling_price - p.cost_price, c)}/unit`],
          ["Sales velocity", `${decimal(item.avgDailySales, 2)}/day`, "Weighted 7/30/90 day average"],
          ["Days of stock", days(item.daysOfStock), `${p.lead_time_days}-day lead time`],
          ["Inventory turnover", `${decimal(item.turnover)}×`, "Annualized from last 30 days"],
          ["Last sale", item.lastSaleDate ? shortDate(item.lastSaleDate) : "Never", item.daysSinceLastSale === null ? "No sales recorded" : `${item.daysSinceLastSale} days ago`],
          ["Reorder point", num(item.reorderPoint), `safety stock ${num(item.safetyStock)}`],
        ].map(([label, value, hint]) => (
          <Panel key={label} className="p-4">
            <Stat label={label!} value={value!} hint={hint!} />
          </Panel>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <p className="label-mono">Demand — last 90 days</p>
            <Trend pct={item.trendPct} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {item.trendPct > 2
              ? `Selling ${item.trendPct.toFixed(0)}% faster than the previous 30 days.`
              : item.trendPct < -2
                ? `Selling ${Math.abs(item.trendPct).toFixed(0)}% slower than the previous 30 days.`
                : "Demand is broadly flat versus the previous 30 days."}
          </p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={item.dailySeries}>
                <defs>
                  <linearGradient id="pFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--med)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--med)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v: string) => v.slice(5)}
                  tick={{ fill: "var(--faint)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fill: "var(--faint)", fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip
                  contentStyle={{
                    background: "var(--panel2)",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={(v: string) => shortDate(v)}
                />
                <Area type="monotone" dataKey="units" stroke="var(--med)" strokeWidth={2} fill="url(#pFill)" name="Units" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <p className="label-mono">Forecast</p>
          <div className="mt-4 space-y-3">
            {[
              ["Next 7 days", item.forecast7],
              ["Next 30 days", item.forecast30],
              ["Next 60 days", item.forecast60],
            ].map(([label, v]) => (
              <div key={label as string} className="flex items-center justify-between rounded-md bg-panel2 px-3 py-2">
                <span className="text-sm text-muted-foreground">{label as string}</span>
                <span className="font-mono text-sm">{Math.round(v as number)} units</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Stock of {num(p.current_stock)} against expected 30-day demand of{" "}
            {Math.round(item.forecast30)} units means about {days(item.daysOfStock)} of cover.
            {item.recommendedOrderQty > 0
              ? ` Recommended reorder: ${num(item.recommendedOrderQty)} units.`
              : " No reorder needed right now."}
          </p>
          <p className="mt-3 text-[11px] text-faint">
            Method: weighted moving average of the last 7, 30 and 90 days, adjusted for the recent
            trend and damped. No machine-learning model is involved.
          </p>
        </Panel>
      </div>
    </>
  );
}
