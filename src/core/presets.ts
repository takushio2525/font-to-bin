import type { FormatOptions } from "./types";

// 用途プリセット：フォーマット設定を一発で切り替える
export type Preset = {
  id: string;
  label: string;
  description: string;
  emoji: string;
  format: Partial<FormatOptions>;
};

export const PRESETS: Preset[] = [
  {
    id: "arduino",
    label: "Arduino / C言語",
    description: "uint8_t 配列として出力（マイコン・OLED 向け）",
    emoji: "🔧",
    format: {
      language: "arduino",
      structure: "bitpack-row",
      dataType: "const uint8_t PROGMEM",
      radix: "hex",
      bitOrder: "msb",
      invert: false,
      variableName: "font_data",
      itemsPerLine: 16,
      includeCharComment: true,
      includeAsciiArt: true,
      padByte: true,
      indent: "  ",
    },
  },
  {
    id: "c-matrix",
    label: "C言語（見やすい2D）",
    description: "1/0 の2次元配列。学習・デバッグ向け",
    emoji: "📋",
    format: {
      language: "c",
      structure: "matrix3d",
      dataType: "uint8_t",
      radix: "dec",
      bitOrder: "msb",
      invert: false,
      variableName: "font_data",
      itemsPerLine: 16,
      includeCharComment: true,
      includeAsciiArt: true,
      padByte: true,
      indent: "    ",
    },
  },
  {
    id: "python-list",
    label: "Python リスト",
    description: "Python の入れ子リストとして出力",
    emoji: "🐍",
    format: {
      language: "python",
      structure: "matrix3d",
      dataType: "",
      radix: "dec",
      bitOrder: "msb",
      invert: false,
      variableName: "font_data",
      itemsPerLine: 16,
      includeCharComment: true,
      includeAsciiArt: false,
      padByte: true,
      indent: "    ",
    },
  },
  {
    id: "micropython",
    label: "MicroPython / bytes",
    description: "ビットパックされた bytes。SSD1306 等で使用",
    emoji: "📟",
    format: {
      language: "python",
      structure: "bitpack-row",
      dataType: "",
      radix: "hex",
      bitOrder: "msb",
      invert: false,
      variableName: "font_data",
      itemsPerLine: 16,
      includeCharComment: true,
      includeAsciiArt: false,
      padByte: true,
      indent: "    ",
    },
  },
  {
    id: "json",
    label: "JSON",
    description: "汎用。他ツールへの受け渡しに",
    emoji: "📦",
    format: {
      language: "json",
      structure: "matrix3d",
      dataType: "",
      radix: "dec",
      bitOrder: "msb",
      invert: false,
      variableName: "font_data",
      itemsPerLine: 16,
      includeCharComment: false,
      includeAsciiArt: false,
      padByte: true,
      indent: "  ",
    },
  },
  {
    id: "symbols",
    label: "記号アート（# と .）",
    description: "プレビュー確認用。コピペでそのままドット絵に",
    emoji: "🎨",
    format: {
      language: "symbols",
      structure: "matrix3d",
      dataType: "",
      radix: "dec",
      bitOrder: "msb",
      invert: false,
      variableName: "font_data",
      itemsPerLine: 16,
      includeCharComment: true,
      includeAsciiArt: false,
      padByte: true,
      indent: "  ",
    },
  },
];

// 現在の format に最もマッチするプリセットを推測する（選択状態の表示用）
export function detectPreset(format: FormatOptions): string | null {
  for (const p of PRESETS) {
    const f = p.format;
    let match = true;
    for (const key of Object.keys(f) as (keyof FormatOptions)[]) {
      if ((format as FormatOptions)[key] !== (f as FormatOptions)[key]) {
        match = false;
        break;
      }
    }
    if (match) return p.id;
  }
  return null;
}
