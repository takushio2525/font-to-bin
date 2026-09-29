import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { formatOutput } from "./format";
import { DEFAULT_FORMAT } from "./defaults";
import { PRESETS } from "./presets";
import type { Bit, FormatOptions, Glyph, OutputLanguage, Structure } from "./types";

// 決まった模様のグリフを作る（フォントのラスタライズは Canvas が要るので、寸法だけ同梱フォントに合わせる）
function makeGlyph(char: string, width: number, height: number, seed: number): Glyph {
  const matrix = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => ((x * 7 + y * 3 + seed) % 5 < 2 ? 1 : 0) as Bit)
  );
  return { char, width, height, matrix };
}

// DotGothic16 (16x16)・美咲ゴシック (8x8) と同じ寸法に、8 の倍数でない寸法を足す
const GLYPH_SETS: { label: string; glyphs: Glyph[] }[] = [
  { label: "16x16", glyphs: ["A", "あ", "\\"].map((c, i) => makeGlyph(c, 16, 16, i)) },
  { label: "8x8", glyphs: ["B", "い"].map((c, i) => makeGlyph(c, 8, 8, i)) },
  { label: "12x12", glyphs: ["C", "う"].map((c, i) => makeGlyph(c, 12, 12, i)) },
];

const C_LANGUAGES: OutputLanguage[] = ["c", "cpp", "arduino"];
const STRUCTURES: Structure[] = ["matrix3d", "matrix2d", "flat", "bitpack-row", "bitpack-col"];

const ARDUINO_PRESET = PRESETS.find((p) => p.id === "arduino")!;

function opts(format: Partial<FormatOptions>): FormatOptions {
  return { ...DEFAULT_FORMAT, ...format };
}

// 宣言行（"... = {"）を取り出す
function declarationOf(out: string): string {
  const line = out.split("\n").find((l) => l.endsWith("= {"));
  if (!line) throw new Error(`宣言行が見つからない:\n${out}`);
  return line;
}

function countWord(s: string, word: string): number {
  return s.match(new RegExp(`\\b${word}\\b`, "g"))?.length ?? 0;
}

// 初期化子の中身（コメントを除く）
function initializerOf(out: string): string {
  const body = out.slice(out.indexOf("= {") + 2);
  return body.replace(/\/\/.*$/gm, "");
}

// 初期化子の波括弧の最大の深さ（宣言の次元数と一致しなければ C の配列として形が合わない）
function braceDepth(init: string): number {
  let depth = 0;
  let max = 0;
  for (const ch of init) {
    if (ch === "{") max = Math.max(max, ++depth);
    if (ch === "}") depth--;
  }
  return max;
}

function valueCount(init: string): number {
  return init.match(/\b(0x[0-9A-F]+|0b[01]+|\d+)\b/g)?.length ?? 0;
}

describe("C / C++ / Arduino: 宣言の修飾子", () => {
  it("Arduino プリセットの宣言は const と PROGMEM が 1 回ずつ", () => {
    for (const { glyphs } of GLYPH_SETS) {
      const decl = declarationOf(formatOutput(glyphs, opts(ARDUINO_PRESET.format)));
      expect(decl).toBe("const uint8_t font_data[] PROGMEM = {");
    }
  });

  it("修正前に保存された dataType（const uint8_t PROGMEM）でも修飾子が重ならない", () => {
    const decl = declarationOf(
      formatOutput(
        GLYPH_SETS[0].glyphs,
        opts({ ...ARDUINO_PRESET.format, dataType: "const uint8_t PROGMEM" })
      )
    );
    expect(countWord(decl, "const")).toBe(1);
    expect(countWord(decl, "PROGMEM")).toBe(1);
  });

  it("データ型に const を書いた C / C++ でも const が重ならない", () => {
    for (const language of ["c", "cpp"] as const) {
      for (const dataType of ["const uint8_t", "uint8_t const"]) {
        const decl = declarationOf(formatOutput(GLYPH_SETS[1].glyphs, opts({ language, dataType })));
        expect(countWord(decl, "const")).toBe(1);
      }
    }
  });
});

