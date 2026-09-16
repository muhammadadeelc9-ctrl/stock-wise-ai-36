import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import { analyzeInventory, type InventorySnapshot } from "./analytics";
import {
  getAll,
  newId,
  nowIso,
  put,
  putMany,
  remove,
  removeWhere,
  requireUserId,
} from "./local-db";
import type {
  Alert,
  Business,
  Movement,
  Product,
  RecommendationState,
  Sale,
  UserSettings,
} from "./types";

type Owned = { user_id?: string };

function byBusiness<T extends { business_id: string }>(rows: T[], businessId: string) {
  return rows.filter((r) => r.business_id === businessId);
}

export async function getOrCreateBusiness(userId: string): Promise<Business> {
  const all = await getAll<Business & Owned>("businesses");
  const mine = all
    .filter((b) => b.user_id === userId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (mine.length > 0) return mine[0] as Business;
  const created: Business = {
    id: newId(),
    user_id: userId,
    name: "My Business",
    business_type: "Retail",
    currency: "USD",
    country: "",
    default_lead_time_days: 10,
    low_stock_threshold: 10,
    created_at: nowIso(),
  };
  await put("businesses", created);
  return created;
}

export function useBusiness() {
  return useQuery({
    queryKey: ["business"],
    queryFn: async (): Promise<Business | null> => {
      const userId = await requireUserId();
      return getOrCreateBusiness(userId);
    },
    staleTime: 60_000,
  });
}

export function useProducts() {
  const { data: business } = useBusiness();
  return useQuery({
    queryKey: ["products", business?.id],
    enabled: !!business?.id,
    queryFn: async (): Promise<Product[]> => {
      const rows = byBusiness(await getAll<Product>("products"), business!.id);
      return rows.sort((a, b) => a.name.localeCompare(b.name));
    },
  });
}

export function useSales() {
  const { data: business } = useBusiness();
  return useQuery({
    queryKey: ["sales", business?.id],
    enabled: !!business?.id,
    queryFn: async (): Promise<Sale[]> => {
      const rows = byBusiness(await getAll<Sale>("sales"), business!.id);
      return rows.sort((a, b) => b.sale_date.localeCompare(a.sale_date));
    },
  });
}

export function useMovements() {
  const { data: business } = useBusiness();
  return useQuery({
    queryKey: ["movements", business?.id],
    enabled: !!business?.id,
    queryFn: async (): Promise<Movement[]> => {
      const rows = byBusiness(await getAll<Movement>("movements"), business!.id);
      return rows.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 500);
    },
  });
}

export function useAlerts() {
  const { data: business } = useBusiness();
  return useQuery({
    queryKey: ["alerts", business?.id],
    enabled: !!business?.id,
    queryFn: async (): Promise<Alert[]> => {
      const rows = byBusiness(await getAll<Alert>("alerts"), business!.id);
      return rows.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 200);
    },
  });
}

export function useRecommendationStates() {
  const { data: business } = useBusiness();
  return useQuery({
    queryKey: ["rec-states", business?.id],
    enabled: !!business?.id,
    queryFn: async (): Promise<RecommendationState[]> => {
      const rows = await getAll<RecommendationState & { business_id: string }>(
        "recommendation_states",
      );
      return byBusiness(rows, business!.id);
    },
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async (): Promise<UserSettings | null> => {
      const userId = await requireUserId();
      const rows = await getAll<UserSettings>("settings");
      const mine = rows.find((r) => r.user_id === userId);
      if (mine) return mine;
      const created: UserSettings = {
        user_id: userId,
        notify_stockout: true,
        notify_overstock: true,
        notify_slow_moving: true,
        notify_email: false,
      };
      await put("settings", created);
      return created;
    },
  });
}

/** The analyzed snapshot every intelligence screen reads from — computed on device. */
export function useInventory(): {
  snapshot: InventorySnapshot | null;
  isLoading: boolean;
  error: unknown;
} {
  const business = useBusiness();
  const products = useProducts();
  const sales = useSales();

  const snapshot = useMemo(() => {
    if (!business.data || !products.data || !sales.data) return null;
    return analyzeInventory(business.data, products.data, sales.data);
  }, [business.data, products.data, sales.data]);

  return {
    snapshot,
    isLoading: business.isLoading || products.isLoading || sales.isLoading,
    error: business.error ?? products.error ?? sales.error,
  };
}

export function useInvalidateAll() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["products"] });
    void qc.invalidateQueries({ queryKey: ["sales"] });
    void qc.invalidateQueries({ queryKey: ["movements"] });
    void qc.invalidateQueries({ queryKey: ["alerts"] });
    void qc.invalidateQueries({ queryKey: ["rec-states"] });
    void qc.invalidateQueries({ queryKey: ["business"] });
    void qc.invalidateQueries({ queryKey: ["settings"] });
  };
}

/* ------------------------- writes ------------------------- */

