import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { buildCsp, CSP_DIRECTIVES, injectCspMeta } from "../csp";

const root = resolve(import.meta.dirname, "..");
const indexHtml = readFileSync(resolve(root, "index.html"), "utf8");

// <script ...>...</script> を属性と中身に分ける（index.html は手書きの小さなファイルなので正規表現で足りる）
const scripts = [...indexHtml.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].map((m) => ({
  attrs: m[1],
  body: m[2],
  src: /\bsrc="([^"]+)"/.exec(m[1])?.[1],
}));

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

  it("consent.js を Google タグの初期化より前に読む", () => {
    const srcs = scripts.map((s) => s.src);
    expect(srcs.indexOf("https://takushio2525.com/consent/consent.js")).toBeLessThan(
      srcs.indexOf("/ga-init.js")
    );
  });
});

describe("public/ga-init.js", () => {
  const code = readFileSync(resolve(root, "public/ga-init.js"), "utf8");

  // ブラウザの代わりに、window・location・dataLayer だけを持つ環境で動かして dataLayer を見る
  function run(href: string, tkConsent?: object) {
    const sandbox: Record<string, unknown> = { location: new URL(href), URL, Date, tkConsent };
    sandbox.window = sandbox;
    runInNewContext(code, sandbox);
    return (sandbox.dataLayer as IArguments[]).map((args) => Array.from(args));
  }

  it("共有 URL の ?s= を page_location から除き、他のパラメータは残す", () => {
    const calls = run("https://font-to-bin.takushio2525.com/?utm_source=x&s=eyJ0ZXh0IjoiQSJ9", {});
    const config = calls.find((c) => c[0] === "config");
    expect(config?.[1]).toBe("G-30GVXMB0GH");
    expect((config?.[2] as { page_location: string }).page_location).toBe(
      "https://font-to-bin.takushio2525.com/?utm_source=x"
    );
  });

  it("consent.js が読めていないときは全部 denied を宣言する", () => {
    const calls = run("https://font-to-bin.takushio2525.com/");
    const consent = calls.find((c) => c[0] === "consent");
    expect(consent?.[1]).toBe("default");
    expect(Object.values(consent?.[2] as object).every((v) => v === "denied")).toBe(true);
  });

  it("consent.js が読めているときは既定値を上書きしない", () => {
    const calls = run("https://font-to-bin.takushio2525.com/", {});
    expect(calls.some((c) => c[0] === "consent")).toBe(false);
  });
});
