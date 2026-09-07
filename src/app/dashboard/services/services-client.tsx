"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { formatARS, parseARPrice } from "@/lib/format";
import { toast } from "sonner";

type Row = {
  id: string;
  name: string;
  description: string | null;
  duration_min: number;
  price: string | number;
  is_active: boolean;
  sort_order: number;
};

export function ServicesClient({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>(initial as Row[]);
  const [saving, setSaving] = useState(false);
  const [newRow, setNewRow] = useState({ name: "", description: "", duration_min: 60, price: "", is_active: true });

  async function refresh() {
    const { data } = await supabase
      .from("services")
      .select("id, name, description, duration_min, price, is_active, sort_order")
      .order("sort_order")
      .order("created_at");
    if (data) setRows(data as Row[]);
    router.refresh();
  }

  async function handleCreate() {
    if (!newRow.name.trim()) { toast.error("Nombre requerido"); return; }
    const price = parseARPrice(newRow.price);
    if (!price || Number(price) <= 0) { toast.error("Precio inválido"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("services").insert({
      professional_id: user.id,
      name: newRow.name.trim(),
      description: newRow.description.trim() || null,
      duration_min: Number(newRow.duration_min),
      price,
      is_active: newRow.is_active,
      sort_order: rows.length,
    });
    setSaving(false);
    if (error) { toast.error("No se pudo crear"); return; }
    setNewRow({ name: "", description: "", duration_min: 60, price: "", is_active: true });
    toast.success("Servicio creado");
    await refresh();
  }

  async function toggleActive(row: Row) {
    const { error } = await supabase.from("services").update({ is_active: !row.is_active }).eq("id", row.id);
    if (error) toast.error("Error al actualizar");
    else { toast.success(row.is_active ? "Desactivado" : "Activado"); await refresh(); }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar servicio? Las reservas existentes no se borran.")) return;
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) toast.error("No se pudo eliminar");
    else { toast.success("Eliminado"); await refresh(); }
  }

  async function handleUpdate(row: Row, patch: Partial<Row & { price: string }>) {
    const upd: Record<string, unknown> = {};
    if (patch.name !== undefined) upd.name = (patch.name as string).trim();
    if (patch.description !== undefined) upd.description = (patch.description as string) || null;
    if (patch.duration_min !== undefined) upd.duration_min = Number(patch.duration_min);
    if (patch.price !== undefined) {
      const p = parseARPrice(patch.price as string);
      if (!p || Number(p) <= 0) { toast.error("Precio inválido"); return; }
      upd.price = p;
    }
    if (patch.is_active !== undefined) upd.is_active = patch.is_active;
    setSaving(true);
    const { error } = await supabase.from("services").update(upd).eq("id", row.id);
    setSaving(false);
    if (error) toast.error("No se pudo actualizar");
    else await refresh();
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardContent className="pt-6 grid gap-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label>Nombre</Label>
              <Input value={newRow.name} onChange={(e) => setNewRow({ ...newRow, name: e.target.value })} placeholder="Corte + color" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1">
                <Label>Duración (min)</Label>
                <Input type="number" min={5} max={480} step={5} value={newRow.duration_min} onChange={(e) => setNewRow({ ...newRow, duration_min: Number(e.target.value) })} />
              </div>
              <div className="grid gap-1">
                <Label>Precio $</Label>
                <Input inputMode="decimal" value={newRow.price} onChange={(e) => setNewRow({ ...newRow, price: e.target.value })} placeholder="8000" />
              </div>
            </div>
          </div>
          <div className="grid gap-1">
            <Label>Descripción (opcional)</Label>
            <Textarea rows={2} value={newRow.description} onChange={(e) => setNewRow({ ...newRow, description: e.target.value })} placeholder="Incluye lavado..." />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={newRow.is_active} onCheckedChange={(v) => setNewRow({ ...newRow, is_active: v })} />
            <span className="text-sm">{newRow.is_active ? "Activo" : "Oculto en la página"}</span>
          </div>
          <Button onClick={handleCreate} disabled={saving}>{saving ? "Guardando..." : "Agregar servicio"}</Button>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {rows.map((r) => (
          <Card key={r.id}>
            <CardContent className="py-4 grid gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{r.name} <span className="text-muted-foreground font-normal">{formatARS(r.price)} · {r.duration_min} min</span></div>
                  {r.description && <div className="text-sm text-muted-foreground">{r.description}</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={r.is_active} onCheckedChange={() => toggleActive(r)} aria-label="Activo" />
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(r.id)}>Eliminar</Button>
                </div>
              </div>
              <div className="grid sm:grid-cols-[1fr_90px_110px] gap-2">
                <Input defaultValue={r.name} placeholder="Nombre" onBlur={(e) => { if (e.target.value !== r.name) handleUpdate(r, { name: e.target.value }); }} />
                <Input type="number" defaultValue={r.duration_min} onBlur={(e) => { const v = Number(e.target.value); if (v !== r.duration_min) handleUpdate(r, { duration_min: v }); }} />
                <Input defaultValue={String(r.price)} onBlur={(e) => { if (e.target.value !== String(r.price)) handleUpdate(r, { price: e.target.value }); }} />
              </div>
            </CardContent>
          </Card>
        ))}
        {rows.length === 0 && <div className="text-center text-sm text-muted-foreground py-8">Sin servicios aún.</div>}
      </div>
    </div>
  );
}
