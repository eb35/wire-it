import { deviceShort, resolveCableColor } from "./catalog";
import { cableLane, landingPoint, sideFromHandle } from "./handles";
import { cableOnWireText, labelPlacement, markOffsets } from "./label";
import { BOX_HEADER, EXTERNAL_SIZE, PANEL_HEADER, PANEL_ROW, PANEL_WIDTH, boxSize, panelSize } from "./layout";
import { pathLength, pathToRoundedD } from "./ortho";
import { isDanglingCable, wireEndParts } from "./ports";
import { buildCablePath, CORNER_RADIUS, LABEL_RUN, locationRect } from "./route";
import type { DeviceType, Location, Project } from "./types";

export type ExportTheme = "dark" | "light";

const NOTE_W = 200;
const NOTE_H = 110;
const PAD = 64;
const MIN_PNG_EDGE = 2400;
const MAX_PNG_EDGE = 8192;

type Theme = {
  bg: string;
  ink: string;
  muted: string;
  faint: string;
  boxFill: string;
  boxStroke: string;
  panelStroke: string;
  headerRule: string;
  codeBg: string;
  codeInk: string;
  deviceFill: string;
  deviceStroke: string;
  emptyStroke: string;
  noteFill: string;
  noteInk: string;
  cableHalo: string;
  externalStroke: string;
  looseFill: string;
};

const THEMES: Record<ExportTheme, Theme> = {
  dark: {
    bg: "#09090b",
    ink: "#f4f4f5",
    muted: "#d4d4d8",
    faint: "#a1a1aa",
    boxFill: "#27272a",
    boxStroke: "#71717a",
    panelStroke: "#a1a1aa",
    headerRule: "#52525b",
    codeBg: "#09090b",
    codeInk: "#e4e4e7",
    deviceFill: "#18181b",
    deviceStroke: "#52525b",
    emptyStroke: "#52525b",
    noteFill: "#E4B84A",
    noteInk: "#18181b",
    cableHalo: "#09090b",
    externalStroke: "#d97706",
    looseFill: "#09090b",
  },
  light: {
    bg: "#fafafa",
    ink: "#18181b",
    muted: "#3f3f46",
    faint: "#52525b",
    boxFill: "#e4e4e7",
    boxStroke: "#71717a",
    panelStroke: "#52525b",
    headerRule: "#a1a1aa",
    codeBg: "#27272a",
    codeInk: "#fafafa",
    deviceFill: "#ffffff",
    deviceStroke: "#a1a1aa",
    emptyStroke: "#a1a1aa",
    noteFill: "#E4B84A",
    noteInk: "#18181b",
    cableHalo: "#fafafa",
    externalStroke: "#b45309",
    looseFill: "#ffffff",
  },
};

const SANS = "ui-sans-serif, system-ui, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

type RoutedCable = {
  id: string;
  d: string;
  color: string;
  mark: string;
  offsets: number[];
  points: { x: number; y: number }[];
  sourceParts: { local: string; rest: string } | null;
  targetParts: { local: string; rest: string } | null;
  dangling: boolean;
  looseEnd?: { x: number; y: number };
};

export function projectExportBounds(project: Project): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let any = false;

  const include = (x: number, y: number, w = 0, h = 0) => {
    any = true;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  };

  for (const location of project.locations) {
    const rect = locationRect(location);
    include(rect.x, rect.y, rect.width, rect.height);
  }
  for (const note of project.notes) {
    include(note.position.x, note.position.y, NOTE_W, NOTE_H);
  }
  for (const routed of routeProjectCables(project)) {
    for (const point of routed.points) include(point.x, point.y);
    if (routed.looseEnd) include(routed.looseEnd.x - 6, routed.looseEnd.y - 6, 12, 12);
  }

  if (!any) {
    throw new Error("Nothing to export yet.");
  }

  return {
    x: minX - PAD,
    y: minY - PAD,
    width: Math.max(1, maxX - minX + PAD * 2),
    height: Math.max(1, maxY - minY + PAD * 2),
  };
}

export function rasterScale(width: number, height: number): number {
  const longest = Math.max(width, height, 1);
  return Math.min(Math.max(2, MIN_PNG_EDGE / longest), MAX_PNG_EDGE / longest);
}

