import { Link, createFileRoute } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";

import { EmptyState, ErrorState, KpiCard, LoadingState, PageHeader } from "@/components/page";
import { Panel, PriorityBadge, StatusBadge, Trend } from "@/components/signals";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useInventory } from "@/lib/data";
import { days, money, num } from "@/lib/format";
import type { Priority } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/risk")({
  head: () => ({
    meta: [
      { title: "Stockout risk — AI Inventory Intelligence" },
      {
        name: "description",
        content:
          "Products that will run out before a replacement order can arrive, ranked by urgency.",
      },
      { property: "og:title", content: "Stockout risk — AI Inventory Intelligence" },
      {
        property: "og:description",
        content: "See which products run out first and how many units to order.",
      },
    ],
  }),
  component: RiskPage,
});

const FILTERS: { key: Priority | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "critical", label: "Critical" },
  { key: "high", label: "High" },
  { key: "medium", label: "Medium" },
];

function RiskPage() {
  const { snapshot, isLoading, error } = useInventory();
  const [filter, setFilter] = useState<Priority | "all">("all");

  if (isLoading) return <LoadingState />;
  if (error)
    return <ErrorState message={error instanceof Error ? error.message : "Unknown error"} />;
  if (!snapshot) return null;

  const c = snapshot.currency;
  const atRisk = snapshot.items
    .filter((i) => i.riskLevel !== "low" || i.status === "out_of_stock")
    .sort((a, b) => a.stockoutDays - b.stockoutDays);
  const rows = filter === "all" ? atRisk : atRisk.filter((i) => i.riskLevel === filter);

  const lostRevenue = atRisk.reduce(
    (s, i) =>
      s +
      Math.max(0, i.forecast30 - i.product.current_stock) * Number(i.product.selling_price),
    0,
  );

  return (
    <>
      <PageHeader
        title="Stockout risk"
        subtitle="Days of cover are calculated as current stock divided by the weighted daily sales rate, then compared against each supplier's lead time."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Out of stock"
          value={num(snapshot.totals.outOfStock)}
          hint="Already losing sales"
          accent="crit"
        />
        <KpiCard
          label="Critical risk"
          value={num(atRisk.filter((i) => i.riskLevel === "critical").length)}
          hint="Runs out inside the lead time"
          accent="crit"
        />
        <KpiCard
          label="High risk"
          value={num(atRisk.filter((i) => i.riskLevel === "high").length)}
          hint="Less than 1.5x lead-time cover"
          accent="high"
        />
        <KpiCard
          label="Revenue exposed"
          value={money(lostRevenue, c, true)}
          hint="Unservable demand over 30 days"
          accent="high"
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={filter === f.key ? "default" : "outline"}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="No stockout risk detected"
          description="Every product currently covers its supplier lead time at the present sales rate."
        />
      ) : (
        <Panel className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Sells/day</TableHead>
                  <TableHead className="text-right">Runs out in</TableHead>
                  <TableHead className="text-right">Lead time</TableHead>
                  <TableHead className="text-right">Trend</TableHead>
                  <TableHead className="text-right">Order now</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((i) => (
                  <TableRow key={i.product.id}>
                    <TableCell>
                      <Link
                        to="/products/$id"
                        params={{ id: i.product.id }}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {i.product.name}
                      </Link>
                      <p className="font-mono text-xs text-faint">{i.product.sku}</p>
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={i.riskLevel} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={i.status} />
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {num(i.product.current_stock)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {i.avgDailySales.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {days(i.stockoutDays)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {i.product.lead_time_days}d
                    </TableCell>
                    <TableCell className="text-right">
                      <Trend pct={i.trendPct} />
                    </TableCell>
                    <TableCell className="text-right font-mono text-foreground">
                      {num(i.recommendedOrderQty)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>
      )}
    </>
  );
}
