import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { buildCsp, CSP_DIRECTIVES, injectCspMeta } from "../csp";
import { PAGES } from "../pages";

const root = resolve(import.meta.dirname, "..");
const indexHtml = readFileSync(resolve(root, "index.html"), "utf8");

// <script ...>...</script> を属性と中身に分ける（どのページも手書きの小さなファイルなので正規表現で足りる）。
// 構造化データ（type="application/ld+json"）は実行されないデータなので、CSP の対象から外す
function scriptsOf(html: string) {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
    .map((m) => ({ attrs: m[1], body: m[2], src: /\bsrc="([^"]+)"/.exec(m[1])?.[1] }))
    .filter((s) => !/type="application\/ld\+json"/.test(s.attrs));
}
const scripts = scriptsOf(indexHtml);

const CONSENT_SRC = "https://takushio2525.com/consent/consent.js";
const GA_ID = "G-30GVXMB0GH";

// CSP のソース表現に URL が当てはまるか（ホストの先頭ワイルドカードとパスの前方一致だけを扱う）
function allowedBy(sources: string[], url: string): boolean {
  if (url.startsWith("/")) return sources.includes("'self'");
  const u = new URL(url);
  return sources.some((src) => {
    const m = /^https:\/\/(\*\.)?([^/]+)(\/.*)?$/.exec(src);
    if (!m || u.protocol !== "https:") return false;
    const [, wildcard, host, path] = m;
    const hostOk = wildcard ? u.hostname.endsWith("." + host) : u.hostname === host;
    const pathOk = !path || (path.endsWith("/") ? u.pathname.startsWith(path) : u.pathname === path);
    return hostOk && pathOk;
  });
}

describe.each(PAGES.map((p) => [p.file, scriptsOf(readFileSync(resolve(root, p.file), "utf8"))] as const))(
  "%s のスクリプトと CSP",
  (_file, pageScripts) => {
    it("インラインスクリプトが無く、読み込む外部スクリプトはすべて script-src で許している", () => {
      expect(pageScripts.length).toBeGreaterThan(0);
      for (const s of pageScripts) {
        expect(s.src, `インラインの <script>: ${s.body.trim().slice(0, 60)}`).toBeTruthy();
        expect(s.body.trim()).toBe("");
        expect(allowedBy(CSP_DIRECTIVES["script-src"], s.src!), s.src).toBe(true);
      }
    });

    // ハブの consent.js の新しい形（basic 型）。gtag.js は consent.js が読んでよいときだけ差し込むので、
    // ページが直接読むと EEA・英国・スイスでも同意の前に Google へ送られてしまう
    it("gtag.js を直接読まず、consent.js に測定 ID を渡し、その前に ga-config.js を同期で読む", () => {
      const srcs = pageScripts.map((s) => s.src);
      expect(srcs.filter((src) => src!.includes("googletagmanager.com"))).toEqual([]);
      expect(srcs).not.toContain("/ga-init.js");

      const consent = pageScripts.filter((s) => s.src === CONSENT_SRC);
      expect(consent).toHaveLength(1);
      expect(/\bdata-ga-id="([^"]*)"/.exec(consent[0].attrs)?.[1]).toBe(GA_ID);

      // tkGaConfig は consent.js が読み込み時に評価することがある（同意済みのとき）ので、先に置かれていないといけない
      const config = pageScripts.filter((s) => s.src === "/ga-config.js");
      expect(config).toHaveLength(1);
      expect(srcs.indexOf("/ga-config.js")).toBeLessThan(srcs.indexOf(CONSENT_SRC));
      for (const s of [...consent, ...config]) expect(s.attrs).not.toMatch(/\b(async|defer)\b/);
    });
  }
);

