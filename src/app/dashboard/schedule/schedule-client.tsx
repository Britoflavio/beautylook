"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Empty } from "@/components/ui/empty";
import { WEEKDAYS } from "@/lib/time";
import { toast } from "sonner";
import { Plus, CalendarOff, Trash2 } from "lucide-react";

type Rule = { id: string; weekday: number; start_time: string; end_time: string };
type Exception = {
  id: string;
  date: string;
  is_full_day_off: boolean;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
};

export function ScheduleClient({
  initialRules,
  initialExceptions,
}: {
  initialRules: Rule[];
  initialExceptions: Exception[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [rules, setRules] = useState(() =>
    WEEKDAYS.map((w) => {
      const r = initialRules.find((x) => x.weekday === w.dbWeekday);
      return r
        ? {
            enabled: true,
            start: r.start_time.slice(0, 5),
            end: r.end_time.slice(0, 5),
          }
        : { enabled: false, start: "09:00", end: "18:00" };
    }),
  );
  const [exceptions, setExceptions] = useState<Exception[]>(initialExceptions);
  const [newDate, setNewDate] = useState("");
  const [newOff, setNewOff] = useState(true);
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("13:00");
  const [newReason, setNewReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveRules() {
    const enabled = rules
      .map((r, i) => ({ ...r, weekday: WEEKDAYS[i].dbWeekday }))
      .filter((r) => r.enabled);
    if (enabled.some((r) => r.start >= r.end)) {
      toast.error("Inicio debe ser menor que fin");
      return;
    }
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }
    await supabase.from("availability_rules").delete().eq("professional_id", user.id);
    if (enabled.length > 0) {
      const { error } = await supabase.from("availability_rules").insert(
        enabled.map((r) => ({
          professional_id: user.id,
          weekday: r.weekday,
          start_time: r.start,
          end_time: r.end,
        })),
      );
      if (error) {
        setSaving(false);
        toast.error("No se pudo guardar");
        return;
      }
    }
    setSaving(false);
    toast.success("Horarios guardados");
    router.refresh();
  }

  async function addException() {
    if (!newDate) {
      toast.error("Elegí una fecha");
      return;
    }
    if (!newOff && newStart >= newEnd) {
      toast.error("Horario inválido");
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("availability_exceptions")
      .insert({
        professional_id: user.id,
        date: newDate,
        is_full_day_off: newOff,
        start_time: newOff ? null : newStart,
        end_time: newOff ? null : newEnd,
        reason: newReason || null,
      })
      .select("id, date, is_full_day_off, start_time, end_time, reason")
      .single();
    if (error) {
      toast.error("No se pudo agregar");
      return;
    }
    setExceptions((prev) =>
      [...prev, data as Exception].sort((a, b) => a.date.localeCompare(b.date)),
    );
    setNewDate("");
    setNewReason("");
    toast.success("Excepción agregada");
    router.refresh();
  }

  async function removeException(id: string) {
    const { error } = await supabase
      .from("availability_exceptions")
      .delete()
      .eq("id", id);
    if (error) toast.error("No se pudo eliminar");
    else {
      setExceptions((prev) => prev.filter((e) => e.id !== id));
      toast.success("Eliminada");
      router.refresh();
    }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Horario semanal</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {WEEKDAYS.map((wd, i) => (
            <div key={wd.dbWeekday} className="flex items-center gap-3">
              <Switch
                checked={rules[i].enabled}
                onCheckedChange={(v) =>
                  setRules((prev) =>
                    prev.map((r, j) => (j === i ? { ...r, enabled: v } : r)),
                  )
                }
                aria-label={wd.label}
              />
              <span className="w-24 text-sm">{wd.label}</span>
              <Input
                type="time"
                className="w-32"
                value={rules[i].start}
                disabled={!rules[i].enabled}
                onChange={(e) =>
                  setRules((prev) =>
                    prev.map((r, j) => (j === i ? { ...r, start: e.target.value } : r)),
                  )
                }
              />
              <span className="text-sm text-muted-foreground">a</span>
              <Input
                type="time"
                className="w-32"
                value={rules[i].end}
                disabled={!rules[i].enabled}
                onChange={(e) =>
                  setRules((prev) =>
                    prev.map((r, j) => (j === i ? { ...r, end: e.target.value } : r)),
                  )
                }
              />
            </div>
          ))}
          <Button onClick={saveRules} disabled={saving} className="w-fit">
            {saving ? "Guardando..." : "Guardar horarios"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Excepciones (feriados / vacaciones)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid sm:grid-cols-[140px_120px_120px_1fr_auto] items-end gap-2">
            <div className="grid gap-1.5">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Switch checked={newOff} onCheckedChange={setNewOff} />
              <span className="text-sm">
                {newOff ? "Cerrado" : "Horario especial"}
              </span>
            </div>
            {!newOff && (
              <>
                <Input
                  type="time"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                />
                <Input
                  type="time"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                />
              </>
            )}
            <Input
              placeholder="Motivo"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
            />
            <Button onClick={addException} size="sm">
              <Plus className="size-4" /> Agregar
            </Button>
          </div>

          {exceptions.length === 0 ? (
            <Empty
              icon={<CalendarOff className="size-5" />}
              title="Sin excepciones"
              description="Agregá feriados o vacaciones para bloquear esos días."
            />
          ) : (
            <div className="grid gap-2">
              {exceptions.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm"
                >
                  <span>
                    {e.date} —{" "}
                    {e.is_full_day_off
                      ? "Cerrado"
                      : `${e.start_time?.slice(0, 5)} a ${e.end_time?.slice(0, 5)}`}
                    {e.reason ? ` · ${e.reason}` : ""}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Quitar"
                    onClick={() => removeException(e.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
