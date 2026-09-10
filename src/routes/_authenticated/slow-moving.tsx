import { Link, createFileRoute } from "@tanstack/react-router";
import { TrendingDown } from "lucide-react";

import { EmptyState, ErrorState, KpiCard, LoadingState, PageHeader } from "@/components/page";
import { DemandBadge, Panel, StatusBadge } from "@/components/signals";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useInventory } from "@/lib/data";
import { money, num } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/slow-moving")({
  head: () => ({
    meta: [
      { title: "Slow-moving & dead stock — AI Inventory Intelligence" },
      {
        name: "description",
        content: "Products that have stopped selling, how long they have been idle, and what they cost you.",
      },
      { property: "og:title", content: "Slow-moving & dead stock" },
      {
        property: "og:description",
        content: "Spot dead stock early and free the cash locked inside it.",
      },
    ],
  }),
  component: SlowMovingPage,
});

function bucket(daysIdle: number | null) {
  if (daysIdle === null) return "Never sold";
  if (daysIdle >= 90) return "Dead stock (90+ days)";
  if (daysIdle >= 60) return "Idle 60–89 days";
  if (daysIdle >= 30) return "Idle 30–59 days";
  return "Slowing down";
}

function SlowMovingPage() {
  const { snapshot, isLoading, error } = useInventory();

  if (isLoading) return <LoadingState />;
  if (error)
    return <ErrorState message={error instanceof Error ? error.message : "Unknown error"} />;
  if (!snapshot) return null;

  const c = snapshot.currency;
  const rows = snapshot.items
    .filter(
      (i) =>
        i.status === "slow_moving" ||
        i.demandLevel === "very_low" ||
        (i.daysSinceLastSale ?? 999) >= 30,
    )
    .sort((a, b) => b.inventoryValue - a.inventoryValue);

  const dead = rows.filter((i) => (i.daysSinceLastSale ?? 999) >= 90);
  const lockedValue = rows.reduce((s, i) => s + i.inventoryValue, 0);
  const deadValue = dead.reduce((s, i) => s + i.inventoryValue, 0);

  return (
    <>
      <PageHeader
        title="Slow-moving & dead stock"
        subtitle="A product counts as slow moving when it sold nothing in the last 30 days or its daily rate is effectively zero while stock remains."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Slow-moving products" value={num(rows.length)} hint="Idle 30 days or more" />
        <KpiCard
          label="Dead stock"
          value={num(dead.length)}
          accent="crit"
          hint="No sale in 90+ days"
        />
        <KpiCard
          label="Cash locked"
          value={money(lockedValue, c, true)}
          accent="high"
          hint="At cost price"
        />
        <KpiCard
          label="Dead stock value"
          value={money(deadValue, c, true)}
          accent="crit"
          hint="Strongest case for clearance"
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={TrendingDown}
          title="No slow-moving stock"
          description="Every product in your catalogue has sold recently."
        />
      ) : (
        <Panel className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Demand</TableHead>
                  <TableHead>Age bucket</TableHead>
                  <TableHead className="text-right">Last sold</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Value</TableHead>
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
                    <TableCell>
                      <DemandBadge level={i.demandLevel} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {bucket(i.daysSinceLastSale)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {i.daysSinceLastSale === null ? "never" : `${i.daysSinceLastSale}d ago`}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {num(i.product.current_stock)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-high">
                      {money(i.inventoryValue, c)}
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