export type ProductInput = Omit<Product, "id" | "business_id" | "created_at">;

export async function addMovementRow(input: {
  userId: string;
  businessId: string;
  productId: string;
  movementType: Movement["movement_type"];
  quantity: number;
  reason: string | null;
  actor?: string | null;
}) {
  const row: Movement & Owned = {
    id: newId(),
    user_id: input.userId,
    business_id: input.businessId,
    product_id: input.productId,
    movement_type: input.movementType,
    quantity: input.quantity,
    reason: input.reason,
    actor: input.actor ?? null,
    created_at: nowIso(),
  };
  await put("movements", row);
}

export async function setStock(productId: string, stock: number) {
  const products = await getAll<Product>("products");
  const product = products.find((p) => p.id === productId);
  if (!product) return;
  await put("products", { ...product, current_stock: Math.max(0, Math.round(stock)) });
}

export function useSaveProduct() {
  const { data: business } = useBusiness();
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: ProductInput }) => {
      const userId = await requireUserId();
      if (id) {
        const existing = (await getAll<Product>("products")).find((p) => p.id === id);
        if (!existing) throw new Error("Product not found");
        await put("products", { ...existing, ...values });
        return id;
      }
      const created: Product & Owned = {
        ...values,
        id: newId(),
        user_id: userId,
        business_id: business!.id,
        created_at: nowIso(),
      };
      await put("products", created);
      if (values.current_stock > 0) {
        await addMovementRow({
          userId,
          businessId: business!.id,
          productId: created.id,
          movementType: "received",
          quantity: values.current_stock,
          reason: "Opening stock",
        });
      }
      return created.id;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteProduct() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (id: string) => {
      await remove("products", id);
      await removeWhere<Sale>("sales", (s) => s.product_id === id);
      await removeWhere<Movement>("movements", (m) => m.product_id === id);
      await removeWhere<Alert & { id: string }>("alerts", (a) => a.product_id === id);
      await removeWhere<RecommendationState & { id: string }>(
        "recommendation_states",
        (r) => r.product_id === id,
      );
    },
    onSuccess: invalidate,
  });
}

export async function recordSaleRow(input: {
  userId: string;
  businessId: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  sale_date: string;
  currentStock: number;
  reason?: string;
}) {
  const sale: Sale & Owned = {
    id: newId(),
    user_id: input.userId,
    business_id: input.businessId,
    product_id: input.product_id,
    sale_date: input.sale_date,
    quantity: input.quantity,
    unit_price: input.unit_price,
    created_at: nowIso(),
  };
  await put("sales", sale);
  await setStock(input.product_id, input.currentStock - input.quantity);
  await addMovementRow({
    userId: input.userId,
    businessId: input.businessId,
    productId: input.product_id,
    movementType: "sold",
    quantity: -input.quantity,
    reason: input.reason ?? "Sale recorded",
  });
}

export function useAddSale() {
  const { data: business } = useBusiness();
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (input: {
      product_id: string;
      quantity: number;
      unit_price: number;
      sale_date: string;
      currentStock: number;
    }) => {
      const userId = await requireUserId();
      await recordSaleRow({ ...input, userId, businessId: business!.id });
    },
    onSuccess: invalidate,
  });
}

export function useAddMovement() {
  const { data: business } = useBusiness();
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (input: {
      product_id: string;
      movement_type: Movement["movement_type"];
      quantity: number;
      reason: string;
      currentStock: number;
    }) => {
      const userId = await requireUserId();
      const delta =
        input.movement_type === "received" || input.movement_type === "returned"
          ? Math.abs(input.quantity)
          : input.movement_type === "adjusted"
            ? input.quantity
            : -Math.abs(input.quantity);
      await addMovementRow({
        userId,
        businessId: business!.id,
        productId: input.product_id,
        movementType: input.movement_type,
        quantity: delta,
        reason: input.reason,
      });
      await setStock(input.product_id, input.currentStock + delta);
    },
    onSuccess: invalidate,
  });
}

export function useSetRecommendationState() {
  const { data: business } = useBusiness();
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (input: {
      product_id: string;
      status: RecommendationState["status"];
      quantity?: number;
    }) => {
      const userId = await requireUserId();
      const rows = await getAll<RecommendationState & { business_id: string } & Owned>(
        "recommendation_states",
      );
      const existing = rows.find((r) => r.product_id === input.product_id);
      await put("recommendation_states", {
        id: existing?.id ?? newId(),
        user_id: userId,
        business_id: business!.id,
        product_id: input.product_id,
        status: input.status,
        quantity: input.quantity ?? null,
      });
    },
    onSuccess: invalidate,
  });
}

export function useMarkAlertRead() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const rows = await getAll<Alert>("alerts");
      const updated = rows.filter((a) => ids.includes(a.id)).map((a) => ({ ...a, is_read: true }));
      await putMany("alerts", updated);
    },
    onSuccess: invalidate,
  });
}
