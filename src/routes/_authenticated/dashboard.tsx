import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { KpiCard, ErrorState, LoadingState, PageHeader } from "@/components/page";
import { MatrixBadge, Panel, PriorityBadge, StatusBadge } from "@/components/signals";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MATRIX_LABEL } from "@/lib/analytics";
import { useInventory } from "@/lib/data";
import { money, num, shortDate } from "@/lib/format";
import type { MatrixClass } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — AI Inventory Intelligence" },
      { name: "description", content: "What needs your attention across stock, demand and cash today." },
      { property: "og:title", content: "Dashboard — AI Inventory Intelligence" },
      { property: "og:description", content: "Inventory health, risks and recommended actions at a glance." },
    ],
  }),
  component: Dashboard,
});

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const MATRIX_ORDER: MatrixClass[] = ["priority", "maintain", "watch", "reduce", "stop"];

function Dashboard() {
  const { snapshot, isLoading, error } = useInventory();

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error instanceof Error ? error.message : "Unknown error"} />;
  if (!snapshot) return null;

  const { totals, currency: c } = snapshot;

  if (totals.products === 0) {
    return (
      <>
        <PageHeader
          title={`${greeting()}, ${snapshot.business?.name ?? "there"}`}
          subtitle="There is nothing to analyze yet."
        />
        <Panel className="flex flex-col items-start gap-4">
          <Sparkles className="size-6 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Start with the demo business</h2>
            <p className="mt-1 max-w-lg text-sm text-muted-foreground">
              Load 22 products with 120 days of realistic sales history, or add your own products
              and import sales from a CSV.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link to="/settings">Load demo data</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/products" search={{}}>
                Add a product
              </Link>
            </Button>
          </div>
        </Panel>
      </>
    );
  }

  const topInsights = snapshot.insights.slice(0, 6);
  const matrixCounts = MATRIX_ORDER.map((m) => ({
    name: MATRIX_LABEL[m],
    key: m,
    value: snapshot.items.filter((i) => i.matrixClass === m).length,
  }));
  const topSelling = [...snapshot.items].sort((a, b) => b.units30 - a.units30).slice(0, 5);
  const topRevenue = [...snapshot.items].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  const valueSplit = [
    { name: "Healthy", value: totals.healthyValue, fill: "var(--low)" },
    { name: "At risk", value: totals.atRiskValue, fill: "var(--crit)" },
    { name: "Overstock", value: totals.overstockValue, fill: "var(--med)" },
    { name: "Slow moving", value: totals.slowValue, fill: "var(--faint)" },
  ];

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${snapshot.business?.name ?? "there"}`}
        subtitle="Here is what needs your attention today."
        actions={
          <Button asChild variant="outline">
            <Link to="/reports">View full report</Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total products" value={num(totals.products)} to="/products" search={{}} />
        <KpiCard label="Units in stock" value={num(totals.unitsInStock)} to="/products" search={{}} />
        <KpiCard
          label="Inventory value"
          value={money(totals.inventoryValue, c)}
          hint={`${money(totals.retailValue, c)} at retail`}
          to="/reports"
        />
        <KpiCard
          label="Units sold (30d)"
          value={num(totals.unitsSold30)}
          hint={`${money(totals.revenue30, c)} revenue`}
          to="/sales"
        />
        <KpiCard
          label="Low stock"
          value={num(totals.lowStock)}
          accent="high"
          to="/products"
          search={{ status: "low" }}
        />
        <KpiCard
          label="At risk of stockout"
          value={num(totals.atRisk)}
          accent="crit"
          to="/risk"
        />
        <KpiCard
          label="Overstocked"
          value={num(totals.overstocked)}
          accent="med"
          hint={money(totals.overstockValue, c)}
          to="/overstock"
        />
        <KpiCard
          label="Slow moving"
          value={num(totals.slowMoving)}
          hint={money(totals.slowValue, c)}
          to="/slow-moving"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="label-mono">Sales — last 30 days</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {num(totals.unitsSold30)} units · {money(totals.revenue30, c)}
              </p>
            </div>
          </div>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={snapshot.salesSeries}>
                <defs>
                  <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--radar)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--radar)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "var(--faint)", fontSize: 11 }}
                  tickFormatter={(v: string) => v.slice(5)}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--faint)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--panel2)",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={(v: string) => shortDate(v)}
                />
                <Area
                  type="monotone"
                  dataKey="units"
                  stroke="var(--radar)"
                  strokeWidth={2}
                  fill="url(#salesFill)"
                  name="Units"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <p className="label-mono">Inventory health score</p>
          <p className="mt-3 font-display text-5xl font-semibold text-primary">
            {snapshot.healthScore}
            <span className="text-lg text-muted-foreground">/100</span>
          </p>
          <div className="mt-5 space-y-3">
            {snapshot.healthBreakdown.map((b) => (
              <div key={b.label}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{b.label}</span>
                  <span className="font-mono text-foreground">{b.score}</span>
                </div>
                <Progress value={b.score} className="mt-1.5 h-1.5" />
                <p className="mt-1 text-[11px] text-faint">{b.detail}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <p className="label-mono">AI inventory insights</p>
            <Link
              to="/recommendations"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              All recommendations <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {topInsights.map((i) => (
              <div key={i.id} className="rounded-lg bg-panel2 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {i.productId ? (
                        <Link
                          to="/products/$id"
                          params={{ id: i.productId }}
                          className="hover:text-primary hover:underline"
                        >
                          {i.title}
                        </Link>
                      ) : (
                        i.title
                      )}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{i.detail}</p>
                  </div>
                  <PriorityBadge priority={i.priority} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                  <span className="rounded-md bg-primary/10 px-2 py-1 text-primary">{i.action}</span>
                  {i.impact ? <span className="text-faint">{i.impact}</span> : null}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <p className="label-mono">Where the money sits</p>
            <div className="mt-4 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={valueSplit} layout="vertical" margin={{ left: 12 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: "var(--faint)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={80}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--panel2)" }}
                    contentStyle={{
                      background: "var(--panel2)",
                      border: "1px solid var(--line)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => money(v, c)}
                  />
                  <Bar dataKey="value" radius={4}>
                    {valueSplit.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel>
            <p className="label-mono">Priority matrix</p>
            <div className="mt-4 space-y-2">
              {matrixCounts.map((m) => (
                <div key={m.key} className="flex items-center justify-between">
                  <MatrixBadge cls={m.key} />
                  <span className="font-mono text-sm">{m.value}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel>
          <p className="label-mono">Top selling (30 days)</p>
          <div className="mt-4 space-y-2">
            {topSelling.map((i) => (
              <Link
                key={i.product.id}
                to="/products/$id"
                params={{ id: i.product.id }}
                className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-panel2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm">{i.product.name}</p>
                  <p className="text-xs text-faint">{i.product.sku}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm">{num(i.units30)}</span>
                  <StatusBadge status={i.status} />
                </div>
              </Link>
            ))}
          </div>
        </Panel>
        <Panel>
          <p className="label-mono">Top revenue (all time)</p>
          <div className="mt-4 space-y-2">
            {topRevenue.map((i) => (
              <Link
                key={i.product.id}
                to="/products/$id"
                params={{ id: i.product.id }}
                className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-panel2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm">{i.product.name}</p>
                  <p className="text-xs text-faint">{i.revenueShare.toFixed(0)}% of revenue</p>
                </div>
                <span className="font-mono text-sm">{money(i.revenue, c, true)}</span>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
