import { CABLE_TYPE_IDS } from "../domain/catalog";
import type { LocationKind } from "../domain/types";
import { useDiagramStore } from "../store/useDiagramStore";

const ITEMS: { kind: LocationKind | "note"; label: string; hint: string }[] = [
  { kind: "panel", label: "Panel", hint: "Load center" },
  { kind: "box", label: "Box", hint: "Outlet or switch" },
  { kind: "fixture", label: "Fixture", hint: "Light, fan" },
  { kind: "note", label: "Note", hint: "Drop anywhere" },
];

export function Palette() {
  const connectType = useDiagramStore((state) => state.connectType);
  const beginConnect = useDiagramStore((state) => state.beginConnect);
  const cancelConnect = useDiagramStore((state) => state.cancelConnect);

  return (
    <aside className="flex w-52 shrink-0 flex-col gap-5 overflow-auto border-r border-zinc-800 bg-zinc-950 p-3">
      <section className="flex flex-col gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Locations
        </h2>
        <p className="text-xs text-zinc-500">Drag onto the canvas, or click then drop.</p>
        {ITEMS.map((item) => (
          <div
            key={item.kind}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData("application/wire-it", item.kind);
              event.dataTransfer.effectAllowed = "move";
            }}
            className="cursor-grab rounded border border-zinc-800 bg-zinc-900 px-2 py-1.5 active:cursor-grabbing"
          >
            <div className="text-sm text-zinc-100">{item.label}</div>
            <div className="text-xs text-zinc-500">{item.hint}</div>
          </div>
        ))}
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Cables
        </h2>
        <p className="text-xs text-zinc-500">
          Click a type, then two boxes. Esc cancels.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {CABLE_TYPE_IDS.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                if (connectType === type) cancelConnect();
                else beginConnect(type);
              }}
              className={[
                "rounded-full px-2 py-0.5 text-xs",
                connectType === type
                  ? "bg-sky-500 text-zinc-950"
                  : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700",
              ].join(" ")}
            >
              {type}
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}

export type PaletteKind = LocationKind | "note";

export function isPaletteKind(value: string): value is PaletteKind {
  return value === "panel" || value === "box" || value === "fixture" || value === "note";
}
