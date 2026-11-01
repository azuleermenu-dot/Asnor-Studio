import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const REMEMBER_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const SESSION_PREFERENCE_COOKIE = "asnor-remember-session";

export async function createClient() {
  const store = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase environment variables are not configured.");
  }

  const remember = store.get(SESSION_PREFERENCE_COOKIE)?.value === "1";

  return createServerClient(url, key, {
    cookieOptions: {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(items) {
        try {
          items.forEach(({ name, value, options }) => {
            const safeOptions = { ...(options ?? {}) };
            delete safeOptions.maxAge;
            delete safeOptions.expires;

            const lifetime =
              value === ""
                ? { maxAge: 0 }
                : remember
                  ? { maxAge: REMEMBER_MAX_AGE_SECONDS }
                  : {};

            store.set(name, value, {
              ...safeOptions,
              ...lifetime,
            });
          });
        } catch {
          // Server Components may read cookies but cannot write them.
          // Middleware owns refresh persistence for those requests.
        }
      },
    },
  });
}
