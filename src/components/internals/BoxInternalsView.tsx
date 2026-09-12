import { useEffect, useState } from "react";
import { spliceRows } from "../../domain/splices";
import { exportElementPng } from "../../lib/exportPng";
import { useDiagramStore } from "../../store/useDiagramStore";
import { InternalsCanvas } from "./InternalsCanvas";
import { JobCard } from "./JobCard";

export function BoxInternalsView() {
  const project = useDiagramStore((state) => state.project);
  const openBoxId = useDiagramStore((state) => state.openBoxId);
  const closeBox = useDiagramStore((state) => state.closeBox);
  const [printAll, setPrintAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const location = project.locations.find((item) => item.id === openBoxId);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (printAll) setPrintAll(false);
        else closeBox();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeBox, printAll]);

  if (!location) return null;

  const box = location;
  const rows = spliceRows(project, box);
  const boxes = project.locations.filter((item) => item.kind === "box" || item.kind === "external");

  async function downloadCard() {
    setError(null);
    try {
      await exportElementPng(`.job-card[data-box="${box.id}"]`, `${project.name}-${box.code}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not export that card.");
    }
  }

  if (printAll) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-zinc-200 text-zinc-900">
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-zinc-300 bg-zinc-100 px-3 py-2">
          <button
            type="button"
            className="rounded border border-zinc-400 px-2 py-1 text-xs hover:bg-zinc-50"
            onClick={() => setPrintAll(false)}
          >
            Back to editor
          </button>
          <span className="text-sm font-medium">Job cards · {project.name}</span>
        </div>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-6">
          {boxes.map((box) => (
            <JobCard key={box.id} project={project} location={box} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-900">
      <div className="flex shrink-0 items-center gap-2 border-b border-zinc-800 px-3 py-2">
        <button
          type="button"
          className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
          onClick={closeBox}
        >
          Floor plan
        </button>
        <h2 className="text-sm font-semibold text-zinc-100">
          {location.code} — {location.label}
        </h2>
        <span className="text-xs text-zinc-500">
          Drag a tip onto a screw or nut. Click a landed tip or drop it on empty paper to
          disconnect. Drag the spare tip on a nut to add a pigtail.
        </span>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
            onClick={() => void downloadCard()}
          >
            PNG this box
          </button>
          <button
            type="button"
            className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
            onClick={() => setPrintAll(true)}
          >
            All job cards
          </button>
        </div>
      </div>
      {error ? <p className="px-3 py-1 text-xs text-red-400">{error}</p> : null}
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-lg border border-zinc-700">
            <InternalsCanvas project={project} location={location} interactive variant="editor" />
          </div>
          <div
            aria-hidden
            className="pointer-events-none fixed top-0 w-[800px]"
            style={{ left: -2000 }}
          >
            <JobCard project={project} location={location} />
          </div>
          <table className="mt-4 w-full text-left text-xs text-zinc-300">
            <thead>
              <tr className="text-zinc-500">
                <th className="py-1 font-medium">Conductor</th>
                <th className="py-1 font-medium">Lands on</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.conductor} className="border-t border-zinc-800">
                  <td className="py-1 font-mono">{row.conductor}</td>
                  <td className="py-1">{row.lands}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
