import { Moon, Sun, Github, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onShare: () => void;
};

export function Header({ theme, onToggleTheme, onShare }: Props) {
  return (
    <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-30">
      <div className="container mx-auto flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-primary grid grid-cols-4 gap-[2px] p-1">
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
          <div>
            <h1 className="text-base font-bold leading-tight">
              Font to Binary Converter
            </h1>
            <p className="text-[11px] text-muted-foreground leading-tight">
              ドットフォントを任意のバイナリ配列へ
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
              href="https://github.com/TakumiShiozawa/font_to_bin"
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
