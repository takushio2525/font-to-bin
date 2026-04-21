import { useEffect, useRef } from "react";
import type { Glyph } from "@/core/types";

type Props = {
  glyph: Glyph;
  scale?: number;       // 1ドットのピクセル数
  grid?: boolean;       // グリッド表示
  onClick?: () => void;
  label?: string;
};

// 単一文字のドット絵を Canvas で描画する
export function GlyphPreview({
  glyph,
  scale = 8,
  grid = true,
  onClick,
  label,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = glyph.width;
    const h = glyph.height;
    canvas.width = w * scale;
    canvas.height = h * scale;

    // 背景
    ctx.fillStyle = "#0b1221";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ドット
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (glyph.matrix[y][x]) {
          ctx.fillStyle = "#ffdd55";
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }

    // グリッド
    if (grid && scale >= 4) {
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
  }, [glyph, scale, grid]);

  return (
    <div
      className={`inline-flex flex-col items-center gap-1 ${onClick ? "cursor-pointer group" : ""}`}
      onClick={onClick}
      title={onClick ? "クリックで編集" : undefined}
    >
      <canvas
        ref={canvasRef}
        className="rounded border border-border bg-[#0b1221] group-hover:border-primary"
        style={{ imageRendering: "pixelated" }}
      />
      {label !== undefined && (
        <span className="text-xs font-mono text-muted-foreground">{label}</span>
      )}
    </div>
  );
}
