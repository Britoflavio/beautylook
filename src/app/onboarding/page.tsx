"use client";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { suggestSlugs } from "@/lib/slug";
import { normalizeARPhone } from "@/lib/phone";
import { parseARPrice } from "@/lib/format";
import { WEEKDAYS } from "@/lib/time";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { cn } from "cn";
import { Plus, X, ArrowRight, Sparkles } from "lucide-react";

const CATEGORIES = [
  "Peluquería",
  "Barbería",
  "Manicuría y uñas",
  "Maquillaje",
  "Cejas y pestañas",
  "Masajes",
  "Depilación",
  "Otros",
];

const DEFAULT_SERVICES: Record<string, [string, number, number][]> = {
  Peluquería: [
    ["Corte de pelo", 45, 8000],
    ["Color completo", 120, 25000],
    ["Lavado + peinado", 60, 10000],
  ],
  Barbería: [
    ["Corte de pelo", 40, 7000],
    ["Corte + barba", 60, 10000],
    ["Afeitado clásico", 30, 6000],
  ],
  "Manicuría y uñas": [
    ["Manicuría completa", 45, 6000],
    ["Uñas esculpidas", 90, 12000],
    ["Esmaltado semipermanente", 60, 8000],
  ],
  Maquillaje: [
    ["Maquillaje social", 60, 15000],
    ["Maquillaje de novia (prueba)", 90, 20000],
    ["Automaquillaje (clase)", 60, 10000],
  ],
  "Cejas y pestañas": [
    ["Perfilado de cejas", 30, 5000],
    ["Lash lifting", 60, 9000],
    ["Extensiones de pestañas", 120, 15000],
  ],
  Masajes: [
    ["Masaje relajante", 60, 12000],
    ["Masaje descontracturante", 60, 13000],
    ["Drenaje linfático", 90, 15000],
  ],
  Depilación: [
    ["Depilación facial", 30, 4000],
    ["Media pierna", 45, 6000],
    ["Pierna completa", 60, 9000],
  ],
  Otros: [
    ["Servicio 1", 60, 5000],
    ["Servicio 2", 90, 8000],
    ["Servicio 3", 45, 4000],
  ],
};

type ServiceDraft = {
  name: string;
  duration_min: number;
  price: string;
};

type DayDraft = { enabled: boolean; start: string; end: string };

