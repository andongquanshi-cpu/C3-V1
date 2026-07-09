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

/** 修复 LLM 常犯的 JSON 瑕疵：尾逗号、字符串内裸换行、弯引号 */
function repairLLMJsonText(raw: string): string {
  let text = raw
    .replace(/\u201c|\u201d/g, '"')
    .replace(/\u2018|\u2019/g, "'")
    .replace(/,\s*([}\]])/g, "$1");

  // 仅当明显是多个顶层对象粘连时才补逗号（避免误伤正文里的 }{）
  if (/^\s*\{[\s\S]*\}\s*\{[\s\S]*\}\s*$/.test(text)) {
    text = text.replace(/}\s*{/g, "},{");
  }

  let result = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escaped) {
      result += ch;
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      result += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }
    if (inString && (ch === "\n" || ch === "\r")) {
      result += ch === "\n" ? "\\n" : "\\r";
      continue;
    }
    result += ch;
  }

  return result;
}

export function parseLLMJson<T>(raw: string): T {
  const candidate = extractJsonCandidate(raw);
  try {
    return JSON.parse(candidate) as T;
  } catch {
    return JSON.parse(repairLLMJsonText(candidate)) as T;
  }
}
