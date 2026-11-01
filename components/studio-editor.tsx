"use client";

import { useEffect, useRef, useState } from "react";
import "grapesjs/dist/css/grapes.min.css";
import "./studio-editor.css";
import { externalizeLocalImages, hydrateLocalImages, readImageFile } from "@/lib/editor/local-assets";
import EditorDesignControls, { type EditorComponent } from "@/components/editor-design-controls";

type Props = { projectId: string; initialData: unknown };
type EditorApi = {
  loadProjectData(data: object): void;
  getProjectData(): object;
  setDevice(name: string): void;
  addComponents(content: object | string): unknown;
  runCommand(command: string): void;
  stopCommand(command: string): void;
  getSelected(): EditorComponent | null;
  destroy(): void;
  on(event: string, callback: (...args: unknown[]) => void): void;
};

type MobilePanel = "blocks" | "design" | "assets" | null;

export default function StudioEditor({ projectId, initialData }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorApi | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState("All changes saved");
  const [device, setDevice] = useState("Desktop");
  const [uploading, setUploading] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<EditorComponent | null>(null);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    let alive = true;
    let editor: EditorApi | null = null;
    let saving = false;
    let saveAgain = false;

    const saveLatest = async () => {
      if (saving) { saveAgain = true; return; }
      saving = true;
      try {
        do {
          saveAgain = false;
          if (!editor) return;
          setStatus("Saving…");
          const editorData = await externalizeLocalImages(projectId, editor.getProjectData());
          const response = await fetch(`/api/projects/${projectId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            cache: "no-store",
            body: JSON.stringify({ editor_data: editorData }),
          });
          if (!response.ok) {
            if (response.status === 401) setStatus("Session expired — sign in again");
            else if (response.status === 404) setStatus("Project not found");
            else if (response.status === 413) setStatus("Project data is too large to save");
            else setStatus("Save failed — check your connection");
            break;
          }
          setStatus(saveAgain ? "Saving…" : "All changes saved");
        } while (saveAgain);
      } catch {
        setStatus("Save failed — local storage may be unavailable");
      } finally { saving = false; }
    };

    async function initialize() {
      const { default: grapesjs } = await import("grapesjs");
      if (!alive || !hostRef.current) return;
      editor = grapesjs.init({
        container: hostRef.current, height: "100%", width: "auto",
        storageManager: false, panels: { defaults: [] },
        blockManager: {
          appendTo: "#studio-blocks",
          blocks: [
            { id: "section", label: "Section", category: "Layout", content: '<section style="padding:56px 24px"><h2>New section</h2><p>Write something meaningful here.</p></section>' },
            { id: "heading", label: "Heading", category: "Text", content: "<h1>Your headline</h1>" },
            { id: "text", label: "Text", category: "Text", content: "<p>Click to edit this text.</p>" },
            { id: "button", label: "Button", category: "Basic", content: '<a href="#" style="display:inline-block;padding:12px 20px;background:#18181b;color:white;border-radius:8px;text-decoration:none">Button</a>' },
            { id: "image", label: "Image", category: "Basic", content: { type: "image", style: { width: "100%", "max-width": "640px" }, attributes: { src: "https://placehold.co/800x450?text=Choose+your+image", alt: "Replace with your image" } } },
            { id: "columns", label: "Two columns", category: "Layout", content: '<div style="display:flex;gap:24px;flex-wrap:wrap"><div style="flex:1;min-width:220px"><h3>Column one</h3><p>Content goes here.</p></div><div style="flex:1;min-width:220px"><h3>Column two</h3><p>Content goes here.</p></div></div>' },
            { id: "spacer", label: "Spacer", category: "Layout", content: '<div style="height:48px" aria-hidden="true"></div>' },
            { id: "container", label: "Container", category: "Layout", content: '<div style="max-width:1100px;margin:0 auto;padding:24px"><p>Container content</p></div>' },
          ],
        },
        deviceManager: { devices: [{ name: "Desktop", width: "" }, { name: "Tablet", width: "768px" }, { name: "Mobile", width: "375px" }] },
      }) as unknown as EditorApi;
      editorRef.current = editor;
      editor.on("component:selected", (...args) => {
        setSelectedComponent((args[0] as EditorComponent | undefined) ?? editor?.getSelected() ?? null);
        setMobilePanel("design");
      });
      editor.on("component:deselected", () => setSelectedComponent(null));
      editor.on("component:remove", () => setSelectedComponent(null));
      if (initialData && typeof initialData === "object" && Object.keys(initialData as object).length > 0) {
        try {
          const hydrated = await hydrateLocalImages(initialData as object);
          if (alive && editor) editor.loadProjectData(hydrated);
        } catch {
          setStatus("Some local images couldn't be loaded on this device");
          if (alive && editor) editor.loadProjectData(initialData as object);
        }
      }
      editor.on("update", () => {
        setStatus("Unsaved changes");
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => void saveLatest(), 900);
      });
    }
    initialize().catch(() => setStatus("Editor failed to load"));
    return () => {
      alive = false;
      if (timer.current) clearTimeout(timer.current);
      editor?.destroy(); editor = null; editorRef.current = null; setSelectedComponent(null);
    };
  }, [projectId, initialData]);

  function changeDevice(name: string) {
    setDevice(name);
    editorRef.current?.setDevice(name);
  }

  async function handleImageSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editorRef.current) return;
    setUploading(true);
    try {
      const dataUrl = await readImageFile(file);
      editorRef.current.addComponents({ type: "image", attributes: { src: dataUrl, alt: file.name.replace(/\.[^.]+$/, "") }, style: { width: "100%", "max-width": "720px", height: "auto" } });
      setStatus("Image added — saving…");
      setMobilePanel(null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Couldn't add that image");
    } finally { setUploading(false); }
  }

  const togglePanel = (panel: Exclude<MobilePanel, null>) => setMobilePanel((current) => current === panel ? null : panel);

  function togglePreview() {
    const next = !preview;
    if (next) editorRef.current?.runCommand("core:preview");
    else editorRef.current?.stopCommand("core:preview");
    setPreview(next);
    setMobilePanel(null);
  }

  return (
    <div className={`studio-shell ${preview ? "studio-preview-mode" : ""} ${mobilePanel ? "studio-panel-open" : ""}`}>
      <aside className={`studio-sidebar ${mobilePanel ? "mobile-panel-visible" : ""}`} aria-label="Editor tools">
        <div className="studio-mobile-panel-head">
          <strong>{mobilePanel === "design" ? "Design selected" : mobilePanel === "assets" ? "Images" : "Add elements"}</strong>
          <button type="button" onClick={() => setMobilePanel(null)} aria-label="Close tools">Close ✕</button>
        </div>
        <div className="studio-side-title">Add elements</div>
        <button type="button" className="studio-upload-button" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? "Adding image…" : "＋ Upload from device"}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageSelected} />
        <p className="studio-local-note">Images stay in this browser on this device. Clearing browser data may remove them.</p>
        <div id="studio-blocks" />
        <EditorDesignControls component={selectedComponent} />
      </aside>
      <section className="studio-workspace">
        <div className="studio-toolbar">
          <div className="studio-device-controls" aria-label="Preview width">
            {[["Desktop", "Desktop"], ["Tablet", "Tablet"], ["Mobile", "Mobile"]].map(([name, label]) => (
              <button key={name} type="button" onClick={() => changeDevice(name)} className={device === name ? "active" : ""} aria-pressed={device === name}>{label}</button>
            ))}
          </div>
          <div className="studio-actions">
            <button type="button" onClick={() => editorRef.current?.runCommand("core:undo")} aria-label="Undo" title="Undo">↶</button>
            <button type="button" onClick={() => editorRef.current?.runCommand("core:redo")} aria-label="Redo" title="Redo">↷</button>
            <button type="button" className={preview ? "active" : ""} onClick={togglePreview} aria-pressed={preview}>{preview ? "Edit" : "Preview"}</button>
          </div>
          <span className="studio-save-status" role="status" aria-live="polite">{status}</span>
        </div>
        <div className="studio-canvas-wrap">
          <div ref={hostRef} className="studio-canvas" />
        </div>
        <nav className="studio-mobile-nav" aria-label="Mobile editor tools">
          <button type="button" aria-pressed={mobilePanel === "blocks"} className={mobilePanel === "blocks" ? "active" : ""} onClick={() => togglePanel("blocks")}><span aria-hidden="true">＋</span> Add</button>
          <button type="button" aria-pressed={mobilePanel === "design"} className={mobilePanel === "design" ? "active" : ""} onClick={() => togglePanel("design")}><span aria-hidden="true">✎</span> Design</button>
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}><span aria-hidden="true">▧</span> Image</button>
          <button type="button" onClick={togglePreview}><span aria-hidden="true">◉</span> {preview ? "Edit" : "Preview"}</button>
        </nav>
      </section>
    </div>
  );
}
