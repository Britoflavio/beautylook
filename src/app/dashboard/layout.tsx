import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "./nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: pro } = await supabase
    .from("professionals")
    .select("slug, display_name, onboarding_completed, mp_status")
    .eq("id", user.id)
    .single();

  if (!pro) redirect("/onboarding");
  if (!pro.onboarding_completed) redirect("/onboarding");

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav displayName={pro.display_name} slug={pro.slug} />
      <main className="px-4 py-8 lg:pl-72 lg:pr-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
