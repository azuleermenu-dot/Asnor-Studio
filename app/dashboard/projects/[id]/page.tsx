import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StudioEditor from "@/components/studio-editor";

export const metadata: Metadata = {
  title: "Website editor",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ProjectEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) redirect("/login");

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id,name,editor_data")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (projectError) {
    console.error("Project lookup failed:", projectError.code);
    throw new Error("We couldn't load this website. Please try again.");
  }

  if (!project) notFound();

  return (
    <main className="min-h-screen bg-[#09090b]">
      <header className="flex h-14 items-center justify-between gap-3 border-b border-white/10 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/dashboard"
            className="shrink-0 text-sm text-zinc-400 transition hover:text-white"
          >
            ← Dashboard
          </Link>
          <span aria-hidden="true" className="text-white/20">
            /
          </span>
          <span className="truncate text-sm font-medium">{project.name}</span>
        </div>
        <span className="shrink-0 text-xs text-zinc-500">Visual editor · Beta</span>
      </header>
      <StudioEditor
        projectId={project.id}
        initialData={project.editor_data ?? {}}
      />
    </main>
  );
}
