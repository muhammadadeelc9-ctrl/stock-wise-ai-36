import { Cloud, CloudOff } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export function useOnlineStatus() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

export function OnlineStatus({ className }: { className?: string }) {
  const online = useOnlineStatus();
  return (
    <span
      title={
        online
          ? "Online — your data is still stored on this device"
          : "Offline — everything you do is saved on this device"
      }
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-wide uppercase",
        online
          ? "border-line text-muted-foreground"
          : "border-high/40 bg-high/10 text-high",
        className,
      )}
    >
      {online ? <Cloud className="size-3" /> : <CloudOff className="size-3" />}
      {online ? "Online" : "Offline"}
    </span>
  );
}

/** Full-width note shown inside the app when the device loses connectivity. */
export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="flex items-start gap-2 border-b border-high/30 bg-high/10 px-4 py-2 text-xs text-high md:px-8">
      <CloudOff className="mt-0.5 size-3.5 shrink-0" />
      <p>
        You are offline. Stock Wise AI keeps working — every product, sale and stock change you make
        is saved locally on this device.
      </p>
    </div>
  );
}
