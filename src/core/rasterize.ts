import type { Bit, Glyph, Matrix, RasterizeOptions } from "./types";

// 単一文字をバイナリ行列にラスタライズする
export function rasterizeChar(
  char: string,
  opts: Omit<RasterizeOptions, "text">
): Glyph {
  const { width, height, fontFamily, size, threshold, offsetX, offsetY, bold } =
    opts;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return { char, width, height, matrix: emptyMatrix(width, height) };
  }

  // 背景を黒で塗りつぶし
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  // フォント指定: フォールバックも含めて複数指定可能
  const weight = bold ? "700" : "400";
  ctx.font = `${weight} ${size}px ${fontFamily}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.imageSmoothingEnabled = false;

  const cx = width / 2 + offsetX;
  const cy = height / 2 + offsetY;
  ctx.fillText(char, cx, cy);

  const imgData = ctx.getImageData(0, 0, width, height).data;
  const matrix: Matrix = [];
  for (let y = 0; y < height; y++) {
    const row: Bit[] = [];
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      // アルファも考慮（輝度 * alpha/255）
      const a = imgData[i + 3] / 255;
      const lum = (imgData[i] + imgData[i + 1] + imgData[i + 2]) / 3;
      const v = lum * a;
      row.push(v >= threshold ? 1 : 0);
    }
    matrix.push(row);
  }
  return { char, width, height, matrix };
}

export function rasterizeText(opts: RasterizeOptions): Glyph[] {
  const chars = Array.from(opts.text); // サロゲートペア対応
  return chars.map((c) => rasterizeChar(c, opts));
}

export function emptyMatrix(width: number, height: number): Matrix {
  const m: Matrix = [];
  for (let y = 0; y < height; y++) {
    const row: Bit[] = [];
    for (let x = 0; x < width; x++) row.push(0);
    m.push(row);
  }
  return m;
}

export function cloneMatrix(m: Matrix): Matrix {
  return m.map((row) => row.slice() as Matrix[number]);
}

export function invertMatrix(m: Matrix): Matrix {
  return m.map((row) => row.map((b) => (b ? 0 : 1)) as Matrix[number]);
}
