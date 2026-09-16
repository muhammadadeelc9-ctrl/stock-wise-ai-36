import { newId, nowIso, putMany, removeWhere } from "@/lib/local-db";
import type { Movement, Product, Sale } from "@/lib/types";

type Scenario =
  | "high_demand"
  | "rising"
  | "healthy"
  | "low_demand"
  | "overstock"
  | "stockout_risk"
  | "slow_moving"
  | "out_of_stock";

type Seed = {
  name: string;
  sku: string;
  category: string;
  supplier: string;
  cost: number;
  price: number;
  stock: number;
  min: number;
  max: number;
  lead: number;
  baseDaily: number;
  scenario: Scenario;
};

const SEEDS: Seed[] = [
  { name: "Black Hoodie", sku: "AP-HD-001", category: "Apparel", supplier: "Northloom Mills", cost: 22, price: 59, stock: 25, min: 20, max: 220, lead: 10, baseDaily: 4.2, scenario: "stockout_risk" },
  { name: "White Sneakers", sku: "FW-SN-014", category: "Footwear", supplier: "Vela Footwear", cost: 34, price: 89, stock: 38, min: 25, max: 260, lead: 14, baseDaily: 3.6, scenario: "rising" },
  { name: "Blue Jeans", sku: "AP-JN-004", category: "Apparel", supplier: "Northloom Mills", cost: 18, price: 49, stock: 210, min: 30, max: 240, lead: 12, baseDaily: 1.4, scenario: "overstock" },
  { name: "Red Jacket", sku: "OT-JK-009", category: "Outerwear", supplier: "Cascade Outfitters", cost: 46, price: 119, stock: 64, min: 15, max: 120, lead: 18, baseDaily: 0.05, scenario: "slow_moving" },
  { name: "Black T-Shirt", sku: "AP-TS-002", category: "Apparel", supplier: "Northloom Mills", cost: 7, price: 24, stock: 92, min: 60, max: 500, lead: 7, baseDaily: 8.4, scenario: "high_demand" },
  { name: "Grey Beanie", sku: "AC-BN-022", category: "Accessories", supplier: "Fenwick Knits", cost: 5, price: 18, stock: 41, min: 20, max: 200, lead: 9, baseDaily: 2.1, scenario: "healthy" },
  { name: "Leather Belt", sku: "AC-BL-031", category: "Accessories", supplier: "Fenwick Knits", cost: 11, price: 34, stock: 0, min: 20, max: 160, lead: 12, baseDaily: 1.9, scenario: "out_of_stock" },
  { name: "Canvas Backpack", sku: "BG-BP-051", category: "Bags", supplier: "Harbor Goods", cost: 28, price: 79, stock: 54, min: 20, max: 180, lead: 15, baseDaily: 1.7, scenario: "healthy" },
  { name: "Running Shorts", sku: "AP-SH-017", category: "Apparel", supplier: "Vela Footwear", cost: 9, price: 29, stock: 138, min: 30, max: 200, lead: 10, baseDaily: 0.9, scenario: "overstock" },
  { name: "Wool Scarf", sku: "AC-SC-026", category: "Accessories", supplier: "Fenwick Knits", cost: 13, price: 39, stock: 88, min: 15, max: 120, lead: 20, baseDaily: 0.08, scenario: "slow_moving" },
  { name: "Denim Jacket", sku: "OT-DJ-011", category: "Outerwear", supplier: "Cascade Outfitters", cost: 38, price: 99, stock: 33, min: 18, max: 150, lead: 16, baseDaily: 2.4, scenario: "rising" },
  { name: "Sport Socks 3-Pack", sku: "AC-SK-041", category: "Accessories", supplier: "Northloom Mills", cost: 4, price: 15, stock: 260, min: 80, max: 600, lead: 6, baseDaily: 6.8, scenario: "high_demand" },
  { name: "Chino Trousers", sku: "AP-CH-006", category: "Apparel", supplier: "Northloom Mills", cost: 20, price: 55, stock: 47, min: 25, max: 200, lead: 12, baseDaily: 1.6, scenario: "healthy" },
  { name: "Rain Shell", sku: "OT-RS-013", category: "Outerwear", supplier: "Cascade Outfitters", cost: 52, price: 139, stock: 19, min: 12, max: 100, lead: 21, baseDaily: 1.3, scenario: "stockout_risk" },
  { name: "Leather Wallet", sku: "AC-WL-036", category: "Accessories", supplier: "Harbor Goods", cost: 15, price: 45, stock: 72, min: 20, max: 160, lead: 14, baseDaily: 0.7, scenario: "low_demand" },
  { name: "Trail Boots", sku: "FW-TB-019", category: "Footwear", supplier: "Vela Footwear", cost: 58, price: 149, stock: 26, min: 12, max: 110, lead: 24, baseDaily: 0.9, scenario: "stockout_risk" },
  { name: "Cotton Cap", sku: "AC-CP-029", category: "Accessories", supplier: "Fenwick Knits", cost: 6, price: 22, stock: 155, min: 40, max: 260, lead: 8, baseDaily: 1.1, scenario: "overstock" },
  { name: "Fleece Pullover", sku: "AP-FP-008", category: "Apparel", supplier: "Northloom Mills", cost: 24, price: 69, stock: 58, min: 25, max: 200, lead: 11, baseDaily: 2.6, scenario: "healthy" },
  { name: "Gym Duffel", sku: "BG-DF-055", category: "Bags", supplier: "Harbor Goods", cost: 26, price: 72, stock: 96, min: 20, max: 150, lead: 17, baseDaily: 0.12, scenario: "slow_moving" },
  { name: "Slim Loafers", sku: "FW-LF-023", category: "Footwear", supplier: "Vela Footwear", cost: 40, price: 109, stock: 44, min: 15, max: 130, lead: 19, baseDaily: 0.5, scenario: "low_demand" },
  { name: "Puffer Vest", sku: "OT-PV-015", category: "Outerwear", supplier: "Cascade Outfitters", cost: 33, price: 89, stock: 12, min: 15, max: 120, lead: 15, baseDaily: 1.8, scenario: "stockout_risk" },
  { name: "Linen Shirt", sku: "AP-LS-010", category: "Apparel", supplier: "Northloom Mills", cost: 16, price: 48, stock: 67, min: 25, max: 180, lead: 10, baseDaily: 2.2, scenario: "healthy" },
];

