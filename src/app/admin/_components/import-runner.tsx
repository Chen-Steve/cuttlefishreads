"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  CircleSlash,
  Loader2,
  Play,
  Square,
  XCircle,
} from "lucide-react";

const inputClass =
  "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/25";
const labelClass = "text-xs font-medium text-muted";

type LogStatus = "imported" | "skipped" | "error";

type LogEntry = {
  id: number;
  status: LogStatus;
  url: string;
  number?: number;
  title?: string;
  message?: string;
};

type ApiResponse = {
  ok: boolean;
  status?: "imported" | "skipped";
  number?: number;
  title?: string;
  sourceUrl?: string;
  nextUrl?: string | null;
  error?: string;
};

export function ImportRunner({
  novelId,
  novelTitle,
}: {
  novelId: string;
  novelTitle: string;
}) {
  const router = useRouter();
  const stopRef = useRef(false);
  const logIdRef = useRef(0);

  const [startUrl, setStartUrl] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("English");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gemini-2.5-flash");
  const [access, setAccess] = useState<"free" | "paid">("free");
  const [coinCost, setCoinCost] = useState(5);
  const [maxChapters, setMaxChapters] = useState(50);
  const [delayMs, setDelayMs] = useState(1500);

  const [running, setRunning] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [done, setDone] = useState(false);

  const importedCount = logs.filter((l) => l.status === "imported").length;
  const skippedCount = logs.filter((l) => l.status === "skipped").length;

  const addLog = useCallback((entry: Omit<LogEntry, "id">) => {
    logIdRef.current += 1;
    setLogs((prev) => [...prev, { id: logIdRef.current, ...entry }]);
  }, []);

  const start = useCallback(async () => {
    const first = startUrl.trim();
    if (!/^https?:\/\//i.test(first)) {
      addLog({ status: "error", url: first, message: "Enter a valid http(s) URL to start from." });
      return;
    }

    stopRef.current = false;
    setRunning(true);
    setDone(false);
    setLogs([]);
    logIdRef.current = 0;

    const visited = new Set<string>();
    let url: string | null = first;
    let processed = 0;

    while (url && !stopRef.current && processed < maxChapters) {
      if (visited.has(url)) {
        addLog({ status: "error", url, message: "Loop detected — already visited this URL. Stopping." });
        break;
      }
      visited.add(url);
      setCurrentUrl(url);

      let data: ApiResponse;
      try {
        const res = await fetch("/api/admin/import-chapter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            novelId,
            url,
            apiKey: apiKey || undefined,
            model: model || undefined,
            targetLanguage,
            access,
            coinCost,
          }),
        });
        data = (await res.json()) as ApiResponse;
      } catch (err) {
        addLog({
          status: "error",
          url,
          message: err instanceof Error ? err.message : "Network error.",
        });
        break;
      }

      if (!data.ok) {
        addLog({ status: "error", url, message: data.error ?? "Unknown error." });
        break;
      }

      addLog({
        status: data.status === "skipped" ? "skipped" : "imported",
        url: data.sourceUrl ?? url,
        number: data.number,
        title: data.title,
      });

      processed += 1;
      url = data.nextUrl ?? null;

      if (url && !stopRef.current) {
        await new Promise((r) => setTimeout(r, Math.max(0, delayMs)));
      }
    }

    setRunning(false);
    setCurrentUrl(null);
    setDone(true);
    router.refresh();
  }, [
    startUrl,
    maxChapters,
    novelId,
    apiKey,
    model,
    targetLanguage,
    access,
    coinCost,
    delayMs,
    addLog,
    router,
  ]);

  const stop = useCallback(() => {
    stopRef.current = true;
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="start-url" className={labelClass}>
            First chapter URL
          </label>
          <input
            id="start-url"
            value={startUrl}
            onChange={(e) => setStartUrl(e.target.value)}
            disabled={running}
            placeholder="https://m.wfxs.tw/xiaoshuo/9389101/82601102/"
            className={inputClass}
          />
          <span className="text-xs text-muted">
            Paste chapter 1. The importer follows each &ldquo;next chapter&rdquo; link
            until there are none left or a link breaks.
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="target-language" className={labelClass}>
            Translate into
          </label>
          <input
            id="target-language"
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            disabled={running}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="model" className={labelClass}>
            Gemini model
          </label>
          <select
            id="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={running}
            className={inputClass}
          >
            <optgroup label="Gemini 3">
              <option value="gemini-3-flash">gemini-3-flash</option>
            </optgroup>
            <optgroup label="Gemini 2.5">
              <option value="gemini-2.5-flash">gemini-2.5-flash</option>
              <option value="gemini-2.5-flash-lite">gemini-2.5-flash-lite</option>
              <option value="gemini-2.5-pro">gemini-2.5-pro</option>
            </optgroup>
            <optgroup label="Gemini 2.0">
              <option value="gemini-2.0-flash">gemini-2.0-flash</option>
              <option value="gemini-2.0-flash-lite">gemini-2.0-flash-lite</option>
            </optgroup>
            <optgroup label="Gemini 1.5">
              <option value="gemini-1.5-flash">gemini-1.5-flash</option>
              <option value="gemini-1.5-flash-8b">gemini-1.5-flash-8b</option>
              <option value="gemini-1.5-pro">gemini-1.5-pro</option>
            </optgroup>
          </select>
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="api-key" className={labelClass}>
            Gemini API key
            <span className="ml-1 font-normal opacity-60">
              (optional if GEMINI_API_KEY is set on the server)
            </span>
          </label>
          <input
            id="api-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={running}
            placeholder="AIza..."
            autoComplete="off"
            className={inputClass}
          />
          <span className="text-xs text-muted">
            The key is sent only to your own server for each request and is never stored.
          </span>
        </div>

        <fieldset className="flex flex-col gap-2 sm:col-span-2">
          <legend className={labelClass}>Imported chapter access</legend>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2 text-sm font-medium text-foreground transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent/10 has-[:checked]:text-accent">
              <input
                type="radio"
                name="import-access"
                value="free"
                checked={access === "free"}
                onChange={() => setAccess("free")}
                disabled={running}
                className="size-3.5 accent-accent"
              />
              Free
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2 text-sm font-medium text-foreground transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent/10 has-[:checked]:text-accent">
              <input
                type="radio"
                name="import-access"
                value="paid"
                checked={access === "paid"}
                onChange={() => setAccess("paid")}
                disabled={running}
                className="size-3.5 accent-accent"
              />
              Paid
            </label>
            {access === "paid" && (
              <input
                type="number"
                min={1}
                value={coinCost}
                onChange={(e) => setCoinCost(Math.max(1, Number(e.target.value)))}
                disabled={running}
                aria-label="Cookie cost"
                className="h-11 w-28 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
            )}
          </div>
          <span className="text-xs text-muted">
            Everything imports as an unpublished draft regardless — you publish it later.
          </span>
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="max-chapters" className={labelClass}>
            Max chapters this run
          </label>
          <input
            id="max-chapters"
            type="number"
            min={1}
            value={maxChapters}
            onChange={(e) => setMaxChapters(Math.max(1, Number(e.target.value)))}
            disabled={running}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="delay" className={labelClass}>
            Delay between chapters (ms)
          </label>
          <input
            id="delay"
            type="number"
            min={0}
            step={250}
            value={delayMs}
            onChange={(e) => setDelayMs(Math.max(0, Number(e.target.value)))}
            disabled={running}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {running ? (
          <button
            type="button"
            onClick={stop}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-rose-200 bg-background px-5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
          >
            <Square className="size-4" strokeWidth={2} aria-hidden />
            Stop after current
          </button>
        ) : (
          <button
            type="button"
            onClick={start}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Play className="size-4" strokeWidth={2} aria-hidden />
            Start import
          </button>
        )}

        {(running || logs.length > 0) && (
          <p className="text-sm text-muted">
            <span className="font-semibold text-foreground">{importedCount}</span> imported
            {skippedCount > 0 && (
              <>
                {" · "}
                <span className="font-semibold text-foreground">{skippedCount}</span> skipped
              </>
            )}
          </p>
        )}

        {done && !running && (
          <Link
            href={`/admin/novels/${novelId}/chapters`}
            className="ml-auto text-sm font-semibold text-accent hover:underline"
          >
            Review drafts →
          </Link>
        )}
      </div>

      {running && currentUrl && (
        <p className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-muted">
          <Loader2 className="size-4 animate-spin text-accent" aria-hidden />
          Scraping &amp; translating{" "}
          <span className="truncate font-mono text-xs">{currentUrl}</span>
        </p>
      )}

      {logs.length > 0 && (
        <ol className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {logs.map((log) => (
            <li key={log.id} className="flex items-start gap-3 px-4 py-3 text-sm">
              {log.status === "imported" && (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
              )}
              {log.status === "skipped" && (
                <CircleSlash className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden />
              )}
              {log.status === "error" && (
                <XCircle className="mt-0.5 size-4 shrink-0 text-rose-600" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                {log.status === "error" ? (
                  <p className="text-rose-600">{log.message}</p>
                ) : (
                  <p className="truncate font-medium text-foreground">
                    {typeof log.number === "number" && (
                      <span className="text-muted">Ch. {log.number} · </span>
                    )}
                    {log.title}
                    {log.status === "skipped" && (
                      <span className="text-amber-600"> (already imported)</span>
                    )}
                  </p>
                )}
                <p className="truncate font-mono text-xs text-muted">{log.url}</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      <p className="text-xs text-muted">
        Importing for <span className="font-medium text-foreground">{novelTitle}</span>.
        Keep this tab open while it runs.
      </p>
    </div>
  );
}
