import { Check, Copy, Download } from "lucide-react";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { FormatOptions, Glyph } from "@/core/types";
import { formatOutput, LANGUAGE_EXT } from "@/core/format";

type Props = {
  glyphs: Glyph[];
  format: FormatOptions;
};

export function OutputPanel({ glyphs, format }: Props) {
  const text = useMemo(() => formatOutput(glyphs, format), [glyphs, format]);
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error(e);
    }
  };

  const onDownload = () => {
    const ext = LANGUAGE_EXT[format.language];
    const filename = `${format.variableName || "font"}.${ext}`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle>出力</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onCopy} disabled={!text}>
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? "コピー済み" : "コピー"}
          </Button>
          <Button size="sm" variant="outline" onClick={onDownload} disabled={!text}>
            <Download className="h-3.5 w-3.5" />
            ダウンロード
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <pre className="h-full max-h-[calc(100vh-20rem)] min-h-[300px] overflow-auto rounded-md bg-[#0b1221] text-[#e6edf3] p-4 text-xs font-mono leading-relaxed scrollbar-thin">
          <code>{text || "// 文字を入力するとここにコードが生成されます\n// コピーボタンでそのまま使えます"}</code>
        </pre>
      </CardContent>
    </Card>
  );
}
