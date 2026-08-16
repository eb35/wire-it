import { DiagramCanvas } from "./components/DiagramCanvas";
import { Inspector } from "./components/Inspector";
import { Palette } from "./components/Palette";
import { Toolbar } from "./components/Toolbar";

export function App() {
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
