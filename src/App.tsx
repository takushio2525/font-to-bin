import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { InputPanel } from "@/components/InputPanel";
import { FormatPanel } from "@/components/FormatPanel";
import { PreviewPanel } from "@/components/PreviewPanel";
import { OutputPanel } from "@/components/OutputPanel";
import { PixelEditor } from "@/components/PixelEditor";
import { BUILTIN_FONTS, registerCustomFont } from "@/core/fonts";
import type { FontDef } from "@/core/types";
import { useAppState } from "@/hooks/useAppState";
import { useGlyphs } from "@/hooks/useGlyphs";
import { useTheme } from "@/hooks/useTheme";
import { persistedInitial, usePersist } from "@/hooks/usePersist";
import { DEFAULT_STATE } from "@/core/defaults";
import { shareUrlToState, stateToShareUrl } from "@/core/share";

export default function App() {
  // 初期状態: 共有URL優先 > LocalStorage > デフォルト
  const [state, dispatch] = useAppState(
    shareUrlToState() ?? persistedInitial(DEFAULT_STATE)
  );
  usePersist(state);
  const [fonts, setFonts] = useState<FontDef[]>(BUILTIN_FONTS);
  const { glyphs } = useGlyphs(state, fonts);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const { theme, toggle } = useTheme();

  // 共有URLから起動したときは、適用後にURLをクリーンにする（履歴には残さない）
  useEffect(() => {
    if (new URL(window.location.href).searchParams.has("s")) {
      const u = new URL(window.location.href);
      u.searchParams.delete("s");
      window.history.replaceState({}, "", u.toString());
    }
  }, []);

  const overriddenIndices = useMemo(
    () => new Set(Object.keys(state.overrides).map((k) => parseInt(k, 10))),
    [state.overrides]
  );

  const handleCustomFont = async (file: File) => {
    try {
      const def = await registerCustomFont(file);
      setFonts((prev) => [...prev, def]);
      dispatch({ type: "setFontId", fontId: def.id });
    } catch (e) {
      console.error(e);
      alert("フォントの読み込みに失敗しました: " + (e as Error).message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        theme={theme}
        onToggleTheme={toggle}
        onShare={async () => {
          const url = stateToShareUrl(state);
          try {
            await navigator.clipboard.writeText(url);
            alert("共有URLをクリップボードにコピーしました");
          } catch {
            prompt("共有URL", url);
          }
        }}
      />

      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* 左カラム: 入力 + フォーマット設定 */}
          <div className="lg:col-span-4 space-y-4">
            <InputPanel
              state={state}
              dispatch={dispatch}
              fonts={fonts}
              onCustomFontSelected={handleCustomFont}
            />
            <FormatPanel state={state} dispatch={dispatch} />
          </div>

          {/* 中央カラム: プレビュー */}
          <div className="lg:col-span-4">
            <PreviewPanel
              glyphs={glyphs}
              overriddenIndices={overriddenIndices}
              onOpenEditor={setEditingIndex}
              onClearAllOverrides={() =>
                dispatch({ type: "clearAllOverrides" })
              }
              hasOverrides={Object.keys(state.overrides).length > 0}
            />
          </div>

          {/* 右カラム: 出力 */}
          <div className="lg:col-span-4">
            <OutputPanel glyphs={glyphs} format={state.format} />
          </div>
        </div>

        <footer className="mt-10 py-4 border-t text-center text-xs text-muted-foreground">
          Built with React + Vite · Fonts: DotGothic16, Misaki Gothic 2nd ·
          <a
            className="ml-1 underline hover:text-foreground"
            href="https://github.com/TakumiShiozawa/font_to_bin"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </footer>
      </main>

      {editingIndex !== null && glyphs[editingIndex] && (
        <PixelEditor
          glyph={glyphs[editingIndex]}
          index={editingIndex}
          onClose={() => setEditingIndex(null)}
          onSave={(matrix) =>
            dispatch({ type: "setOverride", index: editingIndex, matrix })
          }
          onReset={() => {
            dispatch({ type: "clearOverride", index: editingIndex });
            setEditingIndex(null);
          }}
        />
      )}
    </div>
  );
}