export function renderProjectSvg(project: Project, themeName: ExportTheme): string {
  const theme = THEMES[themeName];
  const bounds = projectExportBounds(project);
  const cables = routeProjectCables(project);
  const parts = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(bounds.width)}" height="${fmt(bounds.height)}" viewBox="${fmt(bounds.x)} ${fmt(bounds.y)} ${fmt(bounds.width)} ${fmt(bounds.height)}" role="img" aria-label="${esc(project.name)}">`,
    `<title>${esc(project.name)}</title>`,
    `<rect x="${fmt(bounds.x)}" y="${fmt(bounds.y)}" width="${fmt(bounds.width)}" height="${fmt(bounds.height)}" fill="${theme.bg}"/>`,
    ...cables.map((cable) => renderCable(cable, theme)),
    ...project.locations.map((location) => renderLocation(location, theme)),
    ...project.notes.map((note) => renderNote(note.text, note.position.x, note.position.y, theme)),
    `</svg>`,
  ];
  return parts.join("\n");
}

function routeProjectCables(project: Project): RoutedCable[] {
  const routed: RoutedCable[] = [];
  for (const cable of project.cables) {
    const source = project.locations.find((location) => location.id === cable.source);
    if (!source) continue;
    const dangling = isDanglingCable(cable);
    const target = dangling ? undefined : project.locations.find((location) => location.id === cable.target);
    if (!dangling && !target) continue;

    const start = landingPoint(source, cable.sourceHandle);
    const startSide = sideFromHandle(cable.sourceHandle);
    const end = dangling ? (cable.looseEnd ?? { x: 0, y: 0 }) : landingPoint(target!, cable.targetHandle);
    const endSide = sideFromHandle(cable.targetHandle);
    const obstacles = project.locations
      .filter((location) => location.id !== source.id && location.id !== target?.id)
      .map(locationRect);
    const points = buildCablePath(
      start,
      startSide,
      cable.waypoints,
      end,
      endSide,
      obstacles,
      cableLane(project.cables, cable),
      locationRect(source),
      target ? locationRect(target) : undefined,
    );
    const mark = cableOnWireText(cable);
    routed.push({
      id: cable.id,
      d: pathToRoundedD(points, CORNER_RADIUS),
      color: resolveCableColor(cable),
      mark,
      offsets: markOffsets(mark, pathLength(points), 11, LABEL_RUN),
      points,
      sourceParts: dangling
        ? wireEndParts(source.code, cable.sourcePort)
        : target
          ? wireEndParts(source.code, cable.sourcePort, target.code, cable.targetPort)
          : null,
      targetParts:
        source && target && !dangling
          ? wireEndParts(target.code, cable.targetPort, source.code, cable.sourcePort)
          : null,
      dangling,
      looseEnd: dangling ? end : undefined,
    });
  }
  return routed;
}

function renderCable(cable: RoutedCable, theme: Theme): string {
  const pathId = `cable-${safeId(cable.id)}`;
  const sourceAnchor =
    cable.sourceParts && cable.points.length >= 2
      ? labelPlacement(cable.points[0]!, cable.points[1]!)
      : null;
  const targetAnchor =
    cable.targetParts && cable.points.length >= 2
      ? labelPlacement(cable.points[cable.points.length - 1]!, cable.points[cable.points.length - 2]!)
      : null;
  const marks = cable.offsets
    .map((offset) => `<textPath href="#${pathId}" startOffset="${fmt(offset)}">${esc(cable.mark)}</textPath>`)
    .join("");
  const loose = cable.looseEnd
    ? `<circle cx="${fmt(cable.looseEnd.x)}" cy="${fmt(cable.looseEnd.y)}" r="5" fill="${theme.looseFill}" stroke="${theme.faint}" stroke-width="2"/>`
    : "";
  return [
    `<g data-cable="${esc(cable.id)}">`,
    `<path id="${pathId}" d="${esc(cable.d)}" fill="none" stroke="${cable.color}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`,
    marks
      ? `<text fill="${theme.ink}" stroke="${theme.cableHalo}" stroke-width="3" paint-order="stroke" font-size="11" font-family="${MONO}" dominant-baseline="middle">${marks}</text>`
      : "",
    sourceAnchor && cable.sourceParts
      ? endLabel(sourceAnchor.point.x, sourceAnchor.point.y, sourceAnchor.angle, cable.sourceParts, theme)
      : "",
    targetAnchor && cable.targetParts
      ? endLabel(targetAnchor.point.x, targetAnchor.point.y, targetAnchor.angle, cable.targetParts, theme)
      : "",
    loose,
    `</g>`,
  ]
    .filter(Boolean)
    .join("\n");
}

function endLabel(
  x: number,
  y: number,
  angle: number,
  parts: { local: string; rest: string },
  theme: Theme,
): string {
  return `<text x="${fmt(x)}" y="${fmt(y)}" fill="${theme.ink}" font-size="10" font-family="${MONO}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${fmt(angle)} ${fmt(x)} ${fmt(y)})"><tspan font-weight="700">${esc(parts.local)}</tspan><tspan fill="${theme.muted}"> ${esc(parts.rest)}</tspan></text>`;
}

