export type Business = {
  id: string;
  user_id: string;
  name: string;
  business_type: string;
  currency: string;
  country: string;
  default_lead_time_days: number;
  low_stock_threshold: number;
  created_at: string;
};

export type Product = {
  id: string;
  business_id: string;
  name: string;
  sku: string;
  category: string;
  supplier: string;
  cost_price: number;
  selling_price: number;
  current_stock: number;
  min_stock: number;
  max_stock: number;
  lead_time_days: number;
  created_at: string;
};

export type Sale = {
  id: string;
  business_id: string;
  product_id: string;
  sale_date: string;
  quantity: number;
  unit_price: number;
  created_at: string;
};

export type Movement = {
  id: string;
  business_id: string;
  product_id: string;
  movement_type: MovementType;
  quantity: number;
  reason: string | null;
  actor: string | null;
  created_at: string;
};

export type MovementType = "received" | "sold" | "adjusted" | "returned" | "damaged";

export type Alert = {
  id: string;
  business_id: string;
  product_id: string | null;
  severity: Priority;
  kind: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export type RecommendationState = {
  id: string;
  product_id: string;
  status: "reviewed" | "purchase_list" | "ignored";
  quantity: number | null;
};

export type UserSettings = {
  user_id: string;
  notify_stockout: boolean;
  notify_overstock: boolean;
  notify_slow_moving: boolean;
  notify_email: boolean;
};

export type Priority = "critical" | "high" | "medium" | "low";

export type StockStatus =
  | "out_of_stock"
  | "critical"
  | "low"
  | "healthy"
  | "overstock"
  | "slow_moving";

export type DemandLevel = "very_high" | "high" | "medium" | "low" | "very_low";

export type MatrixClass = "priority" | "maintain" | "watch" | "reduce" | "stop";
