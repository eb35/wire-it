import { DiagramCanvas } from "./DiagramCanvas";
import { Inspector } from "./Inspector";
import { Palette } from "./Palette";
import { Toolbar } from "./Toolbar";

export function Editor() {
  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      <Toolbar />
      <div className="flex min-h-0 flex-1">
        <Palette />
        <DiagramCanvas />
        <Inspector />
      </div>
    </div>
  );
}
