import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://asnor-studio-mvp-asnor-ali.vercel.app"
).replace(/\\/$/, "");
const REMEMBER_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function GET(request: Request) {
  const remember =
    new URL(request.url).searchParams.get("remember") === "1";
  const cookieStore = await cookies();

  cookieStore.set("asnor-remember-session", remember ? "1" : "0", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(remember ? { maxAge: REMEMBER_MAX_AGE_SECONDS } : {}),
  });

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${siteUrl}/auth/callback` },
  });

  if (error || !data.url) {
    return NextResponse.redirect(`${siteUrl}/login?error=google`);
  }

  return NextResponse.redirect(data.url);
}
