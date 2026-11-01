"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export type EmailCodeState={stage?:"verify";email?:string;error?:string;success?:string};
// Compatibility type for the legacy AuthForm component still included in the build.
export type AuthState = EmailCodeState;
export async function sendEmailCode(_state:EmailCodeState,formData:FormData):Promise<EmailCodeState>{
 const email=String(formData.get("email")??"").trim().toLowerCase();
 const intent=String(formData.get("intent")??"login");
 if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return{error:"Enter a valid email address."};
 try{
  const supabase=await createClient();
  const{error}=await supabase.auth.signInWithOtp({email,options:{shouldCreateUser:intent==="signup",emailRedirectTo:"https://asnor-studio-mvp-asnor-ali.vercel.app/auth/callback"}});
  if(error){const m=error.message.toLowerCase();if(m.includes("rate")||m.includes("too many"))return{error:"Please wait a little before requesting another code."};if(intent==="login"&&(m.includes("not found")||m.includes("signups not allowed")))return{error:"No account was found for that email. Create an account first."};return{error:"We couldn’t send your code. Check the email and try again."};}
  return{stage:"verify",email,success:"We sent a sign-in email. Click its secure sign-in link, or enter the 6-digit code if shown. Check spam too."};
 }catch{return{error:"Email verification is temporarily unavailable. Please try again."};}
}
export async function verifyEmailCode(_state:EmailCodeState,formData:FormData):Promise<EmailCodeState>{
 const email=String(formData.get("email")??"").trim().toLowerCase();
 const token=String(formData.get("token")??"").replace(/\s/g,"");
 if(!email||!/^[0-9]{6}$/.test(token))return{stage:"verify",email,error:"Enter the 6-digit code from your email."};
 try{const supabase=await createClient();const{error}=await supabase.auth.verifyOtp({email,token,type:"email"});if(error)return{stage:"verify",email,error:"That code is invalid or expired. Request a new one and try again."};}
 catch{return{stage:"verify",email,error:"We couldn’t verify the code. Please try again."};}
 redirect("/dashboard");
}