/** Small deterministic PRNG so demo data looks natural but is reproducible. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const HISTORY_DAYS = 120;

function scenarioFactor(scenario: Scenario, age: number) {
  // age = days ago (0 = today)
  const recency = 1 - age / HISTORY_DAYS;
  switch (scenario) {
    case "rising":
      return 0.35 + recency * 1.5;
    case "high_demand":
      return 0.9 + recency * 0.35;
    case "low_demand":
      return 0.9 - recency * 0.3;
    case "overstock":
      return 1.2 - recency * 0.6;
    case "slow_moving":
      return age > 40 ? 1.4 : 0;
    case "out_of_stock":
      return age > 3 ? 1.1 : 0;
    case "stockout_risk":
      return 0.7 + recency * 0.9;
    default:
      return 1;
  }
}

export type DemoResult = { products: number; sales: number };

export async function loadDemoData(
  userId: string,
  businessId: string,
  today = new Date(),
): Promise<DemoResult> {
  const mine = (row: { business_id: string }) => row.business_id === businessId;
  await removeWhere<Sale>("sales", mine);
  await removeWhere<Movement>("movements", mine);
  await removeWhere<{ id: string; business_id: string }>("alerts", mine);
  await removeWhere<{ id: string; business_id: string }>("recommendation_states", mine);
  await removeWhere<Product>("products", mine);

  const products: (Product & { user_id: string })[] = SEEDS.map((s) => ({
    id: newId(),
    user_id: userId,
    business_id: businessId,
    name: s.name,
    sku: s.sku,
    category: s.category,
    supplier: s.supplier,
    cost_price: s.cost,
    selling_price: s.price,
    current_stock: s.stock,
    min_stock: s.min,
    max_stock: s.max,
    lead_time_days: s.lead,
    created_at: nowIso(),
  }));
  await putMany("products", products);

  const idBySku = new Map(products.map((p) => [p.sku, p.id]));
  const random = rng(20260905);
  const sales: (Sale & { user_id: string })[] = [];

  for (const s of SEEDS) {
    const productId = idBySku.get(s.sku);
    if (!productId) continue;
    for (let age = HISTORY_DAYS - 1; age >= 0; age--) {
      const factor = scenarioFactor(s.scenario, age);
      if (factor <= 0) continue;
      const weekday = new Date(today.getTime() - age * 86400000).getUTCDay();
      const weekendBoost = weekday === 0 || weekday === 6 ? 1.25 : 1;
      const expected = s.baseDaily * factor * weekendBoost;
      const noise = 0.5 + random() * 1.1;
      const qty = Math.round(expected * noise);
      if (qty <= 0) continue;
      const date = new Date(today.getTime() - age * 86400000).toISOString().slice(0, 10);
      const discount = random() < 0.12 ? 0.9 : 1;
      sales.push({
        id: newId(),
        user_id: userId,
        business_id: businessId,
        product_id: productId,
        sale_date: date,
        quantity: qty,
        unit_price: Math.round(s.price * discount * 100) / 100,
        created_at: nowIso(),
      });
    }
  }
  await putMany("sales", sales);

  const movements: (Movement & { user_id: string })[] = SEEDS.flatMap((s) => {
    const productId = idBySku.get(s.sku);
    if (!productId) return [];
    return [
      {
        id: newId(),
        user_id: userId,
        business_id: businessId,
        product_id: productId,
        movement_type: "received" as const,
        quantity: s.stock,
        reason: "Opening stock from supplier",
        actor: "Demo import",
        created_at: nowIso(),
      },
    ];
  });
  await putMany("movements", movements);

  return { products: products.length, sales: sales.length };
}
