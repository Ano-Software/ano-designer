"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Updater<T> = T | ((previous: T) => T);

type UseDraftOptions<T> = {
  storageKey: string;
  initialValue: T;
  enabled?: boolean;
  autosaveInterval?: number;
};

type UseDraftReturn<T> = {
  value: T;
  setValue: (updater: Updater<T>) => void;
  save: () => void;
  discard: () => void;
  dirty: boolean;
  hydrated: boolean;
  lastSavedAt: number | null;
};

const DEFAULT_AUTOSAVE = 2000;

export function useDraft<T>(options: UseDraftOptions<T>): UseDraftReturn<T> {
  const { storageKey, initialValue, enabled = true, autosaveInterval = DEFAULT_AUTOSAVE } = options;

  const [value, setValueState] = useState<T>(initialValue);
  const [dirty, setDirty] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const valueRef = useRef(value);
  const initialRef = useRef(initialValue);
  const isFirstChangeRef = useRef(true);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    initialRef.current = initialValue;
  }, [initialValue]);

  useEffect(() => {
    if (!enabled) {
      setHydrated(true);
      return;
    }

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as T;
        setValueState(parsed);
        setDirty(false);
      }
    } catch (error) {
      console.error("Falha ao carregar rascunho local", error);
    } finally {
      setHydrated(true);
    }
  }, [enabled, storageKey]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (isFirstChangeRef.current) {
      isFirstChangeRef.current = false;
      return;
    }

    setDirty(true);
  }, [value, hydrated]);

  const save = useCallback(() => {
    if (!enabled) {
      return;
    }

    try {
      const snapshot = valueRef.current;
      window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
      setLastSavedAt(Date.now());
      setDirty(false);
    } catch (error) {
      console.error("Falha ao salvar rascunho local", error);
    }
  }, [enabled, storageKey]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (!hydrated) {
      return;
    }

    const interval = window.setInterval(() => {
      if (dirty) {
        save();
      }
    }, autosaveInterval);

    return () => window.clearInterval(interval);
  }, [autosaveInterval, dirty, enabled, hydrated, save]);

  const setValue = useCallback((updater: Updater<T>) => {
    setValueState((previous) =>
      typeof updater === "function" ? (updater as (prev: T) => T)(previous) : updater
    );
  }, []);

  const discard = useCallback(() => {
    if (enabled) {
      window.localStorage.removeItem(storageKey);
    }
    setValueState(initialRef.current);
    setDirty(false);
    setLastSavedAt(null);
    isFirstChangeRef.current = true;
  }, [enabled, storageKey]);

  return {
    value,
    setValue,
    save,
    discard,
    dirty,
    hydrated,
    lastSavedAt,
  };
}
