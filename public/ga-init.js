// Google タグ（gtag.js）の初期化。CSP でインラインスクリプトを禁止しているので、外部ファイルにしている。
// index.html で consent.js（同意の既定値の宣言）より後に、同期で読み込む。
window.dataLayer = window.dataLayer || [];
function gtag() {
  dataLayer.push(arguments);
}
// consent.js が読めなかった（ブロック・通信失敗）ときは、全部 denied にして止める側に倒す
if (!window.tkConsent)
  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
  });
gtag("js", new Date());
// 共有 URL の ?s=（入力した文字と設定）は GA に送らない。
// s は GA4 のサイト内検索の既定パラメータでもあるので、そのままだと検索語としても記録される
var pageLocation = new URL(location.href);
if (pageLocation.searchParams.has("s")) pageLocation.searchParams.delete("s");
gtag("config", "G-30GVXMB0GH", { page_location: pageLocation.href });
