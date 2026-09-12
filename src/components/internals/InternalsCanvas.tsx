import { useMemo, useRef, useState, type PointerEvent } from "react";
import { resolveCableColor } from "../../domain/catalog";
import {
  jacketExits,
  laneXs,
  nutApproach,
  pathFromPoints,
  routeToHandle,
  terminalHandle,
  type DeviceRect,
  type RouteKind,
} from "../../domain/internalsRoute";
import { wireEndParts } from "../../domain/ports";
import { cablesAtLocation, conductorEndsAt, pigtailColor } from "../../domain/splices";
import { terminalsFor, type TerminalDef, type TerminalSide } from "../../domain/terminals";
import type { ConductorColor, Location, Project } from "../../domain/types";
import { useDiagramStore } from "../../store/useDiagramStore";
import {
  CONDUCTOR_HEX,
  DEVICE_H,
  DEVICE_W,
  EDITOR,
  EDITOR_BLACK,
  EDITOR_BLACK_HALO,
  JACKET_H,
  JACKET_W,
  PRINT,
  SCREW_HEX,
  VIEW_W,
  type PaperTheme,
} from "./paper";

const HIT_R = 18;

type ConductorDrag = {
  kind: "conductor";
  cableId: string;
  conductor: ConductorColor;
  landed: boolean;
  x: number;
  y: number;
  originX: number;
  originY: number;
  moved: boolean;
};

type PigtailDrag = {
  kind: "pigtail";
  pigtailId?: string;
  nutId: string;
  conductor: ConductorColor;
  x: number;
  y: number;
  originX: number;
  originY: number;
  moved: boolean;
};

type Drag = ConductorDrag | PigtailDrag;

type ScrewHit = {
  kind: "terminal";
  slotIndex: number;
  terminalId: string;
  side: TerminalSide;
  cx: number;
  cy: number;
};

type NutHit = { kind: "nut"; nutId: string; cx: number; cy: number };
type NewNutHit = { kind: "new-nut"; cx: number; cy: number };
type Hit = ScrewHit | NutHit | NewNutHit;

function screwPoint(origin: { x: number; y: number }, def: TerminalDef): { cx: number; cy: number } {
  if (def.side === "top") return { cx: origin.x + DEVICE_W / 2, cy: origin.y };
  const cy = origin.y + 36 + def.t * (DEVICE_H - 52);
  if (def.side === "left") return { cx: origin.x, cy };
  return { cx: origin.x + DEVICE_W, cy };
}

function svgCoords(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const next = pt.matrixTransform(svg.getScreenCTM()!.inverse());
  return { x: next.x, y: next.y };
}

