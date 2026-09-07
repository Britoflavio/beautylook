import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { BookingWidget } from "./booking-widget";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-lg mx-auto px-4 py-8 grid gap-6">
        <header className="flex items-start gap-4">
          <Avatar className="w-20 h-20">
            {profile.photo_url ? (
              <AvatarImage src={profile.photo_url} alt={profile.display_name} />
            ) : null}
            <AvatarFallback className="text-xl">
              {profile.display_name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="grid gap-1">
            <h1 className="text-2xl font-bold leading-tight">
              {profile.display_name}
            </h1>
            <Badge variant="secondary" className="w-fit">
              {profile.category}
            </Badge>
            {(profile.city || profile.address) && (
              <p className="text-sm text-muted-foreground">
                {[profile.address, profile.city].filter(Boolean).join(", ")}
              </p>
            )}
            {profile.bio && (
              <p className="text-sm text-muted-foreground mt-1">{profile.bio}</p>
            )}
          </div>
        </header>

        {profile.accepts_payments ? (
          <BookingWidget
            slug={profile.slug}
            services={profile.services}
            cancellationPolicyHours={profile.cancellation_policy_hours}
          />
        ) : (
          <div className="rounded-xl border bg-background p-6 text-center grid gap-3">
            <p className="font-medium">Reservas online no disponibles</p>
            <p className="text-sm text-muted-foreground">
              Por el momento {profile.display_name} no recibe reservas con seña
              desde esta página. Podés escribirle directamente.
            </p>
            <Link
              href={waLink}
              target="_blank"
              className={buttonVariants({ variant: "outline" })}
            >
              Escribirle por WhatsApp
            </Link>
          </div>
        )}

        <footer className="text-xs text-muted-foreground text-center">
          Reservas gestionadas con BeautyBook
        </footer>
      </div>
    </div>
  );
}
