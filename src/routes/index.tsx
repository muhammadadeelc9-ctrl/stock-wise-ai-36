import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  Boxes,
  LineChart,
  PackageX,
  ShieldCheck,
  Sparkles,
  TrendingDown,
} from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/signals";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Inventory Intelligence — Know Your Inventory Before It Becomes a Problem" },
      {
        name: "description",
        content:
          "Analyze stock, sales and demand to know exactly what to reorder, what to reduce and where your money is stuck.",
      },
      {
        property: "og:title",
        content: "AI Inventory Intelligence — Know Your Inventory Before It Becomes a Problem",
      },
      {
        property: "og:description",
        content:
          "Demand forecasting, stockout prediction, overstock detection and reorder recommendations for small businesses.",
      },
    ],
  }),
  component: Landing,
});

const PROBLEMS = [
  "Best sellers run out while you find out from a customer",
  "Cash sits frozen in stock nobody has bought in months",
  "Purchase decisions are made from memory and gut feel",
  "Spreadsheets show what happened, never what to do next",
];

const STEPS = [
  {
    icon: Boxes,
    title: "Bring in your inventory",
    body: "Add products by hand or import a CSV. Sales history comes in the same way.",
  },
  {
    icon: Activity,
    title: "We analyze every product",
    body: "Velocity, demand level, coverage, safety stock, reorder point, excess and tied-up capital.",
  },
  {
    icon: Sparkles,
    title: "You get decisions, not dashboards",
    body: "A prioritized list of what to reorder, what to reduce and what to stop buying.",
  },
];

const FEATURES = [
  {
    icon: BrainCircuit,
    title: "Smart inventory insights",
    body: "Every product carries a plain-English problem, reason, recommended action and priority.",
  },
  {
    icon: LineChart,
    title: "Demand forecasting",
    body: "Weighted moving average with a trend adjustment projects the next 7, 30 and 60 days — and shows the maths.",
  },
  {
    icon: AlertTriangle,
    title: "Stockout prediction",
    body: "Days remaining measured against real supplier lead time, so you reorder before the shelf empties.",
  },
  {
    icon: PackageX,
    title: "Overstock detection",
    body: "Excess units, months of cover and the exact value locked in stock you bought too much of.",
  },
  {
    icon: TrendingDown,
    title: "Slow-moving & dead stock",
    body: "Days since last sale, units idle and the cash you could release by clearing them.",
  },
  {
    icon: ShieldCheck,
    title: "Reorder recommendations",
    body: "Recommended quantity from expected demand, lead time and safety stock — with the reason attached.",
  },
];

