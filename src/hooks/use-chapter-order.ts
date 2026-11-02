"use client";

import { useCallback, useSyncExternalStore } from "react";

const listenersByKey = new Map<string, Set<() => void>>();

function listenersFor(storageKey: string) {
  let listeners = listenersByKey.get(storageKey);
  if (!listeners) {
    listeners = new Set();
    listenersByKey.set(storageKey, listeners);
  }
  return listeners;
}

function subscribeChapterOrder(storageKey: string, onStoreChange: () => void) {
  const listeners = listenersFor(storageKey);
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function readChapterOrder(storageKey: string) {
  try {
    return localStorage.getItem(storageKey) === "newest";
  } catch {
    return false;
  }
}

function writeChapterOrder(storageKey: string, newestFirst: boolean) {
  try {
    localStorage.setItem(storageKey, newestFirst ? "newest" : "oldest");
    for (const listener of listenersFor(storageKey)) {
      listener();
    }
  } catch {
    // Ignore private browsing / quota errors.
  }
}

function getChapterOrderServerSnapshot() {
  return false;
}

/** Newest-first chapter list preference persisted in localStorage. */
export function useChapterOrder(storageKey: string) {
  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      subscribeChapterOrder(storageKey, onStoreChange),
    [storageKey],
  );
  const getSnapshot = useCallback(
    () => readChapterOrder(storageKey),
    [storageKey],
  );
  const newestFirst = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getChapterOrderServerSnapshot,
  );
  const setNewestFirst = useCallback(
    (value: boolean) => writeChapterOrder(storageKey, value),
    [storageKey],
  );
  return [newestFirst, setNewestFirst] as const;
}
