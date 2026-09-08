"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "cn";
import {
  CalendarDays,
  Clock,
  LayoutDashboard,
  LogOut,
  Scissors,
  Settings,
  ExternalLink,
} from "lucide-react";

const LINKS = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/dashboard/bookings", label: "Reservas", icon: CalendarDays },
  { href: "/dashboard/services", label: "Servicios", icon: Scissors },
  { href: "/dashboard/schedule", label: "Horarios", icon: Clock },
  { href: "/dashboard/settings", label: "Configuración", icon: Settings },
];

export function DashboardNav({
  displayName,
  slug,
}: {
  displayName: string;
  slug: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border/60 bg-card/40 backdrop-blur lg:flex">
        <div className="flex h-16 items-center px-6">
          <Link href="/" className="font-display text-lg font-semibold tracking-tight">
            Beauty<span className="text-primary">Book</span>
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
                )}
              >
                <l.icon className="size-4" />
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="grid gap-2 border-t border-border/60 p-4">
          <Link
            href={`/${slug}`}
            target="_blank"
            className={cn(
              "flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-muted",
            )}
          >
            <ExternalLink className="size-4" /> Ver mi página
          </Link>
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="max-w-28 truncate text-sm text-muted-foreground">
              {displayName}
            </span>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Button variant="ghost" size="icon-sm" aria-label="Salir" onClick={signOut}>
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/" className="font-display text-lg font-semibold tracking-tight">
            Beauty<span className="text-primary">Book</span>
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon-sm" aria-label="Salir" onClick={signOut}>
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                <l.icon className="size-4" />
                {l.label}
              </Link>
            );
          })}
        </nav>
      </header>
    </>
  );
}
