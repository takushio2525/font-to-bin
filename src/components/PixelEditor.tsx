import { useEffect, useRef, useState } from "react";
import { Eraser, RotateCcw, Save, X, FlipVertical, FlipHorizontal, RotateCw, Paintbrush } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cloneMatrix, emptyMatrix, invertMatrix } from "@/core/rasterize";
import type { Glyph, Matrix } from "@/core/types";

type Props = {
  glyph: Glyph;
  index: number;
  onClose: () => void;
  onSave: (matrix: Matrix) => void;
  onReset: () => void;
};

type Tool = "pen" | "erase" | "toggle";

// モーダル形式のピクセルエディタ
export function PixelEditor({ glyph, index, onClose, onSave, onReset }: Props) {
  const [matrix, setMatrix] = useState<Matrix>(() => cloneMatrix(glyph.matrix));
  const [tool, setTool] = useState<Tool>("toggle");
  const [scale, setScale] = useState(() => {
    const w = glyph.width;
    if (w <= 8) return 32;
    if (w <= 16) return 24;
    if (w <= 24) return 18;
    if (w <= 32) return 14;
    return 10;
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draggingRef = useRef<{ mode: 0 | 1 | null }>({ mode: null });

  useEffect(() => {
    setMatrix(cloneMatrix(glyph.matrix));
  }, [glyph]);

  // 描画
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = glyph.width;
    const h = glyph.height;
    canvas.width = w * scale;
    canvas.height = h * scale;

    ctx.fillStyle = "#0b1221";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (matrix[y][x]) {
          ctx.fillStyle = "#ffdd55";
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }

    // グリッド
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
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
  }, [matrix, glyph, scale]);

  const getCell = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / scale);
    const y = Math.floor((e.clientY - rect.top) / scale);
    if (x < 0 || y < 0 || x >= glyph.width || y >= glyph.height) return null;
    return { x, y };
  };

  const applyAt = (x: number, y: number, mode: 0 | 1 | null) => {
    setMatrix((prev) => {
      const next = cloneMatrix(prev);
      const cur = next[y][x];
      if (tool === "pen") next[y][x] = 1;
      else if (tool === "erase") next[y][x] = 0;
      else if (tool === "toggle") {
        if (mode === null) next[y][x] = cur ? 0 : 1;
        else next[y][x] = mode;
      }
      return next;
    });
  };

  const onMouseDown = (e: React.MouseEvent) => {
    const c = getCell(e);
    if (!c) return;
    if (tool === "toggle") {
      // ドラッグ時は初回セルの反対の値で塗る
      const target = matrix[c.y][c.x] ? 0 : 1;
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

  const onClear = () => setMatrix(emptyMatrix(glyph.width, glyph.height));
  const onInvert = () => setMatrix((m) => invertMatrix(m));
  const onFlipH = () =>
    setMatrix((m) =>
      m.map((row) => [...row].reverse() as Matrix[number])
    );
  const onFlipV = () => setMatrix((m) => [...m].reverse());
  const onRotate = () => {
    setMatrix((m) => {
      const h = m.length;
      const w = m[0]?.length ?? 0;
      // 時計回り90度: new[x][h-1-y] = old[y][x]
      if (w !== h) return m; // 正方形のみ対応
      const next: Matrix = emptyMatrix(w, h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          next[x][h - 1 - y] = m[y][x];
        }
      }
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      onMouseUp={onMouseUp}
    >
      <div
        className="bg-card rounded-xl border shadow-2xl max-w-3xl w-full max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <div>
            <h3 className="text-base font-semibold">
              ピクセルエディタ — <code className="font-mono">{JSON.stringify(glyph.char)}</code>
              <span className="text-xs text-muted-foreground ml-2">
                #{index} ({glyph.width}×{glyph.height})
              </span>
            </h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-5 py-2 border-b bg-muted/30">
          <ToolBtn active={tool === "toggle"} onClick={() => setTool("toggle")} icon={<Paintbrush className="h-3.5 w-3.5" />} label="トグル" />
          <ToolBtn active={tool === "pen"} onClick={() => setTool("pen")} icon={<Paintbrush className="h-3.5 w-3.5 text-amber-500" />} label="ペン" />
          <ToolBtn active={tool === "erase"} onClick={() => setTool("erase")} icon={<Eraser className="h-3.5 w-3.5" />} label="消しゴム" />
          <div className="h-5 w-px bg-border mx-1" />
          <Button variant="ghost" size="sm" onClick={onInvert} title="0/1反転">反転</Button>
          <Button variant="ghost" size="sm" onClick={onFlipH} title="左右反転"><FlipHorizontal className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="sm" onClick={onFlipV} title="上下反転"><FlipVertical className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="sm" onClick={onRotate} title="90度回転（正方形のみ）"><RotateCw className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="sm" onClick={onClear}>クリア</Button>
          <div className="ml-auto flex items-center gap-2">
            <label className="text-xs text-muted-foreground">拡大</label>
            <input
              type="range"
              min={6}
              max={48}
              value={scale}
              onChange={(e) => setScale(parseInt(e.target.value))}
              className="w-28"
            />
            <span className="text-xs w-10 text-right">{scale}px</span>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-5 flex items-center justify-center bg-background scrollbar-thin">
          <canvas
            ref={canvasRef}
            className="rounded border border-border bg-[#0b1221] cursor-crosshair touch-none"
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseUp}
            style={{ imageRendering: "pixelated" }}
          />
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t gap-2">
          <Button variant="ghost" size="sm" onClick={onReset} title="この文字の編集を破棄して自動生成に戻す">
            <RotateCcw className="h-3.5 w-3.5" />
            自動生成に戻す
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>キャンセル</Button>
            <Button size="sm" onClick={() => { onSave(matrix); onClose(); }}>
              <Save className="h-3.5 w-3.5" />
              保存
            </Button>
          </div>
        </div>
      </div>
    </div>
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
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "hover:bg-accent hover:text-accent-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
