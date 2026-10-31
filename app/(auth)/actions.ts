"use server";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
export async function signIn(formData:FormData){const email=String(formData.get("email")??"").trim();const password=String(formData.get("password")??"");if(!email||!password)redirect("/login?error=missing");const supabase=await createClient();const {error}=await supabase.auth.signInWithPassword({email,password});if(error)redirect("/login?error=invalid");redirect("/dashboard")}
export async function signUp(formData:FormData){const email=String(formData.get("email")??"").trim();const password=String(formData.get("password")??"");if(!email||password.length<8)redirect("/signup?error=validation");const supabase=await createClient();const {error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:`${process.env.NEXT_PUBLIC_SITE_URL??""}/auth/callback`}});if(error)redirect("/signup?error=signup");redirect("/signup?success=check-email")}
