import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { ErrorState, LoadingState, PageHeader, Stat } from "@/components/page";
import { Panel } from "@/components/signals";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { simulate } from "@/lib/analytics";
import { useInventory } from "@/lib/data";
import { days, money, num } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/forecast")({
  head: () => ({
    meta: [
      { title: "Forecast & what-if — AI Inventory Intelligence" },
      { name: "description", content: "Expected demand for the next 7, 30 and 60 days, plus a what-if simulator." },
      { property: "og:title", content: "Forecast & what-if — AI Inventory Intelligence" },
      { property: "og:description", content: "See how demand and lead-time changes move your reorder plan." },
    ],
  }),
  component: ForecastPage,
});

function ForecastPage() {
  const { snapshot, isLoading, error } = useInventory();
  const [selected, setSelected] = useState("");
  const [demandChange, setDemandChange] = useState(0);
  const [leadChange, setLeadChange] = useState(0);

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error instanceof Error ? error.message : "Unknown error"} />;
  if (!snapshot) return null;

  const c = snapshot.currency;
  const rows = [...snapshot.items].sort((a, b) => b.forecast30 - a.forecast30);
  const item = snapshot.byId[selected] ?? rows[0];
  const sim = item ? simulate(item, { demandChangePct: demandChange, leadTimeChangeDays: leadChange }) : null;

  return (
    <>
      <PageHeader
        title="Demand forecast"
        subtitle="Weighted moving average of the last 7, 30 and 90 days, adjusted for the recent trend and damped. No machine-learning model is involved."
      />

      {item ? (
        <Panel className="mb-4">
          <p className="label-mono">Worked example — {item.product.name}</p>
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
            Stock is {num(item.product.current_stock)} units. Expected demand over the next 30 days
            is about {Math.round(item.forecast30)} units, which is{" "}
            {item.avgDailySales.toFixed(2)} units per day. Dividing stock by that daily rate gives
            roughly {days(item.daysOfStock)} of cover, against a supplier lead time of{" "}
            {item.product.lead_time_days} days.{" "}
            {item.recommendedOrderQty > 0
              ? `Recommended reorder is ${num(item.recommendedOrderQty)} units — enough for the lead time plus 30 days of cover and ${num(item.safetyStock)} units of safety stock.`
              : "No reorder is needed at this rate."}
          </p>
        </Panel>
      ) : null}

      <Panel className="mb-6 overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Daily rate</TableHead>
              <TableHead className="text-right">Next 7d</TableHead>
              <TableHead className="text-right">Next 30d</TableHead>
              <TableHead className="text-right">Next 60d</TableHead>
              <TableHead className="text-right">Cover</TableHead>
              <TableHead className="text-right">Reorder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((i) => (
              <TableRow key={i.product.id}>
                <TableCell>
                  <Link
                    to="/products/$id"
                    params={{ id: i.product.id }}
                    className="hover:text-primary hover:underline"
                  >
                    {i.product.name}
                  </Link>
                </TableCell>
                <TableCell className="text-right font-mono">{num(i.product.current_stock)}</TableCell>
                <TableCell className="text-right font-mono">{i.avgDailySales.toFixed(2)}</TableCell>
                <TableCell className="text-right font-mono">{Math.round(i.forecast7)}</TableCell>
                <TableCell className="text-right font-mono">{Math.round(i.forecast30)}</TableCell>
                <TableCell className="text-right font-mono">{Math.round(i.forecast60)}</TableCell>
                <TableCell className="text-right font-mono">{days(i.daysOfStock)}</TableCell>
                <TableCell className="text-right font-mono">
                  {i.recommendedOrderQty > 0 ? num(i.recommendedOrderQty) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>

      <PageHeader title="Inventory what-if" subtitle="Change demand or lead time and see the impact." />
      <Panel>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="label-mono">Product</p>
              <Select value={item?.product.id ?? ""} onValueChange={setSelected}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a product" />
                </SelectTrigger>
                <SelectContent>
                  {snapshot.items.map((i) => (
                    <SelectItem key={i.product.id} value={i.product.id}>
                      {i.product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="label-mono">Demand change: {demandChange > 0 ? "+" : ""}{demandChange}%</p>
              <Slider
                value={[demandChange]}
                min={-50}
                max={50}
                step={5}
                onValueChange={(v) => setDemandChange(v[0] ?? 0)}
              />
            </div>
            <div className="space-y-2">
              <p className="label-mono">
                Lead time change: {leadChange > 0 ? "+" : ""}
                {leadChange} days
              </p>
              <Slider
                value={[leadChange]}
                min={-10}
                max={30}
                step={1}
                onValueChange={(v) => setLeadChange(v[0] ?? 0)}
              />
            </div>
          </div>

          {sim && item ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
              <Panel className="bg-panel2">
                <p className="label-mono">Today</p>
                <div className="mt-3 space-y-3">
                  <Stat label="Days until stockout" value={days(sim.baseStockoutDays)} />
                  <Stat label="30-day demand" value={`${Math.round(sim.baseDemand30)} units`} />
                  <Stat label="Recommended order" value={`${num(sim.baseOrderQty)} units`} />
                  <Stat label="Order cost" value={money(sim.baseValue, c)} />
                </div>
              </Panel>
              <Panel className="bg-panel2 ring-1 ring-primary/40">
                <p className="label-mono text-primary">Simulated</p>
                <div className="mt-3 space-y-3">
                  <Stat label="Days until stockout" value={days(sim.newStockoutDays)} />
                  <Stat label="30-day demand" value={`${Math.round(sim.newDemand30)} units`} />
                  <Stat label="Recommended order" value={`${num(sim.newOrderQty)} units`} />
                  <Stat label="Order cost" value={money(sim.newValue, c)} />
                </div>
              </Panel>
              <p className="text-sm text-muted-foreground sm:col-span-2">
                With demand {demandChange >= 0 ? "up" : "down"} {Math.abs(demandChange)}% and a lead
                time of {(item.product.lead_time_days || 10) + leadChange} days,{" "}
                {item.product.name} would need {num(sim.newOrderQty)} units instead of{" "}
                {num(sim.baseOrderQty)} — a change of {money(sim.newValue - sim.baseValue, c)} in
                purchasing cost.
              </p>
            </div>
          ) : null}
        </div>
      </Panel>
    </>
  );
}
