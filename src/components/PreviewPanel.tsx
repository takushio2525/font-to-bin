import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Glyph } from "@/core/types";
import { GlyphPreview } from "./GlyphPreview";

type Props = {
  glyphs: Glyph[];
  overriddenIndices: Set<number>;
  onOpenEditor: (index: number) => void;
  onClearAllOverrides: () => void;
  hasOverrides: boolean;
  gridStep: number;
  onGridStepChange: (step: number) => void;
};

// 幅に応じた既定スケール（横スクロールなので大きめでもOK）
function defaultScale(w: number): number {
  if (w <= 8) return 18;
  if (w <= 16) return 14;
  if (w <= 32) return 9;
  if (w <= 48) return 7;
  return 5;
}

export function PreviewPanel({
  glyphs,
  overriddenIndices,
  onOpenEditor,
  onClearAllOverrides,
  hasOverrides,
  gridStep,
  onGridStepChange,
}: Props) {
  const baseScale = useMemo(() => defaultScale(glyphs[0]?.width ?? 16), [glyphs]);
  // ユーザーによるズーム倍率（1.0が規定）
  const [zoom, setZoom] = useState<number>(1);
  const scale = Math.max(2, Math.round(baseScale * zoom));

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-3">
          <CardTitle>プレビュー</CardTitle>
          {glyphs.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {glyphs.length}文字 · {glyphs[0].width}×{glyphs[0].height}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* 補助線の間隔 */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-muted-foreground">補助線</label>
            <select
              value={gridStep}
              onChange={(e) => onGridStepChange(parseInt(e.target.value))}
              className="h-8 rounded border bg-background px-1.5 text-xs"
              title="Nドット毎にブロック境界線を強調"
            >
              <option value={0}>なし</option>
              <option value={2}>2px</option>
              <option value={4}>4px</option>
              <option value={8}>8px</option>
              <option value={16}>16px</option>
              <option value={32}>32px</option>
            </select>
          </div>
          {/* ズーム */}
          <div className="flex items-center gap-1 rounded-md border bg-background">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
              title="縮小"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs tabular-nums w-10 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))}
              title="拡大"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>
          {hasOverrides && (
            <Button variant="ghost" size="sm" onClick={onClearAllOverrides}>
              <RotateCcw className="h-3.5 w-3.5" />
              編集をリセット
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {glyphs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
            <div className="text-3xl" aria-hidden>✨</div>
            <p>下の「変換したい文字」に入力するとここにドット絵が表示されます</p>
          </div>
        ) : (
          <div className="relative">
            {/* 横スクロール帯 */}
            <div className="overflow-x-auto scrollbar-thin -mx-1 px-1 pb-2">
              <div className="flex flex-nowrap items-end gap-3 w-max">
                {glyphs.map((g, i) => (
                  <div key={i} className="relative shrink-0">
                    <GlyphPreview
                      glyph={g}
                      scale={scale}
                      grid
                      gridStep={gridStep}
                      label={
                        g.char === "\n"
                          ? "\\n"
                          : g.char === " "
                            ? "␣"
                            : g.char
                      }
                      onClick={() => onOpenEditor(i)}
                    />
                    {overriddenIndices.has(i) && (
                      <span className="absolute -top-1 -right-1 text-[9px] bg-primary text-primary-foreground px-1 rounded">
                        edit
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <p className="mt-2 text-center text-xs text-muted-foreground">
          文字をクリックすると手動でドット編集ができます · 横スクロールで全文字を確認
        </p>
      </CardContent>
    </Card>
  );
}
