"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import "grapesjs/dist/css/grapes.min.css";
import "./studio-editor.css";
type Props = { projectId: string; initialData: unknown };
type EditorApi = {
 loadProjectData(data: object): void;
 getProjectData(): object;
 setDevice(name: string): void;
 destroy(): void;
 on(event: string, callback: () => void): void;
};
export default function StudioEditor({ projectId, initialData }: Props) {
 const hostRef=useRef<HTMLDivElement>(null); const editorRef=useRef<EditorApi|null>(null); const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [status,setStatus]=useState("All changes saved"); const [device,setDevice]=useState("Desktop");
 useEffect(()=>{let alive=true;let editor:EditorApi|null=null;
  import("grapesjs").then(({default:grapesjs})=>{if(!alive||!hostRef.current)return;
   editor=grapesjs.init({container:hostRef.current,height:"100%",width:"auto",storageManager:false,panels:{defaults:[]},
    blockManager:{appendTo:"#studio-blocks",blocks:[
     {id:"section",label:"Section",category:"Layout",content:'<section style="padding:56px 24px"><h2>New section</h2><p>Write something meaningful here.</p></section>'},
     {id:"heading",label:"Heading",category:"Text",content:"<h1>Your headline</h1>"},
     {id:"text",label:"Text",category:"Text",content:"<p>Click to edit this text.</p>"},
     {id:"button",label:"Button",category:"Basic",content:'<a href="#" style="display:inline-block;padding:12px 20px;background:#18181b;color:white;border-radius:8px;text-decoration:none">Button</a>'},
     {id:"image",label:"Image",category:"Basic",content:{type:"image",style:{width:"100%","max-width":"640px"},attributes:{src:"https://placehold.co/800x450?text=Your+Image",alt:"Replace with your image"}}},
     {id:"columns",label:"Two columns",category:"Layout",content:'<div style="display:flex;gap:24px;flex-wrap:wrap"><div style="flex:1;min-width:220px"><h3>Column one</h3><p>Content goes here.</p></div><div style="flex:1;min-width:220px"><h3>Column two</h3><p>Content goes here.</p></div></div>'}
    ]},deviceManager:{devices:[{name:"Desktop",width:""},{name:"Tablet",width:"768px"},{name:"Mobile",width:"375px"}]}}) as unknown as EditorApi;
   editorRef.current=editor;if(initialData&&typeof initialData==="object"&&Object.keys(initialData as object).length)editor.loadProjectData(initialData as object);
   editor.on("update",()=>{setStatus("Unsaved changes");if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(async()=>{setStatus("Saving…");const supabase=createClient();const {error}=await supabase.from("projects").update({editor_data:editor?.getProjectData()}).eq("id",projectId);setStatus(error?"Save failed":"All changes saved");},900);});
  }).catch(()=>setStatus("Editor failed to load"));
  return()=>{alive=false;if(timer.current)clearTimeout(timer.current);editor?.destroy();editorRef.current=null;};
 },[projectId,initialData]);
 function changeDevice(name:string){setDevice(name);editorRef.current?.setDevice(name);}
 return <div className="studio-shell"><aside className="studio-sidebar"><div className="studio-side-title">Add elements</div><div id="studio-blocks"/></aside><section className="studio-workspace"><div className="studio-toolbar"><div className="studio-device-controls">{["Desktop","Tablet","Mobile"].map(n=><button key={n} onClick={()=>changeDevice(n)} className={device===n?"active":""}>{n}</button>)}</div><span className="studio-save-status">{status}</span></div><div className="studio-canvas-wrap"><div ref={hostRef} className="studio-canvas"/></div></section></div>;
}
