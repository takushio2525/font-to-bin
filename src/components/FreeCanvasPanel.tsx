import { useEffect, useMemo, useRef, useState } from "react";
import {
  Eraser,
  FlipHorizontal,
  FlipVertical,
  Paintbrush,
  RotateCcw,
  RotateCw,
  Trash2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Bit, FreeCanvasState, Matrix } from "@/core/types";
import type { Action } from "@/hooks/useAppState";
import { invertMatrix } from "@/core/rasterize";

type Tool = "pen" | "erase" | "toggle";

type Props = {
  free: FreeCanvasState;
  dispatch: React.Dispatch<Action>;
};

// 自由描画キャンバス: 任意サイズ・スクロール・補助線つき
export function FreeCanvasPanel({ free, dispatch }: Props) {
  const [tool, setTool] = useState<Tool>("toggle");
  const [scale, setScale] = useState<number>(() => defaultScaleFor(free.width, free.height));
  const [wInput, setWInput] = useState<string>(String(free.width));
  const [hInput, setHInput] = useState<string>(String(free.height));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draggingRef = useRef<{ mode: 0 | 1 | null }>({ mode: null });

  // サイズが外部から変わったら入力欄も同期
  useEffect(() => {
    setWInput(String(free.width));
    setHInput(String(free.height));
  }, [free.width, free.height]);

  // 描画
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = free.width;
    const h = free.height;
    canvas.width = w * scale;
    canvas.height = h * scale;

    ctx.fillStyle = "#0b1221";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (free.matrix[y][x]) {
          ctx.fillStyle = "#ffdd55";
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }

    // 細グリッド
    if (scale >= 4) {
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= w; x++) {
        ctx.beginPath();
        ctx.moveTo(x * scale + 0.5, 0);
        ctx.lineTo(x * scale + 0.5, h * scale);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * scale + 0.5);
        ctx.lineTo(w * scale, y * scale + 0.5);
        ctx.stroke();
      }
    }

    // 強調線
    if (free.gridStep > 0) {
      ctx.strokeStyle = "rgba(46,134,193,0.65)";
      ctx.lineWidth = 1.5;
      for (let x = 0; x <= w; x += free.gridStep) {
        ctx.beginPath();
        ctx.moveTo(x * scale + 0.5, 0);
        ctx.lineTo(x * scale + 0.5, h * scale);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += free.gridStep) {
        ctx.beginPath();
        ctx.moveTo(0, y * scale + 0.5);
        ctx.lineTo(w * scale, y * scale + 0.5);
        ctx.stroke();
      }
    }
  }, [free.matrix, free.width, free.height, free.gridStep, scale]);

  const getCell = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / scale);
    const y = Math.floor((e.clientY - rect.top) / scale);
    if (x < 0 || y < 0 || x >= free.width || y >= free.height) return null;
    return { x, y };
  };

  const applyAt = (x: number, y: number, mode: 0 | 1 | null) => {
    const cur = free.matrix[y][x];
    let value: Bit;
    if (tool === "pen") value = 1;
    else if (tool === "erase") value = 0;
    else value = mode === null ? ((cur ? 0 : 1) as Bit) : (mode as Bit);
    dispatch({ type: "setFreePixel", x, y, value });
  };

  const onMouseDown = (e: React.MouseEvent) => {
    const c = getCell(e);
    if (!c) return;
    if (tool === "toggle") {
      const target = (free.matrix[c.y][c.x] ? 0 : 1) as 0 | 1;
      draggingRef.current.mode = target;
      applyAt(c.x, c.y, target);
    } else {
      draggingRef.current.mode = tool === "pen" ? 1 : 0;
      applyAt(c.x, c.y, null);
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (draggingRef.current.mode === null) return;
    const c = getCell(e);
    if (!c) return;
    applyAt(c.x, c.y, draggingRef.current.mode);
  };

  const onMouseUp = () => {
    draggingRef.current.mode = null;
  };

  const onClear = () => dispatch({ type: "clearFree" });
  const onInvert = () =>
    dispatch({ type: "setFreeMatrix", matrix: invertMatrix(free.matrix) });
  const onFlipH = () =>
    dispatch({
      type: "setFreeMatrix",
      matrix: free.matrix.map((row) => [...row].reverse() as Matrix[number]),
    });
  const onFlipV = () =>
    dispatch({ type: "setFreeMatrix", matrix: [...free.matrix].reverse() });
  const onRotate = () => {
    if (free.width !== free.height) return;
    const n = free.width;
    const rotated: Matrix = [];
    for (let y = 0; y < n; y++) {
      const row: Bit[] = [];
      for (let x = 0; x < n; x++) row.push(0);
      rotated.push(row);
    }
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        rotated[x][n - 1 - y] = free.matrix[y][x];
      }
    }
    dispatch({ type: "setFreeMatrix", matrix: rotated });
  };

  const commitSize = () => {
    const w = clampInt(wInput, 1, 256, free.width);
    const h = clampInt(hInput, 1, 256, free.height);
    if (w !== free.width || h !== free.height) {
      dispatch({ type: "setFreeSize", width: w, height: h });
    } else {
      setWInput(String(free.width));
      setHInput(String(free.height));
    }
  };

  const pixelStats = useMemo(() => {
    let on = 0;
    for (const row of free.matrix) for (const b of row) if (b) on++;
    return { on, total: free.width * free.height };
  }, [free.matrix, free.width, free.height]);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center gap-3">
          <CardTitle>自由キャンバス</CardTitle>
          <span className="text-xs text-muted-foreground">
            {free.width}×{free.height} · 点灯 {pixelStats.on}/{pixelStats.total}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* サイズ */}
          <div className="flex items-center gap-1.5">
            <Label className="text-xs text-muted-foreground">W</Label>
            <Input
              type="number"
              min={1}
              max={256}
              value={wInput}
              onChange={(e) => setWInput(e.target.value)}
              onBlur={commitSize}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              className="h-8 w-16 text-sm"
            />
            <span className="text-xs text-muted-foreground">×</span>
            <Label className="text-xs text-muted-foreground">H</Label>
            <Input
              type="number"
              min={1}
              max={256}
              value={hInput}
              onChange={(e) => setHInput(e.target.value)}
              onBlur={commitSize}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              className="h-8 w-16 text-sm"
            />
          </div>

          {/* 補助線 */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-muted-foreground">補助線</label>
            <select
              value={free.gridStep}
              onChange={(e) =>
                dispatch({
                  type: "setFreeGridStep",
                  value: parseInt(e.target.value),
                })
              }
              className="h-8 rounded border bg-background px-1.5 text-xs"
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
              onClick={() => setScale((s) => Math.max(2, s - 2))}
              title="縮小"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs tabular-nums w-10 text-center">
              {scale}px
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setScale((s) => Math.min(48, s + 2))}
              title="拡大"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* ツールバー */}
      <div className="px-6 py-2 border-b bg-muted/30 flex flex-wrap items-center gap-2">
        <ToolBtn
          active={tool === "toggle"}
          onClick={() => setTool("toggle")}
          icon={<Paintbrush className="h-3.5 w-3.5" />}
          label="トグル"
        />
        <ToolBtn
          active={tool === "pen"}
          onClick={() => setTool("pen")}
          icon={<Paintbrush className="h-3.5 w-3.5 text-amber-500" />}
          label="ペン"
        />
        <ToolBtn
          active={tool === "erase"}
          onClick={() => setTool("erase")}
          icon={<Eraser className="h-3.5 w-3.5" />}
          label="消しゴム"
        />
        <div className="h-5 w-px bg-border mx-1" />
        <Button variant="ghost" size="sm" onClick={onInvert} title="0/1反転">
          反転
        </Button>
        <Button variant="ghost" size="sm" onClick={onFlipH} title="左右反転">
          <FlipHorizontal className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onFlipV} title="上下反転">
          <FlipVertical className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRotate}
          title="90度回転（正方形のみ）"
          disabled={free.width !== free.height}
        >
          <RotateCw className="h-3.5 w-3.5" />
        </Button>
        <div className="h-5 w-px bg-border mx-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          全消去
        </Button>
        <div className="ml-auto text-xs text-muted-foreground hidden md:block">
          ドラッグで連続描画 · スクロールで全体を移動
        </div>
      </div>

      <CardContent className="p-0">
        {/* スクロール可能なキャンバス領域 */}
        <div
          className="overflow-auto scrollbar-thin bg-background"
          style={{ maxHeight: "min(75vh, 720px)" }}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <div className="p-4 inline-block min-w-full">
            <canvas
              ref={canvasRef}
              className="rounded border border-border bg-[#0b1221] cursor-crosshair touch-none block"
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              style={{ imageRendering: "pixelated" }}
            />
          </div>
        </div>
        <div className="px-6 py-2 border-t text-[11px] text-muted-foreground flex items-center justify-between">
          <span>
            <RotateCcw className="inline h-3 w-3 mr-1" />
            反転・回転はキャンバス全体に適用されます
          </span>
          <span>
            出力はこのキャンバスを1枚のグリフとして扱います
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function ToolBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors " +
        (active
          ? "bg-primary text-primary-foreground"
          : "hover:bg-accent hover:text-accent-foreground")
      }
    >
      {icon}
      {label}
    </button>
  );
}

function clampInt(s: string, min: number, max: number, fallback: number): number {
  const n = parseInt(s, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function defaultScaleFor(w: number, h: number): number {
  const big = Math.max(w, h);
  if (big <= 8) return 32;
  if (big <= 16) return 22;
  if (big <= 32) return 16;
  if (big <= 48) return 12;
  if (big <= 64) return 10;
  if (big <= 96) return 7;
  return 5;
}
