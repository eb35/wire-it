import { spliceRows } from "../../domain/splices";
import type { Location, Project } from "../../domain/types";
import { InternalsCanvas } from "./InternalsCanvas";
import { INK, MUTED, PAPER, STROKE } from "./paper";

export function JobCard({ project, location }: { project: Project; location: Location }) {
  const rows = spliceRows(project, location);
  const device = location.slots
    .map((slot) => slot.device)
    .filter((item) => item !== "empty")
    .join(" + ");

  return (
    <div
      className="job-card overflow-hidden rounded-lg border"
      data-box={location.id}
      style={{ background: PAPER, borderColor: STROKE, color: INK }}
    >
      <div className="flex items-baseline gap-3 border-b px-4 py-3" style={{ borderColor: STROKE }}>
        <span className="text-sm font-semibold">
          {location.code} · {location.label}
        </span>
        <span className="text-xs" style={{ color: MUTED }}>
          {location.kind === "box" ? `${location.capacity}-gang` : location.kind}
          {device ? ` · ${device}` : ""}
        </span>
      </div>
      <InternalsCanvas project={project} location={location} interactive={false} variant="print" />
      <table className="w-full text-left text-xs" style={{ color: INK }}>
        <thead>
          <tr className="border-t" style={{ borderColor: STROKE, color: MUTED }}>
            <th className="px-4 py-2 font-medium">Conductor</th>
            <th className="px-4 py-2 font-medium">Lands on</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.conductor} className="border-t" style={{ borderColor: STROKE }}>
              <td className="px-4 py-1.5 font-mono">{row.conductor}</td>
              <td className="px-4 py-1.5">{row.lands}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
