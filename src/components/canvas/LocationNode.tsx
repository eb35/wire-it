import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { CSSProperties, DragEvent, MouseEvent } from "react";
import { KIND_LABEL } from "../../domain/catalog";
import { BOX_CAPTION, GANG_UNIT, PANEL_HEADER, PANEL_ROW, boxBodySize } from "../../domain/layout";
import { PALETTE_MIME, parsePalette } from "../../domain/palette";
import type { BreakerSlot, DeviceSlot, LocationKind } from "../../domain/types";
import { useDiagramStore } from "../../store/useDiagramStore";
import { DeviceGlyph } from "./DeviceGlyph";

export type LocationNodeData = {
  kind: LocationKind;
  label: string;
  code: string;
  capacity: 1 | 2 | 3;
  slots: DeviceSlot[];
  spaces: number;
  breakers: BreakerSlot[];
  externalRef: string;
};

function offset(position: Position, index: number): CSSProperties {
  const t = `${28 + index * 22}%`;
  if (position === Position.Top || position === Position.Bottom) {
    return { left: t };
  }
  return { top: t };
}

function SideHandles({ position, side }: { position: Position; side: "t" | "r" | "b" | "l" }) {
  return (
    <>
      {[0, 1, 2].map((index) => (
        <span key={`${side}${index}`}>
          <Handle
            type="source"
            id={`s-${side}${index}`}
            position={position}
            style={offset(position, index)}
          />
          <Handle
            type="target"
            id={`t-${side}${index}`}
            position={position}
            style={offset(position, index)}
          />
        </span>
      ))}
    </>
  );
}

function BoxHandles() {
  return (
    <>
      <SideHandles position={Position.Top} side="t" />
      <SideHandles position={Position.Right} side="r" />
      <SideHandles position={Position.Bottom} side="b" />
      <SideHandles position={Position.Left} side="l" />
    </>
  );
}

function PanelHandles({ spaces }: { spaces: number }) {
  return (
    <>
      {Array.from({ length: spaces }, (_, index) => {
        const number = index + 1;
        const row = Math.floor(index / 2);
        const left = number % 2 === 1;
        const top = PANEL_HEADER + row * PANEL_ROW + PANEL_ROW / 2;
        const position = left ? Position.Left : Position.Right;
        return (
          <span key={number}>
            <Handle type="source" id={`s-brk-${number}`} position={position} style={{ top }} />
            <Handle type="target" id={`t-brk-${number}`} position={position} style={{ top }} />
          </span>
        );
      })}
    </>
  );
}

function Caption({
  kind,
  code,
  label,
}: {
  kind: LocationKind;
  code: string;
  label: string;
}) {
  return (
    <div className="flex items-end justify-between gap-2 px-0.5 pb-1" style={{ height: BOX_CAPTION }}>
      <div className="min-w-0">
        <div className="muted text-[10px] uppercase tracking-wide text-zinc-500">{KIND_LABEL[kind]}</div>
        <div className="truncate text-xs font-semibold leading-tight">{label}</div>
      </div>
      <span className="rounded bg-zinc-800 px-1.5 font-mono text-[11px] text-zinc-200">{code}</span>
    </div>
  );
}

function useLocationChrome(id: string) {
  const connectType = useDiagramStore((state) => state.connectType);
  const connectFrom = useDiagramStore((state) => state.connectFrom);
  const clickLocationForConnect = useDiagramStore((state) => state.clickLocationForConnect);
  const placeDevice = useDiagramStore((state) => state.placeDevice);
  return {
    connectType,
    pending: connectFrom === id,
    onClick: (event: MouseEvent) => {
      if (!connectType) return;
      event.stopPropagation();
      clickLocationForConnect(id);
    },
    onDeviceDrop: (event: DragEvent, slotIndex?: number) => {
      const payload = parsePalette(event.dataTransfer.getData(PALETTE_MIME));
      if (payload?.section !== "device") return;
      event.preventDefault();
      event.stopPropagation();
      placeDevice(id, payload.device, slotIndex);
    },
  };
}

