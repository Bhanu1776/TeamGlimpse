import { z } from "zod";

const isServer = typeof window === "undefined";

export function storageGet<T>(key: string, schema: z.ZodType<T>): T | null {
  if (isServer) return null;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    const result = schema.safeParse(parsed);
    if (!result.success) {
      console.warn(`[storage] Schema validation failed for "${key}", clearing.`);
      localStorage.removeItem(key);
      return null;
    }
    return result.data;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export function storageSet<T>(key: string, value: T): void {
  if (isServer) return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function storageRemove(key: string): void {
  if (isServer) return;
  localStorage.removeItem(key);
}

export function storageClear(): void {
  if (isServer) return;
  localStorage.clear();
}
