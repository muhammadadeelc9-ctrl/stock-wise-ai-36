import { Link, createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, ErrorState, KpiCard, LoadingState, PageHeader } from "@/components/page";
import { Panel, PriorityBadge, StatusBadge } from "@/components/signals";
import { Button } from "@/components/ui/button";
import { sortByPriority } from "@/lib/analytics";
import { useInventory, useRecommendationStates, useSetRecommendationState } from "@/lib/data";
import { downloadFile, toCsv } from "@/lib/csv";
import { money, num } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/recommendations")({
  head: () => ({
    meta: [
      { title: "Smart reorder recommendations — AI Inventory Intelligence" },
      {
        name: "description",
        content:
          "Calculated reorder quantities with the reasoning behind every recommended action.",
      },
      { property: "og:title", content: "Smart reorder recommendations" },
      {
        property: "og:description",
        content: "What to buy, how much, and why — derived from your own sales history.",
      },
    ],
  }),
  component: RecommendationsPage,
});

const TABS = [
  { key: "action", label: "Needs action" },
  { key: "list", label: "Purchase list" },
  { key: "all", label: "All products" },
] as const;

function RecommendationsPage() {
  const { snapshot, isLoading, error } = useInventory();
  const { data: states } = useRecommendationStates();
  const setState = useSetRecommendationState();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("action");

  if (isLoading) return <LoadingState />;
  if (error)
    return <ErrorState message={error instanceof Error ? error.message : "Unknown error"} />;
  if (!snapshot) return null;

  const c = snapshot.currency;
  const stateByProduct = new Map((states ?? []).map((s) => [s.product_id, s.status]));

  const ranked = sortByPriority(
    snapshot.items.map((i) => ({ item: i, priority: i.recommendation.priority })),
  ).map((r) => r.item);

  const rows =
    tab === "list"
      ? ranked.filter((i) => stateByProduct.get(i.product.id) === "purchase_list")
      : tab === "action"
        ? ranked.filter(
            (i) =>
              stateByProduct.get(i.product.id) !== "ignored" &&
              (i.recommendation.priority === "critical" ||
                i.recommendation.priority === "high" ||
                i.needsReorder),
          )
        : ranked;

  const purchaseList = ranked.filter(
    (i) => stateByProduct.get(i.product.id) === "purchase_list",
  );
  const purchaseCost = purchaseList.reduce(
    (s, i) => s + i.recommendedOrderQty * Number(i.product.cost_price),
    0,
  );

  function exportList() {
    const list = purchaseList.length > 0 ? purchaseList : rows;
    if (list.length === 0) {
      toast.error("Nothing to export yet");
      return;
    }
    const csv = toCsv(
      list.map((i) => ({
        product: i.product.name,
        sku: i.product.sku,
        supplier: i.product.supplier,
        current_stock: i.product.current_stock,
        order_quantity: i.recommendedOrderQty,
        unit_cost: Number(i.product.cost_price),
        order_cost: i.recommendedOrderQty * Number(i.product.cost_price),
        priority: i.recommendation.priority,
        reason: i.recommendation.reason,
      })),
    );
    downloadFile("purchase-list.csv", csv);
    toast.success("Purchase list exported");
  }

  return (
    <>
      <PageHeader
        title="Smart recommendations"
        subtitle="Order quantities cover the supplier lead time plus 30 days of demand and a safety buffer, minus what is already on the shelf."
        actions={
          <Button variant="outline" onClick={exportList}>
            Export purchase list
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Urgent actions"
          value={num(
            ranked.filter((i) => i.recommendation.priority === "critical").length,
          )}
          accent="crit"
          hint="Reorder or act today"
        />
        <KpiCard
          label="Reorder suggested"
          value={num(ranked.filter((i) => i.needsReorder).length)}
          accent="high"
          hint="Below the calculated reorder point"
        />
        <KpiCard
          label="On purchase list"
          value={num(purchaseList.length)}
          hint="Products you marked to buy"
        />
        <KpiCard
          label="Purchase list cost"
          value={money(purchaseCost, c, true)}
          hint="At current cost prices"
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button
            key={t.key}
            size="sm"
            variant={tab === t.key ? "default" : "outline"}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No recommendations here"
          description="Nothing in this view needs a decision right now. Try another tab or add more sales history."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((i) => {
            const state = stateByProduct.get(i.product.id);
            return (
              <Panel key={i.product.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to="/products/$id"
                        params={{ id: i.product.id }}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {i.product.name}
                      </Link>
                      <span className="font-mono text-xs text-faint">{i.product.sku}</span>
                      <PriorityBadge priority={i.recommendation.priority} />
                      <StatusBadge status={i.status} />
                      {state === "purchase_list" ? (
                        <span className="rounded-full bg-low/15 px-2.5 py-0.5 text-[11px] text-low">
                          On purchase list
                        </span>
                      ) : null}
                      {state === "ignored" ? (
                        <span className="rounded-full bg-panel2 px-2.5 py-0.5 text-[11px] text-faint">
                          Ignored
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {i.recommendation.action}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {i.recommendation.reason}
                    </p>
                    {i.recommendation.impact ? (
                      <p className="mt-1 text-xs text-med">{i.recommendation.impact}</p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs text-faint">
                      <span>Stock {num(i.product.current_stock)}</span>
                      <span>Reorder point {num(i.reorderPoint)}</span>
                      <span>Suggested {num(i.recommendedOrderQty)} units</span>
                      <span>
                        Cost{" "}
                        {money(i.recommendedOrderQty * Number(i.product.cost_price), c)}
                      </span>
                      <span>Supplier {i.product.supplier}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <Button
                      size="sm"
                      disabled={setState.isPending}
                      onClick={() =>
                        setState.mutate(
                          {
                            product_id: i.product.id,
                            status: "purchase_list",
                            quantity: i.recommendedOrderQty,
                          },
                          { onSuccess: () => toast.success("Added to purchase list") },
                        )
                      }
                    >
                      Add to purchase list
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={setState.isPending}
                      onClick={() =>
                        setState.mutate(
                          { product_id: i.product.id, status: "ignored" },
                          { onSuccess: () => toast.success("Recommendation ignored") },
                        )
                      }
                    >
                      Ignore
                    </Button>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </>
  );
}
