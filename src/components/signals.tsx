import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { DEMAND_LABEL, MATRIX_LABEL, STATUS_LABEL } from "@/lib/analytics";
import type { DemandLevel, MatrixClass, Priority, StockStatus } from "@/lib/types";

const base =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap";

const tone: Record<string, string> = {
  crit: "bg-crit/15 text-crit ring-1 ring-inset ring-crit/30",
  high: "bg-high/15 text-high ring-1 ring-inset ring-high/30",
  med: "bg-med/15 text-med ring-1 ring-inset ring-med/30",
  low: "bg-low/15 text-low ring-1 ring-inset ring-low/30",
  faint: "bg-panel2 text-faint ring-1 ring-inset ring-line",
};

const STATUS_TONE: Record<StockStatus, string> = {
  out_of_stock: "crit",
  critical: "crit",
  low: "high",
  healthy: "low",
  overstock: "med",
  slow_moving: "faint",
};

const PRIORITY_TONE: Record<Priority, string> = {
  critical: "crit",
  high: "high",
  medium: "med",
  low: "low",
};

const DEMAND_TONE: Record<DemandLevel, string> = {
  very_high: "low",
  high: "low",
  medium: "med",
  low: "high",
  very_low: "faint",
};

const MATRIX_TONE: Record<MatrixClass, string> = {
  priority: "high",
  maintain: "low",
  watch: "med",
  reduce: "crit",
  stop: "faint",
};

export const MATRIX_MARK: Record<MatrixClass, string> = {
  priority: "★",
  maintain: "●",
  watch: "●",
  reduce: "●",
  stop: "●",
};

export function StatusBadge({ status }: { status: StockStatus }) {
  return <span className={cn(base, tone[STATUS_TONE[status]])}>{STATUS_LABEL[status]}</span>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={cn(base, tone[PRIORITY_TONE[priority]], "uppercase tracking-wide")}>
      {priority}
    </span>
  );
}

export function DemandBadge({ level }: { level: DemandLevel }) {
  return <span className={cn(base, tone[DEMAND_TONE[level]])}>{DEMAND_LABEL[level]}</span>;
}

export function MatrixBadge({ cls }: { cls: MatrixClass }) {
  return (
    <span className={cn(base, tone[MATRIX_TONE[cls]])}>
      {MATRIX_MARK[cls]} {MATRIX_LABEL[cls]}
    </span>
  );
}

export function Trend({ pct }: { pct: number }) {
  const up = pct > 2;
  const down = pct < -2;
  return (
    <span
      className={cn(
        "font-mono text-xs",
        up ? "text-low" : down ? "text-crit" : "text-faint",
      )}
    >
      {up ? "▲" : down ? "▼" : "—"} {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

export function Panel({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("panel-card p-5", className)}>{children}</div>;
}
