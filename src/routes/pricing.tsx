import { Link, createFileRoute } from "@tanstack/react-router";
import { Boxes, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/signals";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — AI Inventory Intelligence" },
      {
        name: "description",
        content:
          "Starter, Growth and Business plans for inventory forecasting, stockout prediction and reorder recommendations.",
      },
      { property: "og:title", content: "Pricing — AI Inventory Intelligence" },
      {
        property: "og:description",
        content: "Three simple plans for small businesses that want inventory decisions, not dashboards.",
      },
    ],
  }),
  component: Pricing,
});

const PLANS = [
  {
    name: "Starter",
    price: "$19",
    blurb: "For a single shop finding its footing.",
    features: [
      "Up to 100 products",
      "Sales history and CSV import",
      "Inventory health score",
      "Stockout risk and reorder list",
      "Email alerts",
    ],
  },
  {
    name: "Growth",
    price: "$49",
    blurb: "For growing catalogues and multiple suppliers.",
    featured: true,
    features: [
      "Up to 2,000 products",
      "Demand forecasting 7 / 30 / 60 days",
      "Overstock and dead-stock analysis",
      "Product priority matrix",
      "What-if simulator",
      "AI inventory assistant",
    ],
  },
  {
    name: "Business",
    price: "$129",
    blurb: "For multi-brand operations that buy at scale.",
    features: [
      "Unlimited products",
      "Full movement audit trail",
      "Reports and CSV exports",
      "Advanced capital analysis",
      "Priority support",
    ],
  },
];

function Pricing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <Boxes className="size-5 text-primary" />
            <span className="font-display text-sm font-semibold">AI Inventory Intelligence</span>
          </Link>
          <Button asChild size="sm">
            <Link to="/auth" search={{ mode: "signup" }}>
              Get started
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-20">
        <p className="label-mono">Pricing</p>
        <h1 className="mt-3 font-display text-4xl font-semibold">
          Pay for clarity, not for storage.
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Every plan includes the full analysis engine. Larger plans simply cover bigger catalogues
          and deeper reporting.
        </p>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {PLANS.map((p) => (
            <Panel
              key={p.name}
              className={cn("flex flex-col", p.featured && "ring-2 ring-primary/60")}
            >
              {p.featured ? <p className="label-mono text-primary">Most popular</p> : null}
              <h2 className="mt-1 text-lg font-semibold">{p.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{p.blurb}</p>
              <p className="mt-6 font-display text-4xl font-semibold">
                {p.price}
                <span className="text-sm font-normal text-muted-foreground"> /month</span>
              </p>
              <ul className="mt-6 flex-1 space-y-3 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-low" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-8" variant={p.featured ? "default" : "outline"}>
                <Link to="/auth" search={{ mode: "signup" }}>
                  Choose {p.name}
                </Link>
              </Button>
            </Panel>
          ))}
        </div>
      </main>
    </div>
  );
}