function BoxBody({
  capacity,
  slots,
  onDropSlot,
}: {
  capacity: 1 | 2 | 3;
  slots: DeviceSlot[];
  onDropSlot: (event: DragEvent, index: number) => void;
}) {
  const body = boxBodySize(capacity);
  return (
    <div
      className="box-body flex gap-1 rounded-sm border-2 border-zinc-500 bg-zinc-800 p-1"
      style={{ width: body.width, height: body.height }}
    >
      {slots.map((slot, index) => (
        <div
          key={index}
          className="min-w-0 flex-1"
          onDragOver={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onDrop={(event) => onDropSlot(event, index)}
        >
          <DeviceGlyph device={slot.device} />
        </div>
      ))}
    </div>
  );
}

function PanelBody({
  breakers,
  onDropSlot,
}: {
  breakers: BreakerSlot[];
  onDropSlot: (event: DragEvent, index: number) => void;
}) {
  const rows: BreakerSlot[][] = [];
  for (let i = 0; i < breakers.length; i += 2) {
    rows.push(breakers.slice(i, i + 2));
  }
  return (
    <div className="overflow-hidden rounded-sm border-2 border-zinc-400 bg-zinc-800">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-2 border-t border-zinc-600 first:border-t-0">
          {row.map((slot, col) => {
            const index = rowIndex * 2 + col;
            return (
              <div
                key={slot.number}
                className={[
                  "flex items-center gap-1 px-1.5",
                  col === 0 ? "border-r border-zinc-600" : "",
                ].join(" ")}
                style={{ height: PANEL_ROW }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onDrop={(event) => onDropSlot(event, index)}
              >
                <span className="w-5 font-mono text-[11px] text-zinc-300">{slot.number}</span>
                <span className="truncate text-[10px] text-zinc-400">{slot.label || "—"}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function LocationNode({ id, data, selected }: NodeProps<Node<LocationNodeData>>) {
  const chrome = useLocationChrome(id);

  const frame = [
    "location-node group text-left shadow-none",
    selected ? "ring-2 ring-sky-400" : "",
    chrome.pending ? "ring-2 ring-sky-400" : "",
    chrome.connectType ? "connect-ready" : "",
    "text-zinc-100",
  ].join(" ");

  if (data.kind === "panel") {
    return (
      <div className={`${frame} w-[176px]`} onClick={chrome.onClick}>
        <PanelHandles spaces={data.spaces} />
        <Caption kind="panel" code={data.code} label={data.label} />
        <PanelBody breakers={data.breakers} onDropSlot={chrome.onDeviceDrop} />
      </div>
    );
  }

  if (data.kind === "external") {
    return (
      <div
        className={`${frame} w-[148px] rounded-sm border-2 border-dashed border-amber-600/80 bg-zinc-900/50 px-2 py-1.5`}
        onClick={chrome.onClick}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => chrome.onDeviceDrop(event)}
      >
        <BoxHandles />
        <div className="muted flex items-center justify-between text-[10px] uppercase tracking-wide text-amber-500/90">
          <span>Off-drawing</span>
          <span className="rounded bg-zinc-800 px-1.5 font-mono text-[11px] text-zinc-200">
            {data.code}
          </span>
        </div>
        <div className="truncate text-sm font-semibold">{data.label}</div>
        <div className="muted truncate text-xs text-zinc-400">
          {data.externalRef.trim() || "Other drawing"}
        </div>
      </div>
    );
  }

  return (
    <div className={frame} onClick={chrome.onClick} style={{ width: GANG_UNIT * data.capacity }}>
      <BoxHandles />
      <Caption kind="box" code={data.code} label={data.label} />
      <BoxBody capacity={data.capacity} slots={data.slots} onDropSlot={chrome.onDeviceDrop} />
    </div>
  );
}
