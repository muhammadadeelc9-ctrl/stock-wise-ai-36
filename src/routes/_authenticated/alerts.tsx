import { Link, createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, ErrorState, KpiCard, LoadingState, PageHeader } from "@/components/page";
import { Panel, PriorityBadge } from "@/components/signals";
import { Button } from "@/components/ui/button";
import { useAlerts, useInventory, useMarkAlertRead } from "@/lib/data";
import { shortDate } from "@/lib/format";
import type { Priority } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/alerts")({
  head: () => ({
    meta: [
      { title: "Alert center — AI Inventory Intelligence" },
      {
        name: "description",
        content: "Every live inventory signal that needs a decision, ranked by urgency.",
      },
      { property: "og:title", content: "Alert center" },
      {
        property: "og:description",
        content: "Stockouts, overstock and dead stock surfaced the moment they appear.",
      },
    ],
  }),
  component: AlertsPage,
});

const FILTERS: { key: Priority | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "critical", label: "Critical" },
  { key: "high", label: "High" },
  { key: "medium", label: "Medium" },
  { key: "low", label: "Low" },
];

function AlertsPage() {
  const { snapshot, isLoading, error } = useInventory();
  const { data: stored } = useAlerts();
  const markRead = useMarkAlertRead();
  const [filter, setFilter] = useState<Priority | "all">("all");

  if (isLoading) return <LoadingState />;
  if (error)
    return <ErrorState message={error instanceof Error ? error.message : "Unknown error"} />;
  if (!snapshot) return null;

  const live = snapshot.insights;
  const rows = filter === "all" ? live : live.filter((i) => i.priority === filter);
  const unread = (stored ?? []).filter((a) => !a.is_read);

  return (
    <>
      <PageHeader
        title="Alert center"
        subtitle="Alerts are recalculated from your current products and sales every time this page loads, so nothing here is stale."
        actions={
          unread.length > 0 ? (
            <Button
              variant="outline"
              disabled={markRead.isPending}
              onClick={() =>
                markRead.mutate(
                  unread.map((a) => a.id),
                  { onSuccess: () => toast.success("Alerts marked as read") },
                )
              }
            >
              Mark saved alerts read ({unread.length})
            </Button>
          ) : undefined
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Critical"
          value={String(live.filter((i) => i.priority === "critical").length)}
          accent="crit"
          hint="Act today"
        />
        <KpiCard
          label="High"
          value={String(live.filter((i) => i.priority === "high").length)}
          accent="high"
          hint="Act this week"
        />
        <KpiCard
          label="Medium"
          value={String(live.filter((i) => i.priority === "medium").length)}
          accent="med"
          hint="Keep an eye on it"
        />
        <KpiCard label="Total signals" value={String(live.length)} hint="Across all products" />
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
          icon={Bell}
          title="No alerts"
          description="Nothing in your inventory needs attention at this priority level."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((i) => (
            <Panel key={i.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <PriorityBadge priority={i.priority} />
                    <p className="font-medium text-foreground">{i.title}</p>
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">{i.detail}</p>
                  <p className="mt-1 text-sm text-foreground">Do this: {i.action}</p>
                  {i.impact ? <p className="mt-1 text-xs text-med">{i.impact}</p> : null}
                </div>
                {i.productId ? (
                  <Button asChild size="sm" variant="outline">
                    <Link to="/products/$id" params={{ id: i.productId }}>
                      Open product
                    </Link>
                  </Button>
                ) : null}
              </div>
            </Panel>
          ))}
        </div>
      )}

      {stored && stored.length > 0 ? (
        <Panel className="mt-6">
          <p className="label-mono">Saved alert history</p>
          <ul className="mt-3 space-y-2">
            {stored.slice(0, 20).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
                <span className={a.is_read ? "text-faint" : "text-foreground"}>{a.title}</span>
                <span className="font-mono text-xs text-faint">{shortDate(a.created_at)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </>
  );
}