describe("C / C++ / Arduino: 初期化子の形が宣言の次元と合う", () => {
  for (const language of C_LANGUAGES) {
    for (const structure of STRUCTURES) {
      it(`${language} / ${structure}`, () => {
        for (const { glyphs } of GLYPH_SETS) {
          const out = formatOutput(glyphs, opts({ language, structure }));
          const dims = declarationOf(out).match(/\[/g)?.length ?? 0;
          expect(braceDepth(initializerOf(out))).toBe(dims);
        }
      });
    }
  }

  it("1 次元の構造は全文字の値を 1 本の配列に並べる", () => {
    const glyphs = GLYPH_SETS[2].glyphs; // 12x12 × 2 文字
    const perGlyph: Record<string, number> = {
      flat: 12 * 12,
      "bitpack-row": 12 * 2, // 1 行 12 ドット → 2 バイト
      "bitpack-col": 12 * 2, // 1 列 12 ドット → 2 バイト
    };
    for (const [structure, n] of Object.entries(perGlyph)) {
      const out = formatOutput(glyphs, opts({ language: "c", structure: structure as Structure }));
      expect(valueCount(initializerOf(out))).toBe(n * glyphs.length);
    }
  });

  it("matrix2d は宣言 [行][列] に合わせて 1 文字目だけを出す", () => {
    const glyphs = GLYPH_SETS[1].glyphs; // 8x8 × 2 文字
    const out = formatOutput(glyphs, opts({ language: "c", structure: "matrix2d" }));
    expect(declarationOf(out)).toBe("const uint8_t font_data[8][8] = {");
    expect(out.match(/char:/g)).toHaveLength(1);
    expect(valueCount(initializerOf(out))).toBe(8 * 8);
  });
});

// ─── 実際のコンパイラに通す ───────────────────────────────
// 手元の cc / c++ で構文と型を検査する。Arduino は avr-g++ の既定（gnu++11）に合わせ、
// ホストに無い PROGMEM は空のマクロにする。C では波括弧の不整合や const の重複が警告止まりなので -Werror で落とす。
function hasCommand(cmd: string): boolean {
  try {
    execFileSync(cmd, ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const COMPILE: Record<string, { cmd: string; args: string[] }> = {
  c: { cmd: "cc", args: ["-x", "c", "-std=gnu11"] },
  cpp: { cmd: "c++", args: ["-x", "c++", "-std=c++17"] },
  arduino: { cmd: "c++", args: ["-x", "c++", "-std=gnu++11", "-DPROGMEM="] },
};

// 成功なら空文字、失敗ならコンパイラのエラー出力を返す
function compile(language: string, source: string): string {
  const { cmd, args } = COMPILE[language];
  try {
    execFileSync(
      cmd,
      [
        ...args,
        "-fsyntax-only",
        "-Wall",
        "-Werror",
        "-Wno-unused-variable",
        "-Wno-unused-const-variable",
        "-",
      ],
      { input: `#include <stdint.h>\n${source}\n`, stdio: ["pipe", "pipe", "pipe"] }
    );
    return "";
  } catch (e) {
    const err = e as { stderr?: Buffer; message: string };
    return err.stderr?.toString() || err.message;
  }
}

describe("C / C++ / Arduino: 生成したコードがコンパイルできる", () => {
  it.skipIf(!hasCommand("c++"))("Arduino プリセット（かんたんモード）", () => {
    const source = GLYPH_SETS.map(({ label, glyphs }) =>
      formatOutput(glyphs, opts({ ...ARDUINO_PRESET.format, variableName: `font_${label}` }))
    ).join("\n");
    expect(compile("arduino", source)).toBe("");
  });

  for (const language of C_LANGUAGES) {
    for (const structure of STRUCTURES) {
      it.skipIf(!hasCommand(COMPILE[language].cmd))(`${language} / ${structure}`, () => {
        // 寸法 3 種 × 表記 3 種を別々の変数にして 1 つの翻訳単位にまとめる
        const source = GLYPH_SETS.flatMap(({ label, glyphs }) =>
          (["hex", "bin", "dec"] as const).map((radix) =>
            formatOutput(
              glyphs,
              opts({ language, structure, radix, variableName: `font_${label}_${radix}` })
            )
          )
        ).join("\n");
        expect(compile(language, source)).toBe("");
      });
    }
  }
});
