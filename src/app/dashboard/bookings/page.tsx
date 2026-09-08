import { createClient } from "@/lib/supabase/server";
import { BookingsClient } from "./bookings-client";

export const dynamic = "force-dynamic";

type BookingRow = {
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
  service_id: string;
  services: { name: string } | null;
};

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase
    .from("bookings")
    .select("id, client_name, client_phone, client_email, starts_at, ends_at, status, amount, currency, hold_expires_at, cancelled_by, cancel_reason, payment_id, service_id, services(name)")
    .eq("professional_id", user!.id)
    .order("starts_at", { ascending: false })
    .limit(100);

  if (status && ["held", "pending_payment", "confirmed", "cancelled"].includes(status)) {
    query = query.eq("status", status);
  }

  const { data } = await query;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Reservas</h1>
        <p className="text-sm text-muted-foreground">Gestioná todos tus turnos. Cancelar como profesional devuelve la seña si estaba confirmada.</p>
      </div>
      <BookingsClient initial={((data as unknown as BookingRow[]) ?? []) as BookingRow[]} initialStatus={status ?? "all"} />
    </div>
  );
}
