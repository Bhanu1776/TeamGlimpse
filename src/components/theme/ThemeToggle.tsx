"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — only render the icon once mounted on client
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true); }, []);

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "relative size-8 rounded-full flex items-center justify-center",
        "border border-border hover:bg-accent transition-colors press",
        "overflow-hidden",
        className
      )}
    >
      {/* Sun */}
      <span
        className={cn(
          "absolute transition-all duration-300",
          mounted && !isDark
            ? "opacity-100 scale-100 rotate-0"
            : "opacity-0 scale-50 -rotate-90"
        )}
      >
        <Sun className="size-[15px] text-foreground" strokeWidth={1.75} />
      </span>

      {/* Moon */}
      <span
        className={cn(
          "absolute transition-all duration-300",
          mounted && isDark
            ? "opacity-100 scale-100 rotate-0"
            : "opacity-0 scale-50 rotate-90"
        )}
      >
        <Moon className="size-[15px] text-foreground" strokeWidth={1.75} />
      </span>
    </button>
  );
}
