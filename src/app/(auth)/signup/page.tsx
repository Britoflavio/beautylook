"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isValidSlug, slugify, suggestSlugs } from "@/lib/slug";
import { normalizeARPhone } from "@/lib/phone";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type SlugStatus = "idle" | "invalid" | "checking" | "available" | "taken";

export default function SignupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slugPreview = useMemo(
    () =>
      slug
        ? `${process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") ?? "beautybook"}/${slug}`
        : "",
    [slug],
  );

  useEffect(() => {
    if (!slugTouched && displayName && slugify(displayName)) {
      setSlug(slugify(displayName));
    }
  }, [displayName, slugTouched]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!slug) {
      setSlugStatus("idle");
      return;
    }
    if (!isValidSlug(slug)) {
      setSlugStatus("invalid");
      return;
    }
    setSlugStatus("checking");
    debounceRef.current = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase.rpc("is_slug_available", { p_slug: slug });
      setSlugStatus(data === true ? "available" : "taken");
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [slug]);

  async function insertProfessional(userId: string): Promise<boolean> {
    const supabase = createClient();
    const { error } = await supabase.from("professionals").insert({
      id: userId,
      slug,
      display_name: displayName.trim(),
      phone_whatsapp: normalizeARPhone(phone)!,
    });
    if (error) {
      if (error.code === "23505") {
        setSlugStatus("taken");
        setSuggestions(suggestSlugs(slug));
        toast.error("Ese nombre de página ya está en uso. Probá una variante.");
      } else {
        toast.error("No pudimos crear tu perfil: " + error.message);
      }
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidSlug(slug)) {
      setSlugStatus("invalid");
      return;
    }
    if (!normalizeARPhone(phone)) {
      toast.error("Ingresá un número de WhatsApp válido (ej: 11 2345 6789)");
      return;
    }
    if (slugStatus === "taken") {
      setSuggestions(suggestSlugs(slug));
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName.trim() } },
    });
    if (error) {
      setLoading(false);
      toast.error(
        error.message === "User already registered"
          ? "Ya existe una cuenta con ese email. Ingresá con tu contraseña."
          : error.message,
      );
      return;
    }
    if (!data.session) {
      setLoading(false);
      setAwaitingConfirmation(true);
      return;
    }
    const ok = await insertProfessional(data.user!.id);
    setLoading(false);
    if (ok) {
      router.push("/onboarding");
      router.refresh();
    }
  }

  if (awaitingConfirmation) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Revisá tu correo</CardTitle>
          <CardDescription>
            Te enviamos un link de confirmación a <strong>{email}</strong>. Cuando
            confirmes tu email, ingresá con tu contraseña y seguimos armando tu
            página.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Link href="/login" className={buttonVariants()}>
            Ir a ingresar
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Creá tu página de turnos</CardTitle>
        <CardDescription>
          En 5 minutos tenés tu página pública con cobro de seña por Mercado Pago.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="displayName">Tu nombre o el de tu negocio</Label>
            <Input
              id="displayName"
              required
              placeholder="Ej: Ana Estética"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="slug">Dirección de tu página</Label>
            <div className="flex items-center gap-2">
              <Input
                id="slug"
                required
                placeholder="ana-estetica"
                className="font-mono"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value.toLowerCase());
                  setSuggestions([]);
                }}
                aria-invalid={slugStatus === "invalid" || slugStatus === "taken"}
              />
              {slugStatus === "checking" && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  Verificando...
                </span>
              )}
              {slugStatus === "available" && (
                <span className="text-xs text-green-600 whitespace-nowrap">
                  Disponible ✓
                </span>
              )}
              {slugStatus === "taken" && (
                <span className="text-xs text-red-600 whitespace-nowrap">
                  Ocupado ✗
                </span>
              )}
              {slugStatus === "invalid" && (
                <span className="text-xs text-red-600 whitespace-nowrap">
                  Inválido ✗
                </span>
              )}
            </div>
            {slugPreview && (
              <p className="text-xs text-muted-foreground font-mono truncate">
                {slugPreview}
              </p>
            )}
            {slugStatus === "invalid" && (
              <p className="text-xs text-red-600">
                Usá entre 3 y 30 caracteres: letras minúsculas, números y guiones.
              </p>
            )}
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary font-mono hover:bg-primary/20"
                    onClick={() => {
                      setSlug(s);
                      setSuggestions([]);
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="phone">WhatsApp</Label>
            <Input
              id="phone"
              required
              inputMode="tel"
              placeholder="11 2345 6789"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Lo van a usar tus clientas para coordinar. Solo números de
              Argentina.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={loading || slugStatus === "invalid"}>
            {loading ? "Creando tu cuenta..." : "Crear mi página"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-4">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="text-primary underline-offset-4 hover:underline">
            Ingresar
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
