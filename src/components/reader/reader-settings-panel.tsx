"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, Minus, Plus, RotateCcw, Type } from "lucide-react";

import { useReaderSettings } from "@/hooks/use-reader-settings";
import {
  BACKGROUND_OPTIONS,
  FONT_FAMILY_OPTIONS,
  FONT_SIZE_RANGE,
  LINE_SPACING_RANGE,
  PARAGRAPH_SPACING_RANGE,
  clampToRange,
  type ReaderFontFamily,
} from "@/lib/reader-settings";
import { cn } from "@/lib/utils";

export function ReaderSettingsPanel({
  placement = "down",
}: {
  placement?: "up" | "down";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const dialogId = useId();
  const titleId = useId();
  const { settings, updateSettings, resetSettings } = useReaderSettings();

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative justify-self-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        aria-label="Reading settings"
        title="Reading settings"
        className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-surface text-sm font-medium leading-none text-foreground transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <Type className="size-4" strokeWidth={1.75} aria-hidden />
      </button>

      {open ? (
        <div
          role="dialog"
          id={dialogId}
          aria-labelledby={titleId}
          className={cn(
            "absolute left-1/2 z-30 w-[min(17.5rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-border bg-surface p-2.5 shadow-md",
            placement === "up" ? "bottom-full mb-1.5" : "top-full mt-1.5",
          )}
        >
          <div className="mb-1 flex items-center justify-between gap-2 px-0.5">
            <h2
              id={titleId}
              className="text-xs font-semibold tracking-wide text-muted uppercase"
            >
              Reader
            </h2>
            <button
              type="button"
              onClick={resetSettings}
              title="Reset to defaults"
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-muted transition-colors hover:bg-background hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <RotateCcw className="size-3" strokeWidth={1.75} aria-hidden />
              Reset
            </button>
          </div>

          <div className="divide-y divide-border/60">
            <SettingRow label="Size">
              <Stepper
                ariaLabel="Font size"
                value={settings.fontSize}
                display={`${settings.fontSize}px`}
                range={FONT_SIZE_RANGE}
                onChange={(fontSize) => updateSettings({ fontSize })}
              />
            </SettingRow>

            <SettingRow label="Font">
              <FontSelect
                value={settings.fontFamily}
                onChange={(fontFamily) => updateSettings({ fontFamily })}
              />
            </SettingRow>

            <SettingRow label="Line">
              <Stepper
                ariaLabel="Line spacing"
                value={settings.lineSpacing}
                display={settings.lineSpacing.toFixed(1)}
                range={LINE_SPACING_RANGE}
                onChange={(lineSpacing) => updateSettings({ lineSpacing })}
              />
            </SettingRow>

            <SettingRow label="Paragraph">
              <Stepper
                ariaLabel="Paragraph spacing"
                value={settings.paragraphSpacing}
                display={settings.paragraphSpacing.toFixed(2)}
                range={PARAGRAPH_SPACING_RANGE}
                onChange={(paragraphSpacing) =>
                  updateSettings({ paragraphSpacing })
                }
              />
            </SettingRow>

            <div className="py-2">
              <div
                role="group"
                aria-label="Background color"
                className="flex items-center justify-between gap-1"
              >
                {BACKGROUND_OPTIONS.map((option) => {
                  const selected = settings.background === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={selected}
                      aria-label={`${option.label} background`}
                      title={option.label}
                      onClick={() =>
                        updateSettings({ background: option.value })
                      }
                      className={cn(
                        "relative inline-flex size-7 shrink-0 items-center justify-center rounded-full border transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                        selected
                          ? "border-accent ring-2 ring-accent/40"
                          : "border-border hover:border-accent/60",
                      )}
                      style={{ backgroundColor: option.swatch }}
                    >
                      {selected ? (
                        <Check
                          className="size-3.5"
                          strokeWidth={2.5}
                          aria-hidden
                          style={{
                            color:
                              option.value === "dusk" ||
                              option.value === "night"
                                ? "#fff"
                                : "#3d3229",
                          }}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SettingRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
    </div>
  );
}

function Stepper({
  ariaLabel,
  value,
  display,
  range,
  onChange,
}: {
  ariaLabel: string;
  value: number;
  display: string;
  range: { min: number; max: number; step: number };
  onChange: (value: number) => void;
}) {
  function step(direction: 1 | -1) {
    onChange(clampToRange(value + direction * range.step, range));
  }

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex h-7 items-center overflow-hidden rounded-lg border border-border bg-background"
    >
      <button
        type="button"
        aria-label={`Decrease ${ariaLabel.toLowerCase()}`}
        disabled={value <= range.min}
        onClick={() => step(-1)}
        className="inline-flex h-full w-7 items-center justify-center text-foreground transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:text-muted/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
      >
        <Minus className="size-3" strokeWidth={2} aria-hidden />
      </button>
      <span
        aria-live="polite"
        className="min-w-11 border-x border-border px-1 text-center font-mono text-[11px] tabular-nums text-foreground"
      >
        {display}
      </span>
      <button
        type="button"
        aria-label={`Increase ${ariaLabel.toLowerCase()}`}
        disabled={value >= range.max}
        onClick={() => step(1)}
        className="inline-flex h-full w-7 items-center justify-center text-foreground transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:text-muted/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
      >
        <Plus className="size-3" strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}

function FontSelect({
  value,
  onChange,
}: {
  value: ReaderFontFamily;
  onChange: (value: ReaderFontFamily) => void;
}) {
  return (
    <div className="relative">
      <select
        aria-label="Font type"
        value={value}
        onChange={(e) => onChange(e.target.value as ReaderFontFamily)}
        className="h-7 w-36 appearance-none rounded-lg border border-border bg-background pr-6 pl-2 text-xs text-foreground transition-colors hover:border-accent/60 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
      >
        {FONT_FAMILY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.value === "default" ? "Default" : option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-1.5 size-3 -translate-y-1/2 text-muted"
        strokeWidth={2}
        aria-hidden
      />
    </div>
  );
}
