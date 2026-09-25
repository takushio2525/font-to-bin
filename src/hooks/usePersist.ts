import { useEffect } from "react";
import type { AppState } from "@/core/types";
import { sanitizeState } from "@/core/sanitize";

const KEY = "font-to-bin.state.v1";

// AppState をローカルストレージへ自動保存し、初期化時に復元する
export function persistedInitial(defaults: AppState): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults;
    // 欠けた項目は既定値で埋め、壊れた値や範囲外の値は丸める
    return sanitizeState(JSON.parse(raw), "stored", defaults);
  } catch {
    return defaults;
  }
}

export function usePersist(state: AppState) {
  useEffect(() => {
    try {
      // overrides はサイズが大きい場合があるので保存する（小さい前提）
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // quota超過など
    }
  }, [state]);
}
