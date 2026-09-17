import { createFileRoute } from "@tanstack/react-router";
import { Download, Plus, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ErrorState, LoadingState, PageHeader } from "@/components/page";
import { Panel } from "@/components/signals";
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
import { requireUserId } from "@/lib/local-db";
import {
  recordSaleRow,
  useAddSale,
  useBusiness,
  useInventory,
  useInvalidateAll,
  useSales,
} from "@/lib/data";
import { SALES_TEMPLATE, downloadFile, parseCsv, toCsv, type ValidationIssue } from "@/lib/csv";
import { money, num, shortDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/sales")({
  head: () => ({
    meta: [
      { title: "Sales — AI Inventory Intelligence" },
      { name: "description", content: "Record sales, import history from CSV and review revenue." },
      { property: "og:title", content: "Sales — AI Inventory Intelligence" },
      { property: "og:description", content: "Every sale feeds demand analysis automatically." },
    ],
  }),
  component: SalesPage,
});

function SalesPage() {
  const { snapshot, isLoading, error } = useInventory();
  const { data: sales } = useSales();
  const { data: business } = useBusiness();
  const addSale = useAddSale();
  const invalidate = useInvalidateAll();
  const fileRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [filterProduct, setFilterProduct] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [issues, setIssues] = useState<ValidationIssue[] | null>(null);
  const [importing, setImporting] = useState(false);

  const rows = useMemo(() => {
    const list = sales ?? [];
    return list.filter((s) => {
      if (filterProduct !== "all" && s.product_id !== filterProduct) return false;
      if (from && s.sale_date < from) return false;
      if (to && s.sale_date > to) return false;
      return true;
    });
  }, [sales, filterProduct, from, to]);

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error instanceof Error ? error.message : "Unknown error"} />;
  if (!snapshot) return null;
  const c = snapshot.currency;

  const totalUnits = rows.reduce((s, r) => s + r.quantity, 0);
  const totalRevenue = rows.reduce((s, r) => s + r.quantity * Number(r.unit_price), 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const item = snapshot!.byId[productId];
    if (!item) {
      toast.error("Choose a product");
      return;
    }
    if (qty <= 0) {
      toast.error("Quantity must be greater than zero");
      return;
    }
    try {
      await addSale.mutateAsync({
        product_id: productId,
        quantity: qty,
        unit_price: price || Number(item.product.selling_price),
        sale_date: date,
        currentStock: item.product.current_stock,
      });
      toast.success("Sale recorded");
      setOpen(false);
      setQty(1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record the sale");
    }
  }

  async function importCsv(file: File) {
    setImporting(true);
    setIssues(null);
    try {
      const parsed = parseCsv(await file.text());
      const found: ValidationIssue[] = [];
      const valid: {
        product_id: string;
        sale_date: string;
        quantity: number;
        unit_price: number;
      }[] = [];
      const userId = await requireUserId();
      if (!business) throw new Error("No business loaded");

      const bySku = new Map(snapshot!.items.map((i) => [i.product.sku.toLowerCase(), i]));
      const byName = new Map(snapshot!.items.map((i) => [i.product.name.toLowerCase(), i]));

      parsed.rows.forEach((r, idx) => {
        const line = idx + 2;
        const item =
          bySku.get((r["sku"] ?? "").toLowerCase()) ?? byName.get((r["product"] ?? "").toLowerCase());
        if (!item) {
          found.push({ row: line, message: `No product matches "${r["sku"] || r["product"] || "(blank)"}"` });
          return;
        }
        const quantity = Number(r["quantity"]);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          found.push({ row: line, message: `Quantity "${r["quantity"]}" is not a positive number` });
          return;
        }
        const d = r["date"] ?? "";
        if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
          found.push({ row: line, message: `Date "${d}" must be YYYY-MM-DD` });
          return;
        }
        const unit = Number(r["selling_price"] || item.product.selling_price);
        if (!Number.isFinite(unit) || unit < 0) {
          found.push({ row: line, message: `Selling price "${r["selling_price"]}" is not valid` });
          return;
        }
        valid.push({
          product_id: item.product.id,
          sale_date: d,
          quantity,
          unit_price: unit,
        });
      });

      if (valid.length > 0) {
        const remaining = new Map<string, number>();
        for (const v of valid) {
          const item = snapshot!.byId[v.product_id];
          const stock = remaining.get(v.product_id) ?? item?.product.current_stock ?? 0;
          await recordSaleRow({
            userId,
            businessId: business.id,
            product_id: v.product_id,
            quantity: v.quantity,
            unit_price: v.unit_price,
            sale_date: v.sale_date,
            currentStock: stock,
            reason: "CSV import",
          });
          remaining.set(v.product_id, Math.max(0, stock - v.quantity));
        }
        invalidate();
      }

      setIssues(found);
      if (valid.length > 0)
        toast.success(`Imported ${valid.length} sale${valid.length > 1 ? "s" : ""}`, {
          description: found.length > 0 ? `${found.length} row(s) were skipped.` : undefined,
        });
      else toast.error("Nothing was imported", { description: "Every row failed validation." });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <>
      <PageHeader
        title="Sales"
        subtitle={`${num(totalUnits)} units · ${money(totalRevenue, c)} in the current view`}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => downloadFile("sales-template.csv", SALES_TEMPLATE)}
            >
              <Download className="size-4" /> Template
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importing}>
              <Upload className="size-4" /> Import CSV
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importCsv(f);
              }}
            />
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" /> Record sale
            </Button>
          </>
        }
      />

      {issues && issues.length > 0 ? (
        <Panel className="mb-4 border border-crit/30">
          <p className="text-sm font-semibold text-crit">{issues.length} row(s) were not imported</p>
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-muted-foreground">
            {issues.map((i) => (
              <li key={`${i.row}-${i.message}`}>Row {i.row}: {i.message}</li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Panel className="mb-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Select value={filterProduct} onValueChange={setFilterProduct}>
            <SelectTrigger>
              <SelectValue placeholder="Product" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All products</SelectItem>
              {snapshot.items.map((i) => (
                <SelectItem key={i.product.id} value={i.product.id}>
                  {i.product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <Button
            variant="outline"
            onClick={() =>
              downloadFile(
                "sales-export.csv",
                toCsv(
                  rows.map((r) => ({
                    date: r.sale_date,
                    product: snapshot.byId[r.product_id]?.product.name ?? "",
                    sku: snapshot.byId[r.product_id]?.product.sku ?? "",
                    quantity: r.quantity,
                    selling_price: r.unit_price,
                  })),
                ),
              )
            }
          >
            <Download className="size-4" /> Export view
          </Button>
        </div>
      </Panel>

      <Panel className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Unit price</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, 300).map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-muted-foreground">{shortDate(r.sale_date)}</TableCell>
                <TableCell>{snapshot.byId[r.product_id]?.product.name ?? "Deleted product"}</TableCell>
                <TableCell className="text-right font-mono">{num(r.quantity)}</TableCell>
                <TableCell className="text-right font-mono">{money(Number(r.unit_price), c)}</TableCell>
                <TableCell className="text-right font-mono">
                  {money(r.quantity * Number(r.unit_price), c)}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  No sales in this view yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Panel>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record a sale</DialogTitle>
            <DialogDescription>Stock and demand analysis update immediately.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Product</Label>
              <Select
                value={productId}
                onValueChange={(v) => {
                  setProductId(v);
                  setPrice(Number(snapshot.byId[v]?.product.selling_price ?? 0));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a product" />
                </SelectTrigger>
                <SelectContent>
                  {snapshot.items.map((i) => (
                    <SelectItem key={i.product.id} value={i.product.id}>
                      {i.product.name} · {num(i.product.current_stock)} in stock
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="q">Quantity</Label>
                <Input id="q" type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pr">Unit price</Label>
                <Input id="pr" type="number" step="any" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dt">Date</Label>
                <Input id="dt" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addSale.isPending}>
                Record sale
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