const STEP_TITLES = ["Tu perfil", "Tus servicios", "Tus horarios", "Cobros"];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasProfile, setHasProfile] = useState(true);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [fallbackName, setFallbackName] = useState("");
  const [fallbackPhone, setFallbackPhone] = useState("");
  const [slug, setSlug] = useState("");
  const [slugSuggestions, setSlugSuggestions] = useState<string[]>([]);

  const [category, setCategory] = useState("Peluquería");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [services, setServices] = useState<ServiceDraft[]>([]);
  const [days, setDays] = useState<DayDraft[]>(
    WEEKDAYS.map((d, i) => ({
      enabled: i < 5,
      start: "09:00",
      end: "18:00",
    })),
  );

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      setFallbackName(
        (user.user_metadata?.display_name as string) || user.email || "",
      );
      const { data: pro } = await supabase
        .from("professionals")
        .select("slug, category, address, city, bio, photo_url, onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();
      if (!pro) {
        setHasProfile(false);
        setSlug("");
      } else {
        setHasProfile(true);
        if (pro.category) setCategory(pro.category);
        if (pro.address) setAddress(pro.address);
        if (pro.city) setCity(pro.city);
        if (pro.bio) setBio(pro.bio);
        if (pro.photo_url) setPhotoUrl(pro.photo_url);
        setServices(
          DEFAULT_SERVICES[pro.category ?? "Otros"]?.map(
            ([name, duration_min, price]) => ({
              name,
              duration_min,
              price: String(price),
            }),
          ) ?? [],
        );
      }
      setLoading(false);
    })();
  }, [supabase]);

  const applyCategoryDefaults = useCallback((cat: string) => {
    setCategory(cat);
    setServices(
      (DEFAULT_SERVICES[cat] ?? DEFAULT_SERVICES.Otros).map(
        ([name, duration_min, price]) => ({
          name,
          duration_min,
          price: String(price),
        }),
      ),
    );
  }, []);

  async function saveProfile() {
    setSaving(true);
    const { error } = await supabase
      .from("professionals")
      .update({ category, address, city, bio, photo_url: photoUrl })
      .eq("id", userId!);
    setSaving(false);
    if (error) {
      toast.error("No pudimos guardar tu perfil");
      return false;
    }
    return true;
  }

  async function handlePhoto(file: File) {
    if (!userId) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("La foto debe pesar menos de 2 MB");
      return;
    }
    setUploadingPhoto(true);
    const path = `${userId}/photo-${Date.now()}`;
    const { error } = await supabase.storage
      .from("professional-photos")
      .upload(path, file, { upsert: true });
    if (error) {
      setUploadingPhoto(false);
      toast.error("No pudimos subir la foto");
      return;
    }
    const { data } = supabase.storage
      .from("professional-photos")
      .getPublicUrl(path);
    setPhotoUrl(data.publicUrl);
    setUploadingPhoto(false);
  }

  async function saveServices() {
    const rows = services
      .filter((s) => s.name.trim())
      .map((s, i) => ({
        professional_id: userId,
        name: s.name.trim(),
        duration_min: s.duration_min,
        price: parseARPrice(s.price) ?? "0",
        sort_order: i,
      }));
    if (rows.length === 0) {
      toast.error("Agregá al menos un servicio");
      return false;
    }
    if (rows.some((r) => Number(r.price) <= 0)) {
      toast.error("Todos los servicios necesitan un precio mayor a cero");
      return false;
    }
    setSaving(true);
    await supabase.from("services").delete().eq("professional_id", userId!);
    const { error } = await supabase.from("services").insert(rows);
    setSaving(false);
    if (error) {
      toast.error("No pudimos guardar los servicios");
      return false;
    }
    return true;
  }

  async function saveSchedule() {
    const enabled = days.filter((d) => d.enabled);
    if (enabled.length === 0) {
      toast.error("Activá al menos un día de atención");
      return false;
    }
    if (enabled.some((d) => d.start >= d.end)) {
      toast.error("El horario de inicio debe ser anterior al de fin");
      return false;
    }
    setSaving(true);
    await supabase.from("availability_rules").delete().eq("professional_id", userId!);
    const { error } = await supabase
      .from("availability_rules")
      .insert(
        enabled.map((d) => ({
          professional_id: userId,
          weekday: WEEKDAYS[days.indexOf(d)].dbWeekday,
          start_time: d.start,
          end_time: d.end,
        })),
      );
    setSaving(false);
    if (error) {
      toast.error("No pudimos guardar tus horarios");
      return false;
    }
    return true;
  }

  async function finish() {
    setSaving(true);
    const { error } = await supabase
      .from("professionals")
      .update({ onboarding_completed: true })
      .eq("id", userId!);
    setSaving(false);
    if (error) {
      toast.error("No pudimos finalizar el registro");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function nextStep() {
    if (step === 0) {
      if (!(await saveProfile())) return;
    } else if (step === 1) {
      if (!(await saveServices())) return;
    } else if (step === 2) {
      if (!(await saveSchedule())) return;
    }
    setStep((s) => Math.min(s + 1, 3));
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (!hasProfile) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
        <div className="pointer-events-none absolute inset-0 texture-grain opacity-50" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 glow-soft" />
        <Card className="relative z-10 w-full max-w-md shadow-sm">
          <CardHeader>
            <CardTitle className="font-display text-xl">
              Completá tu registro
            </CardTitle>
            <CardDescription>
              Elegí la dirección de tu página, {fallbackName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!userId || !slug) return;
                const normalized = normalizeARPhone(fallbackPhone);
                if (!normalized) {
                  toast.error("Ingresá un WhatsApp válido (ej: 11 2345 6789)");
                  return;
                }
                setSaving(true);
                const { error } = await supabase.from("professionals").insert({
                  id: userId,
                  slug,
                  display_name: fallbackName,
                  phone_whatsapp: normalized,
                });
                setSaving(false);
                if (error?.code === "23505") {
                  setSlugSuggestions(suggestSlugs(slug));
                  toast.error("Ese nombre ya está en uso");
                  return;
                }
                if (error) {
                  toast.error("No pudimos crear tu perfil");
                  return;
                }
                setHasProfile(true);
              }}
              className="grid gap-4"
            >
              <div className="grid gap-2">
                <Label htmlFor="slug">Dirección de tu página</Label>
                <Input
                  id="slug"
                  required
                  className="font-mono"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  placeholder="ana-estetica"
                />
                {slugSuggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {slugSuggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="rounded-md bg-primary/10 px-2 py-1 font-mono text-xs text-primary hover:bg-primary/20"
                        onClick={() => setSlug(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fallbackPhone">WhatsApp</Label>
                <Input
                  id="fallbackPhone"
                  required
                  inputMode="tel"
                  placeholder="11 2345 6789"
                  value={fallbackPhone}
                  onChange={(e) => setFallbackPhone(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? <Spinner /> : "Continuar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute inset-0 texture-grain opacity-50" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 glow-soft" />

      <div className="relative z-10 mx-auto max-w-xl">
        <div className="mb-6 flex items-center justify-between">
          <span className="font-display text-xl font-semibold tracking-tight">
            Beauty<span className="text-primary">Book</span>
          </span>
          <p className="text-sm text-muted-foreground">
            Paso {step + 1} de 4 · {STEP_TITLES[step]}
          </p>
        </div>
        <div className="mb-6 flex gap-2">
          {STEP_TITLES.map((t, i) => (
            <div
              key={t}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                i <= step ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="font-display text-xl">
              {STEP_TITLES[step]}
            </CardTitle>
            <CardDescription>
              {step === 0 && "Contale a tus clientas quién sos y dónde atendés."}
              {step === 1 && "Podés editarlos cuando quieras desde el panel."}
              {step === 2 && "Cuándo atendés. Puedes dejar días libres."}
              {step === 3 && "Para que tus clientas puedan reservar con seña."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {step === 0 && (
              <>
                <div className="grid gap-2">
                  <Label>Categoría</Label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => applyCategoryDefaults(c)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-sm transition-colors",
                          category === c
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card hover:bg-accent/40",
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="city">Ciudad / Zona</Label>
                    <Input
                      id="city"
                      placeholder="Palermo, CABA"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="address">Dirección</Label>
                    <Input
                      id="address"
                      placeholder="Gorriti 1234"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="bio">Sobre vos</Label>
                  <Textarea
                    id="bio"
                    rows={3}
                    placeholder="Especialista en color, 8 años de experiencia..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Foto de perfil</Label>
                  <div className="flex items-center gap-4">
                    {photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photoUrl}
                        alt="Foto de perfil"
                        className="size-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex size-16 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
                        Sin foto
                      </div>
                    )}
                    <Input
                      type="file"
                      accept="image/*"
                      className="max-w-56"
                      disabled={uploadingPhoto}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handlePhoto(f);
                      }}
                    />
                  </div>
                </div>
              </>
            )}

            {step === 1 && (
              <div className="grid gap-3">
                {services.map((s, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_80px_100px_36px] items-end gap-2"
                  >
                    <div className="grid gap-1">
                      {i === 0 && <Label>Servicio</Label>}
                      <Input
                        placeholder="Nombre del servicio"
                        value={s.name}
                        onChange={(e) =>
                          setServices((prev) =>
                            prev.map((p, j) =>
                              j === i ? { ...p, name: e.target.value } : p,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="grid gap-1">
                      {i === 0 && <Label>Minutos</Label>}
                      <Input
                        type="number"
                        min={5}
                        max={480}
                        step={5}
                        value={s.duration_min}
                        onChange={(e) =>
                          setServices((prev) =>
                            prev.map((p, j) =>
                              j === i
                                ? { ...p, duration_min: Number(e.target.value) }
                                : p,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="grid gap-1">
                      {i === 0 && <Label>Precio $</Label>}
                      <Input
                        inputMode="decimal"
                        placeholder="8000"
                        value={s.price}
                        onChange={(e) =>
                          setServices((prev) =>
                            prev.map((p, j) =>
                              j === i ? { ...p, price: e.target.value } : p,
                            ),
                          )
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Quitar servicio"
                      onClick={() =>
                        setServices((prev) => prev.filter((_, j) => j !== i))
                      }
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setServices((prev) => [
                      ...prev,
                      { name: "", duration_min: 60, price: "" },
                    ])
                  }
                >
                  <Plus className="size-4" /> Agregar servicio
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-3">
                {WEEKDAYS.map((wd, i) => (
                  <div key={wd.dbWeekday} className="flex items-center gap-3">
                    <Switch
                      checked={days[i].enabled}
                      onCheckedChange={(v) =>
                        setDays((prev) =>
                          prev.map((d, j) => (j === i ? { ...d, enabled: v } : d)),
                        )
                      }
                      aria-label={`Activar ${wd.label}`}
                    />
                    <span className="w-24 text-sm">{wd.label}</span>
                    <Input
                      type="time"
                      className="w-32"
                      value={days[i].start}
                      disabled={!days[i].enabled}
                      onChange={(e) =>
                        setDays((prev) =>
                          prev.map((d, j) =>
                            j === i ? { ...d, start: e.target.value } : d,
                          ),
                        )
                      }
                    />
                    <span className="text-sm text-muted-foreground">a</span>
                    <Input
                      type="time"
                      className="w-32"
                      value={days[i].end}
                      disabled={!days[i].enabled}
                      onChange={(e) =>
                        setDays((prev) =>
                          prev.map((d, j) =>
                            j === i ? { ...d, end: e.target.value } : d,
                          ),
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-4">
                <div className="flex items-start gap-3 rounded-xl border border-border bg-accent/30 p-4">
                  <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Las reservas se confirman con el pago de la seña (el precio
                    completo del servicio) vía Mercado Pago, directo a tu cuenta.
                    Vas a conectar tu cuenta de Mercado Pago en el panel cuando
                    quieras activar los cobros.
                  </p>
                </div>
                <Button onClick={finish} disabled={saving}>
                  {saving ? <Spinner /> : "Ir a mi panel"}
                </Button>
              </div>
            )}

            {step < 3 && (
              <div className="flex justify-end pt-2">
                <Button onClick={nextStep} disabled={saving}>
                  {saving ? <Spinner /> : "Continuar"}
                  {!saving && <ArrowRight className="size-4" />}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
