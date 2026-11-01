"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://asnor-studio-mvp-asnor-ali.vercel.app"
).replace(/\\/$/, "");
const AUTH_CALLBACK_URL = `${SITE_URL}/auth/callback`;
const REMEMBER_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type EmailCodeState = {
  stage?: "verify";
  email?: string;
  error?: string;
  success?: string;
  retryAfterSeconds?: number;
};

export type AuthState = EmailCodeState;

function saveRememberPreference(remember: boolean) {
  return cookies().then((cookieStore) => {
    cookieStore.set("asnor-remember-session", remember ? "1" : "0", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      ...(remember ? { maxAge: REMEMBER_MAX_AGE_SECONDS } : {}),
    });
  });
}

export async function sendEmailCode(
  _state: EmailCodeState,
  formData: FormData,
): Promise<EmailCodeState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const intent = String(formData.get("intent") ?? "login");
  const remember = formData.get("remember") === "on";

  if (!email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }

  if (intent !== "login" && intent !== "signup") {
    return { error: "Invalid sign-in request. Please refresh and try again." };
  }

  await saveRememberPreference(remember);

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: intent === "signup",
        emailRedirectTo: AUTH_CALLBACK_URL,
      },
    });

    if (error) {
      const message = error.message.toLowerCase();

      if (
        message.includes("rate") ||
        message.includes("too many") ||
        message.includes("security purposes")
      ) {
        const match = error.message.match(/(\\d+)\\s*(seconds?|secs?)/i);
        return {
          error: "Too many sign-in or sign-up requests. Try again in:",
          retryAfterSeconds: match ? Math.max(1, Number(match[1])) : 60,
        };
      }

      if (
        intent === "login" &&
        (message.includes("not found") || message.includes("signups not allowed"))
      ) {
        return {
          error: "No account was found for that email. Create an account first.",
        };
      }

      return {
        error: "We couldn’t send your code. Check the email and try again.",
      };
    }

    return {
      stage: "verify",
      email,
      success:
        "We sent a sign-in email. Click its secure sign-in link, or enter the 6-digit code if shown. Check spam too.",
    };
  } catch {
    return {
      error: "Email verification is temporarily unavailable. Please try again.",
    };
  }
}

export async function verifyEmailCode(
  _state: EmailCodeState,
  formData: FormData,
): Promise<EmailCodeState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const token = String(formData.get("token") ?? "").replace(/\\s/g, "");

  if (!email || !/^[0-9]{6}$/.test(token)) {
    return {
      stage: "verify",
      email,
      error: "Enter the 6-digit code from your email.",
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (error) {
      return {
        stage: "verify",
        email,
        error: "That code is invalid or expired. Request a new one and try again.",
      };
    }
  } catch {
    return {
      stage: "verify",
      email,
      error: "We couldn’t verify the code. Please try again.",
    };
  }

  redirect("/dashboard");
}

export async function signInWithGoogle(): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: AUTH_CALLBACK_URL },
  });

  if (error || !data.url) {
    redirect("/login?error=google");
  }

  redirect(data.url);
}
