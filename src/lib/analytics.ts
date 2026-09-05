import type {
  Business,
  DemandLevel,
  MatrixClass,
  Priority,
  Product,
  Sale,
  StockStatus,
} from "./types";

/* ------------------------------------------------------------------ *
 * Deterministic inventory intelligence engine.
 * Every number below is derived from products + sales rows.
 * Nothing here is hardcoded or random.
 * ------------------------------------------------------------------ */

const DAY = 86_400_000;

export function dayKey(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

function daysBetween(a: Date, b: Date) {
  return Math.max(0, Math.floor((a.getTime() - b.getTime()) / DAY));
}

export type ProductAnalytics = {
  product: Product;
  // volume
  unitsSold: number;
  units7: number;
  units30: number;
  units60: number;
  units90: number;
  revenue: number;
  revenue30: number;
  profit: number;
  lastSaleDate: string | null;
  daysSinceLastSale: number | null;
  // velocity + demand
  avgDailySales: number;
  velocity30: number;
  velocityPrev30: number;
  trendPct: number;
  demandLevel: DemandLevel;
  demandScore: number;
  // stock
  daysOfStock: number;
  stockoutDays: number;
  status: StockStatus;
  riskLevel: Priority;
  safetyStock: number;
  reorderPoint: number;
  recommendedOrderQty: number;
  needsReorder: boolean;
  // value
  inventoryValue: number;
  retailValue: number;
  excessUnits: number;
  excessValue: number;
  turnover: number;
  revenueShare: number;
  // forecast
  forecast7: number;
  forecast30: number;
  forecast60: number;
  // output
  matrixClass: MatrixClass;
  recommendation: Recommendation;
  dailySeries: { date: string; units: number; revenue: number }[];
};

export type Recommendation = {
  action: string;
  reason: string;
  priority: Priority;
  impact: string | null;
  problem: string;
};

export type Insight = {
  id: string;
  productId: string | null;
  productName: string | null;
  kind:
    | "stockout"
    | "high_demand"
    | "low_demand"
    | "overstock"
    | "slow_moving"
    | "money_locked"
    | "priority"
    | "out_of_stock";
  title: string;
  detail: string;
  action: string;
  priority: Priority;
  impact: string | null;
};

export type InventorySnapshot = {
  business: Business | null;
  currency: string;
  items: ProductAnalytics[];
  byId: Record<string, ProductAnalytics>;
  totals: {
    products: number;
    unitsInStock: number;
    inventoryValue: number;
    retailValue: number;
    unitsSold30: number;
    unitsSoldAll: number;
    revenue: number;
    revenue30: number;
    healthyValue: number;
    slowValue: number;
    overstockValue: number;
    atRiskValue: number;
    lowStock: number;
    atRisk: number;
    overstocked: number;
    slowMoving: number;
    outOfStock: number;
    healthy: number;
    critical: number;
  };
  healthScore: number;
  healthBreakdown: { label: string; score: number; weight: number; detail: string }[];
  insights: Insight[];
  salesSeries: { date: string; units: number; revenue: number }[];
};

const PRIORITY_ORDER: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export function sortByPriority<T extends { priority: Priority }>(rows: T[]) {
  return [...rows].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}

/** Weighted moving average of daily demand: recent weeks count more. */
function weightedDailyDemand(units7: number, units30: number, units90: number) {
  const r7 = units7 / 7;
  const r30 = units30 / 30;
  const r90 = units90 / 90;
  const parts: [number, number][] = [
    [r7, 0.5],
    [r30, 0.35],
    [r90, 0.15],
  ];
  const total = parts.reduce((s, [v, w]) => s + v * w, 0);
  return Number.isFinite(total) ? total : 0;
}

function classifyDemand(avgDaily: number, trendPct: number, allAvg: number[]): DemandLevel {
  const sorted = [...allAvg].filter((v) => v > 0).sort((a, b) => a - b);
  if (avgDaily <= 0) return "very_low";
  if (sorted.length < 4) {
    if (avgDaily >= 3) return "high";
    if (avgDaily >= 1) return "medium";
    return "low";
  }
  const rank = sorted.filter((v) => v < avgDaily).length / sorted.length;
  const bumped = rank + (trendPct > 25 ? 0.1 : trendPct < -25 ? -0.1 : 0);
  if (bumped >= 0.85) return "very_high";
  if (bumped >= 0.6) return "high";
  if (bumped >= 0.35) return "medium";
  if (bumped >= 0.15) return "low";
  return "very_low";
}

export const DEMAND_LABEL: Record<DemandLevel, string> = {
  very_high: "Very High",
  high: "High",
  medium: "Medium",
  low: "Low",
  very_low: "Very Low",
};

export const STATUS_LABEL: Record<StockStatus, string> = {
  out_of_stock: "Out of stock",
  critical: "Critical stock",
  low: "Low stock",
  healthy: "Healthy",
  overstock: "Overstocked",
  slow_moving: "Slow moving",
};

export const MATRIX_LABEL: Record<MatrixClass, string> = {
  priority: "Priority",
  maintain: "Maintain",
  watch: "Watch",
  reduce: "Reduce",
  stop: "Stop purchasing",
};

export function analyzeInventory(
  business: Business | null,
  products: Product[],
  sales: Sale[],
  now = new Date(),
): InventorySnapshot {
  const currency = business?.currency ?? "USD";
  const lowThreshold = business?.low_stock_threshold ?? 10;
  const defaultLead = business?.default_lead_time_days ?? 10;

  const salesByProduct = new Map<string, Sale[]>();
  for (const s of sales) {
    const list = salesByProduct.get(s.product_id);
    if (list) list.push(s);
    else salesByProduct.set(s.product_id, [s]);
  }

  const rawAvg: number[] = [];
  const prelim = products.map((p) => {
    const rows = salesByProduct.get(p.id) ?? [];
    let units7 = 0,
      units30 = 0,
      units60 = 0,
      units90 = 0,
      unitsPrev30 = 0,
      unitsSold = 0,
      revenue = 0,
      revenue30 = 0;
    let lastSale: Date | null = null;
    const daily = new Map<string, { units: number; revenue: number }>();

    for (const s of rows) {
      const d = new Date(`${s.sale_date}T00:00:00Z`);
      const age = daysBetween(now, d);
      const rev = s.quantity * Number(s.unit_price);
      unitsSold += s.quantity;
      revenue += rev;
      if (age < 7) units7 += s.quantity;
      if (age < 30) {
        units30 += s.quantity;
        revenue30 += rev;
      }
      if (age >= 30 && age < 60) unitsPrev30 += s.quantity;
      if (age < 60) units60 += s.quantity;
      if (age < 90) units90 += s.quantity;
      if (!lastSale || d > lastSale) lastSale = d;
      const key = s.sale_date;
      const cur = daily.get(key) ?? { units: 0, revenue: 0 };
      cur.units += s.quantity;
      cur.revenue += rev;
      daily.set(key, cur);
    }

    const avgDailySales = weightedDailyDemand(units7, units30, units90);
    rawAvg.push(avgDailySales);
    return {
      p,
      units7,
      units30,
      units60,
      units90,
      unitsPrev30,
      unitsSold,
      revenue,
      revenue30,
      lastSale,
      avgDailySales,
      daily,
    };
  });

  const totalRevenue = prelim.reduce((s, r) => s + r.revenue, 0);

  const items: ProductAnalytics[] = prelim.map((r) => {
    const p = r.p;
    const cost = Number(p.cost_price);
    const price = Number(p.selling_price);
    const lead = p.lead_time_days || defaultLead;
    const velocity30 = r.units30 / 30;
    const velocityPrev30 = r.unitsPrev30 / 30;
    const trendPct =
      velocityPrev30 > 0
        ? ((velocity30 - velocityPrev30) / velocityPrev30) * 100
        : velocity30 > 0
          ? 100
          : 0;

    const avgDailySales = r.avgDailySales;
    const demandLevel = classifyDemand(avgDailySales, trendPct, rawAvg);
    const demandScore = { very_high: 100, high: 78, medium: 52, low: 26, very_low: 8 }[demandLevel];

    const daysOfStock = avgDailySales > 0 ? p.current_stock / avgDailySales : Infinity;
    const stockoutDays = Number.isFinite(daysOfStock) ? daysOfStock : Infinity;

    const safetyStock = Math.ceil(avgDailySales * lead * 0.5);
    const reorderPoint = Math.ceil(avgDailySales * lead + safetyStock);
    const targetCover = lead + 30;
    const recommendedOrderQty = Math.max(
      0,
      Math.ceil(avgDailySales * targetCover + safetyStock - p.current_stock),
    );

    const daysSinceLastSale = r.lastSale ? daysBetween(now, r.lastSale) : null;

    // Status classification
    let status: StockStatus;
    if (p.current_stock <= 0) status = "out_of_stock";
    else if (Number.isFinite(daysOfStock) && daysOfStock <= lead * 0.5) status = "critical";
    else if (
      (Number.isFinite(daysOfStock) && daysOfStock <= lead) ||
      p.current_stock <= Math.max(p.min_stock, lowThreshold)
    )
      status = "low";
    else if (
      (r.units30 === 0 && (daysSinceLastSale === null || daysSinceLastSale >= 30)) ||
      (avgDailySales < 0.1 && p.current_stock > 0)
    )
      status = "slow_moving";
    else if (
      (Number.isFinite(daysOfStock) && daysOfStock > 60) ||
      (p.max_stock > 0 && p.current_stock > p.max_stock)
    )
      status = "overstock";
    else status = "healthy";

    let riskLevel: Priority;
    if (status === "out_of_stock") riskLevel = "critical";
    else if (stockoutDays <= lead) riskLevel = "critical";
    else if (stockoutDays <= lead * 1.5) riskLevel = "high";
    else if (stockoutDays <= lead * 2.5) riskLevel = "medium";
    else riskLevel = "low";

    const inventoryValue = p.current_stock * cost;
    const retailValue = p.current_stock * price;
    const expected30 = avgDailySales * 30;
    const excessUnits = Math.max(0, p.current_stock - Math.ceil(expected30 + safetyStock));
    const excessValue = excessUnits * cost;
    const turnover = inventoryValue > 0 ? (r.units30 * cost * 12) / inventoryValue : 0;
    const revenueShare = totalRevenue > 0 ? (r.revenue / totalRevenue) * 100 : 0;

    // Forecast: weighted moving average, trend-adjusted and damped.
    const trendFactor = 1 + Math.max(-0.4, Math.min(0.4, trendPct / 100)) * 0.5;
    const base = avgDailySales * trendFactor;
    const forecast7 = base * 7;
    const forecast30 = base * 30;
    const forecast60 = base * 60;

    const matrixClass = classifyMatrix(status, demandLevel, revenueShare, stockoutDays, lead);
    const recommendation = buildRecommendation({
      product: p,
      status,
      demandLevel,
      trendPct,
      stockoutDays,
      lead,
      recommendedOrderQty,
      excessUnits,
      excessValue,
      inventoryValue,
      daysSinceLastSale,
      forecast30,
      currency,
    });

    const dailySeries = buildSeries(r.daily, now, 90);

    return {
      product: p,
      unitsSold: r.unitsSold,
      units7: r.units7,
      units30: r.units30,
      units60: r.units60,
      units90: r.units90,
      revenue: r.revenue,
      revenue30: r.revenue30,
      profit: r.unitsSold * (price - cost),
      lastSaleDate: r.lastSale ? dayKey(r.lastSale) : null,
      daysSinceLastSale,
      avgDailySales,
      velocity30,
      velocityPrev30,
      trendPct,
      demandLevel,
      demandScore,
      daysOfStock,
      stockoutDays,
      status,
      riskLevel,
      safetyStock,
      reorderPoint,
      recommendedOrderQty,
      needsReorder: p.current_stock <= reorderPoint && recommendedOrderQty > 0,
      inventoryValue,
      retailValue,
      excessUnits,
      excessValue,
      turnover,
      revenueShare,
      forecast7,
      forecast30,
      forecast60,
      matrixClass,
      recommendation,
      dailySeries,
    };
  });

  const byId: Record<string, ProductAnalytics> = {};
  for (const i of items) byId[i.product.id] = i;

  const totals = {
    products: items.length,
    unitsInStock: items.reduce((s, i) => s + i.product.current_stock, 0),
    inventoryValue: items.reduce((s, i) => s + i.inventoryValue, 0),
    retailValue: items.reduce((s, i) => s + i.retailValue, 0),
    unitsSold30: items.reduce((s, i) => s + i.units30, 0),
    unitsSoldAll: items.reduce((s, i) => s + i.unitsSold, 0),
    revenue: items.reduce((s, i) => s + i.revenue, 0),
    revenue30: items.reduce((s, i) => s + i.revenue30, 0),
    healthyValue: sumValue(items, (i) => i.status === "healthy"),
    slowValue: sumValue(items, (i) => i.status === "slow_moving"),
    overstockValue: sumValue(items, (i) => i.status === "overstock"),
    atRiskValue: sumValue(
      items,
      (i) => i.status === "critical" || i.status === "out_of_stock" || i.status === "low",
    ),
    lowStock: items.filter((i) => i.status === "low" || i.status === "critical").length,
    atRisk: items.filter((i) => i.riskLevel === "critical" || i.riskLevel === "high").length,
    overstocked: items.filter((i) => i.status === "overstock").length,
    slowMoving: items.filter((i) => i.status === "slow_moving").length,
    outOfStock: items.filter((i) => i.status === "out_of_stock").length,
    healthy: items.filter((i) => i.status === "healthy").length,
    critical: items.filter((i) => i.status === "critical").length,
  };

  const { healthScore, healthBreakdown } = scoreHealth(items, totals);
  const insights = buildInsights(items, totals, currency);
  const salesSeries = buildAggregateSeries(items, now, 30);

  return {
    business,
    currency,
    items,
    byId,
    totals,
    healthScore,
    healthBreakdown,
    insights,
    salesSeries,
  };
}

function sumValue(items: ProductAnalytics[], match: (i: ProductAnalytics) => boolean) {
  return items.filter(match).reduce((s, i) => s + i.inventoryValue, 0);
}

function buildSeries(
  daily: Map<string, { units: number; revenue: number }>,
  now: Date,
  window: number,
) {
  const out: { date: string; units: number; revenue: number }[] = [];
  for (let i = window - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY);
    const key = dayKey(d);
    const hit = daily.get(key);
    out.push({ date: key, units: hit?.units ?? 0, revenue: hit?.revenue ?? 0 });
  }
  return out;
}

