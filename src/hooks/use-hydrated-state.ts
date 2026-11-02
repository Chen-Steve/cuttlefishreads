"use client";

import { useCallback, useState, useSyncExternalStore, type SetStateAction } from "react";

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/** Read a browser value once after hydration; keep updates working without storage. */
export function useHydratedState<T>(readInitialValue: () => T, serverValue: T) {
  const hydrated = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const [state, setState] = useState<{ value: T } | null>(null);

  if (hydrated && state === null) {
    setState({ value: readInitialValue() });
  }

  const setValue = useCallback((next: SetStateAction<T>) => {
    setState((current) => ({
      value: typeof next === "function"
        ? (next as (value: T) => T)(current ? current.value : serverValue)
        : next,
    }));
  }, [serverValue]);

  return [state ? state.value : serverValue, setValue] as const;
}
