import { EdgeLabelRenderer, useReactFlow, type Edge, type EdgeProps } from "@xyflow/react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  buildCablePath,
  cableLane,
  cableOnWireText,
  CABLE_SNAP_DISTANCE,
  connectOrtho,
  facingSide,
  insertBendOnSegment,
  isDanglingCable,
  locationRect,
  markOffsets,
  movePathSegment,
  nearestLocation,
  pathLength,
  pathToRoundedD,
  projectToPerimeter,
  removePathVertex,
  segmentLength,
  segmentMid,
  sideFromHandle,
  wireEndParts,
} from "../../domain";
import { CORNER_RADIUS, LABEL_RUN } from "../../domain/route";
import type { CableTypeId, Location, Point, Side, WireColorId } from "../../domain/types";
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

const DRAG_SLOP = 4;

type DragEnd = {
  end: "source" | "target";
  point: Point;
  moved: boolean;
};

function EditDot({
  x,
  y,
  title,
  variant,
  active,
  onDrag,
  onClick,
  onDelete,
}: {
  x: number;
  y: number;
  title: string;
  variant: "mid" | "corner" | "end";
  active?: boolean;
  onDrag: (point: Point) => void;
  onClick?: () => void;
  onDelete?: () => void;
}) {
  const { screenToFlowPosition } = useReactFlow();
  const origin = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);
  const end = variant === "end";
  const mid = variant === "mid";

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    event.preventDefault();
    origin.current = { x: event.clientX, y: event.clientY };
    dragged.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.buttons !== 1 || !origin.current) return;
    event.stopPropagation();
    const distance = Math.hypot(event.clientX - origin.current.x, event.clientY - origin.current.y);
    if (distance > DRAG_SLOP) dragged.current = true;
    if (!dragged.current) return;
    onDrag(screenToFlowPosition({ x: event.clientX, y: event.clientY }));
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    const wasDrag = dragged.current;
    origin.current = null;
    dragged.current = false;
    if (!wasDrag) onClick?.();
  };

  return (
    <div
      className={[
        "nopan nodrag pointer-events-auto absolute z-30 flex items-center justify-center",
        end ? "h-7 w-7" : "h-6 w-6",
        mid ? "cursor-pointer" : "cursor-grab",
        active ? "z-40" : "",
      ].join(" ")}
      style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }}
      title={title}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onDelete?.();
      }}
    >
      {end ? (
        <span
          className={[
            "rounded-full border-2 border-white",
            active
              ? "h-4 w-4 bg-white shadow-[0_0_0_3px_#0284c7,0_0_18px_#7dd3fc]"
              : "h-3.5 w-3.5 bg-sky-400 shadow-[0_0_0_2px_#0369a1,0_0_10px_#38bdf8]",
          ].join(" ")}
        />
      ) : mid ? (
        <span className="h-3 w-3 rounded-full border-2 border-sky-300 bg-zinc-950 shadow-[0_0_0_1px_#0c4a6e]" />
      ) : (
        <span
          className={[
            "h-3 w-3 rounded-full border-2 border-sky-200 bg-sky-500",
            active ? "shadow-[0_0_0_2px_#38bdf8]" : "shadow-[0_0_0_1px_#0c4a6e]",
          ].join(" ")}
        />
      )}
      {onDelete ? (
        <button
          type="button"
          className="absolute -right-2.5 -top-2.5 flex h-4 w-4 items-center justify-center rounded-full border border-sky-200 bg-zinc-950 text-[10px] leading-none text-sky-200 hover:bg-sky-500 hover:text-zinc-950"
          title="Remove this bend"
          onPointerDown={(event) => {
            event.stopPropagation();
            event.preventDefault();
          }}
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
        >
          ×
        </button>
      ) : null}
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

function snapDragEnd(
  point: Point,
  locations: Location[],
  avoidId?: string,
): { point: Point; side: Side; snapped: boolean } {
  const hit = nearestLocation(
    avoidId ? locations.filter((location) => location.id !== avoidId) : locations,
    point,
    CABLE_SNAP_DISTANCE,
  );
  if (!hit) return { point, side: "right", snapped: false };
  const landing = projectToPerimeter(locationRect(hit), point);
  return { point: landing.point, side: landing.side, snapped: true };
}

