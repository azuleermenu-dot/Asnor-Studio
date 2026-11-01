import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StudioEditor from "@/components/studio-editor";

export default async function ProjectEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: project } = await supabase.from("projects").select("id,name,editor_data").eq("id", id).eq("owner_id", user.id).single();
  if (!project) notFound();
  return <main className="min-h-screen bg-[#09090b]"><header className="flex h-14 items-center justify-between border-b border-white/10 px-4 sm:px-6"><div className="flex min-w-0 items-center gap-3"><Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white">← Dashboard</Link><span className="text-white/20">/</span><span className="truncate text-sm font-medium">{project.name}</span></div><span className="text-xs text-zinc-500">Visual editor · Beta</span></header><StudioEditor projectId={project.id} initialData={project.editor_data ?? {}} /></main>;
}
