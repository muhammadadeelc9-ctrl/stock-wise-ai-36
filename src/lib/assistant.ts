import { DEMAND_LABEL, sortByPriority, type InventorySnapshot } from "./analytics";
import { money, num } from "./format";

export type AssistantAnswer = {
  text: string;
  bullets: string[];
  links: { id: string; label: string }[];
};

export const SUGGESTED_QUESTIONS = [
  "Which products need attention?",
  "Which products should I reorder?",
  "Where is most of my money stuck?",
  "Which products are performing best?",
  "What is overstocked?",
  "What is not selling?",
  "How healthy is my inventory?",
  "What is about to run out?",
];

/**
 * Deterministic assistant: every answer is computed from the analyzed
 * inventory snapshot, so it never invents numbers.
 */
export function answerQuestion(q: string, snap: InventorySnapshot): AssistantAnswer {
  const text = q.toLowerCase();
  const c = snap.currency;
  const has = (...words: string[]) => words.some((w) => text.includes(w));

  const empty = (msg: string): AssistantAnswer => ({ text: msg, bullets: [], links: [] });

  if (snap.items.length === 0) {
    return empty(
      "There are no products yet. Add products or load the demo business data and I can start analyzing.",
    );
  }

  if (has("reorder", "buy", "purchase", "order")) {
    const rows = sortByPriority(
      snap.items
        .filter((i) => i.needsReorder || i.status === "out_of_stock")
        .map((i) => ({ ...i, priority: i.recommendation.priority })),
    ).slice(0, 6);
    if (rows.length === 0) return empty("Nothing needs reordering right now — every product covers its supplier lead time.");
    return {
      text: `${rows.length} product${rows.length > 1 ? "s" : ""} should be reordered, starting with ${rows[0]!.product.name}.`,
      bullets: rows.map(
        (i) =>
          `${i.product.name}: order ${num(i.recommendedOrderQty)} units — ${num(i.product.current_stock)} in stock, ${Number.isFinite(i.stockoutDays) ? `${Math.round(i.stockoutDays)} days of cover` : "no recent sales"}, ${i.product.lead_time_days}-day lead time.`,
      ),
      links: rows.map((i) => ({ id: i.product.id, label: i.product.name })),
    };
  }

  if (has("money", "stuck", "cash", "tied", "capital", "value")) {
    const worst = [...snap.items].sort((a, b) => b.inventoryValue - a.inventoryValue).slice(0, 5);
    return {
      text: `You are holding ${money(snap.totals.inventoryValue, c)} of inventory at cost. ${money(snap.totals.slowValue, c)} is in slow-moving stock and ${money(snap.totals.overstockValue, c)} is in overstock — that is the money not working for you.`,
      bullets: worst.map(
        (i) =>
          `${i.product.name}: ${money(i.inventoryValue, c)} across ${num(i.product.current_stock)} units (${i.status.replace(/_/g, " ")}).`,
      ),
      links: worst.map((i) => ({ id: i.product.id, label: i.product.name })),
    };
  }

  if (has("best", "performing", "top", "selling most", "bestseller")) {
    const top = [...snap.items].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    return {
      text: `Your strongest performers by revenue are led by ${top[0]!.product.name}.`,
      bullets: top.map(
        (i) =>
          `${i.product.name}: ${money(i.revenue, c)} revenue from ${num(i.unitsSold)} units, ${i.revenueShare.toFixed(0)}% of total, demand ${DEMAND_LABEL[i.demandLevel].toLowerCase()}.`,
      ),
      links: top.map((i) => ({ id: i.product.id, label: i.product.name })),
    };
  }

  if (has("overstock", "too much", "excess")) {
    const rows = snap.items.filter((i) => i.status === "overstock");
    if (rows.length === 0) return empty("Nothing is overstocked right now.");
    return {
      text: `${rows.length} product${rows.length > 1 ? "s are" : " is"} overstocked, holding ${money(snap.totals.overstockValue, c)}.`,
      bullets: rows
        .slice(0, 6)
        .map(
          (i) =>
            `${i.product.name}: ${num(i.product.current_stock)} units, about ${Math.round(i.daysOfStock)} days of cover, ${num(i.excessUnits)} units more than needed (${money(i.excessValue, c)}).`,
        ),
      links: rows.slice(0, 6).map((i) => ({ id: i.product.id, label: i.product.name })),
    };
  }

  if (has("not selling", "slow", "dead", "stale")) {
    const rows = snap.items.filter((i) => i.status === "slow_moving");
    if (rows.length === 0) return empty("Nothing looks like dead stock — every product has sold recently.");
    return {
      text: `${rows.length} product${rows.length > 1 ? "s are" : " is"} slow moving, locking up ${money(snap.totals.slowValue, c)}.`,
      bullets: rows
        .slice(0, 6)
        .map(
          (i) =>
            `${i.product.name}: last sold ${i.daysSinceLastSale === null ? "never" : `${i.daysSinceLastSale} days ago`}, ${num(i.product.current_stock)} units worth ${money(i.inventoryValue, c)}.`,
        ),
      links: rows.slice(0, 6).map((i) => ({ id: i.product.id, label: i.product.name })),
    };
  }

  if (has("run out", "stockout", "about to", "risk")) {
    const rows = snap.items
      .filter((i) => i.riskLevel === "critical" || i.riskLevel === "high")
      .sort((a, b) => a.stockoutDays - b.stockoutDays);
    if (rows.length === 0) return empty("No product is at meaningful risk of running out in the near term.");
    return {
      text: `${rows.length} product${rows.length > 1 ? "s are" : " is"} at risk of running out before a new order could arrive.`,
      bullets: rows
        .slice(0, 6)
        .map(
          (i) =>
            `${i.product.name}: ${num(i.product.current_stock)} units left, selling ${i.avgDailySales.toFixed(1)}/day → out in about ${Math.round(i.stockoutDays)} days versus a ${i.product.lead_time_days}-day lead time.`,
        ),
      links: rows.slice(0, 6).map((i) => ({ id: i.product.id, label: i.product.name })),
    };
  }

  if (has("health", "score", "how am i", "overall")) {
    return {
      text: `Your inventory health score is ${snap.healthScore}/100.`,
      bullets: snap.healthBreakdown.map(
        (b) => `${b.label}: ${b.score}/100 (${Math.round(b.weight * 100)}% of the score) — ${b.detail}.`,
      ),
      links: [],
    };
  }

  if (has("forecast", "next 30", "demand next", "predict")) {
    const rows = [...snap.items].sort((a, b) => b.forecast30 - a.forecast30).slice(0, 5);
    return {
      text: `Expected demand over the next 30 days totals about ${num(snap.items.reduce((s, i) => s + i.forecast30, 0))} units.`,
      bullets: rows.map(
        (i) =>
          `${i.product.name}: ~${Math.round(i.forecast30)} units expected, ${num(i.product.current_stock)} in stock.`,
      ),
      links: rows.map((i) => ({ id: i.product.id, label: i.product.name })),
    };
  }

  // default: what needs attention
  const attention = snap.insights.filter((i) => i.priority === "critical" || i.priority === "high");
  if (attention.length === 0) {
    return {
      text: `Nothing urgent today. Health score is ${snap.healthScore}/100 across ${snap.totals.products} products worth ${money(snap.totals.inventoryValue, c)}.`,
      bullets: [],
      links: [],
    };
  }
  return {
    text: `${attention.length} thing${attention.length > 1 ? "s" : ""} need your attention right now.`,
    bullets: attention.slice(0, 6).map((i) => `${i.title} — ${i.action}.`),
    links: attention
      .filter((i) => i.productId)
      .slice(0, 6)
      .map((i) => ({ id: i.productId!, label: i.productName! })),
  };
}
