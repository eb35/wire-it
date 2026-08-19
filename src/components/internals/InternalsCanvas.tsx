import { useMemo, useRef, useState, type PointerEvent } from "react";
import { resolveCableColor } from "../../domain/catalog";
import { wireEndParts } from "../../domain/ports";
import { cablesAtLocation, conductorEndsAt } from "../../domain/splices";
import { terminalsFor, type TerminalDef } from "../../domain/terminals";
import type { ConductorColor, Location, Project } from "../../domain/types";
import { useDiagramStore } from "../../store/useDiagramStore";
import {
  CONDUCTOR_HEX,
  DEVICE_H,
  DEVICE_W,
  FAINT,
  FILL,
  INK,
  JACKET_H,
  JACKET_W,
  MUTED,
  PAPER,
  SCREW_HEX,
  STROKE,
  VIEW_W,
} from "./paper";

const HIT_R = 18;

type Drag = {
  cableId: string;
  conductor: ConductorColor;
  x: number;
  y: number;
  originX: number;
  originY: number;
  moved: boolean;
};

type ScrewHit = {
  kind: "terminal";
  slotIndex: number;
  terminalId: string;
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
}: {
  project: Project;
  location: Location;
  interactive: boolean;
}) {
  const landConductor = useDiagramStore((state) => state.landConductor);
  const addNutAndLand = useDiagramStore((state) => state.addNutAndLand);
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);

  const layout = useMemo(() => buildLayout(project, location), [project, location]);

  function tipOf(cableId: string, conductor: ConductorColor): { x: number; y: number } {
    if (drag && drag.cableId === cableId && drag.conductor === conductor) {
      return { x: drag.x, y: drag.y };
    }
    return layout.tips[`${cableId}:${conductor}`] ?? { x: 0, y: 0 };
  }

  function onPointerDown(
    event: PointerEvent<SVGCircleElement>,
    cableId: string,
    conductor: ConductorColor,
  ) {
    if (!interactive) return;
    const svg = svgRef.current;
    if (!svg) return;
    event.stopPropagation();
    svg.setPointerCapture(event.pointerId);
    const point = svgCoords(svg, event.clientX, event.clientY);
    setDrag({
      cableId,
      conductor,
      x: point.x,
      y: point.y,
      originX: point.x,
      originY: point.y,
      moved: false,
    });
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
      setDrag(null);
      return;
    }
    const hit = hitTest(layout.hits, drag.x, drag.y);
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
    setDrag(null);
  }

  const height = layout.height;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEW_W} ${height}`}
      width="100%"
      className="block max-w-full"
      style={{ background: PAPER, touchAction: "none" }}
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
            stroke={INK}
            strokeWidth="1.25"
          />
          <text
            x={jacket.x + JACKET_W / 2}
            y={jacket.y + 16}
            textAnchor="middle"
            fontSize="11"
            fontWeight="650"
            fill={INK}
          >
            {jacket.title}
          </text>
          <text
            x={jacket.x + JACKET_W / 2}
            y={jacket.y + 30}
            textAnchor="middle"
            fontSize="10"
            fill={INK}
          >
            {jacket.subtitle}
          </text>
        </g>
      ))}

      {layout.exits.map((exit) => {
        const tip = tipOf(exit.cableId, exit.conductor);
        const white = exit.conductor === "white";
        return (
          <g key={`${exit.cableId}:${exit.conductor}`}>
            {white ? (
              <path
                d={`M ${exit.x} ${exit.y} H ${(exit.x + tip.x) / 2} V ${tip.y} H ${tip.x}`}
                fill="none"
                stroke={STROKE}
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
            <path
              d={`M ${exit.x} ${exit.y} H ${(exit.x + tip.x) / 2} V ${tip.y} H ${tip.x}`}
              fill="none"
              stroke={CONDUCTOR_HEX[exit.conductor]}
              strokeWidth={white ? 3.5 : 4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle
              cx={tip.x}
              cy={tip.y}
              r={7}
              fill={CONDUCTOR_HEX[exit.conductor]}
              stroke={INK}
              strokeWidth="1.2"
              style={{ cursor: interactive ? "grab" : "default" }}
              onPointerDown={(event) => onPointerDown(event, exit.cableId, exit.conductor)}
            />
          </g>
        );
      })}

      {layout.devices.map((device) => (
        <DeviceBody key={device.slotIndex} device={device} />
      ))}

      {layout.nuts.map((nut) => (
        <g key={nut.nutId}>
          <circle cx={nut.cx} cy={nut.cy} r={16} fill={FILL} stroke={INK} strokeWidth="1.5" />
          <text
            x={nut.cx}
            y={nut.cy + 4}
            textAnchor="middle"
            fontSize="11"
            fontWeight="650"
            fill={INK}
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
            stroke={STROKE}
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <text
            x={layout.newNut.cx}
            y={layout.newNut.cy + 4}
            textAnchor="middle"
            fontSize="10"
            fill={FAINT}
          >
            new nut
          </text>
        </g>
      ) : null}

      {layout.jackets.length === 0 ? (
        <text x={VIEW_W / 2} y={height / 2} textAnchor="middle" fontSize="13" fill={MUTED}>
          No cables land on this box yet.
        </text>
      ) : null}
    </svg>
  );
}

function DeviceBody({
  device,
}: {
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
          stroke={STROKE}
          strokeDasharray="5 4"
        />
        <text
          x={device.x + DEVICE_W / 2}
          y={device.y + DEVICE_H / 2}
          textAnchor="middle"
          fontSize="12"
          fill={FAINT}
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
        fill={FILL}
        stroke={INK}
        strokeWidth="1.6"
      />
      <Face kind={device.kind} x={device.x} y={device.y} />
      {terminals.map((terminal) => {
        const point = screwPoint({ x: device.x, y: device.y }, terminal);
        return (
          <g key={terminal.id}>
            <circle
              cx={point.cx}
              cy={point.cy}
              r={7}
              fill={SCREW_HEX[terminal.fill]}
              stroke={INK}
              strokeWidth="1.2"
            />
            <line
              x1={point.cx - 4}
              y1={point.cy}
              x2={point.cx + 4}
              y2={point.cy}
              stroke={INK}
              strokeWidth="1"
            />
            {terminal.side !== "top" ? (
              <text
                x={terminal.side === "left" ? point.cx - 12 : point.cx + 12}
                y={point.cy - 10}
                textAnchor={terminal.side === "left" ? "end" : "start"}
                fontSize="9"
                fill={MUTED}
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

function Face({ kind, x, y }: { kind: Location["slots"][0]["device"]; x: number; y: number }) {
  const cx = x + DEVICE_W / 2;
  const cy = y + DEVICE_H / 2;
  if (kind === "duplex-15" || kind === "duplex-20" || kind === "gfci-15" || kind === "gfci-20") {
    return (
      <g>
        <circle cx={cx} cy={cy - 28} r={14} fill="none" stroke={INK} strokeWidth="2" />
        <circle cx={cx} cy={cy + 28} r={14} fill="none" stroke={INK} strokeWidth="2" />
        {kind.startsWith("gfci") ? (
          <text x={cx} y={y + 28} textAnchor="middle" fontSize="11" fill={MUTED}>
            GFCI
          </text>
        ) : null}
      </g>
    );
  }
  if (kind === "single-outlet") {
    return <circle cx={cx} cy={cy} r={16} fill="none" stroke={INK} strokeWidth="2" />;
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
      fill={PAPER}
      stroke={INK}
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
        ...point,
      });
    }
  }

  const nutHits: NutHit[] = nuts.map((nut) => ({ kind: "nut", nutId: nut.nutId, cx: nut.cx, cy: nut.cy }));
  const hits: Hit[] = [...screws, ...nutHits, { kind: "new-nut", ...newNut }];

  const tips: Record<string, { x: number; y: number }> = {};
  const exits: { cableId: string; conductor: ConductorColor; x: number; y: number }[] = [];
  const members = new Map<string, string[]>();

  for (const nut of nuts) {
    members.set(nut.nutId, []);
  }

  const ends = conductorEndsAt(project, location.id);
  for (const end of ends) {
    if (end.splice?.target.kind === "nut") {
      const list = members.get(end.splice.target.nutId) ?? [];
      list.push(`${end.cableId}:${end.conductor}`);
      members.set(end.splice.target.nutId, list);
    }
  }

  for (const jacket of jackets) {
    const colors = conductorEndsAt(project, location.id).filter((end) => end.cableId === jacket.cable.id);
    colors.forEach((end, index) => {
      const x = jacket.x + JACKET_W;
      const y = jacket.y + 10 + index * 8;
      exits.push({ cableId: end.cableId, conductor: end.conductor, x, y });
      const key = `${end.cableId}:${end.conductor}`;
      if (!end.splice) {
        tips[key] = { x: x + 52, y };
        return;
      }
      if (end.splice.target.kind === "terminal") {
        const target = end.splice.target;
        const screw = screws.find(
          (item) => item.slotIndex === target.slotIndex && item.terminalId === target.terminalId,
        );
        tips[key] = screw ? { x: screw.cx, y: screw.cy } : { x: x + 52, y };
        return;
      }
      const nutId = end.splice.target.nutId;
      const nut = nuts.find((item) => item.nutId === nutId);
      const group = members.get(nutId) ?? [];
      const memberIndex = group.indexOf(key);
      const angle = (memberIndex / Math.max(group.length, 1)) * Math.PI * 2 - Math.PI / 2;
      tips[key] = nut
        ? { x: nut.cx + Math.cos(angle) * 22, y: nut.cy + Math.sin(angle) * 22 }
        : { x: x + 52, y };
    });
  }

  const height = Math.max(420, nutY + 72);
  return { jackets, devices, nuts, newNut, hits, tips, exits, height };
}
