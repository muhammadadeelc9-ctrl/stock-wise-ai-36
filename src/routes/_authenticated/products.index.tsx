import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Package, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ErrorState, LoadingState, PageHeader } from "@/components/page";
import { DemandBadge, Panel, StatusBadge, Trend } from "@/components/signals";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { STATUS_LABEL } from "@/lib/analytics";
import { useDeleteProduct, useInventory, useSaveProduct, type ProductInput } from "@/lib/data";
import { money, num, shortDate } from "@/lib/format";
import type { Product, StockStatus } from "@/lib/types";

type Search = {
  q?: string | undefined;
  status?: string | undefined;
  category?: string | undefined;
  sort?: string | undefined;
};

export const Route = createFileRoute("/_authenticated/products/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    ...(typeof s["q"] === "string" && s["q"] ? { q: s["q"] } : {}),
    ...(typeof s["status"] === "string" && s["status"] ? { status: s["status"] } : {}),
    ...(typeof s["category"] === "string" && s["category"] ? { category: s["category"] } : {}),
    ...(typeof s["sort"] === "string" && s["sort"] ? { sort: s["sort"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Products — AI Inventory Intelligence" },
      { name: "description", content: "Every product with stock, demand, velocity and status." },
      { property: "og:title", content: "Products — AI Inventory Intelligence" },
      { property: "og:description", content: "Search, filter and manage your full catalogue." },
    ],
  }),
  component: ProductsPage,
});

const EMPTY: ProductInput = {
  name: "",
  sku: "",
  category: "General",
  supplier: "Unassigned",
  cost_price: 0,
  selling_price: 0,
  current_stock: 0,
  min_stock: 0,
  max_stock: 0,
  lead_time_days: 10,
  user_id: "",
  updated_at: "",
} as unknown as ProductInput;

function ProductsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { snapshot, isLoading, error } = useInventory();
  const save = useSaveProduct();
  const remove = useDeleteProduct();
  const [editing, setEditing] = useState<{ id?: string; values: ProductInput } | null>(null);

  const set = (patch: Search) =>
    void navigate({ to: "/products", search: (prev: Search) => ({ ...prev, ...patch }) });

  const categories = useMemo(
    () => Array.from(new Set((snapshot?.items ?? []).map((i) => i.product.category))).sort(),
    [snapshot],
  );

  const rows = useMemo(() => {
    if (!snapshot) return [];
    const q = (search.q ?? "").toLowerCase();
    let list = snapshot.items.filter((i) => {
      const p = i.product;
      const matchQ =
        !q ||
        [p.name, p.sku, p.category, p.supplier].some((v) => v.toLowerCase().includes(q));
      const matchStatus =
        !search.status ||
        search.status === "all" ||
        i.status === search.status ||
        (search.status === "low" && (i.status === "low" || i.status === "critical"));
      const matchCat =
        !search.category || search.category === "all" || p.category === search.category;
      return matchQ && matchStatus && matchCat;
    });
    const sort = search.sort ?? "name";
    list = [...list].sort((a, b) => {
      if (sort === "stock") return b.product.current_stock - a.product.current_stock;
      if (sort === "sold") return b.unitsSold - a.unitsSold;
      if (sort === "revenue") return b.revenue - a.revenue;
      if (sort === "value") return b.inventoryValue - a.inventoryValue;
      return a.product.name.localeCompare(b.product.name);
    });
    return list;
  }, [snapshot, search]);

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error instanceof Error ? error.message : "Unknown error"} />;
  if (!snapshot) return null;
  const c = snapshot.currency;

  function openNew() {
    setEditing({ values: { ...EMPTY } });
  }
  function openEdit(p: Product) {
    const { id: _id, business_id: _b, created_at: _c, ...rest } = p;
    setEditing({ id: p.id, values: rest as unknown as ProductInput });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const v = editing.values;
    if (!v.name.trim() || !v.sku.trim()) {
      toast.error("Name and SKU are required");
      return;
    }
    if (Number(v.selling_price) < Number(v.cost_price)) {
      toast.warning("Selling price is below cost price");
    }
    try {
      await save.mutateAsync({ ...(editing.id ? { id: editing.id } : {}), values: v });
      toast.success(editing.id ? "Product updated" : "Product added");
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the product");
    }
  }

  return (
    <>
      <PageHeader
        title="Products"
        subtitle={`${rows.length} of ${snapshot.totals.products} products · ${money(snapshot.totals.inventoryValue, c)} at cost`}
        actions={
          <Button onClick={openNew}>
            <Plus className="size-4" /> Add product
          </Button>
        }
      />

      <Panel className="mb-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Input
            placeholder="Search name, SKU, category, supplier"
            value={search.q ?? ""}
            onChange={(e) => set({ q: e.target.value || undefined })}
          />
          <Select value={search.status ?? "all"} onValueChange={(v) => set({ status: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Stock status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {(Object.keys(STATUS_LABEL) as StockStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={search.category ?? "all"} onValueChange={(v) => set({ category: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={search.sort ?? "name"} onValueChange={(v) => set({ sort: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="stock">Stock</SelectItem>
              <SelectItem value="sold">Units sold</SelectItem>
              <SelectItem value="revenue">Revenue</SelectItem>
              <SelectItem value="value">Inventory value</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Panel>

      {rows.length === 0 ? (
        <Panel className="py-16 text-center">
          <Package className="mx-auto size-6 text-faint" />
          <p className="mt-3 font-semibold">No products match</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Adjust the filters, or add your first product.
          </p>
        </Panel>
      ) : (
        <Panel className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Sold</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead>Demand</TableHead>
                <TableHead>Trend</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last sale</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((i) => (
                <TableRow key={i.product.id}>
                  <TableCell>
                    <Link
                      to="/products/$id"
                      params={{ id: i.product.id }}
                      className="font-medium hover:text-primary hover:underline"
                    >
                      {i.product.name}
                    </Link>
                    <p className="font-mono text-[11px] text-faint">{i.product.sku}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{i.product.category}</TableCell>
                  <TableCell className="text-right font-mono">
                    {num(i.product.current_stock)}
                  </TableCell>
                  <TableCell className="text-right font-mono">{num(i.unitsSold)}</TableCell>
                  <TableCell className="text-right font-mono">
                    {money(i.revenue, c, true)}
                  </TableCell>
                  <TableCell>
                    <DemandBadge level={i.demandLevel} />
                  </TableCell>
                  <TableCell>
                    <Trend pct={i.trendPct} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={i.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {i.lastSaleDate ? shortDate(i.lastSaleDate) : "Never"}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(i.product)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={async () => {
                          if (!confirm(`Delete ${i.product.name}?`)) return;
                          await remove.mutateAsync(i.product.id);
                          toast.success("Product deleted");
                        }}
                      >
                        <Trash2 className="size-3.5 text-crit" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit product" : "Add product"}</DialogTitle>
            <DialogDescription>
              Costs, stock levels and lead time all feed the analysis engine.
            </DialogDescription>
          </DialogHeader>
          {editing ? (
            <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["name", "Name", "text"],
                  ["sku", "SKU", "text"],
                  ["category", "Category", "text"],
                  ["supplier", "Supplier", "text"],
                  ["cost_price", "Cost price", "number"],
                  ["selling_price", "Selling price", "number"],
                  ["current_stock", "Current stock", "number"],
                  ["min_stock", "Min stock", "number"],
                  ["max_stock", "Max stock", "number"],
                  ["lead_time_days", "Lead time (days)", "number"],
                ] as const
              ).map(([key, label, type]) => (
                <div key={key} className="space-y-1.5">
                  <Label htmlFor={key}>{label}</Label>
                  <Input
                    id={key}
                    type={type}
                    step="any"
                    min={type === "number" ? 0 : undefined}
                    value={String(editing.values[key] ?? "")}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        values: {
                          ...editing.values,
                          [key]: type === "number" ? Number(e.target.value) : e.target.value,
                        },
                      })
                    }
                    required={key === "name" || key === "sku"}
                  />
                </div>
              ))}
              <DialogFooter className="sm:col-span-2">
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={save.isPending}>
                  {editing.id ? "Save changes" : "Add product"}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