export function InternalsCanvas({
  project,
  location,
  interactive,
  variant = "print",
}: {
  project: Project;
  location: Location;
  interactive: boolean;
  variant?: "editor" | "print";
}) {
  const theme = variant === "editor" ? EDITOR : PRINT;
  const landConductor = useDiagramStore((state) => state.landConductor);
  const addNutAndLand = useDiagramStore((state) => state.addNutAndLand);
  const addPigtail = useDiagramStore((state) => state.addPigtail);
  const removePigtail = useDiagramStore((state) => state.removePigtail);
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);

  const layout = useMemo(() => buildLayout(project, location), [project, location]);

  function tipOf(key: string, parked: { x: number; y: number }): { x: number; y: number } {
    if (drag?.kind === "conductor" && `${drag.cableId}:${drag.conductor}` === key) {
      return { x: drag.x, y: drag.y };
    }
    if (drag?.kind === "pigtail" && (drag.pigtailId ?? `new:${drag.nutId}`) === key) {
      return { x: drag.x, y: drag.y };
    }
    return parked;
  }

  function beginDrag(event: PointerEvent<SVGCircleElement>, next: Drag) {
    if (!interactive) return;
    const svg = svgRef.current;
    if (!svg) return;
    event.stopPropagation();
    svg.setPointerCapture(event.pointerId);
    setDrag(next);
  }

  function onPointerMove(event: PointerEvent<SVGSVGElement>) {
    if (!drag || !svgRef.current) return;
    const point = svgCoords(svgRef.current, event.clientX, event.clientY);
    const moved = drag.moved || Math.hypot(point.x - drag.originX, point.y - drag.originY) > 4;
    setDrag({ ...drag, x: point.x, y: point.y, moved });
  }

  function onPointerUp() {
    if (!drag) return;
    if (!drag.moved) {
      if (drag.kind === "conductor" && drag.landed) {
        landConductor(location.id, drag.cableId, drag.conductor, null);
      } else if (drag.kind === "pigtail" && drag.pigtailId) {
        removePigtail(drag.pigtailId);
      }
      setDrag(null);
      return;
    }
    const hit = hitTest(layout.hits, drag.x, drag.y);
    if (drag.kind === "conductor") {
      if (hit?.kind === "new-nut") {
        addNutAndLand(location.id, drag.cableId, drag.conductor);
      } else if (hit?.kind === "nut") {
        landConductor(location.id, drag.cableId, drag.conductor, { kind: "nut", nutId: hit.nutId });
      } else if (hit?.kind === "terminal") {
        landConductor(location.id, drag.cableId, drag.conductor, {
          kind: "terminal",
          slotIndex: hit.slotIndex,
          terminalId: hit.terminalId,
        });
      } else {
        landConductor(location.id, drag.cableId, drag.conductor, null);
      }
    } else if (hit?.kind === "terminal") {
      if (drag.pigtailId) removePigtail(drag.pigtailId);
      addPigtail(location.id, drag.nutId, drag.conductor, {
        kind: "terminal",
        slotIndex: hit.slotIndex,
        terminalId: hit.terminalId,
      });
    } else if (drag.pigtailId) {
      removePigtail(drag.pigtailId);
    }
    setDrag(null);
  }

  const height = layout.height;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEW_W} ${height}`}
      width="100%"
      className="block max-w-full"
      style={{ background: theme.paper, touchAction: "none" }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {layout.jackets.map((jacket) => (
        <g key={jacket.cable.id}>
          <rect
            x={jacket.x}
            y={jacket.y}
            width={JACKET_W}
            height={JACKET_H}
            rx={4}
            fill={jacket.color}
            stroke={PRINT.ink}
            strokeWidth="1.25"
          />
          <text
            x={jacket.x + JACKET_W / 2}
            y={jacket.y + 16}
            textAnchor="middle"
            fontSize="11"
            fontWeight="650"
            fill={PRINT.ink}
          >
            {jacket.title}
          </text>
          <text
            x={jacket.x + JACKET_W / 2}
            y={jacket.y + 30}
            textAnchor="middle"
            fontSize="10"
            fill={PRINT.ink}
          >
            {jacket.subtitle}
          </text>
        </g>
      ))}

      {layout.runs.map((run) => {
        const tip = tipOf(run.key, run.handle);
        const dest = drag && run.key === dragKey(drag) ? tip : run.handle;
        const d = pathFromPoints(routeToHandle(run.exit, dest, run.laneX, run.routeKind, run.device));
        return (
          <WireStroke key={run.key} d={d} conductor={run.conductor} theme={theme} variant={variant} />
        );
      })}

      {interactive
        ? layout.spares.map((spare) => {
            const key = `new:${spare.nutId}`;
            const dragging = drag?.kind === "pigtail" && !drag.pigtailId && drag.nutId === spare.nutId;
            if (!dragging) return null;
            const tip = tipOf(key, spare.handle);
            return (
              <WireStroke
                key={key}
                d={pathFromPoints(routeToHandle(spare.exit, tip, spare.laneX, "nut"))}
                conductor={spare.conductor}
                theme={theme}
                variant={variant}
              />
            );
          })
        : null}

      {layout.devices.map((device) => (
        <DeviceBody key={device.slotIndex} device={device} theme={theme} />
      ))}

      {layout.nuts.map((nut) => (
        <g key={nut.nutId}>
          <circle cx={nut.cx} cy={nut.cy} r={16} fill={theme.fill} stroke={theme.ink} strokeWidth="1.5" />
          <text
            x={nut.cx}
            y={nut.cy + 4}
            textAnchor="middle"
            fontSize="11"
            fontWeight="650"
            fill={theme.ink}
          >
            {nut.label}
          </text>
        </g>
      ))}

      {interactive ? (
        <g>
          <circle
            cx={layout.newNut.cx}
            cy={layout.newNut.cy}
            r={18}
            fill="none"
            stroke={theme.stroke}
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <text
            x={layout.newNut.cx}
            y={layout.newNut.cy + 4}
            textAnchor="middle"
            fontSize="10"
            fill={theme.faint}
          >
            new nut
          </text>
        </g>
      ) : null}

      {layout.runs.map((run) => {
        const tip = tipOf(run.key, run.handle);
        return (
          <Tip
            key={run.key}
            x={tip.x}
            y={tip.y}
            conductor={run.conductor}
            theme={theme}
            variant={variant}
            interactive={interactive}
            onPointerDown={(event) => {
              const point = svgRef.current
                ? svgCoords(svgRef.current, event.clientX, event.clientY)
                : tip;
              if (run.kind === "pigtail") {
                beginDrag(event, {
                  kind: "pigtail",
                  pigtailId: run.pigtailId,
                  nutId: run.nutId,
                  conductor: run.conductor,
                  x: point.x,
                  y: point.y,
                  originX: point.x,
                  originY: point.y,
                  moved: false,
                });
                return;
              }
              beginDrag(event, {
                kind: "conductor",
                cableId: run.cableId,
                conductor: run.conductor,
                landed: run.landed,
                x: point.x,
                y: point.y,
                originX: point.x,
                originY: point.y,
                moved: false,
              });
            }}
          />
        );
      })}

      {interactive
        ? layout.spares.map((spare) => {
            const key = `new:${spare.nutId}`;
            const tip = tipOf(key, spare.handle);
            const dragging = drag?.kind === "pigtail" && !drag.pigtailId && drag.nutId === spare.nutId;
            return (
              <Tip
                key={key}
                x={tip.x}
                y={tip.y}
                conductor={spare.conductor}
                theme={theme}
                variant={variant}
                interactive
                spare={!dragging}
                onPointerDown={(event) => {
                  const point = svgRef.current
                    ? svgCoords(svgRef.current, event.clientX, event.clientY)
                    : tip;
                  beginDrag(event, {
                    kind: "pigtail",
                    nutId: spare.nutId,
                    conductor: spare.conductor,
                    x: point.x,
                    y: point.y,
                    originX: point.x,
                    originY: point.y,
                    moved: false,
                  });
                }}
              />
            );
          })
        : null}

      {layout.jackets.length === 0 ? (
        <text x={VIEW_W / 2} y={height / 2} textAnchor="middle" fontSize="13" fill={theme.muted}>
          No cables land on this box yet.
        </text>
      ) : null}
    </svg>
  );
}

function dragKey(drag: Drag): string {
  if (drag.kind === "conductor") return `${drag.cableId}:${drag.conductor}`;
  return drag.pigtailId ?? `new:${drag.nutId}`;
}

function WireStroke({
  d,
  conductor,
  theme,
  variant,
}: {
  d: string;
  conductor: ConductorColor;
  theme: PaperTheme;
  variant: "editor" | "print";
}) {
  const white = conductor === "white";
  const blackOnDark = conductor === "black" && variant === "editor";
  return (
    <>
      {white || blackOnDark ? (
        <path
          d={d}
          fill="none"
          stroke={white ? theme.stroke : EDITOR_BLACK_HALO}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      <path
        d={d}
        fill="none"
        stroke={blackOnDark ? EDITOR_BLACK : CONDUCTOR_HEX[conductor]}
        strokeWidth={white ? 3.5 : 4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  );
}

function Tip({
  x,
  y,
  conductor,
  theme,
  variant,
  interactive,
  spare = false,
  onPointerDown,
}: {
  x: number;
  y: number;
  conductor: ConductorColor;
  theme: PaperTheme;
  variant: "editor" | "print";
  interactive: boolean;
  spare?: boolean;
  onPointerDown: (event: PointerEvent<SVGCircleElement>) => void;
}) {
  const fill =
    conductor === "black" && variant === "editor" ? EDITOR_BLACK : CONDUCTOR_HEX[conductor];
  const stroke =
    spare ? theme.muted : conductor === "black" && variant === "editor" ? EDITOR_BLACK_HALO : theme.ink;
  return (
    <circle
      cx={x}
      cy={y}
      r={7}
      fill={spare ? theme.paper : fill}
      stroke={stroke}
      strokeWidth="1.2"
      strokeDasharray={spare ? "3 2" : undefined}
      style={{ cursor: interactive ? "grab" : "default" }}
      onPointerDown={onPointerDown}
    />
  );
}

function DeviceBody({
  device,
  theme,
}: {
  theme: PaperTheme;
  device: {
    slotIndex: number;
    kind: Location["slots"][0]["device"];
    x: number;
    y: number;
    empty: boolean;
  };
}) {
  const terminals = terminalsFor(device.kind);
  if (device.empty) {
    return (
      <g>
        <rect
          x={device.x}
          y={device.y}
          width={DEVICE_W}
          height={DEVICE_H}
          rx={6}
          fill="none"
          stroke={theme.stroke}
          strokeDasharray="5 4"
        />
        <text
          x={device.x + DEVICE_W / 2}
          y={device.y + DEVICE_H / 2}
          textAnchor="middle"
          fontSize="12"
          fill={theme.faint}
        >
          empty
        </text>
      </g>
    );
  }

  return (
    <g>
      <rect
        x={device.x}
        y={device.y}
        width={DEVICE_W}
        height={DEVICE_H}
        rx={6}
        fill={theme.fill}
        stroke={theme.ink}
        strokeWidth="1.6"
      />
      <Face kind={device.kind} x={device.x} y={device.y} theme={theme} />
      {terminals.map((terminal) => {
        const point = screwPoint({ x: device.x, y: device.y }, terminal);
        return (
          <g key={terminal.id}>
            <circle
              cx={point.cx}
              cy={point.cy}
              r={7}
              fill={SCREW_HEX[terminal.fill]}
              stroke={theme.ink}
              strokeWidth="1.2"
            />
            <line
              x1={point.cx - 4}
              y1={point.cy}
              x2={point.cx + 4}
              y2={point.cy}
              stroke={theme.ink}
              strokeWidth="1"
            />
            {terminal.side !== "top" ? (
              <text
                x={terminal.side === "left" ? point.cx - 12 : point.cx + 12}
                y={point.cy - 10}
                textAnchor={terminal.side === "left" ? "end" : "start"}
                fontSize="9"
                fill={theme.muted}
              >
                {terminal.label}
              </text>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

function Face({
  kind,
  x,
  y,
  theme,
}: {
  kind: Location["slots"][0]["device"];
  x: number;
  y: number;
  theme: PaperTheme;
}) {
  const cx = x + DEVICE_W / 2;
  const cy = y + DEVICE_H / 2;
  if (kind === "duplex-15" || kind === "duplex-20" || kind === "gfci-15" || kind === "gfci-20") {
    return (
      <g>
        <circle cx={cx} cy={cy - 28} r={14} fill="none" stroke={theme.ink} strokeWidth="2" />
        <circle cx={cx} cy={cy + 28} r={14} fill="none" stroke={theme.ink} strokeWidth="2" />
        {kind.startsWith("gfci") ? (
          <text x={cx} y={y + 28} textAnchor="middle" fontSize="11" fill={theme.muted}>
            GFCI
          </text>
        ) : null}
      </g>
    );
  }
  if (kind === "single-outlet") {
    return <circle cx={cx} cy={cy} r={16} fill="none" stroke={theme.ink} strokeWidth="2" />;
  }
  if (kind === "light") {
    return (
      <g>
        <circle cx={cx} cy={cy} r={26} fill="none" stroke="#c4853a" strokeWidth="2" />
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize="18" fill="#c4853a">
          ×
        </text>
      </g>
    );
  }
  return (
    <rect
      x={cx - 10}
      y={cy - 44}
      width={20}
      height={88}
      rx={4}
      fill={theme.paper}
      stroke={theme.ink}
      strokeWidth="1.6"
    />
  );
}

function hitTest(hits: Hit[], x: number, y: number): Hit | null {
  let best: Hit | null = null;
  let bestDist = HIT_R;
  for (const hit of hits) {
    const dist = Math.hypot(hit.cx - x, hit.cy - y);
    if (dist <= bestDist) {
      best = hit;
      bestDist = dist;
    }
  }
  return best;
}

type Run = {
  key: string;
  kind: "conductor" | "pigtail";
  cableId: string;
  pigtailId?: string;
  nutId: string;
  conductor: ConductorColor;
  landed: boolean;
  exit: { x: number; y: number };
  handle: { x: number; y: number };
  laneX: number;
  routeKind: RouteKind;
  device?: DeviceRect;
};

function buildLayout(project: Project, location: Location) {
  const jackets = cablesAtLocation(project, location.id).map((end, index) => {
    const other = project.locations.find((item) => item.id === end.otherId);
    const parts = wireEndParts(location.code, end.localPort, other?.code, end.otherPort);
    return {
      cable: end.cable,
      x: 24,
      y: 56 + index * 88,
      color: resolveCableColor(end.cable),
      title: `${parts.local}  ${end.cable.type}`,
      subtitle: parts.rest,
    };
  });

  const devices = (location.kind === "box" ? location.slots : []).map((slot, slotIndex) => ({
    slotIndex,
    kind: slot.device,
    x: 380 + slotIndex * 148,
    y: 64,
    empty: slot.device === "empty",
  }));

  const nutY = Math.max(
    340,
    jackets.length > 0 ? jackets[jackets.length - 1]!.y + JACKET_H + 56 : 340,
  );

  const nuts = project.nuts
    .filter((item) => item.locationId === location.id)
    .map((nut, index) => ({
      nutId: nut.id,
      label: nut.label,
      cx: 380 + index * 72,
      cy: nutY,
    }));

  const newNut = { cx: 380 + nuts.length * 72, cy: nutY };

  const screws: ScrewHit[] = [];
  for (const device of devices) {
    for (const terminal of terminalsFor(device.kind)) {
      const point = screwPoint({ x: device.x, y: device.y }, terminal);
      screws.push({
        kind: "terminal",
        slotIndex: device.slotIndex,
        terminalId: terminal.id,
        side: terminal.side,
        ...point,
      });
    }
  }

  const nutHits: NutHit[] = nuts.map((nut) => ({ kind: "nut", nutId: nut.nutId, cx: nut.cx, cy: nut.cy }));
  const hits: Hit[] = [...screws, ...nutHits, { kind: "new-nut", ...newNut }];

  const members = new Map<string, string[]>();
  for (const nut of nuts) members.set(nut.nutId, []);

  const ends = conductorEndsAt(project, location.id);
  for (const end of ends) {
    if (end.splice?.target.kind === "nut") {
      const list = members.get(end.splice.target.nutId) ?? [];
      list.push(`${end.cableId}:${end.conductor}`);
      members.set(end.splice.target.nutId, list);
    }
  }

  const pigtails = (project.pigtails ?? []).filter((item) => item.locationId === location.id);
  const incomingCount = jackets.reduce((sum, jacket) => {
    return sum + ends.filter((end) => end.cableId === jacket.cable.id).length;
  }, 0);
  const gutterEnd = (devices[0]?.x ?? 380) - 28;
  const lanes = laneXs(incomingCount + pigtails.length + Math.max(nuts.length, 1), 148, gutterEnd);
  let laneIndex = 0;

  function deviceRect(slotIndex: number): DeviceRect | undefined {
    const device = devices.find((item) => item.slotIndex === slotIndex);
    return device ? { x: device.x, y: device.y, width: DEVICE_W, height: DEVICE_H } : undefined;
  }

  const runs: Run[] = [];

  for (const jacket of jackets) {
    const colors = ends.filter((end) => end.cableId === jacket.cable.id);
    const exits = jacketExits(
      { x: jacket.x, y: jacket.y, width: JACKET_W, height: JACKET_H },
      colors.length,
    );
    colors.forEach((end, index) => {
      const exit = exits[index] ?? { x: jacket.x + JACKET_W, y: jacket.y + JACKET_H / 2 };
      const laneX = lanes[laneIndex] ?? 148;
      laneIndex += 1;
      const key = `${end.cableId}:${end.conductor}`;
      if (!end.splice) {
        runs.push({
          key,
          kind: "conductor",
          cableId: end.cableId,
          nutId: "",
          conductor: end.conductor,
          landed: false,
          exit,
          handle: { x: exit.x + 52, y: exit.y },
          laneX,
          routeKind: "stub",
        });
        return;
      }
      if (end.splice.target.kind === "terminal") {
        const target = end.splice.target;
        const screw = screws.find(
          (item) => item.slotIndex === target.slotIndex && item.terminalId === target.terminalId,
        );
        const handle = screw
          ? terminalHandle({ x: screw.cx, y: screw.cy }, screw.side)
          : { x: exit.x + 52, y: exit.y };
        runs.push({
          key,
          kind: "conductor",
          cableId: end.cableId,
          nutId: "",
          conductor: end.conductor,
          landed: true,
          exit,
          handle,
          laneX,
          routeKind: screw?.side ?? "left",
          device: deviceRect(target.slotIndex),
        });
        return;
      }
      const nutId = end.splice.target.nutId;
      const nut = nuts.find((item) => item.nutId === nutId);
      const group = members.get(nutId) ?? [];
      const handle = nut
        ? nutApproach({ x: nut.cx, y: nut.cy }, group.indexOf(key), group.length)
        : { x: exit.x + 52, y: exit.y };
      runs.push({
        key,
        kind: "conductor",
        cableId: end.cableId,
        nutId,
        conductor: end.conductor,
        landed: true,
        exit,
        handle,
        laneX,
        routeKind: "nut",
        device: devices[0] ? { x: devices[0].x, y: devices[0].y, width: DEVICE_W, height: DEVICE_H } : undefined,
      });
    });
  }

  for (const pigtail of pigtails) {
    const nut = nuts.find((item) => item.nutId === pigtail.nutId);
    const screw = screws.find(
      (item) =>
        item.slotIndex === pigtail.target.slotIndex && item.terminalId === pigtail.target.terminalId,
    );
    const laneX = lanes[laneIndex] ?? 148;
    laneIndex += 1;
    const exit = nut ? { x: nut.cx, y: nut.cy - 16 } : { x: 200, y: nutY };
    const handle = screw
      ? terminalHandle({ x: screw.cx, y: screw.cy }, screw.side)
      : { x: exit.x, y: exit.y - 40 };
    runs.push({
      key: pigtail.id,
      kind: "pigtail",
      cableId: "",
      pigtailId: pigtail.id,
      nutId: pigtail.nutId,
      conductor: pigtail.conductor,
      landed: true,
      exit,
      handle,
      laneX,
      routeKind: screw?.side ?? "top",
      device: deviceRect(pigtail.target.slotIndex),
    });
  }

  const spares = nuts.map((nut, index) => {
    const laneX = lanes[incomingCount + pigtails.length + index] ?? 148;
    const handle = { x: nut.cx + 26, y: nut.cy - 26 };
    return {
      nutId: nut.nutId,
      conductor: pigtailColor(project, nut.nutId),
      exit: { x: nut.cx, y: nut.cy - 16 },
      handle,
      laneX,
    };
  });

  const height = Math.max(420, nutY + 72);
  return { jackets, devices, nuts, newNut, hits, runs, spares, height };
}