function buildAggregateSeries(items: ProductAnalytics[], now: Date, window: number) {
  const agg = new Map<string, { units: number; revenue: number }>();
  for (const i of items) {
    for (const point of i.dailySeries) {
      const cur = agg.get(point.date) ?? { units: 0, revenue: 0 };
      cur.units += point.units;
      cur.revenue += point.revenue;
      agg.set(point.date, cur);
    }
  }
  const out: { date: string; units: number; revenue: number }[] = [];
  for (let i = window - 1; i >= 0; i--) {
    const key = dayKey(new Date(now.getTime() - i * DAY));
    const hit = agg.get(key);
    out.push({ date: key, units: hit?.units ?? 0, revenue: hit?.revenue ?? 0 });
  }
  return out;
}

function classifyMatrix(
  status: StockStatus,
  demand: DemandLevel,
  revenueShare: number,
  stockoutDays: number,
  lead: number,
): MatrixClass {
  const highDemand = demand === "very_high" || demand === "high";
  const lowDemand = demand === "low" || demand === "very_low";
  if (highDemand && (status === "critical" || status === "out_of_stock" || status === "low"))
    return "priority";
  if (highDemand && revenueShare > 8 && stockoutDays < lead * 2) return "priority";
  if (lowDemand && status === "slow_moving") return "stop";
  if (lowDemand && status === "overstock") return "reduce";
  if (status === "healthy" && !lowDemand) return "maintain";
  if (lowDemand) return "reduce";
  return "watch";
}

