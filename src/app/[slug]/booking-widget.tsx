"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatARS, formatDuration } from "@/lib/format";
import { toARTime } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "cn";
import { toast } from "sonner";

type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_min: number;
  price: number;
};

type DayOption = { date: string; dbWeekday: number; label: string };

const HOLD_ERROR_MESSAGES: Record<string, string> = {
  SLOT_TAKEN:
    "Alguien más se quedó ese horario. Elegí otro turno, ¡van rápido!",
  SLOT_UNAVAILABLE: "Ese horario ya no está disponible. Elegí otro turno.",
  TOO_MANY_HOLDS:
    "Tenés demasiadas reservas en proceso. Terminá una o esperá unos minutos.",
  RATE_LIMITED: "Demasiados intentos seguidos. Esperá unos minutos.",
  PAYMENT_UNAVAILABLE: "Los pagos de este profesional no están disponibles.",
  SERVICE_NOT_FOUND: "El servicio ya no está disponible.",
  SERVICE_INVALID: "Este servicio no está disponible para reservar online.",
  INVALID_PHONE: "Ingresá un número de WhatsApp válido.",
  INVALID_CLIENT: "Ingresá tu nombre.",
};

function buildDayOptions(): DayOption[] {
  const days: DayOption[] = [];
  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const now = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
    const arNoon = new Date(`${date}T12:00:00-03:00`);
    const wd = arNoon.getDay();
    const dayNum = Number(date.slice(8, 10));
    days.push({
      date,
      dbWeekday: wd,
      label: `${dayNames[wd]} ${dayNum}`,
    });
  }
  return days;
}

export function BookingWidget({
  slug,
  services,
  cancellationPolicyHours,
}: {
  slug: string;
  services: Service[];
  cancellationPolicyHours: number;
}) {
  const supabase = createClient();
  const days = useState(() => buildDayOptions())[0];

  const [service, setService] = useState<Service | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slot, setSlot] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadSlots = useCallback(
    async (serviceId: string, date: string) => {
      setLoadingSlots(true);
      setSlot(null);
      const { data, error } = await supabase.rpc("get_available_slots", {
        p_slug: slug,
        p_service_id: serviceId,
        p_date: date,
      });
      setLoadingSlots(false);
      if (error) {
        toast.error("No pudimos cargar los horarios. Probá de nuevo.");
        return;
      }
      setSlots(((data as { slot_start: string }[]) ?? []).map((d) => d.slot_start));
    },
    [slug, supabase],
  );

  useEffect(() => {
    if (service && day) {
      loadSlots(service.id, day);
    } else {
      setSlots([]);
    }
  }, [service, day, loadSlots]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!service || !slot) return;
    setSubmitting(true);
    const res = await fetch("/api/bookings/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        service_id: service.id,
        starts_at: slot,
        client_name: clientName,
        client_phone: clientPhone,
        client_email: clientEmail,
      }),
    });
    setSubmitting(false);
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.redirect_url) {
      const code = data?.error ?? "SERVER_ERROR";
      toast.error(HOLD_ERROR_MESSAGES[code] ?? "Algo falló. Probá de nuevo.");
      if (code === "SLOT_TAKEN" || code === "SLOT_UNAVAILABLE") {
        if (service && day) loadSlots(service.id, day);
      }
      return;
    }
    window.location.href = data.redirect_url;
  }

  if (services.length === 0) {
    return (
      <div className="rounded-xl border bg-background p-6 text-center text-muted-foreground">
        Este profesional todavía no publicó servicios.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <section>
        <h2 className="font-semibold mb-2">1. Elegí tu servicio</h2>
        <div className="grid gap-2">
          {services.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setService(s);
                setDay(null);
                setSlot(null);
              }}
              className={cn(
                "w-full text-left rounded-xl border bg-background p-4 transition-colors",
                service?.id === s.id
                  ? "border-primary ring-2 ring-primary/20"
                  : "hover:bg-muted",
              )}
            >
              <div className="flex justify-between items-center gap-2">
                <span className="font-medium">{s.name}</span>
                <span className="font-medium whitespace-nowrap">
                  {formatARS(s.price)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {formatDuration(s.duration_min)}
                {s.description ? ` · ${s.description}` : ""}
              </p>
            </button>
          ))}
        </div>
      </section>

      {service && (
        <section>
          <h2 className="font-semibold mb-2">2. Elegí el día</h2>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {days.map((d) => (
              <button
                key={d.date}
                type="button"
                onClick={() => setDay(d.date)}
                className={cn(
                  "shrink-0 rounded-lg border px-3 py-2 text-sm text-center transition-colors",
                  day === d.date
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted",
                )}
              >
                <span className="block text-xs opacity-80">
                  {d.label.split(" ")[0]}
                </span>
                <span className="font-medium">{d.label.split(" ")[1]}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {service && day && (
        <section>
          <h2 className="font-semibold mb-2">3. Elegí el horario</h2>
          {loadingSlots ? (
            <p className="text-sm text-muted-foreground">Cargando horarios...</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay horarios para este día. Probá otra fecha.
            </p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {slots.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSlot(s)}
                  className={cn(
                    "rounded-lg border py-2 text-sm font-medium transition-colors",
                    slot === s
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted",
                  )}
                >
                  {toARTime(s)}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {service && day && slot && (
        <section>
          <h2 className="font-semibold mb-2">4. Tus datos</h2>
          <form
            onSubmit={handleSubmit}
            className="rounded-xl border bg-background p-4 grid gap-3"
          >
            <div className="grid gap-1">
              <Label htmlFor="clientName">Nombre y apellido</Label>
              <Input
                id="clientName"
                required
                minLength={2}
                placeholder="Tu nombre"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="clientPhone">WhatsApp</Label>
              <Input
                id="clientPhone"
                required
                inputMode="tel"
                placeholder="11 2345 6789"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="clientEmail">
                Email <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="clientEmail"
                type="email"
                placeholder="tu@email.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
              />
            </div>
            <div className="rounded-lg bg-muted p-3 text-sm flex justify-between">
              <span>Seña ({service.name})</span>
              <span className="font-medium">{formatARS(service.price)}</span>
            </div>
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? "Reservando..." : "Reservar y pagar la seña"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Reservamos tu turno {25} minutos mientras completás el pago.
              {cancellationPolicyHours > 0 &&
                ` Cancelando con más de ${cancellationPolicyHours}h de antelación, se te devuelve la seña.`}
            </p>
          </form>
        </section>
      )}
    </div>
  );
}
