import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildSitemap, PAGES, pageUrl, SITE_ORIGIN } from "../pages";

// 検索エンジン向けの作りの検査。公開ページ（pages.ts の PAGES）ごとに、
// canonical・メタ情報・構造化データ・JS なしで読める本文・内部リンクを確かめる
const root = resolve(import.meta.dirname, "..");
const read = (file: string) => readFileSync(resolve(root, file), "utf8");

function meta(html: string, attr: "name" | "property", key: string): string[] {
  const re = new RegExp(`<meta\\s+${attr}="${key.replace(/[:.]/g, "\\$&")}"\\s+content="([^"]*)"`, "g");
  return [...html.matchAll(re)].map((m) => m[1]);
}

function jsonLd(html: string): Record<string, unknown>[] {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  return blocks.flatMap((m) => {
    const data = JSON.parse(m[1]) as { "@context": string; "@graph"?: Record<string, unknown>[] };
    expect(data["@context"]).toBe("https://schema.org");
    return data["@graph"] ?? [data];
  });
}

// タグ・スクリプト・スタイルを除いた、画面に出る文字（JS を動かさないときに読める本文）
function visibleText(html: string): string {
  return html
    .replace(/<head>[\s\S]*?<\/head>/, "")
    .replace(/<script\b[\s\S]*?<\/script>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

const pages = PAGES.map((p) => ({ ...p, url: pageUrl(p), html: read(p.file) }));

describe.each(pages)("$path", (page) => {
  const { html, url } = page;

  it("canonical と og:url が自分自身の URL を 1 つだけ指す", () => {
    const canonicals = [...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)].map((m) => m[1]);
    expect(canonicals).toEqual([url]);
    expect(meta(html, "property", "og:url")).toEqual([url]);
  });

  it("日本語のページで、タイトル・description・OGP がそろっている", () => {
    expect(html).toMatch(/^<!doctype html>\n<html lang="ja">/);
    // CSP の meta を差し込む位置（csp.ts）
    expect(html).toContain('<meta charset="UTF-8" />');
    const title = /<title>([^<]+)<\/title>/.exec(html)?.[1] ?? "";
    expect(title).toContain("Font to Binary Converter");
    const [desc] = meta(html, "name", "description");
    expect(desc.length).toBeGreaterThan(60);
    expect(desc.length).toBeLessThanOrEqual(160);
    for (const key of ["og:title", "og:description", "og:image", "og:type", "og:site_name"]) {
      expect(meta(html, "property", key), key).toHaveLength(1);
    }
    expect(meta(html, "name", "twitter:card")).toEqual(["summary_large_image"]);
  });

  it("構造化データが読めて、URL と日付が公開ページの一覧と合っている", () => {
    const nodes = jsonLd(html);
    const types = nodes.map((n) => n["@type"]);
    expect(types).toContain("WebSite");
    expect(types).toContain("Person");
    if (page.path === "/") {
      const app = nodes.find((n) => n["@type"] === "WebApplication")!;
      expect(app.url).toBe(url);
      expect(app.offers).toEqual({ "@type": "Offer", price: "0", priceCurrency: "JPY" });
    } else {
      const article = nodes.find((n) => n["@type"] === "TechArticle")!;
      expect(article.mainEntityOfPage).toBe(url);
      expect(article.dateModified).toBe(page.lastmod);
      expect(article.headline).toBe(/<h1>([^<]+)<\/h1>/.exec(html)?.[1]);
      const crumbs = nodes.find((n) => n["@type"] === "BreadcrumbList")!.itemListElement as { item: { "@id": string } }[];
      expect(crumbs.map((c) => c.item["@id"])).toEqual([`${SITE_ORIGIN}/`, url]);
    }
  });

  it("内部リンクはすべて公開ページか public/ のファイルを指す", () => {
    const known = new Set(pages.map((p) => p.path));
    const hrefs = [...html.matchAll(/\bhref="(\/[^"#]*)(?:#[^"]*)?"/g)].map((m) => m[1]);
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      if (href.startsWith("/src/")) continue; // ビルドで束ねる CSS
      const ok = known.has(href) || existsSync(resolve(root, "public" + href));
      expect(ok, href).toBe(true);
    }
  });

  it("ページ内リンク（#…）の行き先がある", () => {
    for (const [, id] of html.matchAll(/href="#([\w-]+)"/g)) {
      expect(html, id).toContain(`id="${id}"`);
    }
  });
});

describe("トップページ（ツール本体）", () => {
  const top = pages.find((p) => p.path === "/")!;

  it("JS なしでも紹介・ガイドへのリンク・よくある質問が読める", () => {
    const text = visibleText(top.html);
    expect(text).toContain("Font to Binary Converter でできること");
    for (const p of pages.filter((p) => p.path !== "/")) expect(top.html).toContain(`href="${p.path}"`);
    expect(text.length).toBeGreaterThan(1000);
  });

  it("FAQPage の質問と回答は、画面の「よくある質問」に同じ文で出ている", () => {
    const faq = jsonLd(top.html).find((n) => n["@type"] === "FAQPage")!;
    const text = visibleText(top.html).replace(/\s/g, "");
    const items = faq.mainEntity as { name: string; acceptedAnswer: { text: string } }[];
    expect(items.length).toBeGreaterThan(0);
    for (const q of items) {
      expect(text, q.name).toContain(q.name.replace(/\s/g, ""));
      expect(text, q.name).toContain(q.acceptedAnswer.text.replace(/\s/g, ""));
    }
  });
});

describe("使い方ガイド", () => {
  const guides = pages.filter((p) => p.path.startsWith("/guide/"));

  it.each(guides.map((g) => [g.path, g] as const))("%s は JS を使わず、本文を HTML に持っている", (_path, g) => {
    expect(g.html).not.toContain('type="module"');
    const article = /<article class="guide-article">([\s\S]*?)<\/article>/.exec(g.html)?.[1] ?? "";
    expect(visibleText(article).length).toBeGreaterThan(3000);
    // 見出しは h1 が 1 つで、本文は h2 の節に分かれている
    expect(g.html.match(/<h1>/g)).toHaveLength(1);
    expect((article.match(/<h2 id=/g) ?? []).length).toBeGreaterThanOrEqual(4);
  });
});

describe("sitemap.xml と robots.txt", () => {
  const sitemap = buildSitemap();

  it("sitemap に公開ページがすべて 1 回ずつ、lastmod 付きで入る", () => {
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toEqual(pages.map((p) => p.url));
    expect(new Set(locs).size).toBe(locs.length);
    for (const p of pages) expect(sitemap).toContain(`<loc>${p.url}</loc>\n    <lastmod>${p.lastmod}</lastmod>`);
  });

  it("robots.txt から sitemap を辿れて、クロールを止めていない", () => {
    const robots = read("public/robots.txt");
    expect(robots).toContain(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`);
    expect(robots).not.toMatch(/^Disallow:\s*\/\s*$/m);
  });

  it("手書きの public/sitemap.xml は置かない（ビルドで生成したものと食い違わないように）", () => {
    expect(existsSync(resolve(root, "public/sitemap.xml"))).toBe(false);
  });
});