const FAQS = [
  {
    q: "Do I need an AI API key?",
    a: "No. The analysis engine runs locally on your own numbers — velocity, coverage, forecasts and recommendations are calculated deterministically, so the same data always produces the same answer.",
  },
  {
    q: "Can I try it without entering my own data?",
    a: "Yes. Load the demo business from Settings and you get 22 products with 120 days of realistic sales history covering high demand, overstock, dead stock and stockouts.",
  },
  {
    q: "How is the reorder quantity calculated?",
    a: "Average daily sales × (supplier lead time + 30 days of cover) + safety stock − current stock. Every recommendation shows its own reasoning.",
  },
  {
    q: "Is my data private?",
    a: "Every record is scoped to your account at the database level. No other account can read your products, sales or movements.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-line bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <Boxes className="size-5 text-primary" />
            <span className="font-display text-sm font-semibold tracking-tight">
              AI Inventory Intelligence
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              to="/pricing"
              className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Pricing
            </Link>
            <Link to="/auth" className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
              Sign in
            </Link>
            <Button asChild size="sm">
              <Link to="/auth" search={{ mode: "signup" }}>
                Get started
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-20 pb-16">
        <p className="label-mono">Inventory decision support</p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl leading-tight font-semibold md:text-6xl">
          Know Your Inventory Before It Becomes a Problem.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          AI Inventory Intelligence analyzes your stock, sales and demand to tell you what to
          reorder, what to reduce, and where your money is stuck.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/auth" search={{ mode: "signup" }}>
              Start Analyzing Inventory <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth" search={{ mode: "signup", demo: "1" }}>
              View Demo
            </Link>
          </Button>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-4">
          {[
            ["Health score", "82/100"],
            ["Stockout alerts", "Before lead time"],
            ["Forecast horizon", "7 / 30 / 60 days"],
            ["Capital visibility", "Down to the unit"],
          ].map(([label, value]) => (
            <Panel key={label}>
              <p className="label-mono">{label}</p>
              <p className="mt-2 font-display text-lg font-semibold">{value}</p>
            </Panel>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-panel/40 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p className="label-mono">The problem</p>
          <h2 className="mt-3 max-w-2xl text-3xl">
            Inventory mistakes are invisible until they are expensive.
          </h2>
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {PROBLEMS.map((p) => (
              <li key={p} className="panel-card flex gap-3 p-5 text-sm text-muted-foreground">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-crit" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p className="label-mono">How it works</p>
          <h2 className="mt-3 text-3xl">Data → analysis → recommendation → action</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Panel key={s.title}>
                <div className="flex items-center gap-3">
                  <s.icon className="size-5 text-primary" />
                  <span className="label-mono">Step {i + 1}</span>
                </div>
                <h3 className="mt-4 text-base font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </Panel>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-panel/40 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p className="label-mono">Capabilities</p>
          <h2 className="mt-3 text-3xl">Everything a buyer needs to decide today</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {FEATURES.map((f) => (
              <Panel key={f.title}>
                <f.icon className="size-5 text-primary" />
                <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </Panel>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p className="label-mono">Dashboard preview</p>
          <h2 className="mt-3 text-3xl">Your morning briefing, already prioritized</h2>
          <Panel className="mt-8">
            <div className="grid gap-3 md:grid-cols-4">
              {[
                ["Inventory value", "$25,400"],
                ["Units in stock", "3,180"],
                ["At risk", "6 products"],
                ["Money stuck", "$6,100"],
              ].map(([l, v]) => (
                <div key={l} className="rounded-lg bg-panel2 p-4">
                  <p className="label-mono">{l}</p>
                  <p className="mt-2 font-display text-xl font-semibold">{v}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-3">
              {[
                ["critical", "Black Hoodie may stock out in 5 days", "Reorder 80 units now"],
                ["medium", "Red Jacket has not sold in 32 days", "Promote or discount"],
                ["high", "Blue T-Shirt demand increased 28%", "Increase next order"],
              ].map(([p, title, action]) => (
                <div
                  key={title}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-panel2 p-4"
                >
                  <div>
                    <p className="text-sm font-medium">{title}</p>
                    <p className="text-xs text-muted-foreground">{action}</p>
                  </div>
                  <span className="label-mono">{p}</span>
                </div>
              ))}
            </div>
          </Panel>
          <p className="mt-3 text-xs text-muted-foreground">
            Illustrative figures. Your dashboard is calculated entirely from your own products and
            sales.
          </p>
        </div>
      </section>

      <section className="border-t border-line bg-panel/40 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p className="label-mono">Pricing</p>
          <h2 className="mt-3 text-3xl">Simple plans that grow with your catalogue</h2>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Starter, Growth and Business plans cover everything from a first shop to a multi-brand
            operation.
          </p>
          <Button asChild className="mt-6" variant="outline">
            <Link to="/pricing">
              See plans <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6">
          <p className="label-mono">FAQ</p>
          <h2 className="mt-3 text-3xl">Questions people ask first</h2>
          <Accordion type="single" collapsible className="mt-6">
            {FAQS.map((f) => (
              <AccordionItem key={f.q} value={f.q}>
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <footer className="border-t border-line py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} AI Inventory Intelligence</span>
          <div className="flex gap-4">
            <Link to="/pricing" className="hover:text-foreground">
              Pricing
            </Link>
            <Link to="/auth" className="hover:text-foreground">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
