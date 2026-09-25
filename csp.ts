import type { Plugin } from "vite";

// Content Security Policy。GitHub Pages ではレスポンスヘッダを付けられないので、
// ビルド時に index.html の <meta http-equiv="Content-Security-Policy"> として埋め込む。
// meta では frame-ancestors・report-uri・sandbox は効かない（ブラウザが無視する）。
//
// 外部に許すのは次の 2 系統だけ。追加するときは tests/csp.test.ts も通ることを確かめる。
// - https://takushio2525.com/consent/ … ハブの同意スクリプト consent.js と国判定 API /consent/region
// - Google タグ（gtag.js）と GA4 の送信先 … Google の「GA4 で CSP を使う」ガイドの基本の一覧
export const CSP_DIRECTIVES: Record<string, string[]> = {
  "default-src": ["'self'"],
  // インラインスクリプトは許さない（Google タグの初期化も public/ga-init.js に外出ししている）
  "script-src": [
    "'self'",
    "https://takushio2525.com/consent/",
    "https://*.googletagmanager.com",
  ],
  // Radix UI（Select のスクロールバー隠し・スクロールロック）と consent.js のバナーが
  // インラインの <style> を差し込むので、スタイルだけは 'unsafe-inline' を許す
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": [
    "'self'",
    "https://*.google-analytics.com",
    "https://*.googletagmanager.com",
  ],
  // 同梱フォントは同一オリジン。アップロードしたフォントは ArrayBuffer から読むので対象外
  "font-src": ["'self'"],
  "connect-src": [
    "'self'",
    "https://takushio2525.com/consent/",
    "https://*.google-analytics.com",
    "https://*.analytics.google.com",
    "https://*.googletagmanager.com",
  ],
  "object-src": ["'none'"],
  "base-uri": ["'none'"],
  "form-action": ["'self'"],
  "upgrade-insecure-requests": [],
};

export function buildCsp(directives: Record<string, string[]> = CSP_DIRECTIVES): string {
  return Object.entries(directives)
    .map(([name, values]) => [name, ...values].join(" "))
    .join("; ");
}

const CHARSET_META = '<meta charset="UTF-8" />';

// <meta charset> の直後（どの <script> よりも前）に CSP の meta を差し込む。
// 開発サーバーは React Refresh のインラインスクリプトを使うので、ビルド時だけ付ける
export function injectCspMeta(html: string, csp: string = buildCsp()): string {
  if (!html.includes(CHARSET_META)) {
    // 差し込み位置が見つからないまま CSP 無しで配信しないよう、ビルドを止める
    throw new Error(`CSP を差し込む位置 ${CHARSET_META} が index.html に見つかりません`);
  }
  return html.replace(
    CHARSET_META,
    `${CHARSET_META}\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`
  );
}

export function cspMetaPlugin(): Plugin {
  return {
    name: "font-to-bin:csp-meta",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler: (html) => injectCspMeta(html),
    },
  };
}
