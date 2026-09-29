import { describe, expect, it } from "vitest";
import { isLicenseFileName, packageOfModuleId, renderLicenseNotices } from "../third-party-licenses";

// 配信物の OSS ライセンス文の一覧（third-party-licenses.ts）。
// ファイルを読むのはビルド時の Vite プラグインなので、ここではモジュール id からパッケージを割り出す処理と、
// 一覧のテキストの組み立てだけを見る（実物の出力は npm run build の dist/third-party-licenses.txt）

describe("packageOfModuleId", () => {
  it("node_modules の中のモジュールからパッケージ名と置き場所を取り出す", () => {
    expect(packageOfModuleId("/repo/node_modules/react-dom/cjs/react-dom.production.min.js")).toEqual({
      name: "react-dom",
      root: "/repo/node_modules/react-dom",
    });
  });

  it("スコープ付きのパッケージは 2 段で 1 つの名前にする", () => {
    expect(packageOfModuleId("/repo/node_modules/@radix-ui/react-dialog/dist/index.mjs")).toEqual({
      name: "@radix-ui/react-dialog",
      root: "/repo/node_modules/@radix-ui/react-dialog",
    });
  });

  it("入れ子の node_modules は一番内側のパッケージを採る", () => {
    expect(packageOfModuleId("/repo/node_modules/a/node_modules/@b/c/index.js")?.name).toBe("@b/c");
  });

  it("仮想モジュールの \\0 とクエリを外して考える", () => {
    expect(packageOfModuleId("\0/repo/node_modules/scheduler/index.js?commonjs-proxy")?.name).toBe("scheduler");
  });

  it("リポのソースと node_modules の外の仮想モジュールは null", () => {
    expect(packageOfModuleId("/repo/src/main.tsx")).toBeNull();
    expect(packageOfModuleId("\0vite/modulepreload-polyfill.js")).toBeNull();
  });
});

describe("isLicenseFileName", () => {
  it("LICENSE・LICENCE・COPYING・NOTICE を拡張子や接尾辞つきでも拾う", () => {
    for (const name of ["LICENSE", "license.md", "LICENCE.txt", "LICENSE-MIT", "COPYING", "NOTICE"]) {
      expect(isLicenseFileName(name)).toBe(true);
    }
  });

  it("似た名前のほかのファイルは拾わない", () => {
    for (const name of ["package.json", "README.md", "licenses-checker.js", "notices.ts"]) {
      expect(isLicenseFileName(name)).toBe(false);
    }
  });
});

describe("renderLicenseNotices", () => {
  const text = renderLicenseNotices([
    { name: "react", version: "18.3.1", license: "MIT", texts: ["MIT License\n\nCopyright (c) Facebook"] },
    { name: "@a/b", version: "1.0.0", license: "ISC", texts: ["ISC text", "NOTICE text"] },
    { name: "react", version: "18.3.1", license: "MIT", texts: ["MIT License\n\nCopyright (c) Facebook"] },
    { name: "no-file", version: "2.0.0", license: null, texts: [] },
  ]);

  it("同じ 名前@版 は 1 回だけ、名前順に載せる", () => {
    expect(text).toContain("パッケージ数: 3");
    expect(text.match(/^react@18\.3\.1$/gm)).toHaveLength(1);
    expect(text.indexOf("@a/b@1.0.0")).toBeLessThan(text.indexOf("no-file@2.0.0"));
    expect(text.indexOf("no-file@2.0.0")).toBeLessThan(text.indexOf("react@18.3.1"));
  });

  it("ライセンス文をそのまま載せ、ファイルが無いものはその旨を書く", () => {
    expect(text).toContain("Copyright (c) Facebook");
    expect(text).toContain("ISC text");
    expect(text).toContain("NOTICE text");
    expect(text).toContain("License: （package.json に記載なし）");
    expect(text).toContain("ライセンス文のファイルが同梱されていません");
  });

  it("同梱フォントのライセンス文書の置き場所を案内する", () => {
    expect(text).toContain("/fonts/OFL.txt");
    expect(text).toContain("/fonts/MISAKI-LICENSE.txt");
  });
});
