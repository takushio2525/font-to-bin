import { describe, expect, it } from "vitest";
import { sanitizeState, SHARE_MAX_CELLS, SHARE_MAX_CHARS } from "./sanitize";
import { DEFAULT_STATE } from "./defaults";
import { PRESETS } from "./presets";
import type { AppState } from "./types";

// 共有 URL・LocalStorage から読んだ値を想定した入力（JSON.parse の結果と同じ形）
function roundTrip(state: unknown): unknown {
  return JSON.parse(JSON.stringify(state));
}

describe("sanitizeState: 正常な state はそのまま通す", () => {
  it("既定値は共有・保存のどちらでも変わらない", () => {
    expect(sanitizeState(roundTrip(DEFAULT_STATE), "share")).toEqual(DEFAULT_STATE);
    expect(sanitizeState(roundTrip(DEFAULT_STATE), "stored")).toEqual(DEFAULT_STATE);
  });

  it("プリセットのフォーマット設定は共有しても変わらない", () => {
    for (const preset of PRESETS) {
      const state: AppState = {
        ...DEFAULT_STATE,
        format: { ...DEFAULT_STATE.format, ...preset.format },
      };
      expect(sanitizeState(roundTrip(state), "share").format).toEqual(state.format);
    }
  });

  it("保存された overrides は形が合っていれば残す", () => {
    const m = Array.from({ length: 16 }, (_, y) =>
      Array.from({ length: 16 }, (_, x) => ((x + y) % 2) as 0 | 1)
    );
    const state = { ...DEFAULT_STATE, overrides: { 0: m, 2: m } };
    expect(sanitizeState(roundTrip(state), "stored").overrides).toEqual({ 0: m, 2: m });
  });
});

describe("sanitizeState: 細工した共有 URL でタブを固めさせない", () => {
  it("幅・高さを UI と同じ 1〜128 に丸める", () => {
    const s = sanitizeState({ ...DEFAULT_STATE, width: 4000, height: 1e9 }, "share");
    expect(s.width).toBe(128);
    expect(s.height).toBe(128);
    const t = sanitizeState({ ...DEFAULT_STATE, width: -5, height: 0 }, "stored");
    expect(t.width).toBe(1);
    expect(t.height).toBe(1);
  });

  it("数値でない・有限でない値は既定値に戻す", () => {
    const s = sanitizeState(
      { ...DEFAULT_STATE, width: "999", height: null, size: Infinity, threshold: NaN },
      "share"
    );
    expect(s.width).toBe(DEFAULT_STATE.width);
    expect(s.height).toBe(DEFAULT_STATE.height);
    expect(s.size).toBe(DEFAULT_STATE.size);
    expect(s.threshold).toBe(DEFAULT_STATE.threshold);
  });

  it("共有 URL の文字数は文字数と描画量の両方で上限を掛ける", () => {
    const long = "あ".repeat(10_000);
    const small = sanitizeState({ ...DEFAULT_STATE, text: long, width: 16, height: 16 }, "share");
    expect(Array.from(small.text).length).toBe(SHARE_MAX_CHARS);
    const big = sanitizeState({ ...DEFAULT_STATE, text: long, width: 128, height: 128 }, "share");
    expect(Array.from(big.text).length).toBe(Math.floor(SHARE_MAX_CELLS / (128 * 128)));
    expect(Array.from(big.text).length * 128 * 128).toBeLessThanOrEqual(SHARE_MAX_CELLS);
  });

  it("サロゲートペアの途中で切らない", () => {
    const s = sanitizeState({ ...DEFAULT_STATE, text: "😀".repeat(5000) }, "share");
    expect(s.text).toBe("😀".repeat(SHARE_MAX_CHARS));
  });

  it("利用者自身が保存した長い文字列は切らない", () => {
    const long = "A".repeat(10_000);
    expect(sanitizeState({ ...DEFAULT_STATE, text: long }, "stored").text).toBe(long);
  });

  it("自由キャンバスは 1〜256 に丸め、行列を幅・高さに揃える", () => {
    const s = sanitizeState(
      { ...DEFAULT_STATE, free: { width: 100000, height: 3, matrix: [[1, 2, "1"], null], gridStep: 7 } },
      "share"
    );
    expect(s.free.width).toBe(256);
    expect(s.free.height).toBe(3);
    expect(s.free.matrix).toHaveLength(3);
    expect(s.free.matrix.every((row) => row.length === 256)).toBe(true);
    expect(s.free.matrix[0].slice(0, 3)).toEqual([1, 0, 0]);
    expect(s.free.gridStep).toBe(DEFAULT_STATE.free.gridStep);
  });
});

