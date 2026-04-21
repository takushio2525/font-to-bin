import { useEffect } from "react";
import type { AppState } from "@/core/types";

const KEY = "font-to-bin.state.v1";

// AppState をローカルストレージへ自動保存し、初期化時に復元する
export function persistedInitial<T extends AppState>(defaults: T): T {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<T>;
    // 浅くマージ。format はネストなので個別マージ
    return {
      ...defaults,
      ...parsed,
      format: { ...defaults.format, ...(parsed.format ?? {}) },
    } as T;
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
