import { useEffect, useMemo, useState } from "react";
import type { AppState, FontDef, Glyph } from "@/core/types";
import { loadFont } from "@/core/fonts";
import { rasterizeText } from "@/core/rasterize";

// AppState と利用可能フォント一覧から Glyph[] を計算する。
// overrides が存在する文字インデックスはそれで置き換える。
export function useGlyphs(state: AppState, fonts: FontDef[]) {
  const [fontReady, setFontReady] = useState(false);
  const [version, setVersion] = useState(0);

  const font = useMemo(
    () => fonts.find((f) => f.id === state.fontId) ?? fonts[0],
    [fonts, state.fontId]
  );

  // フォントが変わったら非同期ロード
  useEffect(() => {
    let cancelled = false;
    setFontReady(false);
    (async () => {
      try {
        if (font && !font.isCustom) {
          await loadFont(font, document.baseURI);
        }
        if (!cancelled) {
          setFontReady(true);
          setVersion((v) => v + 1);
        }
      } catch (e) {
        console.error("font load failed", e);
        if (!cancelled) setFontReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [font]);

  const glyphs = useMemo<Glyph[]>(() => {
    if (!font || !fontReady) return [];
    const base = rasterizeText({
      text: state.text,
      fontFamily: font.family,
      width: state.width,
      height: state.height,
      size: state.size,
      threshold: state.threshold,
      offsetX: state.offsetX,
      offsetY: state.offsetY,
      bold: state.bold,
    });
    return base.map((g, i) =>
      state.overrides[i] ? { ...g, matrix: state.overrides[i] } : g
    );
    // version は再計算トリガ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, font, fontReady, version]);

  return { glyphs, font, fontReady };
}
