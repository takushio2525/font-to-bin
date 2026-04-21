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

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: "easy", label: "かんたん", hint: "3ステップで即バイナリ化" },
  { id: "advanced", label: "詳細", hint: "すべての設定を直接編集" },
  { id: "free", label: "自由", hint: "任意サイズで自由にドット絵を描画" },
];

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

        {/* モード切替セグメント（3モード） */}
        <div
          role="tablist"
          aria-label="表示モード"
          className="hidden md:inline-flex h-9 items-center rounded-lg bg-muted p-1 text-sm"
        >
          {MODES.map((m) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={mode === m.id}
              onClick={() => onModeChange(m.id)}
              title={m.hint}
              className={
                "px-3 h-7 rounded-md font-medium transition-colors " +
                (mode === m.id
                  ? "bg-background text-foreground shadow"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          {/* モバイル用のコンパクトなモード切替 */}
          <select
            className="md:hidden mr-1 rounded-md border bg-background px-2 h-8 text-xs"
            value={mode}
            onChange={(e) => onModeChange(e.target.value as Mode)}
          >
            {MODES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
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
              href="https://github.com/takushio2525/font-to-bin"
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
