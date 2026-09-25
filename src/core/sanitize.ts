import type {
  AppState,
  Bit,
  BitOrder,
  FormatOptions,
  Matrix,
  OutputLanguage,
  Radix,
  Structure,
} from "./types";
import { DEFAULT_STATE } from "./defaults";
import { BUILTIN_FONTS } from "./fonts";

// 外から読み込んだ AppState（共有 URL の ?s= / LocalStorage）を、型と値の範囲で検証して丸める。
// 共有 URL は第三者が自由に作れるので、巨大なサイズでタブを固めたり、
// 生成コードに任意の文字列を差し込んだりできないようにする。
//
// - "share":  共有 URL から読むとき。第三者の入力として厳しく扱う
// - "stored": LocalStorage から読むとき。利用者自身が UI で入れた値なので、形と範囲だけを直す
export type SanitizeSource = "share" | "stored";

// UI の入力範囲に合わせた上限（InputPanel / FreeCanvasPanel / FormatPanel）
const GLYPH_SIZE = { min: 1, max: 128 };
const FONT_PX = { min: 4, max: 64 };
const THRESHOLD = { min: 1, max: 254 };
const OFFSET = { min: -256, max: 256 };
const FREE_SIZE = { min: 1, max: 256 };
const ITEMS_PER_LINE = { min: 1, max: 4096 };
const GRID_STEPS = [0, 2, 4, 8, 16, 32];

// 共有 URL から読むときの描画量の上限。ラスタライズの手間は「文字数 × 幅 × 高さ」に比例するので、
// 両方に上限を掛ける（16x16 なら 2000 文字、128x128 なら 122 文字まで。どちらも 2 秒前後で描き終わる）
export const SHARE_MAX_CHARS = 2000;
export const SHARE_MAX_CELLS = 2_000_000;

const MAX_TEXT_LENGTH = 1_000_000;
const MAX_NAME_LENGTH = 64;

const LANGUAGES: readonly OutputLanguage[] = [
  "c", "cpp", "arduino", "python", "javascript", "typescript",
  "rust", "go", "json", "markdown", "plain", "symbols",
];
const STRUCTURES: readonly Structure[] = [
  "matrix2d", "matrix3d", "flat", "bitpack-row", "bitpack-col",
];
const RADIXES: readonly Radix[] = ["bin", "hex", "dec"];
const BIT_ORDERS: readonly BitOrder[] = ["msb", "lsb"];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function intIn(v: unknown, r: { min: number; max: number }, fallback: number): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
  return Math.max(r.min, Math.min(r.max, Math.round(v)));
}

function numIn(v: unknown, r: { min: number; max: number }, fallback: number): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
  return Math.max(r.min, Math.min(r.max, v));
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function oneOf<T extends string | number>(v: unknown, list: readonly T[], fallback: T): T {
  return list.includes(v as T) ? (v as T) : fallback;
}

// 改行・制御文字を除いて長さを切る（UI の 1 行入力では入らない文字）
function singleLine(v: unknown, fallback: string): string {
  if (typeof v !== "string") return fallback;
  // eslint-disable-next-line no-control-regex
  return v.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, "").slice(0, MAX_NAME_LENGTH);
}

// 共有 URL の変数名は識別子に使える文字だけにする（文や式を差し込ませない）
function identifier(v: unknown, fallback: string): string {
  const s = singleLine(v, fallback).replace(/[^\p{L}\p{N}_$]/gu, "");
  return s || fallback;
}

// 共有 URL のデータ型は型名に使う文字だけにする（例: "const uint8_t PROGMEM"・"u8"・"number"）
function typeName(v: unknown, fallback: string): string {
  return singleLine(v, fallback).replace(/[^\p{L}\p{N}_ *:<>,&[\]]/gu, "");
}

function indent(v: unknown, fallback: string): string {
  return typeof v === "string" && /^[ \t]{0,16}$/.test(v) ? v : fallback;
}

// 0/1 の行列を width x height に揃える（足りない所は 0、はみ出しは捨てる）
function matrix(v: unknown, width: number, height: number): Matrix {
  const rows = Array.isArray(v) ? v : [];
  const out: Matrix = [];
  for (let y = 0; y < height; y++) {
    const row = Array.isArray(rows[y]) ? (rows[y] as unknown[]) : [];
    const next: Bit[] = [];
    for (let x = 0; x < width; x++) next.push(row[x] === 1 ? 1 : 0);
    out.push(next);
  }
  return out;
}

