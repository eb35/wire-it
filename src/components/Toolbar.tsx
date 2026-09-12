import { UserButton } from "@clerk/clerk-react";
import { useRef, useState } from "react";
import { parseProject } from "../domain/project";
import { clerkEnabled } from "../lib/clerk";
import { exportDiagramPng, exportDiagramSvg, type ExportTheme } from "../lib/exportDiagram";
import { downloadJson } from "../lib/downloadJson";
import { useDiagramStore, type SaveStatus } from "../store/useDiagramStore";

export function Toolbar() {
  const library = useDiagramStore((state) => state.library);
  const project = useDiagramStore((state) => state.project);
  const setProjectName = useDiagramStore((state) => state.setProjectName);
  const newDrawing = useDiagramStore((state) => state.newDrawing);
  const switchDrawing = useDiagramStore((state) => state.switchDrawing);
  const deleteDrawing = useDiagramStore((state) => state.deleteDrawing);
  const importProject = useDiagramStore((state) => state.importProject);
  const saveStatus = useDiagramStore((state) => state.saveStatus);
  const fileRef = useRef<HTMLInputElement>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport(kind: "svg" | "png", theme: ExportTheme) {
    setError(null);
    try {
      if (kind === "svg") exportDiagramSvg(project, theme);
      else await exportDiagramPng(project, theme);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Export failed.");
    }
    setExportOpen(false);
  }

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-zinc-800 bg-zinc-950 px-3">
      <div className="text-sm font-semibold tracking-tight">Wire-it</div>
      <input
        className="w-48 rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
        value={project.name}
        onChange={(event) => setProjectName(event.target.value)}
        aria-label="Drawing name"
      />
      <select
        className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
        value={project.id}
        onChange={(event) => switchDrawing(event.target.value)}
        aria-label="Switch drawing"
      >
        {library.drawings.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={newDrawing}
        className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-900"
      >
        New
      </button>
      <button
        type="button"
        onClick={() => {
          if (library.drawings.length <= 1) {
            deleteDrawing(project.id);
            return;
          }
          if (window.confirm(`Delete “${project.name}”?`)) {
            deleteDrawing(project.id);
          }
        }}
        className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-900"
      >
        Delete
      </button>
      <div className="relative">
        <button
          type="button"
          onClick={() => setExportOpen((open) => !open)}
          className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-900"
        >
          Export
        </button>
        {exportOpen ? (
          <div className="absolute right-0 z-20 mt-1 w-48 rounded border border-zinc-700 bg-zinc-900 py-1 text-xs">
            <button
              type="button"
              className="block w-full px-3 py-1.5 text-left hover:bg-zinc-800"
              onClick={() => {
                downloadJson(project);
                setExportOpen(false);
              }}
            >
              JSON
            </button>
            <button
              type="button"
              className="block w-full px-3 py-1.5 text-left hover:bg-zinc-800"
              onClick={() => void handleExport("svg", "dark")}
            >
              SVG — dark
            </button>
            <button
              type="button"
              className="block w-full px-3 py-1.5 text-left hover:bg-zinc-800"
              onClick={() => void handleExport("svg", "light")}
            >
              SVG — light
            </button>
            <button
              type="button"
              className="block w-full px-3 py-1.5 text-left hover:bg-zinc-800"
              onClick={() => void handleExport("png", "dark")}
            >
              PNG — dark
            </button>
            <button
              type="button"
              className="block w-full px-3 py-1.5 text-left hover:bg-zinc-800"
              onClick={() => void handleExport("png", "light")}
            >
              PNG — light
            </button>
          </div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-900"
      >
        Import
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          void file.text().then((text) => {
            try {
              importProject(parseProject(JSON.parse(text)));
              setError(null);
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : "Could not import that file.");
            }
          });
        }}
      />
      {error ? <span className="text-xs text-red-400">{error}</span> : null}
      <p className="ml-auto hidden text-[11px] text-zinc-500 md:block">{saveLabel(saveStatus)}</p>
      {clerkEnabled ? (
        <div className="ml-2 flex items-center">
          <UserButton />
        </div>
      ) : null}
    </header>
  );
}

function saveLabel(status: SaveStatus): string {
  if (status === "saving") return "Saving…";
  if (status === "saved") return "Saved to your account";
  if (status === "error") return "Couldn’t save to the cloud";
  if (status === "offline") return "Offline — this browser only";
  return "This browser only";
}
