# Font to Binary Converter

ドットフォントを任意のバイナリ配列に変換する Web ツール。
ブラウザだけで動作し、インストール不要。GitHub Pages で公開されています。

**▶ 公開URL:** <https://font-to-bin.takushio2525.com>

## 特徴

- **同梱フォント**: DotGothic16 (16×16)、Misaki Gothic 2nd (8×8)
- **ユーザー TTF/OTF アップロード**: 任意のフォントをその場で追加可能
- **サイズ自由**: 幅・高さ独立指定、4〜64px
- **出力言語**: C / C++ / Arduino(PROGMEM) / Python / JavaScript / TypeScript / Rust / Go / JSON / Markdown / プレーン / 記号アート
- **出力形式**: 2次元 / 3次元 / フラット / ビットパック（行方向・列方向）
- **表記**: 10進 / 16進(0x) / 2進(0b)、MSB/LSB、0/1反転
- **ピクセルエディタ**: 各文字をクリックで手動編集（ペン・消しゴム・反転・回転・ミラー）
- **設定の保存・共有**: LocalStorage 自動保存 + URL共有ボタン
- **ダーク/ライトテーマ**、レスポンシブ、PWA manifest 同梱

## 開発環境

### 必要なもの

- Node.js 22.12 以上（CI は 24）
- npm

### セットアップ

```bash
npm install
npm run dev       # ローカル開発サーバ (http://localhost:5173)
npm run build     # 本番ビルド (dist/)
npm run preview   # 本番ビルドのプレビュー
npm test          # ユニットテスト (vitest)
```

### プロジェクト構成

```
.
├── public/
│   ├── fonts/            ← 同梱TTFフォント
│   ├── CNAME             ← カスタムドメイン設定
│   ├── ga-init.js        ← Google タグの初期化（CSP のため外部ファイル）
│   ├── favicon.svg
│   └── manifest.webmanifest
├── src/
│   ├── core/             ← ラスタライズ・エンコード・フォーマッタ
│   │   ├── types.ts
│   │   ├── fonts.ts
│   │   ├── rasterize.ts
│   │   ├── encode.ts
│   │   ├── format.ts
│   │   ├── share.ts
│   │   ├── sanitize.ts   ← 共有URL・LocalStorage から読んだ設定の検証
│   │   └── defaults.ts
│   ├── components/       ← UIコンポーネント
│   │   ├── ui/           ← shadcn/ui 系プリミティブ
│   │   ├── Header.tsx
│   │   ├── InputPanel.tsx
│   │   ├── FormatPanel.tsx
│   │   ├── PreviewPanel.tsx
│   │   ├── GlyphPreview.tsx
│   │   ├── OutputPanel.tsx
│   │   └── PixelEditor.tsx
│   ├── hooks/
│   │   ├── useAppState.ts
│   │   ├── useGlyphs.ts
│   │   ├── usePersist.ts
│   │   └── useTheme.ts
│   ├── lib/utils.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── tests/                         ← CSP・index.html のテスト
├── csp.ts                         ← CSP の定義（ビルド時に meta で埋め込む）
├── .github/workflows/deploy.yml   ← GitHub Pages 自動デプロイ
├── doc/                           ← LaTeX 仕様書
└── legacy/                        ← 旧Python版（参考）
```

## 自動デプロイ

`main` ブランチへの push で `.github/workflows/deploy.yml` が走り、
ビルド成果物が GitHub Pages に自動デプロイされます。

初回のみ、リポジトリの Settings → Pages → Source を
「GitHub Actions」に設定してください。

### カスタムドメイン

`public/CNAME` に配信ドメインを記載しており、ビルド時に `dist/CNAME` として
成果物へ含まれます。DNS 側は `font-to-bin` の CNAME レコードを
`takushio2525.github.io` に向けています（CDN プロキシは OFF）。
旧 URL `https://takushio2525.github.io/font-to-bin/` は新 URL へ転送されます。

## アクセス解析と Cookie 同意

GA4 の計測は、ハブ takushio2525.com が配る共用の同意スクリプト（`https://takushio2525.com/consent/consent.js`、Google Consent Mode v2）の下で動きます。`index.html` の `<head>` で consent.js を gtag より前に同期で読み込み、EEA・英国・スイスの閲覧者にだけ同意バナーを出します。選択は `.takushio2525.com` 共通の Cookie `tk_consent` に保存され、一族の全サイトで共有されます。Google タグの初期化は `public/ga-init.js` にあり、consent.js が読めなかったときはここで全項目を denied に倒します。共有 URL の `?s=`（入力した文字と設定）は `page_location` から除いて送ります。フッターの「プライバシーポリシー」は `https://takushio2525.com/privacy/` へ、「Cookie 設定」（`data-tk-consent-open`）はバナーを開き直します。この順番を崩すと同意前に計測が始まるので、gtag を触るときは consent.js より下に置いたままにしてください。

## セキュリティ

GitHub Pages ではレスポンスヘッダを付けられないため、Content Security Policy は `csp.ts` に定義し、ビルド時に `<meta http-equiv="Content-Security-Policy">` として `index.html` の先頭へ埋め込みます（開発サーバーでは React Refresh がインラインスクリプトを使うので付けません）。スクリプトは自サイト・`https://takushio2525.com/consent/`・Google タグだけを許し、インラインスクリプトは禁止しています。外部のスクリプトや送信先を足すときは `csp.ts` を更新し、`npm test` と `npm run build` 後のブラウザのコンソールで CSP 違反が出ないことを確かめてください。meta の CSP では `frame-ancestors` は効きません。

共有 URL（`?s=`）と LocalStorage から読んだ設定は `src/core/sanitize.ts` で型と範囲を検証してから使います。共有 URL は第三者が作れるので、文字数（2000 字かつ文字数×幅×高さ 200 万まで）と変数名・データ型に使える文字を制限し、UI から設定できない `prefix`・`suffix` は読み込まないようにしています。

## 詳細仕様

設計の詳細は [`doc/main.tex`](doc/main.tex) を参照。

## 旧Python版

以前の CUI/GUI Python 実装は [`legacy/`](legacy/) に保存されています。
新UIでは全機能が拡張された形で再実装されています。

## ライセンス

本プロジェクトのソースコードは [MIT License](LICENSE) の下で公開されています。
同梱フォントは本プロジェクトのライセンスとは別に、それぞれのライセンスが適用されます。

| フォント | 作者 | ライセンス | ライセンス本文 |
|---|---|---|---|
| DotGothic16 | Fontworks Inc. | SIL Open Font License 1.1 | [`public/fonts/OFL.txt`](public/fonts/OFL.txt) |
| 美咲フォント 第2版 (Misaki Gothic 2nd) | 門真なむ (Kadoma Namu) | 自由利用可（クレジット推奨） | [`public/fonts/MISAKI-LICENSE.txt`](public/fonts/MISAKI-LICENSE.txt) |

- DotGothic16: <https://github.com/fontworks-fonts/DotGothic16>
- 美咲フォント: <https://littlelimit.net/misaki.htm>

ユーザーがアップロードしたフォントはブラウザ内でのみ処理され、サーバーには送信されません。

## 作者

[takushio2525](https://github.com/takushio2525)