function buildRecommendation(input: {
  product: Product;
  status: StockStatus;
  demandLevel: DemandLevel;
  trendPct: number;
  stockoutDays: number;
  lead: number;
  recommendedOrderQty: number;
  excessUnits: number;
  excessValue: number;
  inventoryValue: number;
  daysSinceLastSale: number | null;
  forecast30: number;
  currency: string;
}): Recommendation {
  const {
    product,
    status,
    demandLevel,
    trendPct,
    stockoutDays,
    lead,
    recommendedOrderQty,
    excessUnits,
    daysSinceLastSale,
    forecast30,
  } = input;
  const highDemand = demandLevel === "very_high" || demandLevel === "high";
  const cover = Number.isFinite(stockoutDays) ? `${Math.round(stockoutDays)} days` : "no measurable";

  if (status === "out_of_stock") {
    return {
      problem: "Out of stock",
      action: `Reorder now — ${Math.max(recommendedOrderQty, 1)} units`,
      reason: `${product.name} has zero units on hand. Every day out of stock is lost revenue, and the supplier needs ${lead} days to deliver.`,
      priority: "critical",
      impact: `${Math.round(forecast30)} units of expected 30-day demand currently unservable`,
    };
  }
  if (status === "critical" || (highDemand && stockoutDays <= lead)) {
    return {
      problem: "Stockout risk",
      action: `Reorder now — ${recommendedOrderQty} units`,
      reason: `Only ${cover} of cover remain at the current sales rate, which is shorter than the ${lead}-day supplier lead time. ${trendPct > 10 ? `Demand is also rising (${trendPct.toFixed(0)}%).` : ""}`.trim(),
      priority: "critical",
      impact: `Stockout expected in ~${Math.round(stockoutDays)} days`,
    };
  }
  if (status === "low") {
    return {
      problem: "Low stock",
      action: `Reorder soon — ${recommendedOrderQty} units`,
      reason: `Stock is approaching the reorder point with ${cover} of cover against a ${lead}-day lead time.`,
      priority: "high",
      impact: `Covers lead time plus safety stock`,
    };
  }
  if (status === "slow_moving") {
    return {
      problem: "Slow moving / dead stock",
      action: "Stop purchasing temporarily and promote existing units",
      reason: `${daysSinceLastSale === null ? "No sales have ever been recorded" : `No sale in ${daysSinceLastSale} days`} while ${product.current_stock} units sit on the shelf. Cash is locked in stock that is not moving.`,
      priority: "medium",
      impact: `${product.current_stock} units idle`,
    };
  }
  if (status === "overstock") {
    return {
      problem: "Overstock",
      action: "Reduce purchasing and consider a promotion",
      reason: `${cover} of inventory remain while recent demand is only ~${forecast30.toFixed(0)} units per month. Roughly ${excessUnits} units are more than needed.`,
      priority: excessUnits > product.current_stock * 0.5 ? "high" : "medium",
      impact: `${excessUnits} excess units`,
    };
  }
  if (trendPct > 40 && highDemand) {
    return {
      problem: "Unusual demand increase",
      action: "Investigate unusual demand and prepare to reorder",
      reason: `Sales velocity jumped ${trendPct.toFixed(0)}% versus the previous 30 days. Confirm the trend is real before committing to a larger purchase.`,
      priority: "medium",
      impact: `Velocity up ${trendPct.toFixed(0)}%`,
    };
  }
  return {
    problem: "Healthy",
    action: "Maintain current stock",
    reason: `Demand is ${DEMAND_LABEL[demandLevel].toLowerCase()} and there are ${cover} of cover — comfortably above the ${lead}-day lead time.`,
    priority: "low",
    impact: null,
  };
}

