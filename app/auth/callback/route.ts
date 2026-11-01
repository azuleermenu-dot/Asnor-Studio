import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://asnor-studio-mvp-asnor-ali.vercel.app").replace(/\\/$/, "");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${siteUrl}/dashboard`);
  }
  return NextResponse.redirect(`${siteUrl}/login?error=callback`);
}
