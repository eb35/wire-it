import { EdgeLabelRenderer, type Edge, type EdgeProps, useReactFlow } from "@xyflow/react";
import {
  buildOrthoPath,
  labelAnchor,
  moveOrthoSegment,
  pathToD,
  repeatOnWire,
  segmentLength,
  segmentMid,
  sideFromHandle,
  wireEndCopy,
} from "../../domain";
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

function PressureHandle({
  edgeId,
  segmentIndex,
  x,
  y,
  start,
  startSide,
  end,
  endSide,
  waypoints,
}: {
  edgeId: string;
  segmentIndex: number;
  x: number;
  y: number;
  start: Point;
  startSide: ReturnType<typeof sideFromHandle>;
  end: Point;
  endSide: ReturnType<typeof sideFromHandle>;
  waypoints: Point[];
}) {
  const { screenToFlowPosition } = useReactFlow();
  const setWaypoints = useDiagramStore((state) => state.setWaypoints);

  return (
    <div
      className="nopan nodrag pointer-events-auto absolute h-2.5 w-2.5 cursor-grab rounded-full border-2 border-sky-400 bg-zinc-950"
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
        const pointer = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        setWaypoints(
          edgeId,
          moveOrthoSegment(start, startSide, waypoints, end, endSide, segmentIndex, pointer),
        );
      }}
      title="Drag to move this run. Stays at 90 degrees."
    />
  );
}

function EndLabel({
  x,
  y,
  title,
  subtitle,
}: {
  x: number;
  y: number;
  title: string;
  subtitle: string;
}) {
  return (
    <div
      className="pointer-events-none absolute whitespace-nowrap font-mono text-[10px] leading-tight text-zinc-200"
      style={{
        transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
      }}
    >
      <div className="font-semibold">{title}</div>
      <div className="text-zinc-400">{subtitle}</div>
    </div>
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
  const project = useDiagramStore((state) => state.project);
  const cable = project.cables.find((item) => item.id === id);
  const source = project.locations.find((item) => item.id === cable?.source);
  const target = project.locations.find((item) => item.id === cable?.target);

  const start = { x: sourceX, y: sourceY };
  const end = { x: targetX, y: targetY };
  const startSide = sideFromHandle(cable?.sourceHandle ?? data?.sourceHandle ?? "s-r1");
  const endSide = sideFromHandle(cable?.targetHandle ?? data?.targetHandle ?? "t-l1");
  const waypoints = data?.waypoints ?? [];
  const points = buildOrthoPath(start, startSide, waypoints, end, endSide);
  const d = pathToD(points);
  const color = resolveCableColor({
    type: data?.type ?? "12/2",
    color: data?.color ?? "sheath",
  });
  const pathId = `cable-path-${id}`;
  const sourceCopy =
    source && target && cable
      ? wireEndCopy(source.code, cable.sourcePort, target.code, cable.targetPort)
      : null;
  const targetCopy =
    source && target && cable
      ? wireEndCopy(target.code, cable.targetPort, source.code, cable.sourcePort)
      : null;
  const sourceAnchor =
    points.length >= 2 ? labelAnchor(points[0]!, points[1]!) : start;
  const targetAnchor =
    points.length >= 2
      ? labelAnchor(points[points.length - 1]!, points[points.length - 2]!)
      : end;

  return (
    <>
      <path
        d={d}
        fill="none"
        stroke={selected ? "#38bdf8" : color}
        strokeWidth={selected ? 7 : 5}
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <path id={pathId} d={d} fill="none" />
      <path
        d={d}
        fill="none"
        stroke="transparent"
        strokeWidth={18}
        className="react-flow__edge-interaction"
      />
      <text
        fill="#18181b"
        fontSize={8}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        dominantBaseline="middle"
        style={{ pointerEvents: "none" }}
      >
        <textPath href={`#${pathId}`} startOffset="12">
          {repeatOnWire(data?.type ?? "12/2", 8)}
        </textPath>
      </text>
      <EdgeLabelRenderer>
        {sourceCopy ? (
          <EndLabel
            x={sourceAnchor.x}
            y={sourceAnchor.y}
            title={sourceCopy.title}
            subtitle={sourceCopy.subtitle}
          />
        ) : null}
        {targetCopy ? (
          <EndLabel
            x={targetAnchor.x}
            y={targetAnchor.y}
            title={targetCopy.title}
            subtitle={targetCopy.subtitle}
          />
        ) : null}
        {selected
          ? points.slice(0, -1).map((point, index) => {
              const next = points[index + 1]!;
              if (segmentLength(point, next) < 28) return null;
              const mid = segmentMid(point, next);
              return (
                <PressureHandle
                  key={`${id}-seg-${index}`}
                  edgeId={id}
                  segmentIndex={index}
                  x={mid.x}
                  y={mid.y}
                  start={start}
                  startSide={startSide}
                  end={end}
                  endSide={endSide}
                  waypoints={waypoints}
                />
              );
            })
          : null}
      </EdgeLabelRenderer>
    </>
  );
}