function scoreHealth(items: ProductAnalytics[], totals: InventorySnapshot["totals"]) {
  const n = Math.max(1, items.length);
  const availability = 1 - (totals.outOfStock + totals.critical * 0.5) / n;
  const stockoutRisk = 1 - items.filter((i) => i.riskLevel === "critical").length / n;
  const overstock = 1 - totals.overstocked / n;
  const slow = 1 - totals.slowMoving / n;
  const capital =
    totals.inventoryValue > 0
      ? 1 - (totals.slowValue + totals.overstockValue) / totals.inventoryValue
      : 1;
  const velocity =
    items.length > 0 ? Math.min(1, items.filter((i) => i.units30 > 0).length / n + 0.15) : 0;

  const parts = [
    { label: "Stock availability", score: availability, weight: 0.25, detail: `${totals.outOfStock} out of stock` },
    { label: "Stockout risk", score: stockoutRisk, weight: 0.2, detail: `${totals.atRisk} at risk` },
    { label: "Overstock control", score: overstock, weight: 0.15, detail: `${totals.overstocked} overstocked` },
    { label: "Slow-moving stock", score: slow, weight: 0.15, detail: `${totals.slowMoving} slow movers` },
    { label: "Capital efficiency", score: capital, weight: 0.15, detail: "Money not stuck" },
    { label: "Sales velocity", score: velocity, weight: 0.1, detail: "Products selling" },
  ].map((p) => ({ ...p, score: Math.max(0, Math.min(1, p.score)) }));

  const healthScore = Math.round(parts.reduce((s, p) => s + p.score * p.weight, 0) * 100);
  return {
    healthScore,
    healthBreakdown: parts.map((p) => ({
      label: p.label,
      score: Math.round(p.score * 100),
      weight: p.weight,
      detail: p.detail,
    })),
  };
}

