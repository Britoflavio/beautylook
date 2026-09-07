import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatARS, formatDuration } from "@/lib/format";
import { formatARDayTime } from "@/lib/time";
import { googleCalendarLink } from "@/lib/calendar";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Countdown, AutoRefresh } from "./client-bits";
import { CancelBookingButton } from "./cancel-button";

export const dynamic = "force-dynamic";

type BookingStatus = {
  status: string;
  starts_at: string;
  ends_at: string;
  amount: number;
  currency: string;
  client_name: string;
  hold_expires_at: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
  service_name: string;
  service_duration_min: number;
  professional_name: string;
  professional_slug: string;
  professional_photo_url: string | null;
  professional_phone: string;
  professional_address: string | null;
  cancellation_policy_hours: number;
};

export default async function BookingStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { bookingId } = await params;
  const { status: paymentStatus } = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_booking_status", {
    p_booking_id: bookingId,
  });
  const booking = data as BookingStatus | null;
  if (!booking) notFound();

  const calendarUrl = googleCalendarLink({
    title: `${booking.service_name} con ${booking.professional_name}`,
    startsAt: booking.starts_at,
    endsAt: booking.ends_at,
    details: `Reserva gestionada con BeautyBook. Profesional: ${booking.professional_name}`,
    location: booking.professional_address ?? undefined,
  });

  const waLink = `https://wa.me/${booking.professional_phone.replace("+", "")}`;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-lg mx-auto px-4 py-8 grid gap-4">
        {booking.status === "confirmed" && (
          <Card>
            <CardHeader className="text-center">
              <div className="text-4xl mb-1">✅</div>
              <CardTitle>¡Turno confirmado!</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-1 text-center">
                <p className="font-medium text-lg">{booking.service_name}</p>
                <p className="text-muted-foreground">
                  {formatDuration(booking.service_duration_min)} · con{" "}
                  {booking.professional_name}
                </p>
                <p className="font-medium">{formatARDayTime(booking.starts_at)}</p>
                {booking.professional_address && (
                  <p className="text-sm text-muted-foreground">
                    {booking.professional_address}
                  </p>
                )}
                <Badge variant="secondary" className="w-fit mx-auto mt-1">
                  Seña pagada: {formatARS(booking.amount)}
                </Badge>
              </div>
              <Separator />
              <div className="grid gap-2">
                <Link href={calendarUrl} target="_blank" className={buttonVariants({ variant: "outline", size: "sm" })}>
                  Agregar a Google Calendar
                </Link>
                <Link href={waLink} target="_blank" className={buttonVariants({ variant: "outline", size: "sm" })}>
                  WhatsApp de {booking.professional_name}
                </Link>
              </div>
              {booking.cancellation_policy_hours > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  Si necesitás cancelar, hacelo con más de{" "}
                  {booking.cancellation_policy_hours}h de antelación para que se
                  te devuelva la seña. Después de ese plazo, la seña no se
                  devuelve.
                </p>
              )}
              <CancelBookingButton
                bookingId={bookingId}
                policyHours={booking.cancellation_policy_hours}
                startsAt={booking.starts_at}
              />
            </CardContent>
          </Card>
        )}

        {(booking.status === "held" || booking.status === "pending_payment") && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle>
                {booking.status === "pending_payment"
                  ? "Esperando el pago..."
                  : "Reservando tu turno..."}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-center">
              <p className="text-sm text-muted-foreground">
                {booking.service_name} · {formatARDayTime(booking.starts_at)}
              </p>
              {booking.hold_expires_at && (
                <p className="text-sm">
                  Tu turno queda reservado por{" "}
                  <Countdown to={booking.hold_expires_at} /> minutos mientras
                  confirmás el pago de {formatARS(booking.amount)}.
                </p>
              )}
              {paymentStatus === "approved" && (
                <p className="text-sm text-green-600 font-medium">
                  ¡Pago recibido! Estamos confirmando tu turno, no cierres esta
                  ventana...
                </p>
              )}
              {paymentStatus === "rejected" && (
                <p className="text-sm text-red-600 font-medium">
                  El pago fue rechazado. Podés reintentar la reserva.
                </p>
              )}
              <AutoRefresh enabled={paymentStatus === "approved"} />
            </CardContent>
          </Card>
        )}

        {booking.status === "cancelled" && (
          <Card>
            <CardHeader className="text-center">
              <div className="text-4xl mb-1">❌</div>
              <CardTitle>
                {booking.cancel_reason === "hold_expired"
                  ? "Se liberó tu turno"
                  : "Reserva cancelada"}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-center">
              <p className="text-sm text-muted-foreground">
                {booking.cancel_reason === "hold_expired" &&
                  "Pasó el tiempo de reserva sin que se confirmara el pago, así que el turno quedó libre para otra persona."}
                {booking.cancel_reason === "client_cancel_no_refund" &&
                  "Cancelaste tu reserva fuera del plazo, por lo que la seña no se devuelve."}
                {booking.cancel_reason === "client_cancel_refund" &&
                  "Cancelaste tu reserva. Vamos a devolverte la seña por Mercado Pago (puede demorar unos días en verse reflejada)."}
                {booking.cancel_reason === "professional_cancel" &&
                  `${booking.professional_name} canceló el turno y te va a devolver la seña por Mercado Pago.`}
                {booking.cancel_reason === "superseded" &&
                  "Esta reserva fue reemplazada por una nueva."}
                {booking.cancel_reason === "payment_failed" &&
                  "El pago no se pudo completar y se liberó el turno."}
                {!booking.cancel_reason && "Esta reserva fue cancelada."}
              </p>
              <Link
                href={`/${booking.professional_slug}`}
                className={buttonVariants()}
              >
                Reservar otro turno
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
