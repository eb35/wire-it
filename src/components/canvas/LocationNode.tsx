import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { CSSProperties } from "react";
import { deviceLabel } from "../../domain/catalog";
import type { DeviceType, LocationKind } from "../../domain/types";
import { useDiagramStore } from "../../store/useDiagramStore";

export type LocationNodeData = {
  kind: LocationKind;
  label: string;
  device: DeviceType;
};

const KIND_LABEL: Record<LocationKind, string> = {
  panel: "Panel",
  box: "Box",
  fixture: "Fixture",
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

export function LocationNode({ id, data, selected }: NodeProps<Node<LocationNodeData>>) {
  const connectType = useDiagramStore((state) => state.connectType);
  const connectFrom = useDiagramStore((state) => state.connectFrom);
  const clickLocationForConnect = useDiagramStore((state) => state.clickLocationForConnect);
  const pending = connectFrom === id;

  return (
    <div
      className={[
        "location-node group w-[148px] rounded border px-3 py-2 text-left shadow-none",
        selected ? "border-sky-400" : "border-zinc-700",
        pending ? "ring-2 ring-sky-400" : "",
        connectType ? "connect-ready" : "",
        "bg-zinc-900 text-zinc-100",
      ].join(" ")}
      onClick={(event) => {
        if (!connectType) return;
        event.stopPropagation();
        clickLocationForConnect(id);
      }}
    >
      <SideHandles position={Position.Top} side="t" />
      <SideHandles position={Position.Right} side="r" />
      <SideHandles position={Position.Bottom} side="b" />
      <SideHandles position={Position.Left} side="l" />
      <div className="muted text-[10px] uppercase tracking-wide text-zinc-500">
        {KIND_LABEL[data.kind]}
      </div>
      <div className="truncate text-sm font-semibold">{data.label}</div>
      <div className="muted truncate text-xs text-zinc-400">{deviceLabel(data.device)}</div>
    </div>
  );
}
