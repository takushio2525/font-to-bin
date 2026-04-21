import type {
  FormatOptions,
  Glyph,
  Matrix,
  OutputLanguage,
  Structure,
} from "./types";
import {
  flattenRowMajor,
  formatNumber,
  packColumn,
  packRow,
} from "./encode";
import { invertMatrix } from "./rasterize";

// 各文字からエンコード済み数値列を生成する
function encodeGlyph(
  matrix: Matrix,
  structure: Structure,
  bitOrder: "msb" | "lsb"
): number[] | number[][] {
  if (structure === "bitpack-row") return packRow(matrix, bitOrder);
  if (structure === "bitpack-col") return packColumn(matrix, bitOrder);
  if (structure === "flat") return flattenRowMajor(matrix);
  // matrix2d / matrix3d は行列のまま返す
  return matrix as unknown as number[][];
}

function radixBitWidth(structure: Structure): number {
  // ビットパックなら1バイト、そうでなければ1ビット
  return structure.startsWith("bitpack") ? 8 : 1;
}

// 1文字ぶんのコメント（ASCIIアートつきも可）
function charComment(
  glyph: Glyph,
  opts: FormatOptions,
  commentStart: string,
  commentLineCont: string,
  commentEnd: string
): string {
  const lines: string[] = [];
  const charLabel = JSON.stringify(glyph.char);
  lines.push(`${commentStart} char: ${charLabel} (${glyph.width}x${glyph.height})`);
  if (opts.includeAsciiArt) {
    for (const row of glyph.matrix) {
      const art = row.map((b) => (b ? "#" : ".")).join("");
      lines.push(`${commentLineCont} ${art}`);
    }
  }
  if (commentEnd) lines.push(commentEnd);
  return lines.join("\n");
}

// 配列要素を1行ずつに折り畳む
function chunkArray<T>(arr: T[], itemsPerLine: number): T[][] {
  if (itemsPerLine <= 0) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += itemsPerLine) {
    out.push(arr.slice(i, i + itemsPerLine));
  }
  return out;
}

// 全文字分のエンコード結果を、言語別構文で整形する
export function formatOutput(
  glyphs: Glyph[],
  opts: FormatOptions
): string {
  if (glyphs.length === 0) return "";

  // 反転適用
  const processed = glyphs.map((g) =>
    opts.invert ? { ...g, matrix: invertMatrix(g.matrix) } : g
  );

  switch (opts.language) {
    case "c":
    case "cpp":
    case "arduino":
      return formatC(processed, opts);
    case "python":
      return formatPython(processed, opts);
    case "javascript":
      return formatJS(processed, opts, false);
    case "typescript":
      return formatJS(processed, opts, true);
    case "rust":
      return formatRust(processed, opts);
    case "go":
      return formatGo(processed, opts);
    case "json":
      return formatJSON(processed, opts);
    case "markdown":
      return formatMarkdown(processed, opts);
    case "symbols":
      return formatSymbols(processed, opts);
    case "plain":
    default:
      return formatPlain(processed, opts);
  }
}

// ─── C / C++ / Arduino ───────────────────────────────
function formatC(glyphs: Glyph[], opts: FormatOptions): string {
  const width = glyphs[0].width;
  const height = glyphs[0].height;
  const lines: string[] = [];
  const bitWidth = radixBitWidth(opts.structure);
  const count = glyphs.length;

  const dataType = opts.dataType || "uint8_t";
  const nameWithDims = buildCDeclaration(
    dataType,
    opts.variableName,
    opts.structure,
    count,
    width,
    height,
    opts.language === "arduino"
  );

  if (opts.prefix) lines.push(opts.prefix);
  lines.push(`${nameWithDims} = {`);

  glyphs.forEach((g, i) => {
    if (opts.includeCharComment) {
      lines.push(
        indentBlock(
          charComment(g, opts, "  //", "  //", ""),
          opts.indent
        )
      );
    }
    lines.push(indentBlock(encodeOneC(g, opts, bitWidth), opts.indent));
    if (i < glyphs.length - 1) {
      // カンマを最後の行末に追加
      const lastIdx = lines.length - 1;
      lines[lastIdx] = lines[lastIdx] + ",";
    }
  });

  lines.push("};");
  if (opts.suffix) lines.push(opts.suffix);

  return lines.join("\n");
}

