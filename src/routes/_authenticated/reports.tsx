import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { ErrorState, KpiCard, LoadingState, PageHeader, Stat } from "@/components/page";
import { Panel } from "@/components/signals";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { downloadFile, toCsv } from "@/lib/csv";
import { useInventory, useSales } from "@/lib/data";
import { decimal, money, num } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports & exports — AI Inventory Intelligence" },
      {
        name: "description",
        content: "Valuation, performance and action reports you can download as CSV.",
      },
      { property: "og:title", content: "Reports & exports" },
      {
        property: "og:description",
        content: "Download inventory valuation, sales performance and reorder plans.",
      },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { snapshot, isLoading, error } = useInventory();
  const { data: sales } = useSales();

  if (isLoading) return <LoadingState />;
  if (error)
    return <ErrorState message={error instanceof Error ? error.message : "Unknown error"} />;
  if (!snapshot) return null;

  const c = snapshot.currency;
  const t = snapshot.totals;

  function save(name: string, rows: Record<string, string | number | null>[]) {
    if (rows.length === 0) {
      toast.error("Nothing to export yet");
      return;
    }
    downloadFile(name, toCsv(rows));
    toast.success(`${name} downloaded`);
  }

  const valuationRows = () =>
    snapshot.items.map((i) => ({
      product: i.product.name,
      sku: i.product.sku,
      category: i.product.category,
      stock: i.product.current_stock,
      cost_price: Number(i.product.cost_price),
      cost_value: i.inventoryValue,
      retail_value: i.retailValue,
      status: i.status,
    }));

  const performanceRows = () =>
    snapshot.items.map((i) => ({
      product: i.product.name,
      sku: i.product.sku,
      units_sold: i.unitsSold,
      units_30d: i.units30,
      revenue: i.revenue,
      profit: i.profit,
      revenue_share_pct: Number(i.revenueShare.toFixed(1)),
      demand: i.demandLevel,
      turnover: Number(i.turnover.toFixed(2)),
    }));

  const actionRows = () =>
    snapshot.items
      .filter((i) => i.recommendation.priority !== "low")
      .map((i) => ({
        product: i.product.name,
        sku: i.product.sku,
        priority: i.recommendation.priority,
        problem: i.recommendation.problem,
        action: i.recommendation.action,
        reason: i.recommendation.reason,
        order_quantity: i.recommendedOrderQty,
      }));

  const salesRows = () =>
    (sales ?? []).map((s) => ({
      date: s.sale_date,
      product: snapshot.byId[s.product_id]?.product.name ?? s.product_id,
      sku: snapshot.byId[s.product_id]?.product.sku ?? "",
      quantity: s.quantity,
      unit_price: Number(s.unit_price),
      revenue: s.quantity * Number(s.unit_price),
    }));

  const byCategory = new Map<
    string,
    { products: number; units: number; value: number; revenue: number }
  >();
  for (const i of snapshot.items) {
    const row = byCategory.get(i.product.category) ?? {
      products: 0,
      units: 0,
      value: 0,
      revenue: 0,
    };
    row.products += 1;
    row.units += i.product.current_stock;
    row.value += i.inventoryValue;
    row.revenue += i.revenue;
    byCategory.set(i.product.category, row);
  }

  const reports = [
    { name: "inventory-valuation.csv", label: "Inventory valuation", get: valuationRows },
    { name: "product-performance.csv", label: "Product performance", get: performanceRows },
    { name: "action-plan.csv", label: "Action plan", get: actionRows },
    { name: "sales-history.csv", label: "Sales history", get: salesRows },
  ];

  return (
    <>
      <PageHeader
        title="Reports & exports"
        subtitle="Point-in-time summaries of your catalogue, calculated from the same engine that powers every other screen."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Stock value (cost)" value={money(t.inventoryValue, c, true)} />
        <KpiCard label="Retail value" value={money(t.retailValue, c, true)} />
        <KpiCard label="Revenue (all time)" value={money(t.revenue, c, true)} />
        <KpiCard label="Health score" value={`${snapshot.healthScore}/100`} accent="low" />
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-2">
        {reports.map((r) => (
          <Panel key={r.name} className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-foreground">{r.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{r.name}</p>
            </div>
            <Button variant="outline" onClick={() => save(r.name, r.get())}>
              <Download className="size-4" />
              Download
            </Button>
          </Panel>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <p className="label-mono">Inventory summary</p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Stat label="Products" value={num(t.products)} />
            <Stat label="Units in stock" value={num(t.unitsInStock)} />
            <Stat label="Units sold (30d)" value={num(t.unitsSold30)} />
            <Stat label="Revenue (30d)" value={money(t.revenue30, c)} />
            <Stat label="Healthy stock value" value={money(t.healthyValue, c)} />
            <Stat label="At-risk value" value={money(t.atRiskValue, c)} />
            <Stat label="Overstock value" value={money(t.overstockValue, c)} />
            <Stat label="Slow-moving value" value={money(t.slowValue, c)} />
          </div>
        </Panel>

        <Panel className="p-0">
          <p className="label-mono px-5 pt-5">By category</p>
          <div className="mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Products</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">Stock value</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...byCategory.entries()]
                  .sort((a, b) => b[1].value - a[1].value)
                  .map(([name, row]) => (
                    <TableRow key={name}>
                      <TableCell className="text-foreground">{name}</TableCell>
                      <TableCell className="text-right font-mono">{row.products}</TableCell>
                      <TableCell className="text-right font-mono">{num(row.units)}</TableCell>
                      <TableCell className="text-right font-mono">
                        {money(row.value, c)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {money(row.revenue, c)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </Panel>
      </div>

      <Panel className="mt-4">
        <p className="label-mono">Health breakdown</p>
        <div className="mt-4 space-y-3">
          {snapshot.healthBreakdown.map((b) => (
            <div key={b.label}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground">{b.label}</span>
                <span className="font-mono text-muted-foreground">
                  {b.score}/100 · weight {decimal(b.weight * 100, 0)}%
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-panel2">
                <div
                  className="h-1.5 rounded-full bg-primary"
                  style={{ width: `${Math.max(2, Math.min(100, b.score))}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{b.detail}</p>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
