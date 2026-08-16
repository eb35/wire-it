import { CABLE_TYPE_IDS, DEVICE_OPTIONS, WIRE_COLOR_IDS, WIRE_COLORS, cableOnWireText, resolveCableColor } from "../domain";
import { useDiagramStore } from "../store/useDiagramStore";

export function Inspector() {
  const project = useDiagramStore((state) => state.project);
  const selection = useDiagramStore((state) => state.selection);
  const updateLocation = useDiagramStore((state) => state.updateLocation);
  const updateCable = useDiagramStore((state) => state.updateCable);
  const updateNote = useDiagramStore((state) => state.updateNote);
  const deleteSelection = useDiagramStore((state) => state.deleteSelection);

  const location =
    selection?.kind === "location"
      ? project.locations.find((item) => item.id === selection.id)
      : undefined;
  const cable =
    selection?.kind === "cable"
      ? project.cables.find((item) => item.id === selection.id)
      : undefined;
  const note =
    selection?.kind === "note"
      ? project.notes.find((item) => item.id === selection.id)
      : undefined;

  return (
    <aside className="flex w-64 shrink-0 flex-col gap-3 overflow-auto border-l border-zinc-800 bg-zinc-950 p-3">
      {!selection ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Inspector</h2>
          <p className="text-xs text-zinc-500">
            Select a box, cable, or note. Drag boxes anywhere. Select a cable and drag the
            squares to bend it. Double-click a cable to add a bend.
          </p>
        </div>
      ) : null}

      {location ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">{location.label}</h2>
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            Name
            <input
              className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
              value={location.label}
              onChange={(event) => updateLocation(location.id, { label: event.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            Device
            <select
              className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
              value={location.device}
              onChange={(event) =>
                updateLocation(location.id, {
                  device: event.target.value as typeof location.device,
                })
              }
            >
              {DEVICE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {cable ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">{cable.type} run</h2>
          <p className="text-xs text-zinc-500">
            On the wire: {cableOnWireText(cable)}
          </p>
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            Type
            <select
              className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
              value={cable.type}
              onChange={(event) =>
                updateCable(cable.id, { type: event.target.value as typeof cable.type })
              }
            >
              {CABLE_TYPE_IDS.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-500">
            Label
            <input
              className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
              value={cable.label}
              placeholder="from brk 29"
              onChange={(event) => updateCable(cable.id, { label: event.target.value })}
            />
          </label>
          <div className="flex flex-col gap-1 text-xs text-zinc-500">
            Color
            <div className="flex flex-wrap gap-1.5">
              {WIRE_COLOR_IDS.map((id) => {
                const swatch =
                  id === "sheath"
                    ? resolveCableColor({ type: cable.type, color: "sheath" })
                    : (WIRE_COLORS[id].hex ?? "#888");
                return (
                  <button
                    key={id}
                    type="button"
                    title={WIRE_COLORS[id].label}
                    onClick={() => updateCable(cable.id, { color: id })}
                    className={[
                      "h-6 w-6 rounded-full border",
                      cable.color === id ? "border-sky-400" : "border-zinc-600",
                    ].join(" ")}
                    style={{ background: swatch }}
                  />
                );
              })}
            </div>
            <span>{WIRE_COLORS[cable.color].label}</span>
          </div>
          <p className="text-xs text-zinc-500">
            {cable.waypoints.length} bend{cable.waypoints.length === 1 ? "" : "s"}. Double-click
            a handle to remove it.
          </p>
        </div>
      ) : null}

      {note ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Note</h2>
          <textarea
            className="min-h-28 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
            value={note.text}
            onChange={(event) => updateNote(note.id, event.target.value)}
          />
        </div>
      ) : null}

      {selection ? (
        <button
          type="button"
          onClick={deleteSelection}
          className="mt-auto rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-900"
        >
          Delete
        </button>
      ) : null}
    </aside>
  );
}
