import { Moon, Sun, Github, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Mode } from "@/hooks/useMode";

type Props = {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onShare: () => void;
  mode: Mode;
  onModeChange: (m: Mode) => void;
};

export function Header({ theme, onToggleTheme, onShare, mode, onModeChange }: Props) {
  return (
    <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-30">
      <div className="container mx-auto flex items-center justify-between gap-3 h-14 px-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-md bg-primary grid grid-cols-4 gap-[2px] p-1 shrink-0">
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className={
                  [0, 2, 5, 6, 8, 9, 10, 13, 15].includes(i)
                    ? "bg-primary-foreground rounded-[1px]"
                    : ""
                }
              />
            ))}
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold leading-tight truncate">
              Font to Binary Converter
            </h1>
            <p className="text-[11px] text-muted-foreground leading-tight truncate">
              ドットフォントを任意のバイナリ配列へ
            </p>
          </div>
        </div>

        {/* モード切替セグメント */}
        <div
          role="tablist"
          aria-label="表示モード"
          className="hidden sm:inline-flex h-9 items-center rounded-lg bg-muted p-1 text-sm"
        >
          <button
            role="tab"
            aria-selected={mode === "easy"}
            onClick={() => onModeChange("easy")}
            className={
              "px-3 h-7 rounded-md font-medium transition-colors " +
              (mode === "easy"
                ? "bg-background text-foreground shadow"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            かんたん
          </button>
          <button
            role="tab"
            aria-selected={mode === "advanced"}
            onClick={() => onModeChange("advanced")}
            className={
              "px-3 h-7 rounded-md font-medium transition-colors " +
              (mode === "advanced"
                ? "bg-background text-foreground shadow"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            詳細
          </button>
        </div>

        <div className="flex items-center gap-1">
          {/* モバイル用のコンパクトなモード切替 */}
          <button
            className="sm:hidden mr-1 rounded-md border px-2 h-8 text-xs"
            onClick={() => onModeChange(mode === "easy" ? "advanced" : "easy")}
          >
            {mode === "easy" ? "かんたん" : "詳細"}
          </button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onShare}
            title="設定を共有URLとしてコピー"
          >
            <Share2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleTheme}
            title={theme === "light" ? "ダークモード" : "ライトモード"}
          >
            {theme === "light" ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </Button>
          <Button variant="ghost" size="icon" asChild title="GitHub">
            <a
              href="https://github.com/takushio2525/font_to_bin"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}
