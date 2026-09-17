import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Boxes, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAccount, getSessionUserId, resetPassword, signIn } from "@/lib/local-db";

type Mode = "signin" | "signup" | "forgot";

type AuthSearch = { mode?: "signin" | "signup"; demo?: string };

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    mode: search["mode"] === "signup" ? "signup" : "signin",
    ...(search["demo"] === "1" ? { demo: "1" } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Stock Wise AI" },
      {
        name: "description",
        content:
          "Create your on-device Stock Wise AI account. Your inventory data stays stored offline on this phone.",
      },
      { property: "og:title", content: "Sign in — Stock Wise AI" },
      { property: "og:description", content: "Access your offline inventory control tower." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (getSessionUserId()) void navigate({ to: "/dashboard", replace: true });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        await resetPassword(email, password);
        toast.success("Password updated on this device");
        setMode("signin");
        return;
      }
      if (mode === "signup") {
        await createAccount(email, password, fullName);
        toast.success("Account created on this device");
      } else {
        await signIn(email, password);
        toast.success("Welcome back");
      }
      void navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden flex-1 flex-col justify-between border-r border-line bg-panel/40 p-12 lg:flex">
        <Link to="/" className="flex items-center gap-2">
          <Boxes className="size-5 text-primary" />
          <span className="font-display text-sm font-semibold">Stock Wise AI</span>
        </Link>
        <div>
          <h2 className="max-w-md font-display text-3xl leading-snug font-semibold">
            Know your inventory before it becomes a problem.
          </h2>
          <p className="mt-4 max-w-md text-sm text-muted-foreground">
            Everything runs on your device — forecasting, stockout risk, overstock detection and
            reorder recommendations, with or without an internet connection.
          </p>
        </div>
        <p className="label-mono">Offline control tower for small business stock</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-2xl font-semibold">
            {mode === "signup"
              ? "Create your account"
              : mode === "forgot"
                ? "Set a new password"
                : "Sign in"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "forgot"
              ? "Enter your email and choose a new password for this device."
              : "Your account and inventory are stored offline on this device."}
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            {mode === "signup" ? (
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Morgan"
                  required
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@business.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                {mode === "forgot" ? "New password" : "Password"}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                minLength={6}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {mode === "signup"
                ? "Create account"
                : mode === "forgot"
                  ? "Update password"
                  : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 space-y-2 text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>
                <button className="hover:text-foreground" onClick={() => setMode("forgot")}>
                  Forgot your password?
                </button>
                <p>
                  New here?{" "}
                  <button
                    className="text-primary hover:underline"
                    onClick={() => setMode("signup")}
                  >
                    Create an account
                  </button>
                </p>
              </>
            ) : (
              <p>
                Already have an account?{" "}
                <button className="text-primary hover:underline" onClick={() => setMode("signin")}>
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
