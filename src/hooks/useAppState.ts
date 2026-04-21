import { useReducer } from "react";
import type { AppState, FormatOptions, Matrix } from "@/core/types";
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
  | { type: "replaceState"; state: AppState };

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
    case "replaceState":
      return action.state;
    default:
      return state;
  }
}

export function useAppState(initial: AppState = DEFAULT_STATE) {
  return useReducer(reducer, initial);
}
