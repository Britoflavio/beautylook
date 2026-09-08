"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatARS, formatDuration } from "@/lib/format";
import { toARTime } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "cn";
import { toast } from "sonner";
import { CalendarCheck, Clock, CheckCircle2 } from "lucide-react";

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

const STEP_LABELS = ["Servicio", "Día", "Horario", "Tus datos"];

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

function currentStep({
  service,
  day,
  slot,
}: {
  service: Service | null;
  day: string | null;
  slot: string | null;
}) {
  if (!service) return 0;
  if (!day) return 1;
  if (!slot) return 2;
  return 3;
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
      <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
        Este profesional todavía no publicó servicios.
      </div>
    );
  }

  const step = currentStep({ service, day, slot });

  return (
    <div className="grid gap-6">
      <div className="flex items-center gap-2">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex flex-1 flex-col gap-1.5">
            <div
              className={cn(
                "h-1 rounded-full transition-colors",
                i <= step ? "bg-primary" : "bg-muted",
              )}
            />
            <span
              className={cn(
                "text-[0.7rem] font-medium",
                i === step ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      <section className="grid gap-3">
        <h2 className="font-display text-lg font-semibold">1. Elegí tu servicio</h2>
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
                "group flex w-full items-center justify-between gap-3 rounded-2xl border bg-card p-4 text-left transition-all",
                service?.id === s.id
                  ? "border-primary ring-2 ring-primary/20"
                  : "hover:border-border hover:bg-accent/40",
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full border transition-colors",
                    service?.id === s.id
                      ? "border-primary bg-primary"
                      : "border-border",
                  )}
                >
                  {service?.id === s.id && <CheckCircle2 className="size-4 text-primary-foreground" />}
                </div>
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDuration(s.duration_min)}
                    {s.description ? ` · ${s.description}` : ""}
                  </p>
                </div>
              </div>
              <span className="font-medium whitespace-nowrap">
                {formatARS(s.price)}
              </span>
            </button>
          ))}
        </div>
      </section>

      {service && (
        <section className="grid gap-3">
          <h2 className="font-display text-lg font-semibold">2. Elegí el día</h2>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {days.map((d) => (
              <button
                key={d.date}
                type="button"
                onClick={() => setDay(d.date)}
                className={cn(
                  "shrink-0 rounded-xl border px-4 py-2.5 text-center transition-colors",
                  day === d.date
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:bg-accent/40",
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
        <section className="grid gap-3">
          <h2 className="font-display text-lg font-semibold">3. Elegí el horario</h2>
          {loadingSlots ? (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              <Spinner /> Cargando horarios...
            </div>
          ) : slots.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              <Clock className="size-4" /> No hay horarios para este día. Probá otra fecha.
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {slots.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSlot(s)}
                  className={cn(
                    "rounded-xl border py-2.5 text-sm font-medium transition-colors",
                    slot === s
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:bg-accent/40",
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
        <section className="grid gap-3">
          <h2 className="font-display text-lg font-semibold">4. Tus datos</h2>
          <form
            onSubmit={handleSubmit}
            className="grid gap-4 rounded-2xl border border-border bg-card p-5"
          >
            <div className="grid gap-1.5">
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
            <div className="grid gap-1.5">
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
            <div className="grid gap-1.5">
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
            <div className="flex items-center justify-between rounded-xl bg-accent/60 px-4 py-3 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <CalendarCheck className="size-4" /> Seña ({service.name})
              </span>
              <span className="font-semibold">{formatARS(service.price)}</span>
            </div>
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner /> Reservando...
                </>
              ) : (
                "Reservar y pagar la seña"
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
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