function renderLocation(location: Location, theme: Theme): string {
  if (location.kind === "panel") return renderPanel(location, theme);
  if (location.kind === "external") return renderExternal(location, theme);
  return renderBox(location, theme);
}

function renderBox(location: Location, theme: Theme): string {
  const size = boxSize(location.capacity);
  const { x, y } = location.position;
  const pad = 4;
  const gap = 4;
  const innerW = size.width - pad * 2;
  const innerH = size.height - BOX_HEADER - pad * 2;
  const slots = location.slots;
  const slotW = slots.length ? (innerW - gap * (slots.length - 1)) / slots.length : innerW;
  const devices = slots
    .map((slot, index) =>
      renderDevice(slot.device, x + pad + index * (slotW + gap), y + BOX_HEADER + pad, slotW, innerH, theme),
    )
    .join("\n");
  return [
    `<g data-location="${esc(location.id)}">`,
    `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(size.width)}" height="${fmt(size.height)}" rx="2" fill="${theme.boxFill}" stroke="${theme.boxStroke}" stroke-width="2"/>`,
    caption(x, y, size.width, location.code, location.label, theme),
    devices,
    `</g>`,
  ].join("\n");
}

function renderPanel(location: Location, theme: Theme): string {
  const { x, y } = location.position;
  const { height } = panelSize(location.spaces);
  const rowMarks = location.breakers
    .map((slot, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const left = x + col * (PANEL_WIDTH / 2);
      const top = y + PANEL_HEADER + row * PANEL_ROW;
      const divider =
        col === 0
          ? `<line x1="${fmt(x + PANEL_WIDTH / 2)}" y1="${fmt(top)}" x2="${fmt(x + PANEL_WIDTH / 2)}" y2="${fmt(top + PANEL_ROW)}" stroke="${theme.headerRule}" stroke-width="1"/>`
          : "";
      const rule =
        row > 0 && col === 0
          ? `<line x1="${fmt(x)}" y1="${fmt(top)}" x2="${fmt(x + PANEL_WIDTH)}" y2="${fmt(top)}" stroke="${theme.headerRule}" stroke-width="1"/>`
          : "";
      return [
        rule,
        divider,
        `<text x="${fmt(left + 8)}" y="${fmt(top + PANEL_ROW / 2)}" fill="${theme.muted}" font-size="11" font-family="${MONO}" dominant-baseline="middle">${esc(String(slot.number))}</text>`,
        `<text x="${fmt(left + 28)}" y="${fmt(top + PANEL_ROW / 2)}" fill="${theme.faint}" font-size="10" font-family="${SANS}" dominant-baseline="middle">${esc(truncate(slot.label || "—", 14))}</text>`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");
  return [
    `<g data-location="${esc(location.id)}">`,
    `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(PANEL_WIDTH)}" height="${fmt(height)}" rx="2" fill="${theme.boxFill}" stroke="${theme.panelStroke}" stroke-width="2"/>`,
    caption(x, y, PANEL_WIDTH, location.code, location.label, theme),
    rowMarks,
    `</g>`,
  ].join("\n");
}

function renderExternal(location: Location, theme: Theme): string {
  const { x, y } = location.position;
  const ref = location.externalRef.trim() || "Other drawing";
  return [
    `<g data-location="${esc(location.id)}">`,
    `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(EXTERNAL_SIZE.width)}" height="${fmt(EXTERNAL_SIZE.height)}" rx="2" fill="${theme.deviceFill}" stroke="${theme.externalStroke}" stroke-width="2" stroke-dasharray="5 4"/>`,
    caption(x, y, EXTERNAL_SIZE.width, location.code, location.label, theme),
    `<text x="${fmt(x + 8)}" y="${fmt(y + BOX_HEADER + 14)}" fill="${theme.faint}" font-size="10" font-family="${SANS}">${esc(truncate(ref, 22))}</text>`,
    `</g>`,
  ].join("\n");
}

function caption(x: number, y: number, width: number, code: string, label: string, theme: Theme): string {
  const badgeW = Math.max(16, code.length * 6 + 8);
  const maxLabel = Math.max(6, Math.floor((width - badgeW - 16) / 5));
  return [
    `<line x1="${fmt(x)}" y1="${fmt(y + BOX_HEADER)}" x2="${fmt(x + width)}" y2="${fmt(y + BOX_HEADER)}" stroke="${theme.headerRule}" stroke-width="1"/>`,
    `<rect x="${fmt(x + 4)}" y="${fmt(y + 5)}" width="${fmt(badgeW)}" height="14" rx="2" fill="${theme.codeBg}"/>`,
    `<text x="${fmt(x + 8)}" y="${fmt(y + 12)}" fill="${theme.codeInk}" font-size="10" font-family="${MONO}" font-weight="700" dominant-baseline="middle">${esc(code)}</text>`,
    `<text x="${fmt(x + 8 + badgeW)}" y="${fmt(y + 12)}" fill="${theme.muted}" font-size="10" font-family="${SANS}" dominant-baseline="middle">${esc(truncate(label, maxLabel))}</text>`,
  ].join("\n");
}

function renderDevice(
  device: DeviceType,
  x: number,
  y: number,
  width: number,
  height: number,
  theme: Theme,
): string {
  if (device === "empty") {
    return [
      `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(width)}" height="${fmt(height)}" rx="2" fill="${theme.deviceFill}" stroke="${theme.emptyStroke}" stroke-width="1" stroke-dasharray="4 3"/>`,
      `<text x="${fmt(x + width / 2)}" y="${fmt(y + height / 2)}" fill="${theme.emptyStroke}" font-size="10" font-family="${SANS}" text-anchor="middle" dominant-baseline="middle">Open</text>`,
    ].join("\n");
  }

  const cx = x + width / 2;
  const cy = y + height / 2 - 8;
  return [
    `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(width)}" height="${fmt(height)}" rx="2" fill="${theme.deviceFill}" stroke="${theme.deviceStroke}" stroke-width="1"/>`,
    deviceFace(device, cx, cy, theme),
    `<text x="${fmt(cx)}" y="${fmt(y + height - 12)}" fill="${theme.muted}" font-size="10" font-family="${SANS}" font-weight="600" text-anchor="middle">${esc(deviceShort(device))}</text>`,
  ].join("\n");
}

function deviceFace(device: DeviceType, cx: number, cy: number, theme: Theme): string {
  if (device === "duplex-15" || device === "duplex-20" || device === "gfci-15" || device === "gfci-20") {
    return `<circle cx="${fmt(cx)}" cy="${fmt(cy - 6)}" r="5" fill="none" stroke="${theme.ink}" stroke-width="2"/><circle cx="${fmt(cx)}" cy="${fmt(cy + 8)}" r="5" fill="none" stroke="${theme.ink}" stroke-width="2"/>`;
  }
  if (device === "single-outlet") {
    return `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="6" fill="none" stroke="${theme.ink}" stroke-width="2"/>`;
  }
  if (device === "light") {
    return `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="10" fill="none" stroke="#fcd34d" stroke-width="2"/><text x="${fmt(cx)}" y="${fmt(cy)}" fill="#fcd34d" font-size="12" font-family="${SANS}" text-anchor="middle" dominant-baseline="middle">×</text>`;
  }
  if (device === "breaker") {
    return `<rect x="${fmt(cx - 6)}" y="${fmt(cy - 12)}" width="12" height="24" rx="1" fill="${theme.boxFill}" stroke="${theme.deviceStroke}"/>`;
  }
  const mark = device === "three-way" ? "3" : device === "four-way" ? "4" : "1";
  return `<rect x="${fmt(cx - 6)}" y="${fmt(cy - 12)}" width="12" height="24" rx="1" fill="${theme.boxFill}" stroke="${theme.ink}"/><text x="${fmt(cx)}" y="${fmt(cy)}" fill="${theme.ink}" font-size="9" font-family="${SANS}" text-anchor="middle" dominant-baseline="middle">${mark}</text>`;
}

function renderNote(text: string, x: number, y: number, theme: Theme): string {
  const lines = wrapLines(text, 28, 4);
  const tspans = lines
    .map((line, index) => `<tspan x="${fmt(x + 12)}" dy="${index === 0 ? 0 : 14}">${esc(line)}</tspan>`)
    .join("");
  return [
    `<g>`,
    `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(NOTE_W)}" height="${fmt(NOTE_H)}" rx="2" fill="${theme.noteFill}"/>`,
    `<text x="${fmt(x + 12)}" y="${fmt(y + 16)}" fill="${theme.noteInk}" font-size="10" font-family="${SANS}" font-weight="700" letter-spacing="0.06em">NOTE</text>`,
    `<text x="${fmt(x + 12)}" y="${fmt(y + 36)}" fill="${theme.noteInk}" font-size="12" font-family="${SANS}">${tspans}</text>`,
    `</g>`,
  ].join("\n");
}

function wrapLines(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length >= maxLines) break;
  }
  if (lines.length < maxLines && current) lines.push(current);
  const used = lines.join(" ");
  const leftover = used !== words.join(" ");
  if (leftover && lines.length) {
    const last = lines[lines.length - 1]!;
    lines[lines.length - 1] = `${last.slice(0, Math.max(1, maxChars - 1))}…`;
  }
  return lines.slice(0, maxLines);
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 1))}…`;
}

function esc(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function safeId(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "-");
}

function fmt(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
