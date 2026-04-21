import type { AppState, FormatOptions } from "./types";

export const DEFAULT_FORMAT: FormatOptions = {
  language: "c",
  structure: "matrix3d",
  dataType: "uint8_t",
  bitOrder: "msb",
  radix: "dec",
  invert: false,
  variableName: "font_data",
  itemsPerLine: 16,
  includeCharComment: true,
  includeAsciiArt: true,
  padByte: true,
  indent: "    ",
  prefix: "",
  suffix: "",
};

export const DEFAULT_STATE: AppState = {
  text: "ABC",
  fontId: "dotgothic16",
  width: 16,
  height: 16,
  size: 16,
  threshold: 128,
  offsetX: 0,
  offsetY: 0,
  bold: false,
  format: DEFAULT_FORMAT,
  overrides: {},
};
