import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://asnor-studio-mvp-asnor-ali.vercel.app").replace(/\/$/, "");

export async function GET() {
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
