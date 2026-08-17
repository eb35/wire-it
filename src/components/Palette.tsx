import { CABLE_TYPE_IDS, DEVICE_OPTIONS, PALETTE_DEVICES } from "../domain/catalog";
import { PALETTE_MIME, serializePalette, type PalettePayload } from "../domain/palette";
import { useDiagramStore } from "../store/useDiagramStore";

const LOCATIONS: { payload: PalettePayload; label: string; hint: string }[] = [
  { payload: { section: "location", kind: "panel" }, label: "Panel", hint: "Load center" },
  { payload: { section: "location", kind: "box", capacity: 1 }, label: "1-gang", hint: "2×1 box" },
  { payload: { section: "location", kind: "box", capacity: 2 }, label: "2-gang", hint: "2×2 box" },
  { payload: { section: "location", kind: "box", capacity: 3 }, label: "3-gang", hint: "2×3 box" },
  { payload: { section: "location", kind: "external" }, label: "Off-drawing", hint: "Box on another sheet" },
  { payload: { section: "note" }, label: "Note", hint: "Drop anywhere" },
];

function PaletteItem({
  payload,
  label,
  hint,
}: {
  payload: PalettePayload;
  label: string;
  hint: string;
}) {
  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData(PALETTE_MIME, serializePalette(payload));
        event.dataTransfer.effectAllowed = "move";
      }}
      className="cursor-grab rounded border border-zinc-800 bg-zinc-900 px-2 py-1.5 active:cursor-grabbing"
    >
      <div className="text-sm text-zinc-100">{label}</div>
      <div className="text-xs text-zinc-500">{hint}</div>
    </div>
  );
}

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
        <p className="text-xs text-zinc-500">Drag onto the canvas.</p>
        {LOCATIONS.map((item) => (
          <PaletteItem key={item.label} {...item} />
        ))}
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Devices
        </h2>
        <p className="text-xs text-zinc-500">Drag onto a box or a panel space.</p>
        {PALETTE_DEVICES.map((id) => {
          const option = DEVICE_OPTIONS.find((item) => item.id === id)!;
          return (
            <PaletteItem
              key={id}
              payload={{ section: "device", device: id }}
              label={option.label}
              hint={option.hint}
            />
          );
        })}
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Cables
        </h2>
        <p className="text-xs text-zinc-500">
          Drag a type onto or near a box to start a run. Or click a type, then connect two
          boxes. Esc cancels.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {CABLE_TYPE_IDS.map((type) => (
            <button
              key={type}
              type="button"
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData(
                  PALETTE_MIME,
                  serializePalette({ section: "cable", type }),
                );
                event.dataTransfer.effectAllowed = "move";
              }}
              onClick={() => {
                if (connectType === type) cancelConnect();
                else beginConnect(type);
              }}
              className={[
                "cursor-grab rounded-full px-2 py-0.5 text-xs active:cursor-grabbing",
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
