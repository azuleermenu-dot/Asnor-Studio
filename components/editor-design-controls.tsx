"use client";

import { useEffect, useState } from "react";

export type EditorComponent = {
  get(name: string): unknown;
  set(name: string, value: unknown): void;
  getStyle(): Record<string, string>;
  setStyle(styles: Record<string, string>): void;
  getAttributes(): Record<string, string>;
  addAttributes(attrs: Record<string, string>): void;
  components(): { length: number };
};

type Props = { component: EditorComponent | null };

type Controls = {
  tag: string;
  text: string;
  editableText: boolean;
  color: string;
  background: string;
  fontSize: string;
  fontWeight: string;
  textAlign: string;
  padding: string;
  margin: string;
  radius: string;
  width: string;
  href: string;
  alt: string;
};

const EMPTY: Controls = {
  tag: "Nothing selected", text: "", editableText: false,
  color: "#18181b", background: "#ffffff", fontSize: "16",
  fontWeight: "400", textAlign: "left", padding: "0", margin: "0",
  radius: "0", width: "auto", href: "", alt: "",
};

function readColor(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  const color = value.trim();
  if (/^#[\da-f]{6}$/i.test(color)) return color;
  if (/^#[\da-f]{3}$/i.test(color)) return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
  const rgb = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgb) return `#${rgb.slice(1, 4).map((part) => Math.max(0, Math.min(255, Number(part))).toString(16).padStart(2, "0")).join("")}`;
  return fallback;
}

function readNumber(value: string | undefined, fallback: string) {
  const number = Number.parseFloat(value ?? "");
  return Number.isFinite(number) ? String(number) : fallback;
}

function allowedHref(value: string) {
  const href = value.trim();
  if (!href) return "";
  if (/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(href)) return href;
  return `https://${href}`;
}

export default function EditorDesignControls({ component }: Props) {
  const [value, setValue] = useState<Controls>(EMPTY);

  useEffect(() => {
    if (!component) {
      setValue(EMPTY);
      return;
    }

    const tag = String(component.get("tagName") ?? "element").toLowerCase();
    const styles = component.getStyle() ?? {};
    const attrs = component.getAttributes() ?? {};
    const content = component.get("content");
    const editableText = component.components().length === 0
      && typeof content === "string"
      && !["img", "input", "br", "hr"].includes(tag);
    const width = String(styles.width ?? "auto");
    const allowedWidths = ["auto", "100%", "75%", "50%", "25%"];

    setValue({
      tag,
      text: editableText ? String(content) : "",
      editableText,
      color: readColor(styles.color, "#18181b"),
      background: readColor(styles["background-color"], "#ffffff"),
      fontSize: readNumber(styles["font-size"], "16"),
      fontWeight: String(styles["font-weight"] ?? "400"),
      textAlign: String(styles["text-align"] ?? "left"),
      padding: readNumber(styles.padding, "0"),
      margin: readNumber(styles.margin, "0"),
      radius: readNumber(styles["border-radius"], "0"),
      width: allowedWidths.includes(width) ? width : "auto",
      href: String(attrs.href ?? ""),
      alt: String(attrs.alt ?? ""),
    });
  }, [component]);

  function style(property: string, next: string) {
    if (!component) return;
    component.setStyle({ [property]: next });
    const key: keyof Controls =
      property === "background-color" ? "background" :
      property === "font-size" ? "fontSize" :
      property === "font-weight" ? "fontWeight" :
      property === "text-align" ? "textAlign" :
      property === "border-radius" ? "radius" :
      property as keyof Controls;
    setValue((current) => ({ ...current, [key]: next }));
  }

  function dimension(property: string, next: string, max: number) {
    if (next === "") {
      style(property, "");
      return;
    }
    const number = Number(next);
    if (Number.isFinite(number)) style(property, `${Math.max(0, Math.min(max, number))}px`);
  }

  function changeText(next: string) {
    component?.set("content", next);
    setValue((current) => ({ ...current, text: next }));
  }

  function attribute(name: "href" | "alt", next: string) {
    if (!component) return;
    component.addAttributes({ [name]: name === "href" ? allowedHref(next) : next.slice(0, 300) });
    setValue((current) => ({ ...current, [name]: next }));
  }

  return (
    <div className="studio-design-panel">
      <div className="studio-side-title">Design selected</div>
      {!component ? (
        <p className="studio-empty-selection">Select an element on the canvas to edit its design.</p>
      ) : (
        <>
          <div className="studio-selected-tag">{`<${value.tag}>`}</div>
          {value.editableText && (
            <label className="studio-field-full">
              <span>Text content</span>
              <textarea rows={3} value={value.text} onChange={(event) => changeText(event.target.value)} />
            </label>
          )}
          {value.tag === "a" && (
            <label className="studio-field-full">
              <span>Button / link URL</span>
              <input value={value.href} onChange={(event) => attribute("href", event.target.value)} placeholder="https://example.com" />
            </label>
          )}
          {value.tag === "img" && (
            <label className="studio-field-full">
              <span>Image description (alt)</span>
              <input value={value.alt} onChange={(event) => attribute("alt", event.target.value)} placeholder="Describe this image" />
            </label>
          )}
          <div className="studio-control-grid">
            <label className="studio-field"><span>Text color</span><input type="color" value={value.color} onChange={(event) => style("color", event.target.value)} /></label>
            <label className="studio-field"><span>Background</span><input type="color" value={value.background} onChange={(event) => style("background-color", event.target.value)} /></label>
            <label className="studio-field"><span>Font size</span><input type="number" min="8" max="120" value={value.fontSize} onChange={(event) => dimension("font-size", event.target.value, 120)} /></label>
            <label className="studio-field"><span>Font weight</span><select value={value.fontWeight} onChange={(event) => style("font-weight", event.target.value)}><option value="300">Light</option><option value="400">Regular</option><option value="500">Medium</option><option value="600">Semibold</option><option value="700">Bold</option><option value="800">Extra bold</option></select></label>
            <label className="studio-field"><span>Alignment</span><select value={value.textAlign} onChange={(event) => style("text-align", event.target.value)}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option><option value="justify">Justify</option></select></label>
            <label className="studio-field"><span>Width</span><select value={value.width} onChange={(event) => style("width", event.target.value)}><option value="auto">Auto</option><option value="100%">Full</option><option value="75%">75%</option><option value="50%">50%</option><option value="25%">25%</option></select></label>
            <label className="studio-field"><span>Padding (px)</span><input type="number" min="0" max="200" value={value.padding} onChange={(event) => dimension("padding", event.target.value, 200)} /></label>
            <label className="studio-field"><span>Margin (px)</span><input type="number" min="0" max="200" value={value.margin} onChange={(event) => dimension("margin", event.target.value, 200)} /></label>
            <label className="studio-field"><span>Corner radius</span><input type="number" min="0" max="100" value={value.radius} onChange={(event) => dimension("border-radius", event.target.value, 100)} /></label>
          </div>
        </>
      )}
    </div>
  );
}
