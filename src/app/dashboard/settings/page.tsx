import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { SettingsClient } from "./settings-client";
import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ mp?: string; reason?: string }>;
}) {
  const { mp, reason } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: pro } = await supabase
    .from("professionals")
    .select("display_name, slug, mp_status, mp_user_id, cancellation_policy_hours, bio, address, city, category")
    .eq("id", user!.id)
    .single();

  return (
    <div className="grid gap-6 max-w-2xl">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground text-sm">Gestioná tu página y cobros.</p>
      </div>

      {mp === "connected" && (
        <Alert variant="success">¡Mercado Pago conectado! Ya podés recibir señas.</Alert>
      )}
      {mp === "error" && (
        <Alert variant="destructive">
          No pudimos conectar Mercado Pago{reason ? `: ${reason}` : ""}.
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Mercado Pago{" "}
            <Badge variant={pro?.mp_status === "connected" ? "default" : "secondary"}>
              {pro?.mp_status === "connected"
                ? "Conectado"
                : pro?.mp_status === "error"
                  ? "Error"
                  : "Desconectado"}
            </Badge>
          </CardTitle>
          <CardDescription>
            Conectá tu cuenta para cobrar las señas directo a tu cuenta. Nosotros
            no tocamos el dinero.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsClient
            mpStatus={pro?.mp_status ?? "disconnected"}
            mpUserId={pro?.mp_user_id ?? null}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tu página</CardTitle>
          <CardDescription>/{pro?.slug} — Visible en /{pro?.slug}</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            initial={{
              display_name: pro?.display_name ?? "",
              bio: pro?.bio ?? null,
              address: pro?.address ?? null,
              city: pro?.city ?? null,
              category: pro?.category ?? "Otros",
              cancellation_policy_hours: pro?.cancellation_policy_hours ?? 24,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
