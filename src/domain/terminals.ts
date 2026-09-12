import type { DeviceType } from "./types";

export type TerminalFill = "brass" | "dark" | "silver" | "green";
export type TerminalSide = "left" | "right" | "top";

export type TerminalDef = {
  id: string;
  label: string;
  side: TerminalSide;
  fill: TerminalFill;
  /** 0–1 along the device body (ignored for top). */
  t: number;
};

const GROUND: TerminalDef = { id: "ground", label: "Ground", side: "top", fill: "green", t: 0 };

export function terminalsFor(device: DeviceType): TerminalDef[] {
  switch (device) {
    case "empty":
    case "breaker":
      return [];
    case "single-pole":
      return [
        GROUND,
        { id: "line", label: "Line", side: "right", fill: "brass", t: 0.32 },
        { id: "load", label: "Load", side: "right", fill: "brass", t: 0.68 },
      ];
    case "three-way":
      return [
        GROUND,
        { id: "trav-1", label: "Traveler", side: "left", fill: "brass", t: 0.32 },
        { id: "trav-2", label: "Traveler", side: "left", fill: "brass", t: 0.68 },
        { id: "common", label: "Common", side: "right", fill: "dark", t: 0.5 },
      ];
    case "four-way":
      return [
        GROUND,
        { id: "trav-a1", label: "Traveler", side: "left", fill: "brass", t: 0.32 },
        { id: "trav-a2", label: "Traveler", side: "left", fill: "brass", t: 0.68 },
        { id: "trav-b1", label: "Traveler", side: "right", fill: "brass", t: 0.32 },
        { id: "trav-b2", label: "Traveler", side: "right", fill: "brass", t: 0.68 },
      ];
    case "duplex-15":
    case "duplex-20":
      return [
        GROUND,
        { id: "neu-1", label: "Neutral", side: "left", fill: "silver", t: 0.32 },
        { id: "neu-2", label: "Neutral", side: "left", fill: "silver", t: 0.68 },
        { id: "hot-1", label: "Hot", side: "right", fill: "brass", t: 0.32 },
        { id: "hot-2", label: "Hot", side: "right", fill: "brass", t: 0.68 },
      ];
    case "single-outlet":
      return [
        GROUND,
        { id: "neu", label: "Neutral", side: "left", fill: "silver", t: 0.5 },
        { id: "hot", label: "Hot", side: "right", fill: "brass", t: 0.5 },
      ];
    case "gfci-15":
    case "gfci-20":
      return [
        GROUND,
        { id: "line-neu", label: "LINE white", side: "left", fill: "silver", t: 0.28 },
        { id: "load-neu", label: "LOAD white", side: "left", fill: "silver", t: 0.72 },
        { id: "line-hot", label: "LINE hot", side: "right", fill: "brass", t: 0.28 },
        { id: "load-hot", label: "LOAD hot", side: "right", fill: "brass", t: 0.72 },
      ];
    case "light":
      return [
        GROUND,
        { id: "neu", label: "Neutral", side: "left", fill: "silver", t: 0.5 },
        { id: "hot", label: "Hot", side: "right", fill: "brass", t: 0.5 },
      ];
  }
}

export function terminalById(device: DeviceType, terminalId: string): TerminalDef | undefined {
  return terminalsFor(device).find((item) => item.id === terminalId);
}
