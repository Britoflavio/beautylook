import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: pro } = await supabase
    .from("professionals")
    .select("display_name, slug, mp_status, category")
    .eq("id", user!.id)
    .single();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { count: monthConfirmed } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("professional_id", user!.id)
    .eq("status", "confirmed")
    .gte("starts_at", monthStart.toISOString());

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold">Hola, {pro?.display_name} 👋</h1>
        <p className="text-muted-foreground">
          Tu página:{" "}
          <Link
            href={`/${pro?.slug}`}
            target="_blank"
            className="text-primary underline-offset-4 hover:underline"
          >
            /{pro?.slug}
          </Link>
        </p>
      </div>

      {pro?.mp_status !== "connected" && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-base">
              Activá los cobros con Mercado Pago
            </CardTitle>
            <CardDescription>
              Sin conectar tu cuenta, tu página se ve pero no se pueden tomar
              reservas con seña. Conectala desde Configuración.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/settings" className={buttonVariants({ size: "sm" })}>
              Conectar Mercado Pago
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Reservas confirmadas este mes</CardDescription>
            <CardTitle className="text-3xl">{monthConfirmed ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href="/dashboard/bookings"
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              Ver reservas →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Plan actual</CardDescription>
            <CardTitle className="text-3xl">Free</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Reservas ilimitadas, sin costo. El asistente de WhatsApp llega
            próximamente.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