// 形が width x height の 0/1 行列のときだけ受け入れる（ピクセルエディタの上書き用）
function exactMatrix(v: unknown, width: number, height: number): Matrix | null {
  if (!Array.isArray(v) || v.length !== height) return null;
  for (const row of v) {
    if (!Array.isArray(row) || row.length !== width) return null;
    if (!row.every((b) => b === 0 || b === 1)) return null;
  }
  return (v as Matrix).map((row) => row.slice() as Bit[]);
}

function sanitizeFormat(
  v: unknown,
  source: SanitizeSource,
  defaults: FormatOptions
): FormatOptions {
  const f = isRecord(v) ? v : {};
  const strict = source === "share";
  return {
    language: oneOf(f.language, LANGUAGES, defaults.language),
    structure: oneOf(f.structure, STRUCTURES, defaults.structure),
    dataType: strict ? typeName(f.dataType, defaults.dataType) : singleLine(f.dataType, defaults.dataType),
    bitOrder: oneOf(f.bitOrder, BIT_ORDERS, defaults.bitOrder),
    radix: oneOf(f.radix, RADIXES, defaults.radix),
    invert: bool(f.invert, defaults.invert),
    variableName: strict
      ? identifier(f.variableName, defaults.variableName)
      : singleLine(f.variableName, defaults.variableName),
    itemsPerLine: intIn(f.itemsPerLine, ITEMS_PER_LINE, defaults.itemsPerLine),
    includeCharComment: bool(f.includeCharComment, defaults.includeCharComment),
    includeAsciiArt: bool(f.includeAsciiArt, defaults.includeAsciiArt),
    padByte: bool(f.padByte, defaults.padByte),
    indent: indent(f.indent, defaults.indent),
    // prefix / suffix は UI から設定できない。外から入った値は、利用者が気付けないまま
    // 生成コードの先頭・末尾に付き続けるので、読み込み時は常に既定値へ戻す
    prefix: defaults.prefix,
    suffix: defaults.suffix,
  };
}

export function sanitizeState(
  input: unknown,
  source: SanitizeSource,
  defaults: AppState = DEFAULT_STATE
): AppState {
  const s = isRecord(input) ? input : {};
  const strict = source === "share";

  const width = intIn(s.width, GLYPH_SIZE, defaults.width);
  const height = intIn(s.height, GLYPH_SIZE, defaults.height);

  let text = typeof s.text === "string" ? s.text.slice(0, MAX_TEXT_LENGTH) : defaults.text;
  if (strict) {
    // サロゲートペアを割らないよう、コードポイント単位で数えて切る
    const maxChars = Math.min(SHARE_MAX_CHARS, Math.floor(SHARE_MAX_CELLS / (width * height)));
    const chars = Array.from(text);
    if (chars.length > maxChars) text = chars.slice(0, maxChars).join("");
  }

  const glyphCount = Array.from(text).length;
  const overrides: AppState["overrides"] = {};
  // 共有リンクには overrides を含めない（share.ts と同じ扱い）
  if (!strict && isRecord(s.overrides)) {
    for (const [key, m] of Object.entries(s.overrides)) {
      const i = Number(key);
      if (!Number.isInteger(i) || i < 0 || i >= glyphCount) continue;
      const ok = exactMatrix(m, width, height);
      if (ok) overrides[i] = ok;
    }
  }

  const free = isRecord(s.free) ? s.free : {};
  const freeWidth = intIn(free.width, FREE_SIZE, defaults.free.width);
  const freeHeight = intIn(free.height, FREE_SIZE, defaults.free.height);

  return {
    text,
    fontId: oneOf(
      s.fontId,
      BUILTIN_FONTS.map((f) => f.id),
      defaults.fontId
    ),
    width,
    height,
    size: intIn(s.size, FONT_PX, defaults.size),
    threshold: intIn(s.threshold, THRESHOLD, defaults.threshold),
    offsetX: numIn(s.offsetX, OFFSET, defaults.offsetX),
    offsetY: numIn(s.offsetY, OFFSET, defaults.offsetY),
    bold: bool(s.bold, defaults.bold),
    format: sanitizeFormat(s.format, source, defaults.format),
    overrides,
    previewGridStep: oneOf(s.previewGridStep, GRID_STEPS, defaults.previewGridStep),
    free: {
      width: freeWidth,
      height: freeHeight,
      matrix: matrix(free.matrix, freeWidth, freeHeight),
      gridStep: oneOf(free.gridStep, GRID_STEPS, defaults.free.gridStep),
    },
  };
}
