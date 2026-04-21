import type { FontDef } from "./types";

// 同梱フォント定義
export const BUILTIN_FONTS: FontDef[] = [
  {
    id: "dotgothic16",
    name: "DotGothic16 (16x16)",
    family: "DotGothic16",
    url: "fonts/DotGothic16-Regular.ttf",
    recommendedSize: 16,
  },
  {
    id: "misaki",
    name: "Misaki Gothic (8x8)",
    family: "MisakiGothic",
    url: "fonts/misaki_gothic_2nd.ttf",
    recommendedSize: 8,
  },
  {
    id: "system-mono",
    name: "システムモノスペース",
    family: "ui-monospace, Menlo, Consolas, monospace",
    recommendedSize: 12,
  },
];

// FontFace のキャッシュ
const loaded = new Set<string>();

export async function loadFont(font: FontDef, baseUrl: string): Promise<void> {
  if (!font.url) return; // システムフォントは読み込み不要
  if (loaded.has(font.id)) return;

  const url = new URL(font.url, baseUrl).href;
  const face = new FontFace(font.family, `url(${url})`);
  await face.load();
  document.fonts.add(face);
  loaded.add(font.id);
}

// ユーザーがアップロードしたフォントをFontFaceとして登録する
export async function registerCustomFont(
  file: File
): Promise<FontDef> {
  const id = `custom-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const family = `Custom_${id}`;
  const buf = await file.arrayBuffer();
  const face = new FontFace(family, buf);
  await face.load();
  document.fonts.add(face);
  loaded.add(id);
  return {
    id,
    name: file.name.replace(/\.(ttf|otf|woff2?)$/i, ""),
    family,
    isCustom: true,
  };
}
