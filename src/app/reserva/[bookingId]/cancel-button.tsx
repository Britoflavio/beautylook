"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function CancelBookingButton({
  bookingId,
  policyHours,
  startsAt,
}: {
  bookingId: string;
  policyHours: number;
  startsAt: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const hoursLeft = (new Date(startsAt).getTime() - Date.now()) / 3600000;
  const withinPolicy = policyHours > 0 && hoursLeft > policyHours;

  async function handleCancel() {
    setLoading(true);
    const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actor: "client" }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(
        data?.error === "NOT_CANCELLABLE"
          ? "La reserva ya no se puede cancelar."
          : "No pudimos cancelar la reserva.",
      );
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button className="text-xs text-muted-foreground underline-offset-4 hover:underline">
            Cancelar mi reserva
          </button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Querés cancelar tu turno?</DialogTitle>
          <DialogDescription>
            {withinPolicy
              ? "Cancelando ahora, la seña se devuelve completa por Mercado Pago."
              : `Estás a menos de ${policyHours}h del turno: la seña no se devuelve.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            No, mantener
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={loading}>
            {loading ? "Cancelando..." : "Sí, cancelar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
