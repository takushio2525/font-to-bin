import { Moon, Sun, Share2 } from "lucide-react";
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
              <GitHubMark className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}

// GitHub のマーク。Octicons の mark-github-16 を形を変えずに描く（色は文字色に合わせる）。
// GitHub のロゴのガイドライン（https://brand.github.com/foundations/logo）は、プロジェクトへのリンクの
// ボタンとして使うことを認め、ロゴの改変を禁じている。lucide の Github は線画に描き直したものなので使わない
function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M6.766 11.328c-2.063-.25-3.516-1.734-3.516-3.656 0-.781.281-1.625.75-2.188-.203-.515-.172-1.609.063-2.062.625-.078 1.468.25 1.968.703.594-.187 1.219-.281 1.985-.281.765 0 1.39.094 1.953.265.484-.437 1.344-.765 1.969-.687.218.422.25 1.515.046 2.047.5.593.766 1.39.766 2.203 0 1.922-1.453 3.375-3.547 3.64.531.344.89 1.094.89 1.954v1.625c0 .468.391.734.86.547C13.781 14.359 16 11.53 16 8.03 16 3.61 12.406 0 7.984 0 3.563 0 0 3.61 0 8.031a7.88 7.88 0 0 0 5.172 7.422c.422.156.828-.125.828-.547v-1.25c-.219.094-.5.156-.75.156-1.031 0-1.64-.562-2.078-1.609-.172-.422-.36-.672-.719-.719-.187-.015-.25-.093-.25-.187 0-.188.313-.328.625-.328.453 0 .844.281 1.25.86.313.452.64.655 1.031.655s.641-.14 1-.5c.266-.265.47-.5.657-.656" />
    </svg>
  );
}
