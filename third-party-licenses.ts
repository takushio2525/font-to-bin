import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

// 配信物（ブラウザに配る JS と CSS）に入った OSS のライセンス文を、ビルドのたびに
// dist/third-party-licenses.txt として出す。画面下のリンク（index.html と guide/*/index.html の footer）と名前を合わせる。
//
// MIT・ISC は「著作権表示と許諾表示を複製に含める」、Apache-2.0 は「ライセンスの写しを渡す」を
// 再配布の条件にしている。ビルドの圧縮でソース中の著作権コメントは落ちるので、ここで別のファイルにまとめる。
// 同梱フォントのライセンスは public/fonts/ の文書（/fonts/OFL.txt・/fonts/MISAKI-LICENSE.txt）が受け持つ。
export const THIRD_PARTY_LICENSES_FILE = "third-party-licenses.txt";

// JS のモジュールとしては現れないが、CSS の出力に入るパッケージ。
// src/index.css の @tailwind（preflight を含む）と、tailwind.config.js の plugins の tailwindcss-animate
const CSS_PACKAGES = ["tailwindcss", "tailwindcss-animate"];

/** 1 パッケージぶんのライセンス情報 */
export type LicenseEntry = {
  name: string;
  version: string;
  /** package.json の license。無ければ null */
  license: string | null;
  /** 同梱の LICENSE / NOTICE などの本文。1 つも無ければ空 */
  texts: string[];
};

const NODE_MODULES = "/node_modules/";

/**
 * バンドルのモジュール id から、そのモジュールを持つパッケージの名前と置き場所を取り出す。
 * `\0` で始まる仮想モジュールとクエリ（`?commonjs-proxy` など）は外して考え、
 * node_modules が入れ子なら一番内側のパッケージを採る。スコープ付き（@radix-ui/react-dialog）は 2 段で 1 つの名前。
 * node_modules の外（このリポのソース）なら null。
 */
export function packageOfModuleId(id: string): { name: string; root: string } | null {
  const file = (id.replace(/^\0/, "").split("?")[0] ?? "").replaceAll("\\", "/");
  const at = file.lastIndexOf(NODE_MODULES);
  if (at < 0) return null;
  const rest = file.slice(at + NODE_MODULES.length).split("/");
  const name = rest[0]?.startsWith("@") ? `${rest[0]}/${rest[1] ?? ""}` : (rest[0] ?? "");
  if (!name || name.endsWith("/")) return null;
  return { name, root: file.slice(0, at + NODE_MODULES.length + name.length) };
}

/** LICENSE・LICENCE・COPYING・NOTICE（拡張子・接尾辞つきも）をライセンス文のファイルとみなす */
export function isLicenseFileName(fileName: string): boolean {
  return /^(licen[cs]e|copying|notice)([.\-_].*)?$/i.test(fileName);
}

const RULE = "=".repeat(72);
const THIN_RULE = "-".repeat(72);

/** 名前順に並べ、同じ「名前@版」は 1 回だけ載せたテキストを作る */
export function renderLicenseNotices(entries: readonly LicenseEntry[]): string {
  const unique = new Map<string, LicenseEntry>();
  for (const e of entries) unique.set(`${e.name}@${e.version}`, e);
  const sorted = [...unique.values()].sort((a, b) =>
    a.name === b.name ? a.version.localeCompare(b.version) : a.name.localeCompare(b.name)
  );

  const header = [
    "Font to Binary Converter（https://font-to-bin.takushio2525.com）の配信物に含まれるオープンソースソフトウェア",
    "Open source software included in the files served by font-to-bin.takushio2525.com",
    "",
    "ブラウザに配る JavaScript と CSS に入っているパッケージと、そのライセンス文です。",
    "このファイルはビルドのたびに自動で作られます。",
    "同梱フォントのライセンスは /fonts/OFL.txt（DotGothic16）と /fonts/MISAKI-LICENSE.txt（美咲フォント）にあります。",
    "",
    `パッケージ数: ${sorted.length}`,
  ];
  const sections = sorted.map((e) =>
    [
      RULE,
      `${e.name}@${e.version}`,
      `License: ${e.license ?? "（package.json に記載なし）"}`,
      THIN_RULE,
      e.texts.length > 0
        ? e.texts.map((t) => t.trim()).join(`\n\n${THIN_RULE}\n\n`)
        : "（パッケージにライセンス文のファイルが同梱されていません。上の License の種類に従います）",
    ].join("\n")
  );
  return `${[...header, "", ...sections].join("\n")}\n`;
}

function readEntry(root: string): LicenseEntry | null {
  const manifestPath = path.join(root, "package.json");
  if (!existsSync(manifestPath)) return null;
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    name?: string;
    version?: string;
    license?: string | { type?: string };
  };
  const license =
    typeof manifest.license === "string" ? manifest.license : (manifest.license?.type ?? null);
  const texts = readdirSync(root)
    .filter(isLicenseFileName)
    .sort()
    .map((f) => readFileSync(path.join(root, f), "utf8"));
  return { name: manifest.name ?? path.basename(root), version: manifest.version ?? "0.0.0", license, texts };
}

/**
 * バンドルに実際に入ったパッケージだけを集めて third-party-licenses.txt を出力に足す。
 * 開発サーバーでは作らない（バンドルが無いため）。リンクが 404 にならないよう案内だけ返す。
 */
export function thirdPartyLicensesPlugin(): Plugin {
  let root = process.cwd();
  return {
    name: "font-to-bin:third-party-licenses",
    configResolved(config) {
      root = config.root;
    },
    configureServer(server) {
      server.middlewares.use(`/${THIRD_PARTY_LICENSES_FILE}`, (_req, res) => {
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end(
          `開発サーバーではライセンス文の一覧を作りません。npm run build の出力 dist/${THIRD_PARTY_LICENSES_FILE} を見てください。\n`
        );
      });
    },
    generateBundle(_options, bundle) {
      const roots = new Set<string>();
      // \0vite/modulepreload-polyfill や \0commonjsHelpers など、Vite（同梱の Rollup プラグイン）が
      // 差し込む小さな実行時コードも配信物に入る。Vite の LICENSE.md が同梱物のライセンスもまとめている
      let usesViteRuntime = false;
      for (const output of Object.values(bundle)) {
        if (output.type !== "chunk") continue;
        for (const id of output.moduleIds) {
          const found = packageOfModuleId(id);
          if (found) roots.add(found.root);
          else if (id.startsWith("\0")) usesViteRuntime = true;
        }
      }
      const nodeModules = path.join(root, "node_modules");
      for (const name of [...CSS_PACKAGES, ...(usesViteRuntime ? ["vite"] : [])]) {
        roots.add(path.join(nodeModules, name));
      }

      const entries = [...roots].map(readEntry).filter((e): e is LicenseEntry => e !== null);
      this.emitFile({
        type: "asset",
        fileName: THIRD_PARTY_LICENSES_FILE,
        source: renderLicenseNotices(entries),
      });
    },
  };
}
