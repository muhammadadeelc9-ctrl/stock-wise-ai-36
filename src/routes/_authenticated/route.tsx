import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { currentAccount } from "@/lib/local-db";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const account = await currentAccount();
    if (!account) throw redirect({ to: "/auth" });
    return { user: account };
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