function buildCDeclaration(
  dataType: string,
  name: string,
  structure: Structure,
  count: number,
  width: number,
  height: number,
  arduino: boolean
): string {
  const progmem = arduino ? " PROGMEM" : "";
  if (structure === "matrix3d") {
    return `const ${dataType} ${name}[${count}][${height}][${width}]${progmem}`;
  }
  if (structure === "matrix2d") {
    return `const ${dataType} ${name}[${height}][${width}]${progmem}`;
  }
  if (structure === "flat") {
    const total = count * height * width;
    return `const ${dataType} ${name}[${total}]${progmem}`;
  }
  // ビットパック
  // 1文字あたりのバイト数 ≒ ceil(w*h/8) の近似（行/列でceilは各ライン単位）
  // 厳密計算
  return `const ${dataType} ${name}[]${progmem}`;
}

function encodeOneC(
  glyph: Glyph,
  opts: FormatOptions,
  bitWidth: number
): string {
  const encoded = encodeGlyph(glyph.matrix, opts.structure, opts.bitOrder);

  // 2D/3D のとき: 内側中括弧で行を表現
  if (opts.structure === "matrix2d" || opts.structure === "matrix3d") {
    const matrix = encoded as number[][];
    const rows = matrix.map((r) => {
      const s = r.map((v) => formatNumber(v, opts.radix, bitWidth)).join(", ");
      return `{${s}}`;
    });
    const body = rows.map((r) => opts.indent + r).join(",\n");
    return `{\n${body}\n}`;
  }

  // flat / bitpack: 1D
  const arr = encoded as number[];
  const chunks = chunkArray(arr, opts.itemsPerLine);
  const bitw = opts.structure.startsWith("bitpack") ? 8 : 1;
  const body = chunks
    .map(
      (c) =>
        opts.indent + c.map((v) => formatNumber(v, opts.radix, bitw)).join(", ")
    )
    .join(",\n");
  return `{\n${body}\n}`;
}

// ─── Python ───────────────────────────────
function formatPython(glyphs: Glyph[], opts: FormatOptions): string {
  const lines: string[] = [];
  const bitWidth = radixBitWidth(opts.structure);

  if (opts.prefix) lines.push(opts.prefix);

  const open = opts.structure === "matrix3d" ? "[" : "[";
  lines.push(`${opts.variableName} = ${open}`);

  glyphs.forEach((g, i) => {
    if (opts.includeCharComment) {
      lines.push(indentBlock(charComment(g, opts, "#", "#", ""), opts.indent));
    }
    lines.push(indentBlock(encodeOnePython(g, opts, bitWidth), opts.indent));
    if (i < glyphs.length - 1) {
      const lastIdx = lines.length - 1;
      lines[lastIdx] = lines[lastIdx] + ",";
    }
  });

  lines.push(`]`);
  if (opts.suffix) lines.push(opts.suffix);
  return lines.join("\n");
}

function encodeOnePython(
  glyph: Glyph,
  opts: FormatOptions,
  _bitWidth: number
): string {
  const encoded = encodeGlyph(glyph.matrix, opts.structure, opts.bitOrder);
  const radix = opts.radix;
  const bitw = opts.structure.startsWith("bitpack") ? 8 : 1;
  const numFmt = (n: number) => {
    if (radix === "bin") return "0b" + n.toString(2).padStart(bitw, "0");
    if (radix === "hex")
      return "0x" + n.toString(16).padStart(Math.ceil(bitw / 4), "0").toUpperCase();
    return String(n);
  };

  if (opts.structure === "matrix2d" || opts.structure === "matrix3d") {
    const matrix = encoded as number[][];
    const rows = matrix.map((r) => `[${r.map(numFmt).join(", ")}]`);
    const body = rows.map((r) => opts.indent + r).join(",\n");
    return `[\n${body}\n]`;
  }
  const arr = encoded as number[];
  const chunks = chunkArray(arr, opts.itemsPerLine);
  const body = chunks
    .map((c) => opts.indent + c.map(numFmt).join(", "))
    .join(",\n");
  return `[\n${body}\n]`;
}

// ─── JavaScript / TypeScript ───────────────────────────────
function formatJS(glyphs: Glyph[], opts: FormatOptions, ts: boolean): string {
  const lines: string[] = [];
  const bitWidth = radixBitWidth(opts.structure);

  if (opts.prefix) lines.push(opts.prefix);

  const type = ts
    ? opts.structure === "matrix2d"
      ? ": number[][]"
      : opts.structure === "matrix3d"
        ? ": number[][][]"
        : ": number[]"
    : "";
  lines.push(`export const ${opts.variableName}${type} = [`);

  glyphs.forEach((g, i) => {
    if (opts.includeCharComment) {
      lines.push(indentBlock(charComment(g, opts, "  //", "  //", ""), opts.indent));
    }
    lines.push(indentBlock(encodeOnePython(g, opts, bitWidth), opts.indent));
    if (i < glyphs.length - 1) {
      const lastIdx = lines.length - 1;
      lines[lastIdx] = lines[lastIdx] + ",";
    }
  });

  lines.push(`];`);
  if (opts.suffix) lines.push(opts.suffix);
  return lines.join("\n");
}

