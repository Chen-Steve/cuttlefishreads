"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Check, ChevronDown, Minus, Plus, RotateCcw, Type } from "lucide-react";

import { useReaderSettings } from "@/hooks/use-reader-settings";
import {
  BACKGROUND_OPTIONS,
  FONT_FAMILY_OPTIONS,
  FONT_SIZE_RANGE,
  LINE_SPACING_RANGE,
  PARAGRAPH_SPACING_RANGE,
  TEXT_COLOR_OPTIONS,
  clampToRange,
  type ReaderFontFamily,
} from "@/lib/reader-settings";
import { cn } from "@/lib/utils";

function getFocusable(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);
}

export function ReaderSettingsPanel({
  placement = "down",
}: {
  placement?: "up" | "down";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dialogId = useId();
  const titleId = useId();
  const sizeLabelId = useId();
  const fontLabelId = useId();
  const lineLabelId = useId();
  const paragraphLabelId = useId();
  const backgroundLabelId = useId();
  const textColorLabelId = useId();
  const { settings, updateSettings, resetSettings } = useReaderSettings();

  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Move focus into the panel once it mounts.
    requestAnimationFrame(() => {
      const focusable = panel ? getFocusable(panel) : [];
      (focusable[0] ?? panel)?.focus();
    });

    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key !== "Tab" || !panel) return;

      const focusable = getFocusable(panel);
      if (focusable.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
      // Restore focus to the trigger when the panel closes.
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      } else {
        triggerRef.current?.focus();
      }
    };
  }, [open]);

  return (
    <div ref={ref} className="relative justify-self-center">
      <button
        ref={triggerRef}
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
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          id={dialogId}
          aria-labelledby={titleId}
          tabIndex={-1}
          className={cn(
            "absolute left-1/2 z-30 w-[min(17.5rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-border bg-surface p-2.5 shadow-md outline-none",
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
            <SettingRow label="Size" labelId={sizeLabelId}>
              <Stepper
                labelledBy={sizeLabelId}
                ariaLabel="Font size"
                value={settings.fontSize}
                display={`${settings.fontSize}px`}
                range={FONT_SIZE_RANGE}
                onChange={(fontSize) => updateSettings({ fontSize })}
              />
            </SettingRow>

            <SettingRow label="Font" labelId={fontLabelId}>
              <FontSelect
                labelledBy={fontLabelId}
                value={settings.fontFamily}
                onChange={(fontFamily) => updateSettings({ fontFamily })}
              />
            </SettingRow>

            <SettingRow label="Line" labelId={lineLabelId}>
              <Stepper
                labelledBy={lineLabelId}
                ariaLabel="Line spacing"
                value={settings.lineSpacing}
                display={settings.lineSpacing.toFixed(1)}
                range={LINE_SPACING_RANGE}
                onChange={(lineSpacing) => updateSettings({ lineSpacing })}
              />
            </SettingRow>

            <SettingRow label="Paragraph" labelId={paragraphLabelId}>
              <Stepper
                labelledBy={paragraphLabelId}
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
              <p
                id={backgroundLabelId}
                className="mb-1.5 text-xs font-medium text-muted"
              >
                Background
              </p>
              <div
                role="group"
                aria-labelledby={backgroundLabelId}
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

            <div className="py-2">
              <p
                id={textColorLabelId}
                className="mb-1.5 text-xs font-medium text-muted"
              >
                Text
              </p>
              <div
                role="group"
                aria-labelledby={textColorLabelId}
                className="flex items-center justify-between gap-1"
              >
                {TEXT_COLOR_OPTIONS.map((option) => {
                  const selected = settings.textColor === option.value;
                  const checkColor =
                    option.value === "default"
                      ? "var(--background)"
                      : option.value === "soft"
                        ? "#3d3229"
                        : "#fff";
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={selected}
                      aria-label={`${option.label} text color`}
                      title={option.label}
                      onClick={() =>
                        updateSettings({ textColor: option.value })
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
                          style={{ color: checkColor }}
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
  labelId,
  children,
}: {
  label: string;
  labelId: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span id={labelId} className="text-xs font-medium text-muted">
        {label}
      </span>
      {children}
    </div>
  );
}

function Stepper({
  labelledBy,
  ariaLabel,
  value,
  display,
  range,
  onChange,
}: {
  labelledBy: string;
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
      aria-labelledby={labelledBy}
      aria-label={ariaLabel}
      className="inline-flex h-7 items-center overflow-hidden rounded-lg border border-border bg-background"
    >
      <button
        type="button"
        aria-label={`Decrease ${ariaLabel.toLowerCase()}`}
        disabled={value <= range.min}
        onClick={() => step(-1)}
        className="inline-flex h-full w-7 items-center justify-center text-foreground transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:text-muted/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
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
        className="inline-flex h-full w-7 items-center justify-center text-foreground transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:text-muted/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
      >
        <Plus className="size-3" strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}

function FontSelect({
  labelledBy,
  value,
  onChange,
}: {
  labelledBy: string;
  value: ReaderFontFamily;
  onChange: (value: ReaderFontFamily) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedOption = FONT_FAMILY_OPTIONS.find((o) => o.value === value);
  const displayLabel =
    value === "default" ? "Default" : (selectedOption?.label ?? "Default");

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
    <div ref={ref} className="relative w-36">
      <button
        type="button"
        aria-labelledby={labelledBy}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-7 w-full items-center justify-between gap-1 rounded-lg border border-border bg-background px-2 text-xs font-medium text-foreground transition-colors hover:border-accent/60 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown
          className={cn(
            "size-3 shrink-0 transition-transform duration-150",
            open && "rotate-180",
          )}
          strokeWidth={1.75}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-labelledby={labelledBy}
          className="absolute inset-x-0 top-full z-40 mt-1.5 max-h-48 overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-surface shadow-md"
        >
          {FONT_FAMILY_OPTIONS.map((option) => {
            const selected = option.value === value;
            const label =
              option.value === "default" ? "Default" : option.label;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-background"
              >
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
