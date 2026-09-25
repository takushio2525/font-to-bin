import type { AppState } from "./types";
import { sanitizeState } from "./sanitize";

// 設定のみを URL クエリパラメータに埋め込むための簡易シリアライザ。
// overrides はサイズが大きくなりがちなので共有URLからは除外する。
export function stateToShareUrl(state: AppState): string {
  const share = {
    ...state,
    overrides: {},
  };
  const json = JSON.stringify(share);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  const url = new URL(window.location.href);
  url.searchParams.set("s", b64);
  return url.toString();
}

export function shareUrlToState(): AppState | null {
  try {
    const url = new URL(window.location.href);
    const b64 = url.searchParams.get("s");
    if (!b64) return null;
    const json = decodeURIComponent(escape(atob(b64)));
    // 共有 URL は誰でも作れるので、型と範囲を検証してから使う
    return sanitizeState(JSON.parse(json), "share");
  } catch {
    return null;
  }
}
