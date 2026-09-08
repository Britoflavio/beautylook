import { createClient } from "@/lib/supabase/server";
import { ServicesClient } from "./services-client";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("services")
    .select("id, name, description, duration_min, price, is_active, sort_order")
    .eq("professional_id", user!.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Servicios</h1>
        <p className="text-sm text-muted-foreground">Los servicios activos se muestran en tu página pública. El orden arrastra el orden en la landing.</p>
      </div>
      <ServicesClient initial={data ?? []} />
    </div>
  );
}
