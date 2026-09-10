import { Link, createFileRoute } from "@tanstack/react-router";
import { PackageX } from "lucide-react";

import { EmptyState, ErrorState, KpiCard, LoadingState, PageHeader } from "@/components/page";
import { Panel, StatusBadge } from "@/components/signals";
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

export const Route = createFileRoute("/_authenticated/overstock")({
  head: () => ({
    meta: [
      { title: "Overstock detection — AI Inventory Intelligence" },
      {
        name: "description",
        content: "Products holding far more stock than demand justifies, and the cash tied up in them.",
      },
      { property: "og:title", content: "Overstock detection" },
      {
        property: "og:description",
        content: "Find excess units, the money they lock up, and what to do about it.",
      },
    ],
  }),
  component: OverstockPage,
});

function OverstockPage() {
  const { snapshot, isLoading, error } = useInventory();

  if (isLoading) return <LoadingState />;
  if (error)
    return <ErrorState message={error instanceof Error ? error.message : "Unknown error"} />;
  if (!snapshot) return null;

  const c = snapshot.currency;
  const rows = snapshot.items
    .filter((i) => i.status === "overstock" || i.excessUnits > 0)
    .sort((a, b) => b.excessValue - a.excessValue);

  const excessValue = rows.reduce((s, i) => s + i.excessValue, 0);
  const excessUnits = rows.reduce((s, i) => s + i.excessUnits, 0);

  return (
    <>
      <PageHeader
        title="Overstock detection"
        subtitle="Excess is stock above 30 days of expected demand plus safety stock. Anything beyond that is cash sitting on a shelf."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Overstocked products"
          value={num(snapshot.totals.overstocked)}
          accent="med"
          hint="More than 60 days of cover"
        />
        <KpiCard label="Excess units" value={num(excessUnits)} hint="Above what demand needs" />
        <KpiCard
          label="Cash tied up"
          value={money(excessValue, c, true)}
          accent="med"
          hint="Excess units at cost price"
        />
        <KpiCard
          label="Share of inventory"
          value={`${
            snapshot.totals.inventoryValue > 0
              ? ((excessValue / snapshot.totals.inventoryValue) * 100).toFixed(0)
              : "0"
          }%`}
          hint="Of total stock value"
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={PackageX}
          title="No overstock detected"
          description="Every product is carrying a stock level in line with its demand."
        />
      ) : (
        <Panel className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">30-day demand</TableHead>
                  <TableHead className="text-right">Cover</TableHead>
                  <TableHead className="text-right">Excess units</TableHead>
                  <TableHead className="text-right">Cash tied up</TableHead>
                  <TableHead>Suggested action</TableHead>
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
                      <StatusBadge status={i.status} />
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {num(i.product.current_stock)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {Math.round(i.forecast30)}
                    </TableCell>
                    <TableCell className="text-right font-mono">{days(i.daysOfStock)}</TableCell>
                    <TableCell className="text-right font-mono text-med">
                      {num(i.excessUnits)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-med">
                      {money(i.excessValue, c)}
                    </TableCell>
                    <TableCell className="max-w-xs text-sm text-muted-foreground">
                      {i.recommendation.action}
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
