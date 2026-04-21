import { useReducer } from "react";
import type { AppState, FormatOptions, Matrix, Bit } from "@/core/types";
import { DEFAULT_STATE } from "@/core/defaults";

export type Action =
  | { type: "setText"; text: string }
  | { type: "setFontId"; fontId: string }
  | { type: "setSize"; width: number; height: number; size: number }
  | { type: "setWidth"; value: number }
  | { type: "setHeight"; value: number }
  | { type: "setFontSize"; value: number }
  | { type: "setThreshold"; value: number }
  | { type: "setOffset"; x: number; y: number }
  | { type: "setOffsetX"; value: number }
  | { type: "setOffsetY"; value: number }
  | { type: "setBold"; value: boolean }
  | { type: "setFormat"; format: Partial<FormatOptions> }
  | { type: "setOverride"; index: number; matrix: Matrix }
  | { type: "clearOverride"; index: number }
  | { type: "clearAllOverrides" }
  | { type: "setPreviewGridStep"; value: number }
  | { type: "setFreeSize"; width: number; height: number }
  | { type: "setFreeMatrix"; matrix: Matrix }
  | { type: "setFreePixel"; x: number; y: number; value: Bit }
  | { type: "setFreeGridStep"; value: number }
  | { type: "clearFree" }
  | { type: "replaceState"; state: AppState };

// キャンバスサイズ変更時に既存のmatrixをリサイズする（切り詰め/ゼロ埋め）
function resizeMatrix(src: Matrix, w: number, h: number): Matrix {
  const next: Matrix = [];
  for (let y = 0; y < h; y++) {
    const row: Bit[] = [];
    for (let x = 0; x < w; x++) {
      row.push(src[y]?.[x] ?? 0);
    }
    next.push(row);
  }
  return next;
}

function emptyMatrix(w: number, h: number): Matrix {
  const m: Matrix = [];
  for (let y = 0; y < h; y++) {
    const row: Bit[] = [];
    for (let x = 0; x < w; x++) row.push(0);
    m.push(row);
  }
  return m;
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "setText":
      // 入力テキストが変わると override は無効化する（インデックスが変わるため）
      return { ...state, text: action.text, overrides: {} };
    case "setFontId":
      return { ...state, fontId: action.fontId, overrides: {} };
    case "setSize":
      return {
        ...state,
        width: action.width,
        height: action.height,
        size: action.size,
        overrides: {},
      };
    case "setWidth":
      return { ...state, width: action.value, overrides: {} };
    case "setHeight":
      return { ...state, height: action.value, overrides: {} };
    case "setFontSize":
      return { ...state, size: action.value, overrides: {} };
    case "setThreshold":
      return { ...state, threshold: action.value, overrides: {} };
    case "setOffsetX":
      return { ...state, offsetX: action.value, overrides: {} };
    case "setOffsetY":
      return { ...state, offsetY: action.value, overrides: {} };
    case "setOffset":
      return { ...state, offsetX: action.x, offsetY: action.y, overrides: {} };
    case "setBold":
      return { ...state, bold: action.value, overrides: {} };
    case "setFormat":
      return { ...state, format: { ...state.format, ...action.format } };
    case "setOverride":
      return {
        ...state,
        overrides: { ...state.overrides, [action.index]: action.matrix },
      };
    case "clearOverride": {
      const next = { ...state.overrides };
      delete next[action.index];
      return { ...state, overrides: next };
    }
    case "clearAllOverrides":
      return { ...state, overrides: {} };
    case "setPreviewGridStep":
      return { ...state, previewGridStep: Math.max(0, Math.floor(action.value)) };
    case "setFreeSize": {
      const w = Math.max(1, Math.min(256, Math.floor(action.width)));
      const h = Math.max(1, Math.min(256, Math.floor(action.height)));
      return {
        ...state,
        free: {
          ...state.free,
          width: w,
          height: h,
          matrix: resizeMatrix(state.free.matrix, w, h),
        },
      };
    }
    case "setFreeMatrix":
      return { ...state, free: { ...state.free, matrix: action.matrix } };
    case "setFreePixel": {
      const { x, y, value } = action;
      if (
        y < 0 ||
        y >= state.free.height ||
        x < 0 ||
        x >= state.free.width
      ) {
        return state;
      }
      if (state.free.matrix[y][x] === value) return state;
      const nextMatrix = state.free.matrix.map((row, ry) =>
        ry === y
          ? (row.map((b, rx) => (rx === x ? value : b)) as Matrix[number])
          : row
      );
      return { ...state, free: { ...state.free, matrix: nextMatrix } };
    }
    case "setFreeGridStep":
      return {
        ...state,
        free: { ...state.free, gridStep: Math.max(0, Math.floor(action.value)) },
      };
    case "clearFree":
      return {
        ...state,
        free: {
          ...state.free,
          matrix: emptyMatrix(state.free.width, state.free.height),
        },
      };
    case "replaceState":
      return action.state;
    default:
      return state;
  }
}

export function useAppState(initial: AppState = DEFAULT_STATE) {
  return useReducer(reducer, initial);
}
