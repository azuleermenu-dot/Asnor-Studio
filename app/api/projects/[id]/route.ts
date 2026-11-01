import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_EDITOR_BYTES = 1_500_000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Vary: "Cookie",
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!UUID_PATTERN.test(id)) {
    return json({ error: "Project not found." }, 404);
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_EDITOR_BYTES) {
    return json({ error: "Project content is too large to save." }, 413);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON request." }, 400);
  }

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    !("editor_data" in body)
  ) {
    return json({ error: "Invalid project data." }, 400);
  }

  const editorData = (body as { editor_data?: unknown }).editor_data;
  if (
    !editorData ||
    typeof editorData !== "object" ||
    Array.isArray(editorData)
  ) {
    return json({ error: "Editor data must be a JSON object." }, 400);
  }

  const serialized = JSON.stringify(editorData);
  const size = new TextEncoder().encode(serialized).byteLength;
  if (size > MAX_EDITOR_BYTES) {
    return json({ error: "Project content is too large to save." }, 413);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: "Your session has expired. Please sign in again." }, 401);
  }

  const { data, error } = await supabase
    .from("projects")
    .update({ editor_data: editorData })
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Project autosave failed:", error.code);
    return json({ error: "We couldn't save this project. Please try again." }, 500);
  }

  if (!data) {
    return json({ error: "Project not found." }, 404);
  }

  return json({ success: true, savedAt: new Date().toISOString() });
}
