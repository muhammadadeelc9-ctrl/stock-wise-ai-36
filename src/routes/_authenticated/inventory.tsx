import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
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
import { useAddMovement, useInventory, useMovements } from "@/lib/data";
import { num, shortDate } from "@/lib/format";
import type { MovementType } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory movements — AI Inventory Intelligence" },
      { name: "description", content: "Audit trail of stock received, sold, adjusted, returned and damaged." },
      { property: "og:title", content: "Inventory movements — AI Inventory Intelligence" },
      { property: "og:description", content: "Every stock change, with reason and timestamp." },
    ],
  }),
  component: InventoryPage,
});

const TYPES: MovementType[] = ["received", "sold", "adjusted", "returned", "damaged"];

function InventoryPage() {
  const { snapshot, isLoading, error } = useInventory();
  const { data: movements } = useMovements();
  const add = useAddMovement();
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [type, setType] = useState<MovementType>("received");
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState("");
  const [filter, setFilter] = useState("all");

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error instanceof Error ? error.message : "Unknown error"} />;
  if (!snapshot) return null;

  const rows = (movements ?? []).filter((m) => filter === "all" || m.movement_type === filter);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const item = snapshot!.byId[productId];
    if (!item) {
      toast.error("Choose a product");
      return;
    }
    if (!reason.trim()) {
      toast.error("Add a reason so the audit trail stays useful");
      return;
    }
    try {
      await add.mutateAsync({
        product_id: productId,
        movement_type: type,
        quantity: qty,
        reason,
        currentStock: item.product.current_stock,
      });
      toast.success("Movement recorded");
      setOpen(false);
      setReason("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record the movement");
    }
  }

  return (
    <>
      <PageHeader
        title="Inventory movements"
        subtitle="A complete audit trail of every stock change."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Record movement
          </Button>
        }
      />

      <Panel className="mb-4 max-w-xs">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Movement type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All movement types</SelectItem>
            {TYPES.map((t) => (
              <SelectItem key={t} value={t} className="capitalize">
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Panel>

      <Panel className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="text-muted-foreground">{shortDate(m.created_at)}</TableCell>
                <TableCell>{snapshot.byId[m.product_id]?.product.name ?? "Deleted product"}</TableCell>
                <TableCell className="capitalize">{m.movement_type}</TableCell>
                <TableCell
                  className={`text-right font-mono ${m.quantity < 0 ? "text-crit" : "text-low"}`}
                >
                  {m.quantity > 0 ? "+" : ""}
                  {num(m.quantity)}
                </TableCell>
                <TableCell className="text-muted-foreground">{m.reason ?? "—"}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  No movements recorded yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Panel>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record a stock movement</DialogTitle>
            <DialogDescription>
              Received and returned add stock; sold and damaged remove it. Adjusted applies the
              number exactly as entered.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Product</Label>
              <Select value={productId} onValueChange={setProductId}>
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
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as MovementType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mq">Quantity</Label>
                <Input id="mq" type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mr">Reason</Label>
              <Input
                id="mr"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Supplier delivery, stock count correction, breakage…"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={add.isPending}>
                Record movement
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
