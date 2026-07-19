import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

export function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function extractJsonCandidate(raw: string) {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return trimmed;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const objectStart = trimmed.indexOf("{");
  const arrayStart = trimmed.indexOf("[");
  const start = [objectStart, arrayStart].filter((item) => item >= 0).sort((a, b) => a - b)[0];
  if (start === undefined) return trimmed;

  const endChar = trimmed[start] === "{" ? "}" : "]";
  const end = trimmed.lastIndexOf(endChar);
  return end > start ? trimmed.slice(start, end + 1) : trimmed.slice(start);
}

export function parseLLMJson<T>(raw: string): T {
  const candidate = extractJsonCandidate(raw)
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/}\s*{/g, "},{");
  return JSON.parse(candidate) as T;
}
