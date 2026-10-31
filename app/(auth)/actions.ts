"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type EmailCodeState = {
  stage?: "verify";
  email?: string;
  error?: string;
  success?: string;
};

export async function sendEmailCode(_state: EmailCodeState, formData: FormData): Promise<EmailCodeState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const intent = String(formData.get("intent") ?? "login");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: intent === "signup",
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback`,
      },
    });
    if (error) {
      const message = error.message.toLowerCase();
      if (message.includes("rate") || message.includes("too many")) {
        return { error: "Please wait a little before requesting another code." };
      }
      if (intent === "login" && (message.includes("not found") || message.includes("signups not allowed"))) {
        return { error: "No account was found for that email. Create an account first." };
      }
      return { error: "We couldn’t send your code. Check the email and try again." };
    }
    return { stage: "verify", email, success: "We sent a 6-digit sign-in code to your email. Check your inbox and spam folder." };
  } catch {
    return { error: "Email verification is temporarily unavailable. Please try again." };
  }
}

export async function verifyEmailCode(_state: EmailCodeState, formData: FormData): Promise<EmailCodeState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const token = String(formData.get("token") ?? "").replace(/\s/g, "");
  if (!email || !/^\d{6}$/.test(token)) {
    return { stage: "verify", email, error: "Enter the 6-digit code from your email." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    if (error) return { stage: "verify", email, error: "That code is invalid or expired. Request a new one and try again." };
  } catch {
    return { stage: "verify", email, error: "We couldn’t verify the code. Please try again." };
  }
  redirect("/dashboard");
}