describe("index.html と CSP", () => {
  it("インラインスクリプトが無い（script-src に 'unsafe-inline' を足さずに済む）", () => {
    expect(scripts.length).toBeGreaterThan(0);
    for (const s of scripts) {
      expect(s.src, `インラインの <script>: ${s.body.trim().slice(0, 60)}`).toBeTruthy();
      expect(s.body.trim()).toBe("");
    }
  });

  it("読み込む外部スクリプトはすべて script-src で許している", () => {
    for (const s of scripts) {
      expect(allowedBy(CSP_DIRECTIVES["script-src"], s.src!), s.src).toBe(true);
    }
  });

  it("script-src に危険なキーワードが無く、基本の制限が入っている", () => {
    const scriptSrc = CSP_DIRECTIVES["script-src"];
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
    expect(scriptSrc.some((v) => v === "*" || v === "https:" || v === "data:")).toBe(false);
    expect(CSP_DIRECTIVES["object-src"]).toEqual(["'none'"]);
    expect(CSP_DIRECTIVES["base-uri"]).toEqual(["'none'"]);
    expect(CSP_DIRECTIVES["default-src"]).toEqual(["'self'"]);
  });

  it("同意スクリプトの国判定 API と GA4 の送信先へ接続できる", () => {
    const connect = CSP_DIRECTIVES["connect-src"];
    expect(allowedBy(connect, "https://takushio2525.com/consent/region")).toBe(true);
    expect(allowedBy(connect, "https://www.google-analytics.com/g/collect")).toBe(true);
    expect(allowedBy(connect, "https://region1.google-analytics.com/g/collect")).toBe(true);
    expect(allowedBy(connect, "https://evil.example.com/")).toBe(false);
  });

  it("ビルド時に CSP の meta を <meta charset> の直後、どの <script> よりも前に差し込む", () => {
    const html = injectCspMeta(indexHtml);
    const meta = `<meta http-equiv="Content-Security-Policy" content="${buildCsp()}" />`;
    expect(html).toContain(meta);
    expect(html.indexOf(meta)).toBeLessThan(html.indexOf("<script"));
    expect(html.indexOf('<meta charset="UTF-8" />')).toBeLessThan(html.indexOf(meta));
    expect(buildCsp()).not.toMatch(/"/);
  });

  it("差し込む位置が無ければビルドを止める", () => {
    expect(() => injectCspMeta("<html><head></head></html>")).toThrow();
  });

  it("referrer は strict-origin-when-cross-origin を明示している", () => {
    expect(indexHtml).toContain('<meta name="referrer" content="strict-origin-when-cross-origin" />');
  });
});

describe("public/ga-config.js", () => {
  const code = readFileSync(resolve(root, "public/ga-config.js"), "utf8");

  // ブラウザの代わりに、window と location だけを持つ環境で動かす
  function load(href: string) {
    const sandbox: Record<string, unknown> = { location: new URL(href), URL };
    sandbox.window = sandbox;
    runInNewContext(code, sandbox);
    return sandbox as { location: URL; tkGaConfig?: () => { page_location: string } } & Record<string, unknown>;
  }

  it("共有 URL の ?s= を page_location から除き、他のパラメータは残す", () => {
    const w = load("https://font-to-bin.takushio2525.com/?utm_source=x&s=eyJ0ZXh0IjoiQSJ9");
    expect(w.tkGaConfig!()).toEqual({ page_location: "https://font-to-bin.takushio2525.com/?utm_source=x" });
  });

  it("consent.js が gtag.js を読む時点の URL で組み立てる（同意を待ってから読む EEA でも伏せる）", () => {
    const w = load("https://font-to-bin.takushio2525.com/guide/output-format/");
    expect(typeof w.tkGaConfig).toBe("function");
    w.location.href = "https://font-to-bin.takushio2525.com/guide/output-format/?s=eyJ0ZXh0IjoiQSJ9";
    expect(w.tkGaConfig!()).toEqual({ page_location: "https://font-to-bin.takushio2525.com/guide/output-format/" });
  });

  it("gtag を呼ばない（config は consent.js が積む。ここでも積むと page_view が二重に送られる）", () => {
    const w = load("https://font-to-bin.takushio2525.com/?s=eyJ0ZXh0IjoiQSJ9");
    expect(w.dataLayer).toBeUndefined();
    expect(w.gtag).toBeUndefined();
  });
});