export function CableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  selected: flowSelected,
}: EdgeProps<Edge<CableEdgeData>>) {
  const [activeVertex, setActiveVertex] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<DragEnd | null>(null);
  const project = useDiagramStore((state) => state.project);
  const storeSelected = useDiagramStore(
    (state) => state.selection?.kind === "cable" && state.selection.id === id,
  );
  const setWaypoints = useDiagramStore((state) => state.setWaypoints);
  const dropCableEnd = useDiagramStore((state) => state.dropCableEnd);
  const setSelection = useDiagramStore((state) => state.setSelection);
  const setDraggingCableEnd = useDiagramStore((state) => state.setDraggingCableEnd);
  const { screenToFlowPosition } = useReactFlow();
  const selected = flowSelected || storeSelected;
  const cable = project.cables.find((item) => item.id === id);
  const source = project.locations.find((item) => item.id === cable?.source);
  const target = project.locations.find((item) => item.id === cable?.target);

  const start = { x: sourceX, y: sourceY };
  const end = { x: targetX, y: targetY };
  const startSide = sideFromHandle(cable?.sourceHandle ?? data?.sourceHandle ?? "s-r-50");
  const endSide = sideFromHandle(cable?.targetHandle ?? data?.targetHandle ?? "t-l-50");

  let drawStart = start;
  let drawEnd = end;
  let drawStartSide = startSide;
  let drawEndSide = endSide;
  if (dragEnd?.moved) {
    if (dragEnd.end === "source") {
      const snapped = snapDragEnd(dragEnd.point, project.locations, cable?.target || undefined);
      drawStart = snapped.snapped ? snapped.point : dragEnd.point;
      drawStartSide = snapped.snapped ? snapped.side : facingSide(end, dragEnd.point);
    } else {
      const snapped = snapDragEnd(dragEnd.point, project.locations, cable?.source);
      drawEnd = snapped.snapped ? snapped.point : dragEnd.point;
      drawEndSide = snapped.snapped ? snapped.side : facingSide(start, dragEnd.point);
    }
  }

  const waypoints = dragEnd?.moved ? [] : (data?.waypoints ?? []);
  const obstacles = project.locations
    .filter((location) => location.id !== source?.id && location.id !== target?.id)
    .map(locationRect);
  const lane = cable ? cableLane(project.cables, cable) : 0;
  const points = buildCablePath(
    drawStart,
    drawStartSide,
    waypoints,
    drawEnd,
    drawEndSide,
    obstacles,
    lane,
    source && dragEnd?.end !== "source" ? locationRect(source) : undefined,
    target && dragEnd?.end !== "target" ? locationRect(target) : undefined,
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
    if (!selected) {
      setActiveVertex(null);
      setDragEnd(null);
    }
  }, [selected]);

  useEffect(() => {
    if (!selected || activeVertex === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const targetEl = event.target as HTMLElement;
      if (targetEl.tagName === "INPUT" || targetEl.tagName === "TEXTAREA") return;
      event.preventDefault();
      event.stopPropagation();
      setWaypoints(id, removePathVertex(points, activeVertex));
      setActiveVertex(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [selected, activeVertex, id, points, setWaypoints]);

  const beginEndDrag = (endKind: "source" | "target", event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelection({ kind: "cable", id });
    setDraggingCableEnd({ cableId: id, end: endKind });
    setDragEnd({
      end: endKind,
      point: screenToFlowPosition({ x: event.clientX, y: event.clientY }),
      moved: false,
    });
  };

  const moveEndDrag = (endKind: "source" | "target", event: PointerEvent<HTMLDivElement>) => {
    if (event.buttons !== 1) return;
    event.stopPropagation();
    const point = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    setDragEnd((current) => {
      const origin = endKind === "source" ? start : end;
      const moved = current?.moved || Math.hypot(point.x - origin.x, point.y - origin.y) > DRAG_SLOP;
      return { end: endKind, point, moved };
    });
  };

  const finishEndDrag = (endKind: "source" | "target", event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    const point = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const moved = dragEnd?.moved || Math.hypot(point.x - (endKind === "source" ? start.x : end.x), point.y - (endKind === "source" ? start.y : end.y)) > DRAG_SLOP;
    setDragEnd(null);
    setDraggingCableEnd(null);
    if (moved) dropCableEnd(id, endKind, point);
  };

  return (
    <>
      {selected ? (
        <path
          d={d}
          fill="none"
          stroke="#38bdf8"
          strokeWidth={16}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.32}
          style={{ pointerEvents: "none" }}
        />
      ) : null}
      <path
        d={d}
        fill="none"
        stroke={selected ? "#7dd3fc" : color}
        strokeWidth={selected ? 8 : 5}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ pointerEvents: "none" }}
      />
      {selected ? (
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ pointerEvents: "none" }}
        />
      ) : null}
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
            {!dragEnd
              ? points.slice(0, -1).map((point, index) => {
                  const next = points[index + 1]!;
                  if (segmentLength(point, next) < 28) return null;
                  const mid = segmentMid(point, next);
                  return (
                    <EditDot
                      key={`${id}-seg-${index}`}
                      x={mid.x}
                      y={mid.y}
                      variant="mid"
                      title="Click to add a 90° bend. Drag to move this run."
                      onDrag={(pointer) => setWaypoints(id, movePathSegment(points, index, pointer))}
                      onClick={() => setWaypoints(id, insertBendOnSegment(points, index))}
                    />
                  );
                })
              : null}
            {!dragEnd
              ? points.slice(1, -1).map((point, index) => (
                  <EditDot
                    key={`${id}-corner-${index + 1}`}
                    x={point.x}
                    y={point.y}
                    variant="corner"
                    active={activeVertex === index + 1}
                    title="Drag to move this bend. Click × to remove it."
                    onDrag={(pointer) => {
                      const next = points.map((item, i) => (i === index + 1 ? pointer : item));
                      setWaypoints(id, connectOrtho(next).slice(1, -1));
                      setActiveVertex(index + 1);
                    }}
                    onClick={() => setActiveVertex(index + 1)}
                    onDelete={() => {
                      setWaypoints(id, removePathVertex(points, index + 1));
                      setActiveVertex(null);
                    }}
                  />
                ))
              : null}
            <div
              className="nopan nodrag pointer-events-auto absolute z-40 flex h-7 w-7 cursor-grab items-center justify-center"
              style={{
                transform: `translate(-50%, -50%) translate(${drawStart.x}px, ${drawStart.y}px)`,
              }}
              title="Drag this end to another box, along a blue bar, or onto empty canvas"
              onPointerDown={(event) => beginEndDrag("source", event)}
              onPointerMove={(event) => moveEndDrag("source", event)}
              onPointerUp={(event) => finishEndDrag("source", event)}
              onPointerCancel={(event) => finishEndDrag("source", event)}
            >
              <span
                className={[
                  "rounded-full border-2 border-white",
                  dragEnd?.end === "source"
                    ? "h-4 w-4 bg-white shadow-[0_0_0_3px_#0284c7,0_0_18px_#7dd3fc]"
                    : "h-3.5 w-3.5 bg-sky-400 shadow-[0_0_0_2px_#0369a1,0_0_10px_#38bdf8]",
                ].join(" ")}
              />
            </div>
            <div
              className="nopan nodrag pointer-events-auto absolute z-40 flex h-7 w-7 cursor-grab items-center justify-center"
              style={{
                transform: `translate(-50%, -50%) translate(${drawEnd.x}px, ${drawEnd.y}px)`,
              }}
              title="Drag this end to another box, along a blue bar, or onto empty canvas"
              onPointerDown={(event) => beginEndDrag("target", event)}
              onPointerMove={(event) => moveEndDrag("target", event)}
              onPointerUp={(event) => finishEndDrag("target", event)}
              onPointerCancel={(event) => finishEndDrag("target", event)}
            >
              <span
                className={[
                  "rounded-full border-2 border-white",
                  dragEnd?.end === "target"
                    ? "h-4 w-4 bg-white shadow-[0_0_0_3px_#0284c7,0_0_18px_#7dd3fc]"
                    : "h-3.5 w-3.5 bg-sky-400 shadow-[0_0_0_2px_#0369a1,0_0_10px_#38bdf8]",
                ].join(" ")}
              />
            </div>
          </>
        ) : null}
      </EdgeLabelRenderer>
    </>
  );
}
