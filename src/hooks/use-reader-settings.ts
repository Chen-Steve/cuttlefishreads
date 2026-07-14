"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  DEFAULT_READER_SETTINGS,
  READER_SETTINGS_STORAGE_KEY,
  parseReaderSettings,
  type ReaderSettings,
} from "@/lib/reader-settings";

const listeners = new Set<() => void>();

let cachedSettings: ReaderSettings | null = null;
let cachedRaw: string | null = null;

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function readSettings(): ReaderSettings {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(READER_SETTINGS_STORAGE_KEY);
  } catch {
    return DEFAULT_READER_SETTINGS;
  }

  if (cachedSettings && cachedRaw === raw) {
    return cachedSettings;
  }

  cachedRaw = raw;
  cachedSettings = parseReaderSettings(raw);
  return cachedSettings;
}

function writeSettings(next: ReaderSettings) {
  const raw = JSON.stringify(next);
  try {
    localStorage.setItem(READER_SETTINGS_STORAGE_KEY, raw);
  } catch {
    // Ignore private browsing / quota errors.
  }
  cachedRaw = raw;
  cachedSettings = next;
  notify();
}

function getServerSnapshot(): ReaderSettings {
  return DEFAULT_READER_SETTINGS;
}

export function useReaderSettings() {
  const settings = useSyncExternalStore(
    subscribe,
    readSettings,
    getServerSnapshot,
  );

  const updateSettings = useCallback((patch: Partial<ReaderSettings>) => {
    writeSettings({ ...readSettings(), ...patch });
  }, []);

  const resetSettings = useCallback(() => {
    writeSettings(DEFAULT_READER_SETTINGS);
  }, []);

  return { settings, updateSettings, resetSettings } as const;
}
