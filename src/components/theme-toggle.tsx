"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { THEME_STORAGE_KEY, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

function getPreferredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // ignore
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function ThemeToggle({
  className,
  variant = "icon",
}: {
  className?: string;
  /** `menu` styles the control as an account-dropdown row. */
  variant?: "icon" | "menu";
}) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(getPreferredTheme());
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }

  const isDark = theme === "dark";
  const label = isDark ? "Light mode" : "Dark mode";

  if (variant === "menu") {
    return (
      <button
        type="button"
        role="menuitem"
        onClick={toggle}
        className={cn(
          "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-background",
          className,
        )}
      >
        {theme === null ? (
          <span className="size-4 shrink-0" aria-hidden />
        ) : isDark ? (
          <Sun className="size-4 shrink-0 text-muted" strokeWidth={1.75} aria-hidden />
        ) : (
          <Moon className="size-4 shrink-0 text-muted" strokeWidth={1.75} aria-hidden />
        )}
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={label}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-xl px-2.5 text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:h-9 sm:px-3",
        className,
      )}
    >
      {theme === null ? (
        <span className="size-5 sm:size-4" aria-hidden />
      ) : isDark ? (
        <Sun className="size-5 sm:size-4" strokeWidth={1.75} aria-hidden />
      ) : (
        <Moon className="size-5 sm:size-4" strokeWidth={1.75} aria-hidden />
      )}
    </button>
  );
}