describe("sanitizeState: 形の壊れた state でも落ちない", () => {
  it.each([
    ["null", null],
    ["配列", []],
    ["文字列", "x"],
    ["free が null", { ...DEFAULT_STATE, free: null }],
    ["format が欠けている", { text: "A" }],
    ["format が null", { ...DEFAULT_STATE, format: null }],
  ])("%s", (_name, input) => {
    const s = sanitizeState(input, "share");
    expect(typeof s.text).toBe("string");
    expect(s.format.language).toBeTypeOf("string");
    expect(s.free.matrix).toHaveLength(s.free.height);
  });

  it("未知の言語・構造・フォントは既定値に戻す", () => {
    const s = sanitizeState(
      {
        ...DEFAULT_STATE,
        fontId: "custom-123",
        format: { ...DEFAULT_STATE.format, language: "html", structure: "x", radix: 16, bitOrder: "?" },
      },
      "share"
    );
    expect(s.fontId).toBe(DEFAULT_STATE.fontId);
    expect(s.format.language).toBe(DEFAULT_STATE.format.language);
    expect(s.format.structure).toBe(DEFAULT_STATE.format.structure);
    expect(s.format.radix).toBe(DEFAULT_STATE.format.radix);
    expect(s.format.bitOrder).toBe(DEFAULT_STATE.format.bitOrder);
  });

  it("__proto__ を含む入力でプロトタイプを汚さない", () => {
    const input = JSON.parse('{"__proto__": {"polluted": true}, "format": {"__proto__": {"polluted": true}}}');
    sanitizeState(input, "share");
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("形の合わない overrides は捨てる", () => {
    const state = {
      ...DEFAULT_STATE,
      overrides: { 0: [[1]], 1: "x", 99: DEFAULT_STATE.free.matrix, foo: [] },
    };
    expect(sanitizeState(state, "stored").overrides).toEqual({});
  });
});

describe("sanitizeState: 生成コードに任意の文字列を差し込ませない", () => {
  it("UI から設定できない prefix / suffix は読み込み時に空へ戻す", () => {
    const format = { ...DEFAULT_STATE.format, prefix: "import os; os.system('x')", suffix: "evil()" };
    for (const source of ["share", "stored"] as const) {
      const s = sanitizeState({ ...DEFAULT_STATE, format }, source);
      expect(s.format.prefix).toBe("");
      expect(s.format.suffix).toBe("");
    }
  });

  it("共有 URL の変数名は識別子に使える文字だけにする", () => {
    const s = sanitizeState(
      {
        ...DEFAULT_STATE,
        format: { ...DEFAULT_STATE.format, variableName: "__import__('os').system('id');font\ndata" },
      },
      "share"
    );
    expect(s.format.variableName).toBe("__import__ossystemidfontdata");
  });

  it("共有 URL のデータ型から文を作れる記号を除く", () => {
    const s = sanitizeState(
      {
        ...DEFAULT_STATE,
        format: { ...DEFAULT_STATE.format, dataType: 'uint8_t x; int main(){system("id");} const uint8_t' },
      },
      "share"
    );
    expect(s.format.dataType).not.toMatch(/[;{}()"=]/);
  });

  it("保存された値でも改行・制御文字は除き、長さを切る", () => {
    const s = sanitizeState(
      {
        ...DEFAULT_STATE,
        format: { ...DEFAULT_STATE.format, variableName: "a\nb c", dataType: "x".repeat(500) },
      },
      "stored"
    );
    expect(s.format.variableName).toBe("abc");
    expect(s.format.dataType.length).toBeLessThanOrEqual(64);
  });

  it("インデントは空白とタブだけを許す", () => {
    const bad = sanitizeState(
      { ...DEFAULT_STATE, format: { ...DEFAULT_STATE.format, indent: "\nrm -rf /\n" } },
      "stored"
    );
    expect(bad.format.indent).toBe(DEFAULT_STATE.format.indent);
    const tab = sanitizeState({ ...DEFAULT_STATE, format: { ...DEFAULT_STATE.format, indent: "\t" } }, "share");
    expect(tab.format.indent).toBe("\t");
  });
});
