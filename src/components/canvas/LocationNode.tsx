import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { CSSProperties, DragEvent, MouseEvent } from "react";
import {
  BOX_HEADER,
  EXTERNAL_SIZE,
  PANEL_HEADER,
  PANEL_ROW,
  PANEL_WIDTH,
  boxSize,
} from "../../domain/layout";
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

function LocationCaption({ code, label }: { code: string; label: string }) {
  return (
    <div
      className="flex shrink-0 items-center gap-1 border-b border-zinc-600/80 px-1"
      style={{ height: BOX_HEADER }}
      title={label}
    >
      <span className="box-code shrink-0 rounded bg-zinc-950/70 px-1 font-mono text-[10px] font-semibold leading-none text-zinc-200">
        {code}
      </span>
      <span className="min-w-0 truncate text-[10px] leading-none text-zinc-300">{label}</span>
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
  code,
  label,
  onDropSlot,
}: {
  capacity: 1 | 2 | 3;
  slots: DeviceSlot[];
  code: string;
  label: string;
  onDropSlot: (event: DragEvent, index: number) => void;
}) {
  const size = boxSize(capacity);
  return (
    <div
      className="box-body flex flex-col overflow-hidden rounded-sm border-2 border-zinc-500 bg-zinc-800"
      style={{ width: size.width, height: size.height }}
    >
      <LocationCaption code={code} label={label} />
      <div className="flex min-h-0 flex-1 gap-1 p-1">
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
    </div>
  );
}

function PanelBody({
  breakers,
  code,
  label,
  onDropSlot,
}: {
  breakers: BreakerSlot[];
  code: string;
  label: string;
  onDropSlot: (event: DragEvent, index: number) => void;
}) {
  const rows: BreakerSlot[][] = [];
  for (let i = 0; i < breakers.length; i += 2) {
    rows.push(breakers.slice(i, i + 2));
  }
  return (
    <div className="overflow-hidden rounded-sm border-2 border-zinc-400 bg-zinc-800">
      <LocationCaption code={code} label={label} />
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className={["grid grid-cols-2", rowIndex > 0 ? "border-t border-zinc-600" : ""].join(" ")}
        >
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
      <div className={frame} style={{ width: PANEL_WIDTH }} onClick={chrome.onClick}>
        <PanelHandles spaces={data.spaces} />
        <PanelBody
          breakers={data.breakers}
          code={data.code}
          label={data.label}
          onDropSlot={chrome.onDeviceDrop}
        />
      </div>
    );
  }

  if (data.kind === "external") {
    const ref = data.externalRef.trim() || "Other drawing";
    return (
      <div
        className={`${frame} overflow-hidden rounded-sm border-2 border-dashed border-amber-600/80 bg-zinc-900/50`}
        style={{ width: EXTERNAL_SIZE.width, height: EXTERNAL_SIZE.height }}
        onClick={chrome.onClick}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => chrome.onDeviceDrop(event)}
      >
        <BoxHandles />
        <LocationCaption code={data.code} label={data.label} />
        <div className="truncate px-1.5 pt-1 text-[10px] leading-tight text-zinc-400" title={ref}>
          {ref}
        </div>
      </div>
    );
  }

  const size = boxSize(data.capacity);
  return (
    <div className={frame} onClick={chrome.onClick} style={{ width: size.width }}>
      <BoxHandles />
      <BoxBody
        capacity={data.capacity}
        slots={data.slots}
        code={data.code}
        label={data.label}
        onDropSlot={chrome.onDeviceDrop}
      />
    </div>
  );
}
