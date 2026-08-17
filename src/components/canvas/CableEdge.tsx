import { EdgeLabelRenderer, useReactFlow, type Edge, type EdgeProps } from "@xyflow/react";
import { useEffect, useState } from "react";
import {
  buildCablePath,
  cableLane,
  cableOnWireText,
  connectOrtho,
  isDanglingCable,
  locationRect,
  markOffsets,
  movePathSegment,
  pathLength,
  pathToRoundedD,
  removePathVertex,
  segmentLength,
  segmentMid,
  sideFromHandle,
  wireEndParts,
} from "../../domain";
import { CORNER_RADIUS, LABEL_RUN } from "../../domain/route";
import type { CableTypeId, Point, WireColorId } from "../../domain/types";
import { resolveCableColor } from "../../domain/catalog";
import { useDiagramStore } from "../../store/useDiagramStore";

export type CableEdgeData = {
  type: CableTypeId;
  label: string;
  color: WireColorId;
  waypoints: Point[];
  sourceHandle?: string | null;
  targetHandle?: string | null;
};

function HitDot({
  x,
  y,
  title,
  onDrag,
  onRemove,
}: {
  x: number;
  y: number;
  title: string;
  onDrag: (point: Point) => void;
  onRemove?: () => void;
}) {
  const { screenToFlowPosition } = useReactFlow();
  return (
    <div
      className="nopan nodrag pointer-events-auto absolute z-20 flex h-6 w-6 cursor-grab items-center justify-center"
      style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }}
      title={title}
      onPointerDown={(event) => {
        event.stopPropagation();
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (event.buttons !== 1) return;
        event.stopPropagation();
        onDrag(screenToFlowPosition({ x: event.clientX, y: event.clientY }));
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onRemove?.();
      }}
    >
      <span className="h-3 w-3 rounded-full border-2 border-sky-400 bg-zinc-950 shadow-[0_0_0_1px_#0f172a]" />
    </div>
  );
}

