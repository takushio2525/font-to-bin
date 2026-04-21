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
import { Switch } from "@/components/ui/switch";
import type { AppState, OutputLanguage, Structure } from "@/core/types";
import type { Action } from "@/hooks/useAppState";
import {
  DEFAULT_DATA_TYPE,
  LANGUAGE_LABELS,
} from "@/core/format";

type Props = {
  state: AppState;
  dispatch: React.Dispatch<Action>;
};

const STRUCTURES: { value: Structure; label: string }[] = [
  { value: "matrix3d", label: "3次元配列 (文字×行×列)" },
  { value: "matrix2d", label: "2次元配列 (行×列) ※1文字目のみ" },
  { value: "flat", label: "フラット 1次元" },
  { value: "bitpack-row", label: "ビットパック（行方向）" },
  { value: "bitpack-col", label: "ビットパック（列方向）" },
];

export function FormatPanel({ state, dispatch }: Props) {
  const fmt = state.format;

  const onLang = (v: OutputLanguage) => {
    const next: Partial<typeof fmt> = { language: v };
    // データ型をデフォルトに置き換え
    next.dataType = DEFAULT_DATA_TYPE[v];
    dispatch({ type: "setFormat", format: next });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>出力フォーマット</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>言語</Label>
          <Select value={fmt.language} onValueChange={(v) => onLang(v as OutputLanguage)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(LANGUAGE_LABELS) as OutputLanguage[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {LANGUAGE_LABELS[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>構造</Label>
          <Select
            value={fmt.structure}
            onValueChange={(v) =>
              dispatch({ type: "setFormat", format: { structure: v as Structure } })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STRUCTURES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>表記</Label>
            <Select
              value={fmt.radix}
              onValueChange={(v) =>
                dispatch({
                  type: "setFormat",
                  format: { radix: v as typeof fmt.radix },
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dec">10進数</SelectItem>
                <SelectItem value="hex">16進数 (0x..)</SelectItem>
                <SelectItem value="bin">2進数 (0b..)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>ビット順</Label>
            <Select
              value={fmt.bitOrder}
              onValueChange={(v) =>
                dispatch({
                  type: "setFormat",
                  format: { bitOrder: v as typeof fmt.bitOrder },
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="msb">MSB first</SelectItem>
                <SelectItem value="lsb">LSB first</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>変数名</Label>
          <Input
            value={fmt.variableName}
            onChange={(e) =>
              dispatch({
                type: "setFormat",
                format: { variableName: e.target.value || "font_data" },
              })
            }
            className="font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <Label>データ型</Label>
          <Input
            value={fmt.dataType}
            onChange={(e) =>
              dispatch({ type: "setFormat", format: { dataType: e.target.value } })
            }
            placeholder="uint8_t など"
            className="font-mono"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>1行あたり要素数</Label>
            <Input
              type="number"
              min={1}
              max={256}
              value={fmt.itemsPerLine}
              onChange={(e) =>
                dispatch({
                  type: "setFormat",
                  format: {
                    itemsPerLine: Math.max(1, parseInt(e.target.value) || 1),
                  },
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>インデント</Label>
            <Select
              value={String(fmt.indent.length) + (fmt.indent.includes("\t") ? "t" : "s")}
              onValueChange={(v) => {
                const indent =
                  v === "2s" ? "  " : v === "4s" ? "    " : v === "8s" ? "        " : "\t";
                dispatch({ type: "setFormat", format: { indent } });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2s">スペース2</SelectItem>
                <SelectItem value="4s">スペース4</SelectItem>
                <SelectItem value="8s">スペース8</SelectItem>
                <SelectItem value="1t">タブ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>0/1 反転</Label>
            <Switch
              checked={fmt.invert}
              onCheckedChange={(v) =>
                dispatch({ type: "setFormat", format: { invert: v } })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>文字コメントを挿入</Label>
            <Switch
              checked={fmt.includeCharComment}
              onCheckedChange={(v) =>
                dispatch({ type: "setFormat", format: { includeCharComment: v } })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>ASCIIアートも含める</Label>
            <Switch
              checked={fmt.includeAsciiArt}
              onCheckedChange={(v) =>
                dispatch({ type: "setFormat", format: { includeAsciiArt: v } })
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
