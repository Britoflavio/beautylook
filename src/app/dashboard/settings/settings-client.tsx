"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { toast } from "sonner";

export function SettingsClient({ mpStatus, mpUserId }: { mpStatus: string; mpUserId: number | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDisconnect() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("professionals")
      .update({ mp_status: "disconnected" })
      .eq("id", (await supabase.auth.getUser()).data.user!.id);

    // Also clear tokens via admin? This will be blocked by guard_mp_columns for owner.
    // We call a dedicated route that uses service role.
    if (!error) {
      await fetch("/api/auth/mercadopago/disconnect", { method: "POST" });
    }
    setLoading(false);
    if (error) {
      toast.error("No pudimos desconectar");
      return;
    }
    toast.success("Mercado Pago desconectado");
    router.refresh();
  }

  if (mpStatus === "connected") {
    return (
      <div className="grid gap-3">
        <p className="text-sm text-muted-foreground">
          Cuenta MP vinculada {mpUserId ? `(ID ${mpUserId})` : ""}. Las nuevas reservas generarán preferencias a tu nombre.
        </p>
        <div className="flex gap-2">
          <Link href="/api/auth/mercadopago" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Reconectar
          </Link>
          <Button variant="ghost" size="sm" onClick={handleDisconnect} disabled={loading}>
            {loading ? "Desconectando..." : "Desconectar"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">
        Al conectar, Mercado Pago te pedirá autorizar a BeautyBook a crear cobros a tu nombre. Podés revocar en cualquier momento.
      </p>
      <Link href="/api/auth/mercadopago" className={buttonVariants({ size: "sm" })}>
        Conectar con Mercado Pago
      </Link>
    </div>
  );
}
