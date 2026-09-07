import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const appId = process.env.MP_APP_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  if (!appId) return NextResponse.json({ error: "MP_NOT_CONFIGURED" }, { status: 500 });

  const redirectUri = `${appUrl}/api/auth/mercadopago/callback`;
  const state = Buffer.from(JSON.stringify({ uid: user.id, ts: Date.now() })).toString("base64url");

  const authUrl = new URL("https://auth.mercadopago.com/authorization");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", appId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}
