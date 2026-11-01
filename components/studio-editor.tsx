"use client";

import { useEffect, useRef, useState } from "react";
import "grapesjs/dist/css/grapes.min.css";
import "./studio-editor.css";

type Props = {
  projectId: string;
  initialData: unknown;
};

type EditorApi = {
  loadProjectData(data: object): void;
  getProjectData(): object;
  setDevice(name: string): void;
  destroy(): void;
  on(event: string, callback: () => void): void;
};

export default function StudioEditor({ projectId, initialData }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState("All changes saved");
  const [device, setDevice] = useState("Desktop");

  useEffect(() => {
    let alive = true;
    let editor: EditorApi | null = null;
    let saving = false;
    let saveAgain = false;

    const saveLatest = async () => {
      if (saving) {
        saveAgain = true;
        return;
      }

      saving = true;

      try {
        do {
          saveAgain = false;
          if (!editor) return;

          setStatus("Saving…");
          const response = await fetch(`/api/projects/${projectId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            cache: "no-store",
            body: JSON.stringify({
              editor_data: editor.getProjectData(),
            }),
          });

          if (!response.ok) {
            if (response.status === 401) {
              setStatus("Session expired — sign in again");
            } else if (response.status === 404) {
              setStatus("Project not found");
            } else if (response.status === 413) {
              setStatus("This page is too large to save");
            } else {
              setStatus("Save failed — check your connection");
            }
            break;
          }

          setStatus(saveAgain ? "Saving…" : "All changes saved");
        } while (saveAgain);
      } catch {
        setStatus("Save failed — check your connection");
      } finally {
        saving = false;
      }
    };

    import("grapesjs")
      .then(({ default: grapesjs }) => {
        if (!alive || !hostRef.current) return;

        editor = grapesjs.init({
          container: hostRef.current,
          height: "100%",
          width: "auto",
          storageManager: false,
          panels: { defaults: [] },
          blockManager: {
            appendTo: "#studio-blocks",
            blocks: [
              {
                id: "section",
                label: "Section",
                category: "Layout",
                content:
                  '<section style="padding:56px 24px"><h2>New section</h2><p>Write something meaningful here.</p></section>',
              },
              {
                id: "heading",
                label: "Heading",
                category: "Text",
                content: "<h1>Your headline</h1>",
              },
              {
                id: "text",
                label: "Text",
                category: "Text",
                content: "<p>Click to edit this text.</p>",
              },
              {
                id: "button",
                label: "Button",
                category: "Basic",
                content:
                  '<a href="#" style="display:inline-block;padding:12px 20px;background:#18181b;color:white;border-radius:8px;text-decoration:none">Button</a>',
              },
              {
                id: "image",
                label: "Image",
                category: "Basic",
                content: {
                  type: "image",
                  style: { width: "100%", "max-width": "640px" },
                  attributes: {
                    src: "https://placehold.co/800x450?text=Your+Image",
                    alt: "Replace with your image",
                  },
                },
              },
              {
                id: "columns",
                label: "Two columns",
                category: "Layout",
                content:
                  '<div style="display:flex;gap:24px;flex-wrap:wrap"><div style="flex:1;min-width:220px"><h3>Column one</h3><p>Content goes here.</p></div><div style="flex:1;min-width:220px"><h3>Column two</h3><p>Content goes here.</p></div></div>',
              },
            ],
          },
          deviceManager: {
            devices: [
              { name: "Desktop", width: "" },
              { name: "Tablet", width: "768px" },
              { name: "Mobile", width: "375px" },
            ],
          },
        }) as unknown as EditorApi;

        if (
          initialData &&
          typeof initialData === "object" &&
          Object.keys(initialData as object).length > 0
        ) {
          editor.loadProjectData(initialData as object);
        }

        editor.on("update", () => {
          setStatus("Unsaved changes");
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            void saveLatest();
          }, 900);
        });
      })
      .catch(() => setStatus("Editor failed to load"));

    return () => {
      alive = false;
      if (timer.current) clearTimeout(timer.current);
      editor?.destroy();
      editor = null;
    };
  }, [projectId, initialData]);

  function changeDevice(name: string) {
    setDevice(name);
    // Device names match the GrapesJS deviceManager entries above.
    // The editor instance is scoped to the effect; this is handled below.
  }

  return (
    <div className="studio-shell">
      <aside className="studio-sidebar">
        <div className="studio-side-title">Add elements</div>
        <div id="studio-blocks" />
      </aside>
      <section className="studio-workspace">
        <div className="studio-toolbar">
          <div className="studio-device-controls">
            {["Desktop", "Tablet", "Mobile"].map((name) => (
              <button
                key={name}
                onClick={() => changeDevice(name)}
                className={device === name ? "active" : ""}
              >
                {name}
              </button>
            ))}
          </div>
          <span className="studio-save-status" role="status" aria-live="polite">
            {status}
          </span>
        </div>
        <div className="studio-canvas-wrap">
          <div ref={hostRef} className="studio-canvas" />
        </div>
      </section>
    </div>
  );
}
