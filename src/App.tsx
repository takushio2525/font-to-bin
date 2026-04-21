import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { InputPanel } from "@/components/InputPanel";
import { FormatPanel } from "@/components/FormatPanel";
import { EasyPanel } from "@/components/EasyPanel";
import { PreviewPanel } from "@/components/PreviewPanel";
import { OutputPanel } from "@/components/OutputPanel";
import { PixelEditor } from "@/components/PixelEditor";
import { BUILTIN_FONTS, registerCustomFont } from "@/core/fonts";
import type { FontDef } from "@/core/types";
import { useAppState } from "@/hooks/useAppState";
import { useGlyphs } from "@/hooks/useGlyphs";
import { useTheme } from "@/hooks/useTheme";
import { useMode } from "@/hooks/useMode";
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
  const { mode, setMode } = useMode();

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
        mode={mode}
        onModeChange={setMode}
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
        {mode === "easy" ? (
          <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm">
            <span className="font-semibold">かんたんモード</span>
            <span className="text-muted-foreground">
              {" "}
              — 3ステップでバイナリ化できます。細かく調整したい場合は右上の「詳細」へ
            </span>
          </div>
        ) : (
          <div className="mb-4 rounded-lg border bg-card px-4 py-2.5 text-sm">
            <span className="font-semibold">詳細モード</span>
            <span className="text-muted-foreground">
              {" "}
              — すべての設定を直接編集できます。迷ったら右上の「かんたん」へ
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* 左カラム: モードに応じて切替 */}
          <div className="lg:col-span-4 space-y-4">
            {mode === "easy" ? (
              <EasyPanel
                state={state}
                dispatch={dispatch}
                fonts={fonts}
                onCustomFontSelected={handleCustomFont}
              />
            ) : (
              <>
                <InputPanel
                  state={state}
                  dispatch={dispatch}
                  fonts={fonts}
                  onCustomFontSelected={handleCustomFont}
                />
                <FormatPanel state={state} dispatch={dispatch} />
              </>
            )}
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
            href="https://github.com/takushio2525/font_to_bin"
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
