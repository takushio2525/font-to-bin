import { Upload, Sparkles } from "lucide-react";
import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AppState, FontDef } from "@/core/types";
import type { Action } from "@/hooks/useAppState";
import { PRESETS, detectPreset } from "@/core/presets";

type Props = {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  fonts: FontDef[];
  onCustomFontSelected: (file: File) => void;
};

// ドットサイズのプリセット（幅=高さ=フォントpxをまとめて変える）
const DOT_SIZES: { value: number; label: string; hint: string }[] = [
  { value: 8, label: "8", hint: "極小" },
  { value: 12, label: "12", hint: "小" },
  { value: 16, label: "16", hint: "標準" },
  { value: 24, label: "24", hint: "大" },
  { value: 32, label: "32", hint: "特大" },
];

export function EasyPanel({
  state,
  dispatch,
  fonts,
  onCustomFontSelected,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const activePreset = detectPreset(state.format);

  const setSize = (px: number) =>
    dispatch({ type: "setSize", width: px, height: px, size: px });

  return (
    <div className="space-y-4">
      {/* ステップ1: 文字 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
              1
            </span>
            変換したい文字
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={state.text}
            onChange={(e) => dispatch({ type: "setText", text: e.target.value })}
            placeholder="ABC や こんにちは など"
            rows={2}
            className="font-mono text-base"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            複数文字・日本語・絵文字もそのまま入力できます
          </p>
        </CardContent>
      </Card>

      {/* ステップ2: 見た目 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
              2
            </span>
            見た目
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>フォント</Label>
            <Select
              value={state.fontId}
              onValueChange={(v) => {
                dispatch({ type: "setFontId", fontId: v });
                const f = fonts.find((x) => x.id === v);
                if (f?.recommendedSize) {
                  setSize(f.recommendedSize);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fonts.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              自分のフォント(TTF/OTF)を使う
            </Button>
            <input
              type="file"
              ref={fileRef}
              className="hidden"
              accept=".ttf,.otf,.woff,.woff2"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onCustomFontSelected(f);
                e.target.value = "";
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>ドットサイズ</Label>
            <div className="grid grid-cols-5 gap-1.5">
              {DOT_SIZES.map((s) => {
                const active = state.width === s.value && state.height === s.value;
                return (
                  <button
                    key={s.value}
                    onClick={() => setSize(s.value)}
                    className={
                      "rounded-md border px-2 py-2 text-center transition-colors " +
                      (active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background hover:bg-accent")
                    }
                    title={`${s.value}×${s.value} ドット`}
                  >
                    <div className="text-sm font-semibold">{s.label}px</div>
                    <div className="text-[10px] opacity-80">{s.hint}</div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              数字は1文字あたりの縦横ドット数。標準は 16px
            </p>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="easy-bold" className="text-sm">太字にする</Label>
              <p className="text-[11px] text-muted-foreground">
                細すぎるときに ON
              </p>
            </div>
            <Switch
              id="easy-bold"
              checked={state.bold}
              onCheckedChange={(v) => dispatch({ type: "setBold", value: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* ステップ3: 出力フォーマット（プリセット） */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
              3
            </span>
            出力フォーマット
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground -mt-1">
            用途を選ぶだけで最適な形式に変換します
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRESETS.map((p) => {
              const active = activePreset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() =>
                    dispatch({ type: "setFormat", format: p.format })
                  }
                  className={
                    "rounded-md border p-3 text-left transition-colors " +
                    (active
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-input hover:bg-accent")
                  }
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span aria-hidden>{p.emoji}</span>
                    <span>{p.label}</span>
                    {active && (
                      <span className="ml-auto inline-flex items-center gap-0.5 text-[10px] text-primary">
                        <Sparkles className="h-3 w-3" />
                        選択中
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
                    {p.description}
                  </p>
                </button>
              );
            })}
          </div>
          {!activePreset && (
            <p className="text-[11px] text-muted-foreground">
              ※ 現在の設定はどのプリセットとも一致していません。プリセットを押すと上書きされます
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
