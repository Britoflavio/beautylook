"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { cn } from "cn";

type Props = {
  initial: {
    display_name: string;
    bio: string | null;
    address: string | null;
    city: string | null;
    category: string;
    cancellation_policy_hours: number;
  };
};

const CATS = [
  "Peluquería",
  "Barbería",
  "Manicuría y uñas",
  "Maquillaje",
  "Cejas y pestañas",
  "Masajes",
  "Depilación",
  "Otros",
];

export function ProfileForm({ initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (form.display_name.trim().length < 2) {
      toast.error("Nombre muy corto");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from("professionals")
      .update({
        display_name: form.display_name.trim(),
        bio: form.bio?.trim() || null,
        address: form.address?.trim() || null,
        city: form.city?.trim() || null,
        category: form.category,
        cancellation_policy_hours: Number(form.cancellation_policy_hours),
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error("No se pudo guardar");
    else {
      toast.success("Guardado");
      router.refresh();
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <Label>Nombre / negocio</Label>
        <Input
          value={form.display_name}
          onChange={(e) => setForm({ ...form, display_name: e.target.value })}
        />
      </div>
      <div className="grid gap-1.5">
        <Label>Categoría</Label>
        <div className="flex flex-wrap gap-2">
          {CATS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setForm({ ...form, category: c })}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                form.category === c
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-accent/40",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label>Ciudad</Label>
          <Input
            value={form.city ?? ""}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            placeholder="Palermo, CABA"
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Dirección</Label>
          <Input
            value={form.address ?? ""}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Gorriti 1234"
          />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label>Sobre vos</Label>
        <Textarea
          rows={3}
          value={form.bio ?? ""}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
          placeholder="Especialista..."
        />
      </div>
      <div className="grid gap-1.5">
        <Label>Política de cancelación (horas)</Label>
        <Input
          type="number"
          min={0}
          max={168}
          value={form.cancellation_policy_hours}
          onChange={(e) =>
            setForm({ ...form, cancellation_policy_hours: Number(e.target.value) })
          }
        />
        <p className="text-xs text-muted-foreground">
          Si cancela antes de X horas, se devuelve la seña. 0 = nunca se devuelve.
        </p>
      </div>
      <Button onClick={handleSave} disabled={saving} className="w-fit">
        {saving ? (
          <>
            <Spinner /> Guardando...
          </>
        ) : (
          "Guardar cambios"
        )}
      </Button>
    </div>
  );
}
