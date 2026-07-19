import type { BusinessLine } from "@/lib/types";

export interface StorageAdapter {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export const browserStorage: StorageAdapter = {
  get(key) {
    return getLocalStorage()?.getItem(key) ?? null;
  },
  set(key, value) {
    getLocalStorage()?.setItem(key, value);
  },
  remove(key) {
    getLocalStorage()?.removeItem(key);
  },
};

export const APP_PREFERENCES_STORAGE_KEY = "c3:v3:preferences";

export interface AppPreferences {
  theme: "day" | "night";
}

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  theme: "day",
};

export interface WorkspaceStorageKeys {
  brief: string;
  drafts: string;
  history: string;
  materials: string;
  angleHistory: string;
}

export const MATRIX_DRAFTS_STORAGE_KEY = "c3:v3:creation:drafts";
export const MATRIX_HISTORY_STORAGE_KEY = "c3:v3:creation:history";

export function getWorkspaceStorageKeys(
  businessLine: BusinessLine,
): WorkspaceStorageKeys {
  const scope = "c3:v3:creation";
  return {
    brief: `${scope}:brief:${businessLine}`,
    drafts: MATRIX_DRAFTS_STORAGE_KEY,
    history: MATRIX_HISTORY_STORAGE_KEY,
    materials: `${scope}:materials`,
    angleHistory: `${scope}:angle-history`,
  };
}

export function readStoredJson<T>(key: string, fallback: T, legacyKeys: string[] = []): T {
  const current = browserStorage.get(key);
  const raw = current ?? legacyKeys.map((legacyKey) => browserStorage.get(legacyKey)).find(Boolean);
  if (!raw) return fallback;

  try {
    const value = JSON.parse(raw) as T;
    if (current === null) browserStorage.set(key, raw);
    return value;
  } catch {
    return fallback;
  }
}

export function writeStoredJson(key: string, value: unknown): void {
  browserStorage.set(key, JSON.stringify(value));
}
