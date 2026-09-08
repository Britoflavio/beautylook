import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { MapPin, MessageCircle, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BookingWidget } from "@/components/booking/booking-widget";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export const revalidate = 60;

type PublicProfile = {
  slug: string;
  display_name: string;
  category: string;
  address: string | null;
  city: string | null;
  bio: string | null;
  photo_url: string | null;
  accepts_payments: boolean;
  phone_whatsapp: string;
  cancellation_policy_hours: number;
  services: {
    id: string;
    name: string;
    description: string | null;
    duration_min: number;
    price: number;
  }[];
};

async function fetchProfile(slug: string): Promise<PublicProfile | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_profile", { p_slug: slug });
  return (data as PublicProfile | null) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = await fetchProfile(slug);
  if (!profile) return { title: "Página no encontrada" };
  return {
    title: `${profile.display_name} · Turnos online`,
    description:
      profile.bio ||
      `Reservá tu turno con ${profile.display_name} (${profile.category}) y confirmá con seña.`,
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await fetchProfile(slug);
  if (!profile) notFound();

  const waLink = `https://wa.me/${profile.phone_whatsapp.replace("+", "")}`;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 texture-grain opacity-50" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 glow-soft" />

      <header className="relative z-10 mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <span className="font-display text-lg font-semibold tracking-tight">
          Beauty<span className="text-primary">Book</span>
        </span>
        <ThemeToggle />
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-4 pb-16 pt-4">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <div className="flex items-center gap-4">
              <Avatar className="size-16">
                {profile.photo_url ? (
                  <AvatarImage src={profile.photo_url} alt={profile.display_name} />
                ) : null}
                <AvatarFallback className="text-xl">
                  {profile.display_name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid gap-1">
                <h1 className="font-display text-2xl font-semibold leading-tight">
                  {profile.display_name}
                </h1>
                <Badge variant="secondary" className="w-fit">
                  <Sparkles className="size-3" /> {profile.category}
                </Badge>
              </div>
            </div>

            <div className="mt-5 grid gap-2 text-sm">
              {(profile.city || profile.address) && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="size-4" />
                  {[profile.address, profile.city].filter(Boolean).join(", ")}
                </p>
              )}
              {profile.bio && (
                <p className="leading-relaxed text-muted-foreground">
                  {profile.bio}
                </p>
              )}
            </div>

            <Link
              href={waLink}
              target="_blank"
              className={buttonVariants({ variant: "outline", className: "mt-6" })}
            >
              <MessageCircle className="size-4" /> Escribirle por WhatsApp
            </Link>
          </aside>

          <div>
            {profile.accepts_payments ? (
              <div className="rounded-3xl border border-border/70 bg-card/60 p-5 shadow-sm sm:p-6">
                <BookingWidget
                  slug={profile.slug}
                  services={profile.services}
                  cancellationPolicyHours={profile.cancellation_policy_hours}
                />
              </div>
            ) : (
              <div className="grid gap-3 rounded-3xl border border-border bg-card p-8 text-center">
                <p className="font-medium">Reservas online no disponibles</p>
                <p className="text-sm text-muted-foreground">
                  Por el momento {profile.display_name} no recibe reservas con
                  seña desde esta página. Podés escribirle directamente.
                </p>
                <Link
                  href={waLink}
                  target="_blank"
                  className={buttonVariants({ variant: "outline", className: "mx-auto" })}
                >
                  <MessageCircle className="size-4" /> Escribirle por WhatsApp
                </Link>
              </div>
            )}
          </div>
        </div>

        <footer className="mt-16 text-center text-xs text-muted-foreground">
          Reservas gestionadas con BeautyBook
        </footer>
      </main>
    </div>
  );
}
