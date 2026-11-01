import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const REMEMBER_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const SESSION_PREFERENCE_COOKIE = "asnor-remember-session";

function getAuthCookieNames(request: NextRequest) {
  return request.cookies
    .getAll()
    .filter(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"))
    .map(({ name }) => name);
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return response;

  const preference = request.cookies.get(SESSION_PREFERENCE_COOKIE);
  const remember = preference?.value === "1";
  const authCookieNames = getAuthCookieNames(request);

  // Supabase's SSR cookie storage intentionally gives refresh-token cookies
  // a very long lifetime. The separate browser-session preference is the
  // actual remember-me boundary. If it disappeared when the browser closed,
  // remove the leftover auth-token cookies before any page or API can use them.
  if (!preference && authCookieNames.length > 0) {
    authCookieNames.forEach((name) => request.cookies.delete(name));
    response = NextResponse.next({ request });

    authCookieNames.forEach((name) => {
      response.cookies.set(name, "", {
        path: "/",
        maxAge: 0,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    });

    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    return response;
  }

  // Refresh the session on the server and copy refreshed cookies to both the
  // downstream request and response. Strip Supabase's long default max-age
  // unless the user explicitly enabled "Keep me logged in".
  const supabase = createServerClient(url, key, {
    cookieOptions: {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(items) {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });

        items.forEach(({ name, value, options }) => {
          const {
            maxAge: _supabaseMaxAge,
            expires: _supabaseExpires,
            ...cookieOptions
          } = options ?? {};

          const lifetime =
            value === ""
              ? { maxAge: 0 }
              : remember
                ? { maxAge: REMEMBER_MAX_AGE_SECONDS }
                : {};

          response.cookies.set(name, value, {
            ...cookieOptions,
            ...lifetime,
          });
        });

        response.headers.set("Cache-Control", "private, no-store, max-age=0");
        response.headers.set("Pragma", "no-cache");
        response.headers.set("Expires", "0");
      },
    },
  });

  if (authCookieNames.length > 0) {
    await supabase.auth.getUser();
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
