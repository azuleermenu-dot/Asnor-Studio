import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://asnor-studio-mvp-asnor-ali.vercel.app"
).replace(/\\/$/, "");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const cookieStore = await cookies();

  // A callback can be opened from an email on a fresh browser session.
  // In that case establish a normal browser-session login unless the
  // sign-in flow explicitly stored the remember-me preference.
  if (!cookieStore.get("asnor-remember-session")) {
    cookieStore.set("asnor-remember-session", "0", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${siteUrl}/dashboard`);
    }
  }

  return NextResponse.redirect(`${siteUrl}/login?error=callback`);
}
