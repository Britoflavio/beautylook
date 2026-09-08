"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BOOKING_STATUS_LABELS, formatARS } from "@/lib/format";
import { formatARDayTime } from "@/lib/time";
import { toast } from "sonner";
import { cn } from "cn";
import { CalendarDays } from "lucide-react";

type Row = {
  id: string;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  amount: string;
  currency: string;
  hold_expires_at: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
  payment_id: number | null;
  services: { name: string } | null;
};

const STATUSES = ["all", "confirmed", "pending_payment", "held", "cancelled"] as const;

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "confirmed"
      ? "default"
      : status === "cancelled"
        ? "secondary"
        : status === "held"
          ? "outline"
          : "secondary";
  return <Badge variant={variant}>{BOOKING_STATUS_LABELS[status] ?? status}</Badge>;
}

export function BookingsClient({
  initial,
  initialStatus,
}: {
  initial: Row[];
  initialStatus: string;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState(initialStatus);
  const [busy, setBusy] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);

  async function handleCancel(id: string) {
    setBusy(id);
    const res = await fetch(`/api/bookings/${id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actor: "professional" }),
    });
    setBusy(null);
    setCancelId(null);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(data?.error ?? "No se pudo cancelar");
      return;
    }
    toast.success(
      data?.refund_due
        ? `Cancelada — reembolso ${formatARS(data.refund_amount ?? 0)}`
        : "Reserva cancelada",
    );
    router.refresh();
  }

  const filtered = filter === "all" ? initial : initial.filter((b) => b.status === filter);
  const counts = STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = s === "all" ? initial.length : initial.filter((b) => b.status === s).length;
    return acc;
  }, {});

  return (
    <div className="grid gap-4">
      <div className="flex gap-2 flex-wrap">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition-colors",
              filter === s
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:bg-accent/40",
            )}
          >
            {s === "all" ? "Todas" : BOOKING_STATUS_LABELS[s] ?? s}
            <span className={cn("ml-1.5", filter === s ? "opacity-80" : "text-muted-foreground")}>
              {counts[s]}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent>
            <Empty
              icon={<CalendarDays className="size-5" />}
              title="No hay reservas en este filtro"
              description="Cuando tus clientas reserven, los turnos van a aparecer acá."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((b) => (
            <Card key={b.id}>
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="grid gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{b.client_name}</span>
                    <StatusBadge status={b.status} />
                    <span className="text-sm text-muted-foreground">
                      {b.services?.name ?? ""}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatARDayTime(b.starts_at)} · {formatARS(b.amount)} ·{" "}
                    {b.client_phone}
                    {b.client_email ? ` · ${b.client_email}` : ""}
                  </div>
                  {b.status === "cancelled" && b.cancel_reason && (
                    <div className="text-xs text-muted-foreground">
                      Motivo: {b.cancel_reason}
                    </div>
                  )}
                </div>
                {["held", "pending_payment", "confirmed"].includes(b.status) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCancelId(b.id)}
                    disabled={busy === b.id}
                  >
                    {busy === b.id ? "Cancelando..." : "Cancelar"}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!cancelId} onOpenChange={(o) => !o && setCancelId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Cancelar esta reserva?</DialogTitle>
            <DialogDescription>
              Si estaba confirmada, se inicia el reembolso de la seña.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelId(null)} disabled={busy === cancelId}>
              No, mantener
            </Button>
            <Button variant="destructive" onClick={() => cancelId && handleCancel(cancelId)} disabled={busy === cancelId}>
              {busy === cancelId ? "Cancelando..." : "Sí, cancelar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