function EndLabel({
  x,
  y,
  angle,
  local,
  rest,
}: {
  x: number;
  y: number;
  angle: number;
  local: string;
  rest: string;
}) {
  return (
    <div
      className="pointer-events-none absolute whitespace-nowrap font-mono text-[10px] leading-none text-zinc-100"
      style={{
        transform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${angle}deg)`,
        userSelect: "none",
      }}
    >
      <span className="font-bold">{local}</span>
      <span className="font-normal text-zinc-300"> {rest}</span>
    </div>
  );
}

function labelPlacement(from: Point, toward: Point): { point: Point; angle: number } {
  const dx = toward.x - from.x;
  const dy = toward.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  let nx = -uy;
  let ny = ux;
  if (angle > 90 || angle < -90) {
    angle += 180;
    nx = -nx;
    ny = -ny;
  }
  const along = Math.min(Math.max(LABEL_RUN * 0.45, 28), Math.max(20, length * 0.5));
  const perp = 14;
  return {
    point: {
      x: from.x + ux * along + nx * perp,
      y: from.y + uy * along + ny * perp,
    },
    angle,
  };
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
  const [activeVertex, setActiveVertex] = useState<number | null>(null);
  const project = useDiagramStore((state) => state.project);
  const setWaypoints = useDiagramStore((state) => state.setWaypoints);
  const dropCableEnd = useDiagramStore((state) => state.dropCableEnd);
  const setSelection = useDiagramStore((state) => state.setSelection);
  const { screenToFlowPosition } = useReactFlow();
  const cable = project.cables.find((item) => item.id === id);
  const source = project.locations.find((item) => item.id === cable?.source);
  const target = project.locations.find((item) => item.id === cable?.target);

  const start = { x: sourceX, y: sourceY };
  const end = { x: targetX, y: targetY };
  const startSide = sideFromHandle(cable?.sourceHandle ?? data?.sourceHandle ?? "s-r-50");
  const endSide = sideFromHandle(cable?.targetHandle ?? data?.targetHandle ?? "t-l-50");
  const waypoints = data?.waypoints ?? [];
  const obstacles = project.locations
    .filter((location) => location.id !== source?.id && location.id !== target?.id)
    .map(locationRect);
  const lane = cable ? cableLane(project.cables, cable) : 0;
  const points = buildCablePath(
    start,
    startSide,
    waypoints,
    end,
    endSide,
    obstacles,
    lane,
    source ? locationRect(source) : undefined,
    target ? locationRect(target) : undefined,
  );
  const d = pathToRoundedD(points, CORNER_RADIUS);
  const color = resolveCableColor({
    type: data?.type ?? "12/2",
    color: data?.color ?? "sheath",
  });
  const pathId = `cable-path-${id}`;
  const dangling = cable ? isDanglingCable(cable) : false;
  const sourceParts =
    source && cable
      ? dangling
        ? wireEndParts(source.code, cable.sourcePort)
        : target
          ? wireEndParts(source.code, cable.sourcePort, target.code, cable.targetPort)
          : null
      : null;
  const targetParts =
    source && target && cable && !dangling
      ? wireEndParts(target.code, cable.targetPort, source.code, cable.sourcePort)
      : null;
  const sourceAnchor = points.length >= 2 ? labelPlacement(points[0]!, points[1]!) : null;
  const targetAnchor =
    points.length >= 2
      ? labelPlacement(points[points.length - 1]!, points[points.length - 2]!)
      : null;
  const mark = cableOnWireText({
    type: data?.type ?? "12/2",
    label: data?.label ?? "",
  });
  const offsets = markOffsets(mark, pathLength(points), 11, LABEL_RUN);

  useEffect(() => {
    if (!selected) setActiveVertex(null);
  }, [selected]);

  useEffect(() => {
    if (!selected || activeVertex === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const targetEl = event.target as HTMLElement;
      if (targetEl.tagName === "INPUT" || targetEl.tagName === "TEXTAREA") return;
      event.preventDefault();
      setWaypoints(id, removePathVertex(points, activeVertex));
      setActiveVertex(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, activeVertex, id, points, setWaypoints]);

  const dragSegment = (segmentIndex: number, pointer: Point) => {
    setWaypoints(id, movePathSegment(points, segmentIndex, pointer));
  };

  return (
    <>
      <path
        d={d}
        fill="none"
        stroke={selected ? "#38bdf8" : color}
        strokeWidth={selected ? 7 : 5}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ pointerEvents: "none" }}
      />
      <path id={pathId} d={d} fill="none" style={{ pointerEvents: "none" }} />
      <path
        d={d}
        fill="none"
        stroke="transparent"
        strokeWidth={22}
        className="react-flow__edge-interaction"
        style={{ pointerEvents: "stroke" }}
        onClick={(event) => {
          event.stopPropagation();
          setSelection({ kind: "cable", id });
        }}
      />
      <text
        fill="#f4f4f5"
        stroke="#09090b"
        strokeWidth={3}
        paintOrder="stroke"
        fontSize={11}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        dominantBaseline="middle"
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {offsets.map((offset) => (
          <textPath key={offset} href={`#${pathId}`} startOffset={offset}>
            {mark}
          </textPath>
        ))}
      </text>
      <EdgeLabelRenderer>
        {sourceParts && sourceAnchor ? (
          <EndLabel
            x={sourceAnchor.point.x}
            y={sourceAnchor.point.y}
            angle={sourceAnchor.angle}
            local={sourceParts.local}
            rest={sourceParts.rest}
          />
        ) : null}
        {targetParts && targetAnchor ? (
          <EndLabel
            x={targetAnchor.point.x}
            y={targetAnchor.point.y}
            angle={targetAnchor.angle}
            local={targetParts.local}
            rest={targetParts.rest}
          />
        ) : null}
        {selected ? (
          <>
            {points.slice(0, -1).map((point, index) => {
              const next = points[index + 1]!;
              if (segmentLength(point, next) < 28) return null;
              const mid = segmentMid(point, next);
              return (
                <HitDot
                  key={`${id}-seg-${index}`}
                  x={mid.x}
                  y={mid.y}
                  title="Drag to add or move a bend. Drag back straight to remove it."
                  onDrag={(pointer) => dragSegment(index, pointer)}
                />
              );
            })}
            {points.slice(1, -1).map((point, index) => (
              <HitDot
                key={`${id}-corner-${index + 1}`}
                x={point.x}
                y={point.y}
                title="Drag to move. Double-click or Delete to remove this bend."
                onDrag={(pointer) => {
                  const next = points.map((item, i) => (i === index + 1 ? pointer : item));
                  setWaypoints(id, connectOrtho(next).slice(1, -1));
                  setActiveVertex(index + 1);
                }}
                onRemove={() => {
                  setWaypoints(id, removePathVertex(points, index + 1));
                  setActiveVertex(null);
                }}
              />
            ))}
            <EndDragDot
              x={start.x}
              y={start.y}
              title="Drag this end to another box, along a blue bar, or onto empty canvas"
              onDrop={(point) => dropCableEnd(id, "source", point)}
              screenToFlowPosition={screenToFlowPosition}
            />
            <EndDragDot
              x={end.x}
              y={end.y}
              title="Drag this end to another box, along a blue bar, or onto empty canvas"
              onDrop={(point) => dropCableEnd(id, "target", point)}
              screenToFlowPosition={screenToFlowPosition}
            />
          </>
        ) : null}
      </EdgeLabelRenderer>
    </>
  );
}

function EndDragDot({
  x,
  y,
  title,
  onDrop,
  screenToFlowPosition,
}: {
  x: number;
  y: number;
  title: string;
  onDrop: (point: Point) => void;
  screenToFlowPosition: (point: { x: number; y: number }) => Point;
}) {
  const [dragging, setDragging] = useState(false);
  const [live, setLive] = useState<Point>({ x, y });
  const pos = dragging ? live : { x, y };
  return (
    <div
      className="nopan nodrag pointer-events-auto absolute z-30 flex h-6 w-6 cursor-grab items-center justify-center"
      style={{ transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px)` }}
      title={title}
      onPointerDown={(event) => {
        event.stopPropagation();
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
        setLive({ x, y });
      }}
      onPointerMove={(event) => {
        if (event.buttons !== 1) return;
        event.stopPropagation();
        setLive(screenToFlowPosition({ x: event.clientX, y: event.clientY }));
      }}
      onPointerUp={(event) => {
        event.stopPropagation();
        setDragging(false);
        onDrop(screenToFlowPosition({ x: event.clientX, y: event.clientY }));
      }}
    >
      <span className="h-3.5 w-3.5 rounded-full border-2 border-sky-300 bg-sky-500/80" />
    </div>
  );
}
