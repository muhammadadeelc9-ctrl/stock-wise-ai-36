import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel-card flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 rounded-full bg-panel2 p-3">
        <Icon className="size-6 text-faint" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ label = "Analyzing inventory…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-24 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin text-primary" />
      {label}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="panel-card border border-crit/30 p-6 text-sm text-crit">
      <p className="font-semibold">Something went wrong</p>
      <p className="mt-1 text-muted-foreground">{message}</p>
    </div>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  to,
  search,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  to?: string;
  search?: Record<string, string>;
  accent?: "crit" | "high" | "med" | "low";
}) {
  const inner = (
    <>
      <p className="label-mono">{label}</p>
      <p
        className={cn(
          "mt-2 font-display text-2xl font-semibold",
          accent === "crit" && "text-crit",
          accent === "high" && "text-high",
          accent === "med" && "text-med",
          accent === "low" && "text-low",
          !accent && "text-foreground",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </>
  );

  const cls = "panel-card block p-4 text-left transition-colors";
  if (to) {
    return (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <Link to={to as any} search={search as any} className={cn(cls, "hover:bg-panel2")}>
        {inner}
      </Link>
    );
  }
  return <div className={cls}>{inner}</div>;
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="label-mono">{label}</p>
      <p className="mt-1 font-display text-lg font-semibold text-foreground">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
