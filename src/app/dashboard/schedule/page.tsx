import { createClient } from "@/lib/supabase/server";
import { ScheduleClient } from "./schedule-client";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rules } = await supabase
    .from("availability_rules")
    .select("id, weekday, start_time, end_time")
    .eq("professional_id", user!.id)
    .order("weekday");

  const { data: exceptions } = await supabase
    .from("availability_exceptions")
    .select("id, date, is_full_day_off, start_time, end_time, reason")
    .eq("professional_id", user!.id)
    .order("date", { ascending: true })
    .limit(30);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold">Horarios</h1>
        <p className="text-sm text-muted-foreground">Configurá tus días y horarios recurrentes, y bloqueá fechas puntuales.</p>
      </div>
      <ScheduleClient initialRules={rules ?? []} initialExceptions={exceptions ?? []} />
    </div>
  );
}
