import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  Bell,
  Boxes,
  ChevronDown,
  FileText,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  PackageX,
  Search,
  Settings,
  ShoppingCart,
  Sparkles,
  TrendingDown,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { OfflineBanner, OnlineStatus } from "@/components/online-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clearSession } from "@/lib/local-db";
import { useAlerts, useBusiness } from "@/lib/data";
import { cn } from "@/lib/utils";

const NAV: { group: string; items: { to: string; label: string; icon: typeof Boxes }[] }[] = [
  {
    group: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/products", label: "Products", icon: Package },
      { to: "/sales", label: "Sales", icon: ShoppingCart },
      { to: "/inventory", label: "Inventory", icon: ArrowLeftRight },
    ],
  },
  {
    group: "Intelligence",
    items: [
      { to: "/forecast", label: "Forecast", icon: LineChart },
      { to: "/risk", label: "Stockout Risk", icon: AlertTriangle },
      { to: "/recommendations", label: "Recommendations", icon: Sparkles },
      { to: "/overstock", label: "Overstock", icon: PackageX },
      { to: "/slow-moving", label: "Slow-Moving", icon: TrendingDown },
    ],
  },
  {
    group: "Workspace",
    items: [
      { to: "/alerts", label: "Alerts", icon: Bell },
      { to: "/assistant", label: "AI Assistant", icon: MessageSquare },
      { to: "/reports", label: "Reports", icon: FileText },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { data: business } = useBusiness();
  const { data: alerts } = useAlerts();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");

  const unread = (alerts ?? []).filter((a) => !a.is_read).length;

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    void navigate({ to: "/auth", replace: true });
  }

  function runSearch(e: React.FormEvent) {
    e.preventDefault();
    void navigate({ to: "/products", search: { q: term || undefined } });
  }

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-line bg-panel transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-line px-5">
          <Boxes className="size-5 text-primary" />
          <span className="font-display text-sm font-semibold">Inventory Intelligence</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV.map((group) => (
            <div key={group.group} className="mb-5">
              <p className="label-mono px-2 pb-2">{group.group}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
                  return (
                    <Link
                      key={item.to}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      to={item.to as any}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                        active
                          ? "bg-panel2 font-medium text-foreground"
                          : "text-muted-foreground hover:bg-panel2/60 hover:text-foreground",
                      )}
                    >
                      <item.icon
                        className={cn("size-4", active ? "text-primary" : "text-faint")}
                      />
                      <span className="flex-1">{item.label}</span>
                      {item.to === "/alerts" && unread > 0 ? (
                        <span className="rounded-full bg-crit/20 px-1.5 py-0.5 font-mono text-[10px] text-crit">
                          {unread}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-line p-3">
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-panel2 hover:text-foreground"
          >
            <LogOut className="size-4 text-faint" />
            Sign out
          </button>
        </div>
      </aside>

      {open ? (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-ink/70 lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-background/90 px-4 backdrop-blur md:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Open menu"
          >
            <Menu className="size-4" />
          </Button>
          <form onSubmit={runSearch} className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search products, SKU, category, supplier…"
              className="pl-9"
            />
          </form>
          <div className="ml-auto flex items-center gap-3">
            <Link
              to="/alerts"
              className="relative rounded-md p-2 text-muted-foreground hover:bg-panel2 hover:text-foreground"
              aria-label="Alerts"
            >
              <Bell className="size-4" />
              {unread > 0 ? (
                <span className="absolute top-1 right-1 size-2 rounded-full bg-crit" />
              ) : null}
            </Link>
            <Link
              to="/settings"
              className="hidden items-center gap-2 rounded-md border border-line px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground sm:flex"
            >
              <BarChart3 className="size-3.5 text-primary" />
              {business?.name ?? "My Business"}
              <ChevronDown className="size-3.5" />
            </Link>
          </div>
        </header>
        <main className="px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
