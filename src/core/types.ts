// コア型定義
export type Bit = 0 | 1;
export type Matrix = Bit[][]; // [row][col]

export type Glyph = {
  char: string;
  width: number;
  height: number;
  matrix: Matrix;
};

export type FontDef = {
  id: string;
  name: string;
  family: string;
  url?: string;        // publicからの相対URL（同梱フォント用）
  isCustom?: boolean;  // ユーザーアップロード
  recommendedSize?: number;
};

export type RasterizeOptions = {
  text: string;
  fontFamily: string;
  width: number;
  height: number;
  size: number;        // フォントのpxサイズ
  threshold: number;   // 0-255 二値化閾値
  offsetX: number;
  offsetY: number;
  bold: boolean;
};

export type OutputLanguage =
  | "c"
  | "cpp"
  | "arduino"
  | "python"
  | "javascript"
  | "typescript"
  | "rust"
  | "go"
  | "json"
  | "markdown"
  | "plain"
  | "symbols";

export type Structure =
  | "matrix2d"       // 1文字: [[..],[..]]
  | "matrix3d"       // 複数文字: [[[..]],...]
  | "flat"           // 1次元
  | "bitpack-row"    // 行方向にビットパック
  | "bitpack-col";   // 列方向にビットパック

export type Radix = "bin" | "hex" | "dec";

export type BitOrder = "msb" | "lsb";

export type FormatOptions = {
  language: OutputLanguage;
  structure: Structure;
  dataType: string;        // 例: "uint8_t", "const uint8_t PROGMEM"
  bitOrder: BitOrder;      // ビットパック時
  radix: Radix;            // 表記
  invert: boolean;         // 0/1 反転
  variableName: string;
  itemsPerLine: number;    // 1行に何個
  includeCharComment: boolean; // 各文字の前に // 'A' のようなコメント
  includeAsciiArt: boolean;    // コメントにドット絵も入れる
  padByte: boolean;        // バイト境界に揃える（bitpack時）
  indent: string;          // インデント文字
  prefix: string;          // 先頭に挿入
  suffix: string;          // 末尾に挿入
};

export type AppState = {
  text: string;
  fontId: string;
  width: number;
  height: number;
  size: number;
  threshold: number;
  offsetX: number;
  offsetY: number;
  bold: boolean;
  format: FormatOptions;
  // ピクセルエディタの上書き: charIndex -> override matrix
  overrides: Record<number, Matrix>;
};
