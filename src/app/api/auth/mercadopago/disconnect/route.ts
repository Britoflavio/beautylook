import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const admin = createAdminClient();
  await admin
    .from("professionals")
    .update({
      mp_user_id: null,
      mp_access_token_enc: null,
      mp_refresh_token_enc: null,
      mp_token_expires_at: null,
      mp_status: "disconnected",
    })
    .eq("id", user.id);

  return NextResponse.json({ ok: true });
}
