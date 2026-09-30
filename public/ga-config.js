// GA4 の config に足す引数。ハブの consent.js（新しい形）が、gtag.js を読み込む時点でこの関数を呼んで config に重ねる。
// gtag.js の読み込みと config は consent.js が行うので、ここでは gtag を呼ばない（呼ぶと page_view が二重に送られる）。
// CSP でインラインスクリプトを禁止しているので外部ファイルにし、各ページで consent.js より前に同期で読み込む。
//
// 共有 URL の ?s=（入力した文字と設定）は page_location に入れない。
// ただし s は GA4 のサイト内検索の既定パラメータでもあり、サイト内検索は page_location ではなく実際の URL を読むので、
// ここで伏せても検索語（search_term）としては送られうる（#25。GA4 の管理画面で s を外すか、URL から先に退避する）
window.tkGaConfig = function () {
  var pageLocation = new URL(location.href);
  pageLocation.searchParams.delete("s");
  return { page_location: pageLocation.href };
};
