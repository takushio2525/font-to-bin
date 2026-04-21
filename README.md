# Font to Binary Converter

ドットフォントを任意のバイナリ配列に変換する Web ツール。
ブラウザだけで動作し、インストール不要。GitHub Pages で公開されています。

**▶ 公開URL:** <https://takushio2525.github.io/font-to-bin/>

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

- Node.js 20 以上
- npm

### セットアップ

```bash
npm install
npm run dev       # ローカル開発サーバ (http://localhost:5173)
npm run build     # 本番ビルド (dist/)
npm run preview   # 本番ビルドのプレビュー
```

### プロジェクト構成

```
.
├── public/
│   ├── fonts/            ← 同梱TTFフォント
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
├── .github/workflows/deploy.yml   ← GitHub Pages 自動デプロイ
├── doc/                           ← LaTeX 仕様書
└── legacy/                        ← 旧Python版（参考）
```

## 自動デプロイ

`main` ブランチへの push で `.github/workflows/deploy.yml` が走り、
ビルド成果物が GitHub Pages に自動デプロイされます。

初回のみ、リポジトリの Settings → Pages → Source を
「GitHub Actions」に設定してください。

## 詳細仕様

設計の詳細は [`doc/main.tex`](doc/main.tex) を参照。

## 旧Python版

以前の CUI/GUI Python 実装は [`legacy/`](legacy/) に保存されています。
新UIでは全機能が拡張された形で再実装されています。

## ライセンス

同梱フォントはそれぞれのライセンスに従います（DotGothic16: SIL OFL / Misaki Gothic: 自由配布）。
