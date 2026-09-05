import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import { supabase } from "@/integrations/supabase/client";
import { analyzeInventory, type InventorySnapshot } from "./analytics";
import type {
  Alert,
  Business,
  Movement,
  Product,
  RecommendationState,
  Sale,
  UserSettings,
} from "./types";

async function requireUserId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

export function useBusiness() {
  return useQuery({
    queryKey: ["business"],
    queryFn: async (): Promise<Business | null> => {
      const userId = await requireUserId();
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1);
      if (error) throw error;
      if (data && data.length > 0) return data[0] as unknown as Business;

      const { data: created, error: insertError } = await supabase
        .from("businesses")
        .insert({ user_id: userId })
        .select("*")
        .single();
      if (insertError) throw insertError;
      return created as unknown as Business;
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
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("business_id", business!.id)
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Product[];
    },
  });
}

export function useSales() {
  const { data: business } = useBusiness();
  return useQuery({
    queryKey: ["sales", business?.id],
    enabled: !!business?.id,
    queryFn: async (): Promise<Sale[]> => {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .eq("business_id", business!.id)
        .order("sale_date", { ascending: false })
        .limit(20000);
      if (error) throw error;
      return (data ?? []) as unknown as Sale[];
    },
  });
}

export function useMovements() {
  const { data: business } = useBusiness();
  return useQuery({
    queryKey: ["movements", business?.id],
    enabled: !!business?.id,
    queryFn: async (): Promise<Movement[]> => {
      const { data, error } = await supabase
        .from("inventory_movements")
        .select("*")
        .eq("business_id", business!.id)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as Movement[];
    },
  });
}

export function useAlerts() {
  const { data: business } = useBusiness();
  return useQuery({
    queryKey: ["alerts", business?.id],
    enabled: !!business?.id,
    queryFn: async (): Promise<Alert[]> => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .eq("business_id", business!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as Alert[];
    },
  });
}

export function useRecommendationStates() {
  const { data: business } = useBusiness();
  return useQuery({
    queryKey: ["rec-states", business?.id],
    enabled: !!business?.id,
    queryFn: async (): Promise<RecommendationState[]> => {
      const { data, error } = await supabase
        .from("recommendation_states")
        .select("*")
        .eq("business_id", business!.id);
      if (error) throw error;
      return (data ?? []) as unknown as RecommendationState[];
    },
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async (): Promise<UserSettings | null> => {
      const userId = await requireUserId();
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as unknown as UserSettings;
      const { data: created, error: e2 } = await supabase
        .from("user_settings")
        .insert({ user_id: userId })
        .select("*")
        .single();
      if (e2) throw e2;
      return created as unknown as UserSettings;
    },
  });
}

/** The analyzed snapshot every intelligence screen reads from. */
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
  };
}

/* ------------------------- mutations ------------------------- */

export type ProductInput = Omit<Product, "id" | "business_id" | "created_at">;

export function useSaveProduct() {
  const { data: business } = useBusiness();
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: ProductInput }) => {
      const userId = await requireUserId();
      if (id) {
        const { error } = await supabase.from("products").update(values).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await supabase
        .from("products")
        .insert({ ...values, user_id: userId, business_id: business!.id })
        .select("id")
        .single();
      if (error) throw error;
      if (values.current_stock > 0) {
        await supabase.from("inventory_movements").insert({
          user_id: userId,
          business_id: business!.id,
          product_id: data.id,
          movement_type: "received",
          quantity: values.current_stock,
          reason: "Opening stock",
        });
      }
      return data.id as string;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteProduct() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
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
      const { error } = await supabase.from("sales").insert({
        user_id: userId,
        business_id: business!.id,
        product_id: input.product_id,
        quantity: input.quantity,
        unit_price: input.unit_price,
        sale_date: input.sale_date,
      });
      if (error) throw error;
      await supabase
        .from("products")
        .update({ current_stock: Math.max(0, input.currentStock - input.quantity) })
        .eq("id", input.product_id);
      await supabase.from("inventory_movements").insert({
        user_id: userId,
        business_id: business!.id,
        product_id: input.product_id,
        movement_type: "sold",
        quantity: -input.quantity,
        reason: "Sale recorded",
      });
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
      const { error } = await supabase.from("inventory_movements").insert({
        user_id: userId,
        business_id: business!.id,
        product_id: input.product_id,
        movement_type: input.movement_type,
        quantity: delta,
        reason: input.reason,
      });
      if (error) throw error;
      const { error: e2 } = await supabase
        .from("products")
        .update({ current_stock: Math.max(0, input.currentStock + delta) })
        .eq("id", input.product_id);
      if (e2) throw e2;
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
      const { error } = await supabase.from("recommendation_states").upsert(
        {
          user_id: userId,
          business_id: business!.id,
          product_id: input.product_id,
          status: input.status,
          quantity: input.quantity ?? null,
        },
        { onConflict: "product_id" },
      );
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useMarkAlertRead() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("alerts").update({ is_read: true }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
