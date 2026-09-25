import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { cspMetaPlugin } from "./csp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// カスタムドメイン (font-to-bin.takushio2525.com) のルートに配置されるため
// 開発・本番ともに base は '/'
export default defineConfig(() => ({
  base: "/",
  plugins: [react(), cspMetaPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