// ─── Rust ───────────────────────────────
function formatRust(glyphs: Glyph[], opts: FormatOptions): string {
  const lines: string[] = [];
  const count = glyphs.length;
  const w = glyphs[0].width;
  const h = glyphs[0].height;
  const bitWidth = radixBitWidth(opts.structure);

  if (opts.prefix) lines.push(opts.prefix);

  const name = opts.variableName.toUpperCase();
  const dataType = opts.dataType || "u8";

  let typeSig: string;
  if (opts.structure === "matrix3d") {
    typeSig = `[[[${dataType}; ${w}]; ${h}]; ${count}]`;
  } else if (opts.structure === "matrix2d") {
    typeSig = `[[${dataType}; ${w}]; ${h}]`;
  } else if (opts.structure === "flat") {
    typeSig = `[${dataType}; ${count * w * h}]`;
  } else {
    typeSig = `&[${dataType}]`;
  }

  lines.push(`pub const ${name}: ${typeSig} = [`);
  glyphs.forEach((g, i) => {
    if (opts.includeCharComment) {
      lines.push(indentBlock(charComment(g, opts, "//", "//", ""), opts.indent));
    }
    lines.push(indentBlock(encodeOneRust(g, opts, bitWidth), opts.indent));
    if (i < glyphs.length - 1) {
      const lastIdx = lines.length - 1;
      lines[lastIdx] = lines[lastIdx] + ",";
    }
  });
  lines.push(`];`);
  if (opts.suffix) lines.push(opts.suffix);
  return lines.join("\n");
}

function encodeOneRust(
  glyph: Glyph,
  opts: FormatOptions,
  _bitWidth: number
): string {
  const encoded = encodeGlyph(glyph.matrix, opts.structure, opts.bitOrder);
  const bitw = opts.structure.startsWith("bitpack") ? 8 : 1;
  const numFmt = (n: number) => formatNumber(n, opts.radix, bitw);
  if (opts.structure === "matrix2d" || opts.structure === "matrix3d") {
    const matrix = encoded as number[][];
    const rows = matrix.map((r) => `[${r.map(numFmt).join(", ")}]`);
    return `[\n${rows.map((r) => opts.indent + r).join(",\n")}\n]`;
  }
  const arr = encoded as number[];
  const chunks = chunkArray(arr, opts.itemsPerLine);
  return (
    `[\n` +
    chunks.map((c) => opts.indent + c.map(numFmt).join(", ")).join(",\n") +
    `\n]`
  );
}

// ─── Go ───────────────────────────────
function formatGo(glyphs: Glyph[], opts: FormatOptions): string {
  const lines: string[] = [];
  const count = glyphs.length;
  const w = glyphs[0].width;
  const h = glyphs[0].height;
  const dataType = opts.dataType || "uint8";
  const bitWidth = radixBitWidth(opts.structure);

  if (opts.prefix) lines.push(opts.prefix);

  let typeSig: string;
  if (opts.structure === "matrix3d") {
    typeSig = `[${count}][${h}][${w}]${dataType}`;
  } else if (opts.structure === "matrix2d") {
    typeSig = `[${h}][${w}]${dataType}`;
  } else if (opts.structure === "flat") {
    typeSig = `[${count * w * h}]${dataType}`;
  } else {
    typeSig = `[]${dataType}`;
  }

  lines.push(`var ${opts.variableName} = ${typeSig}{`);
  glyphs.forEach((g, i) => {
    if (opts.includeCharComment) {
      lines.push(indentBlock(charComment(g, opts, "//", "//", ""), opts.indent));
    }
    lines.push(indentBlock(encodeOneGo(g, opts, bitWidth), opts.indent));
    if (i < glyphs.length - 1) {
      const lastIdx = lines.length - 1;
      lines[lastIdx] = lines[lastIdx] + ",";
    }
  });
  lines.push(`}`);
  if (opts.suffix) lines.push(opts.suffix);
  return lines.join("\n");
}

