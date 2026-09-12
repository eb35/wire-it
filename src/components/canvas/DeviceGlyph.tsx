import { deviceShort } from "../../domain/catalog";
import { terminalsFor, type TerminalDef } from "../../domain/terminals";
import type { DeviceType } from "../../domain/types";

const FILL: Record<TerminalDef["fill"], string> = {
  brass: "bg-amber-600 border-amber-300",
  dark: "bg-zinc-900 border-zinc-400",
  silver: "bg-zinc-300 border-zinc-100",
  green: "bg-emerald-600 border-emerald-300",
};

export function DeviceGlyph({ device }: { device: DeviceType }) {
  if (device === "empty") {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-sm border border-dashed border-zinc-600 bg-zinc-950/40">
        <span className="text-[10px] uppercase tracking-wide text-zinc-600">Open</span>
      </div>
    );
  }

  const terminals = terminalsFor(device);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-sm border border-zinc-600 bg-zinc-950/70">
      {terminals.map((terminal) => (
        <span
          key={terminal.id}
          className={`absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border ${FILL[terminal.fill]}`}
          style={nubStyle(terminal)}
          title={terminal.label}
        />
      ))}
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-2">
        <Face device={device} />
        <span className="text-[10px] font-semibold text-zinc-300">{deviceShort(device)}</span>
      </div>
    </div>
  );
}

function nubStyle(terminal: TerminalDef): { left: string; top: string } {
  if (terminal.side === "top") return { left: "50%", top: "8%" };
  if (terminal.side === "left") return { left: "6%", top: `${18 + terminal.t * 64}%` };
  return { left: "94%", top: `${18 + terminal.t * 64}%` };
}

function Face({ device }: { device: DeviceType }) {
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
    <span className="h-9 w-3 rounded-sm border border-zinc-300 bg-zinc-800" title={device} />
  );
}
