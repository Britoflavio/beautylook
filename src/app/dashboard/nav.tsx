"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buttonVariants, Button } from "@/components/ui/button";

const LINKS = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/dashboard/bookings", label: "Reservas" },
  { href: "/dashboard/services", label: "Servicios" },
  { href: "/dashboard/schedule", label: "Horarios" },
  { href: "/dashboard/settings", label: "Configuración" },
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
    <header className="border-b bg-background sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <nav className="flex items-center gap-1 overflow-x-auto">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors ${
                pathname === l.href
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/${slug}`}
            target="_blank"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Ver mi página
          </Link>
          <span className="text-sm text-muted-foreground hidden sm:block max-w-32 truncate">
            {displayName}
          </span>
          <Button variant="ghost" size="sm" onClick={signOut}>
            Salir
          </Button>
        </div>
      </div>
    </header>
  );
}
