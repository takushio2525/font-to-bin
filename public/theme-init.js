// ダーク / ライトの初期表示。ツール本体（src/hooks/useTheme.ts）と同じキーを読み、描画の前に <html> へ dark クラスを付ける。
// 使い方ガイド（JS なしの素の HTML）でもツールで選んだテーマで表示するため。CSP でインラインを禁止しているので外部ファイルにしている
(function () {
  var theme = null;
  try {
    theme = localStorage.getItem("font-to-bin.theme");
  } catch (e) {
    // LocalStorage が使えない環境では OS の設定に従う
  }
  if (theme !== "light" && theme !== "dark") {
    theme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  if (theme === "dark") document.documentElement.classList.add("dark");
})();
