import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { cspMetaPlugin } from "./csp";
import { PAGES, sitemapPlugin } from "./pages";
import { thirdPartyLicensesPlugin } from "./third-party-licenses";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// カスタムドメイン (font-to-bin.takushio2525.com) のルートに配置されるため
// 開発・本番ともに base は '/'
export default defineConfig(() => ({
  base: "/",
  plugins: [react(), cspMetaPlugin(), sitemapPlugin(), thirdPartyLicensesPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // ツール本体（index.html）と使い方ガイド（guide/*/index.html、JS なしの素の HTML）を出す
    rollupOptions: {
      input: Object.fromEntries(
        PAGES.map((p) => [
          p.path === "/" ? "main" : p.path.replace(/^\/|\/$/g, "").replace(/\//g, "-"),
          path.resolve(__dirname, p.file),
        ])
      ),
    },
  },
}));
