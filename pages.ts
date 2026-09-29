import type { Plugin } from "vite";

// 公開するページの一覧。ビルドの入口（vite.config.ts）・sitemap.xml の生成・
// tests/seo.test.ts の検査（canonical・JSON-LD の dateModified・sitemap の中身）がここを参照する。
// ページを足したら、ここに 1 行足すだけで sitemap とビルドに入る。
// lastmod は本文を書き換えた日に更新し、ページの JSON-LD の dateModified と揃える（テストで照合する）
export const SITE_ORIGIN = "https://font-to-bin.takushio2525.com";

export type Page = {
  /** リポジトリのルートからの HTML ファイル */
  file: string;
  /** 公開 URL のパス（末尾スラッシュ付き） */
  path: string;
  /** 本文を最後に書き換えた日（YYYY-MM-DD） */
  lastmod: string;
};

export const PAGES: Page[] = [
  { file: "index.html", path: "/", lastmod: "2026-09-29" },
  {
    file: "guide/arduino-oled-misaki/index.html",
    path: "/guide/arduino-oled-misaki/",
    lastmod: "2026-09-29",
  },
  {
    file: "guide/led-matrix-max7219/index.html",
    path: "/guide/led-matrix-max7219/",
    lastmod: "2026-09-29",
  },
  {
    file: "guide/output-format/index.html",
    path: "/guide/output-format/",
    lastmod: "2026-09-29",
  },
];

export function pageUrl(page: Page): string {
  return SITE_ORIGIN + page.path;
}

export function buildSitemap(pages: Page[] = PAGES): string {
  const urls = pages
    .map((p) => `  <url>\n    <loc>${pageUrl(p)}</loc>\n    <lastmod>${p.lastmod}</lastmod>\n  </url>`)
    .join("\n");
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls +
    "\n</urlset>\n"
  );
}

// ビルド時に PAGES から sitemap.xml を書き出す（robots.txt の Sitemap: はこのファイルを指す）
export function sitemapPlugin(): Plugin {
  return {
    name: "font-to-bin:sitemap",
    apply: "build",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: buildSitemap() });
    },
  };
}