function buildInsights(
  items: ProductAnalytics[],
  totals: InventorySnapshot["totals"],
  currency: string,
): Insight[] {
  const out: Insight[] = [];
  const fmt = (v: number) =>
    `${currency === "USD" ? "$" : ""}${Math.round(v).toLocaleString()}${currency === "USD" ? "" : ` ${currency}`}`;

  for (const i of items) {
    const p = i.product;
    if (i.status === "out_of_stock") {
      out.push({
        id: `oos-${p.id}`,
        productId: p.id,
        productName: p.name,
        kind: "out_of_stock",
        title: `${p.name} is out of stock`,
        detail: i.recommendation.reason,
        action: i.recommendation.action,
        priority: "critical",
        impact: i.recommendation.impact,
      });
      continue;
    }
    if (i.riskLevel === "critical" || i.status === "critical") {
      out.push({
        id: `risk-${p.id}`,
        productId: p.id,
        productName: p.name,
        kind: "stockout",
        title: `${p.name} may run out in ~${Math.round(i.stockoutDays)} days`,
        detail: i.recommendation.reason,
        action: i.recommendation.action,
        priority: "critical",
        impact: `Lead time ${p.lead_time_days} days`,
      });
      continue;
    }
    if (
      (i.demandLevel === "very_high" || i.demandLevel === "high") &&
      i.trendPct > 15 &&
      i.stockoutDays < 30
    ) {
      out.push({
        id: `hd-${p.id}`,
        productId: p.id,
        productName: p.name,
        kind: "high_demand",
        title: `${p.name} has high and increasing demand`,
        detail: `Velocity is up ${i.trendPct.toFixed(0)}% versus the previous 30 days and current stock covers only ${Math.round(i.stockoutDays)} days.`,
        action: `Reorder ${i.recommendedOrderQty} units`,
        priority: "high",
        impact: `~${Math.round(i.forecast30)} units expected next 30 days`,
      });
      continue;
    }
    if (i.status === "overstock") {
      out.push({
        id: `ov-${p.id}`,
        productId: p.id,
        productName: p.name,
        kind: "overstock",
        title: `${p.name} has ~${Math.round(i.daysOfStock)} days of inventory remaining`,
        detail: i.recommendation.reason,
        action: i.recommendation.action,
        priority: i.recommendation.priority,
        impact: `${fmt(i.excessValue)} in excess stock`,
      });
      continue;
    }
    if (i.status === "slow_moving") {
      out.push({
        id: `slow-${p.id}`,
        productId: p.id,
        productName: p.name,
        kind: "slow_moving",
        title: `${p.name} has not sold in ${i.daysSinceLastSale ?? "30+"} days`,
        detail: i.recommendation.reason,
        action: i.recommendation.action,
        priority: "medium",
        impact: `${fmt(i.inventoryValue)} tied up`,
      });
      continue;
    }
    if (i.demandLevel === "low" || i.demandLevel === "very_low") {
      if (i.product.current_stock > 0) {
        out.push({
          id: `ld-${p.id}`,
          productId: p.id,
          productName: p.name,
          kind: "low_demand",
          title: `${p.name} has low sales velocity`,
          detail: `Only ${i.units30} units sold in the last 30 days compared with other products. Avoid buying more until demand improves.`,
          action: "Reduce purchasing",
          priority: "low",
          impact: null,
        });
      }
    }
  }

  if (totals.slowValue > 0) {
    out.push({
      id: "money-locked",
      productId: null,
      productName: null,
      kind: "money_locked",
      title: `Approximately ${fmt(totals.slowValue)} is tied up in slow-moving inventory`,
      detail: `${totals.slowMoving} products have not sold recently. That cash cannot be reinvested into products that are actually selling.`,
      action: "Promote or discount slow-moving stock",
      priority: totals.slowValue > totals.inventoryValue * 0.2 ? "high" : "medium",
      impact: `${((totals.slowValue / Math.max(1, totals.inventoryValue)) * 100).toFixed(0)}% of inventory value`,
    });
  }

  const topPriority = items
    .filter((i) => i.matrixClass === "priority")
    .sort((a, b) => b.revenueShare - a.revenueShare)[0];
  if (topPriority) {
    out.push({
      id: `prio-${topPriority.product.id}`,
      productId: topPriority.product.id,
      productName: topPriority.product.name,
      kind: "priority",
      title: `${topPriority.product.name} should receive purchasing priority`,
      detail: `It combines ${DEMAND_LABEL[topPriority.demandLevel].toLowerCase()} demand, ${topPriority.revenueShare.toFixed(0)}% of total revenue and only ${Math.round(topPriority.stockoutDays)} days of remaining cover.`,
      action: `Order ${topPriority.recommendedOrderQty} units first`,
      priority: "high",
      impact: `${topPriority.revenueShare.toFixed(0)}% revenue contribution`,
    });
  }

  return sortByPriority(out);
}

