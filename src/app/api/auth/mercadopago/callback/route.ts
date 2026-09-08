import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/crypto";
import { exchangeAuthCode } from "@/lib/mercadopago";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  if (error) {
    return NextResponse.redirect(`${appUrl}/dashboard/settings?mp=error&reason=${error}`);
  }

  if (!code) {
    return NextResponse.redirect(`${appUrl}/dashboard/settings?mp=error&reason=missing_code`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.redirect(`${appUrl}/login`);

  const appId = process.env.MP_APP_ID;
  const clientSecret = process.env.MP_CLIENT_SECRET;
  const redirectUri = `${appUrl}/api/auth/mercadopago/callback`;

  if (!appId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}/dashboard/settings?mp=error&reason=not_configured`);
  }

  try {
    const res = await exchangeAuthCode({ clientId: appId, clientSecret, code, redirectUri });

    if (!res.access_token || !res.refresh_token) {
      throw new Error("missing_tokens");
    }

    const expiresIn = res.expires_in ?? 21600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const admin = createAdminClient();
    const { error: updErr } = await admin
      .from("professionals")
      .update({
        mp_user_id: Number(res.user_id) || null,
        mp_access_token_enc: encrypt(res.access_token),
        mp_refresh_token_enc: encrypt(res.refresh_token),
        mp_token_expires_at: expiresAt,
        mp_status: "connected",
      })
      .eq("id", user.id);

    if (updErr) throw updErr;

    return NextResponse.redirect(`${appUrl}/dashboard/settings?mp=connected`);
  } catch (e) {
    const msg = e instanceof Error ? e.message.replace(/[^a-zA-Z0-9 _.-]/g, "") : "oauth_failed";
    const admin = createAdminClient();
    await admin.from("professionals").update({ mp_status: "error" }).eq("id", user.id);
    return NextResponse.redirect(`${appUrl}/dashboard/settings?mp=error&reason=${encodeURIComponent(msg.slice(0, 80))}`);
  }
}
