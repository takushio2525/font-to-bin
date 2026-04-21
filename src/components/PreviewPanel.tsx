import { RotateCcw } from "lucide-react";
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
};

export function PreviewPanel({
  glyphs,
  overriddenIndices,
  onOpenEditor,
  onClearAllOverrides,
  hasOverrides,
}: Props) {
  // 1文字あたりのスケールを動的に決める（幅が大きいほど小さく）
  const firstW = glyphs[0]?.width ?? 16;
  const scale =
    firstW <= 8 ? 14 : firstW <= 16 ? 10 : firstW <= 32 ? 6 : 4;

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle>プレビュー</CardTitle>
        {hasOverrides && (
          <Button variant="ghost" size="sm" onClick={onClearAllOverrides}>
            <RotateCcw className="h-3.5 w-3.5" />
            編集をリセット
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {glyphs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            文字を入力してください
          </p>
        ) : (
          <div className="flex flex-wrap gap-3 justify-center">
            {glyphs.map((g, i) => (
              <div key={i} className="relative">
                <GlyphPreview
                  glyph={g}
                  scale={scale}
                  grid
                  label={g.char === "\n" ? "\\n" : g.char === " " ? "␣" : g.char}
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
        )}
        <p className="mt-3 text-center text-xs text-muted-foreground">
          文字をクリックすると手動でドット編集ができます
        </p>
      </CardContent>
    </Card>
  );
}
