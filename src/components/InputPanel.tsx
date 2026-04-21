import { Upload } from "lucide-react";
import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AppState, FontDef } from "@/core/types";
import type { Action } from "@/hooks/useAppState";

type Props = {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  fonts: FontDef[];
  onCustomFontSelected: (file: File) => void;
};

export function InputPanel({
  state,
  dispatch,
  fonts,
  onCustomFontSelected,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>入力</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="text">変換する文字列</Label>
          <Textarea
            id="text"
            value={state.text}
            onChange={(e) =>
              dispatch({ type: "setText", text: e.target.value })
            }
            placeholder="ABC"
            rows={2}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            複数文字・改行もOK（絵文字は1文字として扱われます）
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>フォント</Label>
          <Select
            value={state.fontId}
            onValueChange={(v) => {
              dispatch({ type: "setFontId", fontId: v });
              // 推奨サイズがあれば幅・高さ・フォントpxを揃える
              const f = fonts.find((x) => x.id === v);
              if (f?.recommendedSize) {
                dispatch({
                  type: "setSize",
                  width: f.recommendedSize,
                  height: f.recommendedSize,
                  size: f.recommendedSize,
                });
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
            className="w-full mt-1"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" />
            TTF / OTF を追加
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

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="width">幅 (px)</Label>
            <Input
              id="width"
              type="number"
              min={1}
              max={128}
              value={state.width}
              onChange={(e) =>
                dispatch({
                  type: "setWidth",
                  value: clampInt(e.target.value, 1, 128),
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="height">高さ (px)</Label>
            <Input
              id="height"
              type="number"
              min={1}
              max={128}
              value={state.height}
              onChange={(e) =>
                dispatch({
                  type: "setHeight",
                  value: clampInt(e.target.value, 1, 128),
                })
              }
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between">
            <Label>フォントサイズ: {state.size}px</Label>
          </div>
          <Slider
            value={[state.size]}
            min={4}
            max={64}
            step={1}
            onValueChange={([v]) =>
              dispatch({ type: "setFontSize", value: v })
            }
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between">
            <Label>閾値: {state.threshold}</Label>
          </div>
          <Slider
            value={[state.threshold]}
            min={1}
            max={254}
            step={1}
            onValueChange={([v]) =>
              dispatch({ type: "setThreshold", value: v })
            }
          />
          <p className="text-xs text-muted-foreground">
            アンチエイリアスのしきい値。低いほど細く、高いほど太くなります。
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ox">X オフセット</Label>
            <Input
              id="ox"
              type="number"
              value={state.offsetX}
              onChange={(e) =>
                dispatch({
                  type: "setOffsetX",
                  value: parseFloat(e.target.value) || 0,
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="oy">Y オフセット</Label>
            <Input
              id="oy"
              type="number"
              value={state.offsetY}
              onChange={(e) =>
                dispatch({
                  type: "setOffsetY",
                  value: parseFloat(e.target.value) || 0,
                })
              }
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="bold">太字</Label>
          <Switch
            id="bold"
            checked={state.bold}
            onCheckedChange={(v) => dispatch({ type: "setBold", value: v })}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function clampInt(s: string, min: number, max: number): number {
  const n = parseInt(s, 10);
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}
