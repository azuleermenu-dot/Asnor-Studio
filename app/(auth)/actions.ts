"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; success?: string };

function credentials(formData: FormData) {
  return { email: String(formData.get("email") ?? "").trim().toLowerCase(), password: String(formData.get("password") ?? "") };
}

export async function signIn(_state: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = credentials(formData);
  if (!email || !password) return { error: "Enter your email and password." };
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message.toLowerCase().includes("email not confirmed") ? "Please verify your email before signing in." : "That email and password don’t match. Try again." };
  } catch {
    return { error: "Sign-in is temporarily unavailable. Please try again in a moment." };
  }
  redirect("/dashboard");
}

export async function signUp(_state: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = credentials(formData);
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  if (!email) return { error: "Enter a valid email address." };
  if (password.length < 8) return { error: "Use a password with at least 8 characters." };
  if (password !== confirmPassword) return { error: "Your passwords don’t match." };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback` } });
    if (error) {
      const message = error.message.toLowerCase();
      if (message.includes("already") || message.includes("registered")) return { error: "An account may already exist with this email. Try signing in instead." };
      return { error: "We couldn’t create your account. Please check your details and try again." };
    }
    if (data.session) redirect("/dashboard");
    return { success: "Account created. Check your inbox for the verification link, then sign in." };
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    return { error: "Sign-up is temporarily unavailable. Please try again in a moment." };
  }
}

export async function resetPassword(_state: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Enter your email address first." };
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback?next=/login` });
    if (error) return { error: "We couldn’t send a reset link. Please try again." };
    return { success: "If an account exists for that email, a password reset link is on its way." };
  } catch {
    return { error: "Password reset is temporarily unavailable. Please try again." };
  }
}
