import { deviceShort } from "../../domain/catalog";
import type { DeviceType } from "../../domain/types";

export function DeviceGlyph({ device }: { device: DeviceType }) {
  if (device === "empty") {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-sm border border-dashed border-zinc-600 bg-zinc-950/40">
        <span className="text-[10px] uppercase tracking-wide text-zinc-600">Open</span>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-sm border border-zinc-600 bg-zinc-950/70 px-1">
      <Glyph device={device} />
      <span className="text-[10px] font-semibold text-zinc-300">{deviceShort(device)}</span>
    </div>
  );
}

function Glyph({ device }: { device: DeviceType }) {
  if (device === "duplex-15" || device === "duplex-20" || device === "gfci-15" || device === "gfci-20") {
    return (
      <div className="flex flex-col gap-1">
        <span className="h-2.5 w-2.5 rounded-full border-2 border-zinc-300" />
        <span className="h-2.5 w-2.5 rounded-full border-2 border-zinc-300" />
      </div>
    );
  }
  if (device === "single-outlet") {
    return <span className="h-3 w-3 rounded-full border-2 border-zinc-300" />;
  }
  if (device === "light") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-amber-300 text-[10px] text-amber-300">
        ×
      </span>
    );
  }
  if (device === "breaker") {
    return <span className="h-6 w-3 rounded-sm border border-zinc-400 bg-zinc-700" />;
  }
  return (
    <span className="flex h-6 w-3 items-center justify-center rounded-sm border border-zinc-300 text-[9px] text-zinc-200">
      {device === "three-way" ? "3" : device === "four-way" ? "4" : "1"}
    </span>
  );
}
