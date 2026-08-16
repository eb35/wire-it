import {
  EdgeLabelRenderer,
  type Edge,
  type EdgeProps,
  useReactFlow,
} from "@xyflow/react";
import { cableOnWireText, repeatOnWire, resolveCableColor } from "../../domain";
import type { CableTypeId, Point, WireColorId } from "../../domain/types";
import { useDiagramStore } from "../../store/useDiagramStore";

export type CableEdgeData = {
  type: CableTypeId;
  label: string;
  color: WireColorId;
  waypoints: Point[];
};

function pathFrom(points: Point[]): string {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function BendHandle({
  edgeId,
  index,
  x,
  y,
}: {
  edgeId: string;
  index: number;
  x: number;
  y: number;
}) {
  const { screenToFlowPosition } = useReactFlow();
  const moveBend = useDiagramStore((state) => state.moveBend);
  const removeBend = useDiagramStore((state) => state.removeBend);

  return (
    <div
      className="nopan nodrag pointer-events-auto absolute h-3 w-3 cursor-grab rounded-sm border-2 border-sky-400 bg-zinc-900"
      style={{
        transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (event.buttons !== 1) return;
        event.stopPropagation();
        const point = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        moveBend(edgeId, index, point);
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        removeBend(edgeId, index);
      }}
      title="Drag to bend. Double-click to remove."
    />
  );
}

export function CableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  selected,
}: EdgeProps<Edge<CableEdgeData>>) {
  const waypoints = data?.waypoints ?? [];
  const points = [{ x: sourceX, y: sourceY }, ...waypoints, { x: targetX, y: targetY }];
  const d = pathFrom(points);
  const color = resolveCableColor({
    type: data?.type ?? "12/2",
    color: data?.color ?? "sheath",
  });
  const text = cableOnWireText({
    type: data?.type ?? "12/2",
    label: data?.label ?? "",
  });
  const pathId = `cable-path-${id}`;

  return (
    <>
      <path
        d={d}
        fill="none"
        stroke={selected ? "#38bdf8" : color}
        strokeWidth={selected ? 14 : 11}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path id={pathId} d={d} fill="none" />
      <path d={d} fill="none" stroke="transparent" strokeWidth={28} className="react-flow__edge-interaction" />
      <text
        fill="#18181b"
        fontSize={9}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        style={{ pointerEvents: "none" }}
      >
        <textPath href={`#${pathId}`} startOffset="10">
          {repeatOnWire(text)}
        </textPath>
      </text>
      {selected ? (
        <EdgeLabelRenderer>
          {waypoints.map((waypoint, index) => (
            <BendHandle
              key={`${id}-${index}`}
              edgeId={id}
              index={index}
              x={waypoint.x}
              y={waypoint.y}
            />
          ))}
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
