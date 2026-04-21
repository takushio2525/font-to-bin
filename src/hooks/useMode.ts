import { useEffect, useState } from "react";

export type Mode = "easy" | "advanced" | "free";

const KEY = "font_to_bin_mode_v1";

function read(): Mode {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "advanced" || v === "free") return v;
    return "easy";
  } catch {
    return "easy";
  }
}

// かんたん / 詳細 モードの切替フック（LocalStorage 永続）
export function useMode() {
  const [mode, setMode] = useState<Mode>(() => read());

  useEffect(() => {
    try {
      localStorage.setItem(KEY, mode);
    } catch {
      /* noop */
    }
  }, [mode]);

  return { mode, setMode };
}
