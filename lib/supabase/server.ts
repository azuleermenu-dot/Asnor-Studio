import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const store = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase environment variables are not configured.");
  const remember = store.get("asnor-remember-session")?.value === "1";
  return createServerClient(url, key, {
    cookieOptions: remember ? { maxAge: 60 * 60 * 24 * 30 } : {},
    cookies: {
      getAll() { return store.getAll(); },
      setAll(items) {
        try { items.forEach(({ name, value, options }) => store.set(name, value, options)); }
        catch { /* Server Components cannot write cookies. */ }
      },
    },
  });
}
