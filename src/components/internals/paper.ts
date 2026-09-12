export type PaperTheme = {
  paper: string;
  ink: string;
  muted: string;
  faint: string;
  stroke: string;
  fill: string;
};

export const PRINT: PaperTheme = {
  paper: "#fafafa",
  ink: "#18181b",
  muted: "#52525b",
  faint: "#71717a",
  stroke: "#d4d4d8",
  fill: "#e4e4e7",
};

export const EDITOR: PaperTheme = {
  paper: "#18181b",
  ink: "#fafafa",
  muted: "#a1a1aa",
  faint: "#71717a",
  stroke: "#3f3f46",
  fill: "#27272a",
};

export const PAPER = PRINT.paper;
export const INK = PRINT.ink;
export const MUTED = PRINT.muted;
export const FAINT = PRINT.faint;
export const STROKE = PRINT.stroke;
export const FILL = PRINT.fill;

export const CONDUCTOR_HEX: Record<"black" | "white" | "red" | "bare", string> = {
  black: "#18181b",
  white: "#f4f4f5",
  red: "#c24141",
  bare: "#3f8f5b",
};

export const EDITOR_BLACK = "#09090b";
export const EDITOR_BLACK_HALO = "#e4e4e7";

export const SCREW_HEX: Record<"brass" | "dark" | "silver" | "green", string> = {
  brass: "#c4853a",
  dark: "#27272a",
  silver: "#a1a1aa",
  green: "#3f8f5b",
};

export const DEVICE_W = 120;
export const DEVICE_H = 200;
export const JACKET_W = 92;
export const JACKET_H = 40;
export const VIEW_W = 960;
