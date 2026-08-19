import { DiagramCanvas } from "./DiagramCanvas";
import { Inspector } from "./Inspector";
import { BoxInternalsView } from "./internals/BoxInternalsView";
import { Palette } from "./Palette";
import { Toolbar } from "./Toolbar";
import { useDiagramStore } from "../store/useDiagramStore";

export function Editor() {
  const openBoxId = useDiagramStore((state) => state.openBoxId);

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      <Toolbar />
      <div className="flex min-h-0 flex-1">
        {openBoxId ? null : <Palette />}
        {openBoxId ? <BoxInternalsView /> : <DiagramCanvas />}
        <Inspector />
      </div>
    </div>
  );
}
