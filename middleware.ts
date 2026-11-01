import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return response;

  const remember = request.cookies.get("asnor-remember-session")?.value === "1";
  const cookieOptions = remember ? { maxAge: 60 * 60 * 24 * 30 } : {};

  const supabase = createServerClient(url, key, {
    cookieOptions,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(items) {
        // Keep refreshed auth cookies on the request for downstream server components.
        items.forEach(({ name, value }) => request.cookies.set(name, value));

        // Rebuild the response and preserve every Supabase cookie option.
        response = NextResponse.next({ request });
        items.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, {
            ...options,
            ...cookieOptions,
          });
        });
      },
    },
  });

  // Refresh/validate the session without signing the user out.
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
