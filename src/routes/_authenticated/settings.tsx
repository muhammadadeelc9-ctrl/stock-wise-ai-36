import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Database, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ErrorState, LoadingState, PageHeader } from "@/components/page";
import { Panel } from "@/components/signals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { loadDemoData } from "@/lib/demo-data";
import { useBusiness, useInvalidateAll, useSettings } from "@/lib/data";
import { CURRENCIES } from "@/lib/format";
import type { UserSettings } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — AI Inventory Intelligence" },
      {
        name: "description",
        content: "Business profile, alert preferences and demo business data.",
      },
      { property: "og:title", content: "Settings" },
      {
        property: "og:description",
        content: "Tune lead times, thresholds and notifications, or load demo data.",
      },
    ],
  }),
  component: SettingsPage,
});

const BUSINESS_TYPES = [
  "Retail",
  "Wholesale",
  "E-commerce",
  "Restaurant",
  "Pharmacy",
  "Manufacturing",
  "Other",
];

function SettingsPage() {
  const { data: business, isLoading, error, refetch } = useBusiness();
  const { data: settings } = useSettings();
  const invalidate = useInvalidateAll();

  const [form, setForm] = useState({
    name: "",
    business_type: "Retail",
    currency: "USD",
    country: "",
    default_lead_time_days: 10,
    low_stock_threshold: 10,
  });

  useEffect(() => {
    if (business) {
      setForm({
        name: business.name,
        business_type: business.business_type,
        currency: business.currency,
        country: business.country,
        default_lead_time_days: business.default_lead_time_days,
        low_stock_threshold: business.low_stock_threshold,
      });
    }
  }, [business]);

  const saveBusiness = useMutation({
    mutationFn: async () => {
      if (!business) throw new Error("No business loaded");
      const { error: e } = await supabase
        .from("businesses")
        .update({
          name: form.name.trim() || "My Business",
          business_type: form.business_type,
          currency: form.currency,
          country: form.country,
          default_lead_time_days: Number(form.default_lead_time_days) || 10,
          low_stock_threshold: Number(form.low_stock_threshold) || 10,
        })
        .eq("id", business.id);
      if (e) throw e;
    },
    onSuccess: () => {
      toast.success("Business profile saved");
      void refetch();
      invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const saveSetting = useMutation({
    mutationFn: async (patch: Partial<UserSettings>) => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error("Not signed in");
      const { error: e } = await supabase
        .from("user_settings")
        .update(patch)
        .eq("user_id", data.user.id);
      if (e) throw e;
    },
    onSuccess: () => {
      toast.success("Preference updated");
      invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const demo = useMutation({
    mutationFn: async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error("Not signed in");
      if (!business) throw new Error("No business loaded");
      return loadDemoData(data.user.id, business.id);
    },
    onSuccess: (result) => {
      toast.success(
        `Demo data loaded — ${result.products} products and ${result.sales} sales records`,
      );
      invalidate();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not load demo data"),
  });

  if (isLoading) return <LoadingState label="Loading settings…" />;
  if (error)
    return <ErrorState message={error instanceof Error ? error.message : "Unknown error"} />;

  const toggles: { key: keyof UserSettings; label: string; hint: string }[] = [
    {
      key: "notify_stockout",
      label: "Stockout warnings",
      hint: "Alert when cover drops below the supplier lead time.",
    },
    {
      key: "notify_overstock",
      label: "Overstock warnings",
      hint: "Alert when a product holds far more stock than demand needs.",
    },
    {
      key: "notify_slow_moving",
      label: "Slow-moving warnings",
      hint: "Alert when a product stops selling for 30 days or more.",
    },
    {
      key: "notify_email",
      label: "Email digest",
      hint: "Include these alerts in an email summary.",
    },
  ];

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Business profile, thresholds and alert preferences. Lead time and threshold changes immediately affect every calculation in the app."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <p className="label-mono">Business profile</p>
          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveBusiness.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="name">Business name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Business type</Label>
                <Select
                  value={form.business_type}
                  onValueChange={(v) => setForm({ ...form, business_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select
                  value={form.currency}
                  onValueChange={(v) => setForm({ ...form, currency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="lead">Default supplier lead time (days)</Label>
                <Input
                  id="lead"
                  type="number"
                  min={1}
                  value={form.default_lead_time_days}
                  onChange={(e) =>
                    setForm({ ...form, default_lead_time_days: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="threshold">Low stock threshold (units)</Label>
                <Input
                  id="threshold"
                  type="number"
                  min={0}
                  value={form.low_stock_threshold}
                  onChange={(e) =>
                    setForm({ ...form, low_stock_threshold: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <Button type="submit" disabled={saveBusiness.isPending}>
              {saveBusiness.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save profile
            </Button>
          </form>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <p className="label-mono">Alert preferences</p>
            <div className="mt-4 space-y-4">
              {toggles.map((t) => (
                <div key={t.key} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.hint}</p>
                  </div>
                  <Switch
                    checked={Boolean(settings?.[t.key] ?? true)}
                    disabled={!settings || saveSetting.isPending}
                    onCheckedChange={(checked) =>
                      saveSetting.mutate({ [t.key]: checked } as Partial<UserSettings>)
                    }
                  />
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <p className="label-mono">Demo business data</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Loads a realistic catalogue of 22 products with 120 days of sales history covering
              fast sellers, stockout risks, overstock and dead stock. This replaces all existing
              products, sales, movements and alerts for this business.
            </p>
            <Button
              className="mt-4"
              variant="outline"
              disabled={demo.isPending}
              onClick={() => demo.mutate()}
            >
              {demo.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Database className="size-4" />
              )}
              {demo.isPending ? "Loading demo data…" : "Load demo business data"}
            </Button>
          </Panel>
        </div>
      </div>
    </>
  );
}
