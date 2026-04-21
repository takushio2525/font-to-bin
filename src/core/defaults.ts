import type { AppState, FormatOptions, Matrix, Bit } from "./types";

// 空のマトリックスを作るヘルパー（rasterize.ts と同機能だが循環依存を避けてローカル実装）
function makeEmptyMatrix(w: number, h: number): Matrix {
  const m: Matrix = [];
  for (let y = 0; y < h; y++) {
    const row: Bit[] = [];
    for (let x = 0; x < w; x++) row.push(0);
    m.push(row);
  }
  return m;
}

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

// 自由キャンバスの初期値: 8×8のグリフが8文字並ぶ想定で 横64×縦8
const DEFAULT_FREE_W = 64;
const DEFAULT_FREE_H = 8;

export const DEFAULT_STATE: AppState = {
  text: "ABCあいう",
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
  previewGridStep: 0,
  free: {
    width: DEFAULT_FREE_W,
    height: DEFAULT_FREE_H,
    matrix: makeEmptyMatrix(DEFAULT_FREE_W, DEFAULT_FREE_H),
    gridStep: 8,
  },
};