function encodeOneGo(glyph: Glyph, opts: FormatOptions, _bw: number): string {
  const encoded = encodeGlyph(glyph.matrix, opts.structure, opts.bitOrder);
  const bitw = opts.structure.startsWith("bitpack") ? 8 : 1;
  const numFmt = (n: number) => formatNumber(n, opts.radix, bitw);
  if (opts.structure === "matrix2d" || opts.structure === "matrix3d") {
    const matrix = encoded as number[][];
    const rows = matrix.map((r) => `{${r.map(numFmt).join(", ")}}`);
    return `{\n${rows.map((r) => opts.indent + r).join(",\n")},\n}`;
  }
  const arr = encoded as number[];
  const chunks = chunkArray(arr, opts.itemsPerLine);
  return (
    `{\n` +
    chunks.map((c) => opts.indent + c.map(numFmt).join(", ")).join(",\n") +
    `,\n}`
  );
}

// ─── JSON ───────────────────────────────
function formatJSON(glyphs: Glyph[], opts: FormatOptions): string {
  const data = glyphs.map((g) => {
    const matrix = opts.invert ? invertMatrix(g.matrix) : g.matrix;
    const encoded = encodeGlyph(matrix, opts.structure, opts.bitOrder);
    return {
      char: g.char,
      width: g.width,
      height: g.height,
      data: encoded,
    };
  });

  const wrap: Record<string, unknown> = {
    name: opts.variableName,
    structure: opts.structure,
    radix: opts.radix,
    bitOrder: opts.bitOrder,
    glyphs: data,
  };
  return JSON.stringify(wrap, null, 2);
}

// ─── Markdown ───────────────────────────────
function formatMarkdown(glyphs: Glyph[], _opts: FormatOptions): string {
  const parts: string[] = [];
  for (const g of glyphs) {
    parts.push(`### \`${g.char}\` (${g.width}×${g.height})\n`);
    parts.push("```");
    for (const row of g.matrix) {
      parts.push(row.map((b) => (b ? "█" : " ")).join(""));
    }
    parts.push("```\n");
  }
  return parts.join("\n");
}

// ─── Symbols ───────────────────────────────
function formatSymbols(glyphs: Glyph[], _opts: FormatOptions): string {
  const parts: string[] = [];
  for (const g of glyphs) {
    parts.push(`-- '${g.char}' --`);
    for (const row of g.matrix) {
      parts.push(row.map((b) => (b ? "█" : "·")).join(""));
    }
  }
  return parts.join("\n");
}

// ─── Plain ───────────────────────────────
function formatPlain(glyphs: Glyph[], opts: FormatOptions): string {
  const parts: string[] = [];
  const bitw = opts.structure.startsWith("bitpack") ? 8 : 1;
  const numFmt = (n: number) => formatNumber(n, opts.radix, bitw);
  for (const g of glyphs) {
    parts.push(`# '${g.char}'`);
    const encoded = encodeGlyph(g.matrix, opts.structure, opts.bitOrder);
    if (opts.structure === "matrix2d" || opts.structure === "matrix3d") {
      const m = encoded as number[][];
      for (const row of m) parts.push(row.map(numFmt).join(" "));
    } else {
      const arr = encoded as number[];
      const chunks = chunkArray(arr, opts.itemsPerLine || 16);
      for (const c of chunks) parts.push(c.map(numFmt).join(" "));
    }
    parts.push("");
  }
  return parts.join("\n");
}

function indentBlock(s: string, indent: string): string {
  return s
    .split("\n")
    .map((l) => indent + l)
    .join("\n");
}

// 出力言語の表示ラベル
export const LANGUAGE_LABELS: Record<OutputLanguage, string> = {
  c: "C",
  cpp: "C++",
  arduino: "Arduino (PROGMEM)",
  python: "Python",
  javascript: "JavaScript",
  typescript: "TypeScript",
  rust: "Rust",
  go: "Go",
  json: "JSON",
  markdown: "Markdown",
  plain: "プレーンテキスト",
  symbols: "記号アート",
};

// 言語ごとのデフォルトデータ型
export const DEFAULT_DATA_TYPE: Record<OutputLanguage, string> = {
  c: "uint8_t",
  cpp: "uint8_t",
  arduino: "uint8_t",
  python: "",
  javascript: "",
  typescript: "number",
  rust: "u8",
  go: "uint8",
  json: "",
  markdown: "",
  plain: "",
  symbols: "",
};

// 言語ごとのファイル拡張子（ダウンロード用）
export const LANGUAGE_EXT: Record<OutputLanguage, string> = {
  c: "h",
  cpp: "hpp",
  arduino: "h",
  python: "py",
  javascript: "js",
  typescript: "ts",
  rust: "rs",
  go: "go",
  json: "json",
  markdown: "md",
  plain: "txt",
  symbols: "txt",
};
