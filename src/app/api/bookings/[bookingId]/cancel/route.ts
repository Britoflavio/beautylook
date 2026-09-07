import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const BodySchema = z.object({
  actor: z.enum(["client", "professional"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const { bookingId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancel_booking", {
    p_booking_id: bookingId,
    p_actor: parsed.data.actor,
  });

  if (error) {
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }

  const result = data as {
    error?: string;
    cancelled?: boolean;
    refund_due?: boolean;
    refund_amount?: number | null;
  };

  if (result.error) {
    const status =
      result.error === "FORBIDDEN"
        ? 403
        : result.error === "BOOKING_NOT_FOUND"
          ? 404
          : 409;
    return NextResponse.json({ error: result.error }, { status });
  }

  if (result.cancelled) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { data: b } = await admin
      .from("bookings")
      .select("client_email, client_name, starts_at, cancel_reason, services(name), professionals(display_name)")
      .eq("id", bookingId)
      .maybeSingle() as { data: { client_email: string | null; client_name: string; starts_at: string; cancel_reason: string | null; services: { name: string } | null; professionals: { display_name: string } | null } | null };
    if (b?.client_email) {
      const { bookingCancelledEmail } = await import("@/lib/email");
      await bookingCancelledEmail({
        to: b.client_email,
        clientName: b.client_name,
        serviceName: b.services?.name ?? "Turno",
        startsAt: b.starts_at,
        professionalName: b.professionals?.display_name ?? "",
        reason: b.cancel_reason ?? "cancelado",
        refundDue: !!result.refund_due,
      });
    }
  }

  return NextResponse.json(result);
}