/* ---------------- What-if simulator ---------------- */

export type WhatIfInput = {
  demandChangePct: number;
  leadTimeChangeDays: number;
};

export type WhatIfResult = {
  baseStockoutDays: number;
  newStockoutDays: number;
  baseOrderQty: number;
  newOrderQty: number;
  baseDemand30: number;
  newDemand30: number;
  baseValue: number;
  newValue: number;
};

export function simulate(item: ProductAnalytics, input: WhatIfInput): WhatIfResult {
  const factor = 1 + input.demandChangePct / 100;
  const newDaily = item.avgDailySales * factor;
  const lead = (item.product.lead_time_days || 10) + input.leadTimeChangeDays;
  const newSafety = Math.ceil(newDaily * lead * 0.5);
  const newOrderQty = Math.max(
    0,
    Math.ceil(newDaily * (lead + 30) + newSafety - item.product.current_stock),
  );
  const cost = Number(item.product.cost_price);
  return {
    baseStockoutDays: item.stockoutDays,
    newStockoutDays: newDaily > 0 ? item.product.current_stock / newDaily : Infinity,
    baseOrderQty: item.recommendedOrderQty,
    newOrderQty,
    baseDemand30: item.forecast30,
    newDemand30: item.forecast30 * factor,
    baseValue: item.recommendedOrderQty * cost,
    newValue: newOrderQty * cost,
  };
}
