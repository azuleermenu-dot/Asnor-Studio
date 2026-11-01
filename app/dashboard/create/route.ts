import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function POST(request: Request) {
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return NextResponse.redirect(new URL("/login",request.url));
 const {data:project,error}=await supabase.from("projects").insert({owner_id:user.id,name:"Untitled website"}).select("id").single();
 return NextResponse.redirect(new URL(error||!project?"/dashboard?error=create":`/dashboard/projects/${project.id}`,request.url),303);
}