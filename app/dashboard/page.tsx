import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export const metadata: Metadata = {
  title: "Your workspace",
  robots: {
    index: false,
    follow: false,
  },
};

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) redirect("/login");

  const {
    data: projects,
    error: projectsError,
  } = await supabase
    .from("projects")
    .select("id,name,updated_at")
    .order("updated_at", { ascending: false });

  if (projectsError) {
    console.error("Dashboard projects query failed:", projectsError.code);
  }

  const websites = projects ?? [];

  return (
    <main className="min-h-screen">
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-8">
        <Link href="/" className="font-semibold tracking-tight">
          asnor<span className="text-zinc-500"> studio</span>
        </Link>

        <form action={signOut}>
          <button
            type="submit"
            className="rounded-full px-4 py-2 text-sm text-zinc-400 transition hover:bg-white/[.06] hover:text-white"
          >
            Sign out
          </button>
        </form>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-violet-300">Your workspace</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Good to see you.
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              {user.email ?? "You're signed in to Asnor Studio."}
            </p>
          </div>

          <form action="/dashboard/create" method="post">
            <button
              type="submit"
              className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200 focus-visible:outline-offset-4"
            >
              ＋ New website
            </button>
          </form>
        </div>

        <section className="mt-10" aria-labelledby="websites-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="websites-heading" className="text-sm font-medium text-zinc-300">
              Your websites
            </h2>
            {!projectsError && (
              <span className="text-xs text-zinc-600">
                {websites.length} {websites.length === 1 ? "project" : "projects"}
              </span>
            )}
          </div>

          {projectsError ? (
            <div
              className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/[.06] p-6"
              role="alert"
            >
              <h3 className="font-medium text-amber-100">
                Your websites couldn&apos;t be loaded.
              </h3>
              <p className="mt-2 max-w-lg text-sm leading-6 text-zinc-400">
                Your projects have not been changed. Check your connection and try again.
              </p>
              <Link
                href="/dashboard"
                className="mt-4 inline-flex rounded-full border border-amber-200/20 px-4 py-2 text-sm text-amber-100 transition hover:bg-amber-200/10"
              >
                Try again
              </Link>
            </div>
          ) : websites.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {websites.map((project) => (
                <Link
                  href={`/dashboard/projects/${project.id}`}
                  key={project.id}
                  aria-label={`Open ${project.name} in the visual editor`}
                  className="group block min-w-0 rounded-2xl border border-white/10 bg-white/[.03] p-5 transition hover:-translate-y-0.5 hover:border-violet-400/40 hover:bg-white/[.05] focus-visible:outline-offset-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 break-words font-medium text-zinc-100">
                      {project.name}
                    </p>
                    <span
                      aria-hidden="true"
                      className="shrink-0 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-violet-300"
                    >
                      ↗
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-zinc-600">
                    Updated {formatUpdatedAt(project.updated_at)}
                  </p>
                  <span className="mt-6 inline-block text-xs font-medium text-violet-300">
                    Open visual editor →
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-white/15 px-6 py-14 text-center">
              <div
                aria-hidden="true"
                className="mx-auto grid size-12 place-items-center rounded-xl bg-white/[.06] text-xl"
              >
                ＋
              </div>
              <h3 className="mt-4 font-medium">Your first website starts here</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-500">
                Create a project and start building with visual blocks. You can
                edit your content and design directly on the canvas.
              </p>
              <form action="/dashboard/create" method="post">
                <button
                  type="submit"
                  className="mt-5 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-zinc-950 transition hover:bg-zinc-200"
                >
                  Create a project
                </button>
              </form>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
