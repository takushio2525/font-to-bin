import type { BitOrder, Matrix, Radix } from "./types";

// 行方向にビットパック: 1行分のビットをMSB/LSB順でバイト列に詰める
export function packRow(matrix: Matrix, bitOrder: BitOrder): number[] {
  const bytes: number[] = [];
  for (const row of matrix) {
    let byte = 0;
    let count = 0;
    for (const bit of row) {
      if (bitOrder === "msb") {
        byte = (byte << 1) | bit;
      } else {
        byte = byte | (bit << count);
      }
      count++;
      if (count === 8) {
        bytes.push(byte & 0xff);
        byte = 0;
        count = 0;
      }
    }
    if (count > 0) {
      // 余り分を埋める
      if (bitOrder === "msb") {
        byte = (byte << (8 - count)) & 0xff;
      }
      bytes.push(byte & 0xff);
    }
  }
  return bytes;
}

// 列方向にビットパック: 1列分のビットを縦に詰める（LCD向け）
export function packColumn(matrix: Matrix, bitOrder: BitOrder): number[] {
  if (matrix.length === 0) return [];
  const height = matrix.length;
  const width = matrix[0].length;
  const bytes: number[] = [];

  for (let x = 0; x < width; x++) {
    let byte = 0;
    let count = 0;
    for (let y = 0; y < height; y++) {
      const bit = matrix[y][x];
      if (bitOrder === "msb") {
        byte = (byte << 1) | bit;
      } else {
        byte = byte | (bit << count);
      }
      count++;
      if (count === 8) {
        bytes.push(byte & 0xff);
        byte = 0;
        count = 0;
      }
    }
    if (count > 0) {
      if (bitOrder === "msb") {
        byte = (byte << (8 - count)) & 0xff;
      }
      bytes.push(byte & 0xff);
    }
  }
  return bytes;
}

// 行列をフラット化（row-major）
export function flattenRowMajor(matrix: Matrix): number[] {
  const out: number[] = [];
  for (const row of matrix) for (const b of row) out.push(b);
  return out;
}

// 数値を指定基数で文字列化（bin/hex/dec）
export function formatNumber(
  n: number,
  radix: Radix,
  byteBits = 8
): string {
  switch (radix) {
    case "bin":
      return "0b" + n.toString(2).padStart(byteBits, "0");
    case "hex":
      return "0x" + n.toString(16).padStart(Math.ceil(byteBits / 4), "0").toUpperCase();
    case "dec":
      return String(n);
  }
}
