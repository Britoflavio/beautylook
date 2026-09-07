"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function Countdown({ to }: { to: string }) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(to).getTime() - Date.now()) / 1000)),
  );

  useEffect(() => {
    const t = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.floor((new Date(to).getTime() - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(t);
  }, [to]);

  return (
    <span className="font-mono font-medium tabular-nums">
      {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
    </span>
  );
}

export function AutoRefresh({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(t);
  }, [enabled, router]);
  return null;
}
