import type { EastMoneyNewsItem } from "@/lib/eastmoney-hotspot";

type ColumnKey = "title" | "summary" | "url" | "source" | "time";

const COLUMN_ALIASES: Record<ColumnKey, string[]> = {
  title: ["标题", "title", "新闻标题", "名称"],
  summary: ["摘要", "summary", "内容", "正文", "简介"],
  url: ["跳转链接", "链接", "url", "link", "href"],
  source: ["来源", "source", "媒体"],
  time: ["发布时间", "时间", "publishTime", "日期"],
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function buildColumnIndex(columns: string[]) {
  const index: Partial<Record<ColumnKey, number>> = {};
  columns.forEach((col, i) => {
    const normalized = String(col || "").trim().toLowerCase();
    for (const [key, aliases] of Object.entries(COLUMN_ALIASES) as Array<[ColumnKey, string[]]>) {
      if (index[key] !== undefined) continue;
      if (aliases.some((alias) => normalized === alias.toLowerCase() || normalized.includes(alias.toLowerCase()))) {
        index[key] = i;
      }
    }
  });
  if (index.title === undefined) index.title = 0;
  if (index.summary === undefined) index.summary = 1;
  return index;
}

function cellValue(row: unknown, index: number | undefined) {
  if (index === undefined) return "";
  if (Array.isArray(row)) return String(row[index] ?? "").trim();
  const record = asRecord(row);
  if (!record) return "";
  const values = Object.values(record);
  return String(values[index] ?? "").trim();
}

function rowsToNewsItems(columns: string[], rows: unknown[]): EastMoneyNewsItem[] {
  const idx = buildColumnIndex(columns);
  const items: EastMoneyNewsItem[] = [];

  for (const row of rows) {
    const title = cellValue(row, idx.title);
    if (!title || title.startsWith("{")) continue;
    const trunk = cellValue(row, idx.summary);
    const url = cellValue(row, idx.url);
    const source = cellValue(row, idx.source);
    const publishTime = cellValue(row, idx.time);
    items.push({
      title,
      trunk: trunk || undefined,
      url: url.startsWith("http") ? url : undefined,
      source: source || undefined,
      publishTime: publishTime || undefined,
    });
  }

  return items;
}

function parseTableRecord(record: Record<string, unknown>): EastMoneyNewsItem[] {
  const columns = Array.isArray(record.columns)
    ? record.columns.map(String)
    : Array.isArray(record.columnNames)
      ? record.columnNames.map(String)
      : null;

  const rows =
    (Array.isArray(record.list) && record.list) ||
    (Array.isArray(record.items) && record.items) ||
    (Array.isArray(record.rows) && record.rows) ||
    null;

  if (columns?.length && rows?.length) {
    return rowsToNewsItems(columns, rows);
  }

  if (Array.isArray(record.list)) {
    const objectRows = record.list.filter((row) => asRecord(row));
    if (objectRows.length) {
      return objectRows
        .map((row) => {
          const item = asRecord(row)!;
          return {
            title: String(item.title || item.name || ""),
            trunk: String(item.summary || item.trunk || item.content || item.body || ""),
            url: typeof item.url === "string" ? item.url : typeof item.link === "string" ? item.link : undefined,
            source: typeof item.source === "string" ? item.source : undefined,
            publishTime: typeof item.publishTime === "string" ? item.publishTime : undefined,
          };
        })
        .filter((item) => item.title?.trim());
    }
  }

  return [];
}

function parseDataSheets(data: unknown[]): EastMoneyNewsItem[] {
  const items: EastMoneyNewsItem[] = [];
  for (const sheet of data) {
    items.push(...parseTableRecord(asRecord(sheet) || {}));
  }
  return items;
}

function stripMarkdownFences(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced?.[1] || text).trim();
}

function extractTableJsonString(text: string) {
  const cleaned = stripMarkdownFences(text);
  if (!cleaned.includes("columns") || (!cleaned.includes("list") && !cleaned.includes("items"))) return null;
  const match = cleaned.match(/\{[\s\S]*"columns"[\s\S]*"(?:list|items)"[\s\S]*\}/);
  return match?.[0] || null;
}

/** 解析东财 MCP 常见的 columns + list 表格 JSON，展开为多条热搜条目 */
export function parseEastMoneyTablePayload(value: unknown): EastMoneyNewsItem[] {
  if (Array.isArray(value)) {
    const fromArray = value.flatMap((item) => parseEastMoneyTablePayload(item));
    if (fromArray.length) return fromArray;
  }

  if (typeof value === "string") {
    const trimmed = stripMarkdownFences(value.trim());
    if (!trimmed) return [];
    try {
      return parseEastMoneyTablePayload(JSON.parse(trimmed));
    } catch {
      const embedded = extractTableJsonString(trimmed);
      if (embedded) {
        try {
          return parseEastMoneyTablePayload(JSON.parse(embedded));
        } catch {
          return [];
        }
      }
      return [];
    }
  }

  const record = asRecord(value);
  if (!record) return [];

  if (Array.isArray(record.data)) {
    const fromSheets = parseDataSheets(record.data);
    if (fromSheets.length) return fromSheets;
  }

  const direct = parseTableRecord(record);
  if (direct.length) return direct;

  for (const key of ["data", "result", "trunk", "content", "text", "llmSearchResponse"]) {
    const nested = record[key];
    if (typeof nested === "string") {
      const parsed = parseEastMoneyTablePayload(nested);
      if (parsed.length) return parsed;
    }
    if (Array.isArray(nested)) {
      const parsed = parseEastMoneyTablePayload(nested);
      if (parsed.length) return parsed;
    }
    const nestedRecord = asRecord(nested);
    if (nestedRecord) {
      const parsed = parseEastMoneyTablePayload(nestedRecord);
      if (parsed.length) return parsed;
    }
  }

  return [];
}

export function expandEastMoneyNewsItems(items: EastMoneyNewsItem[]): EastMoneyNewsItem[] {
  const expanded: EastMoneyNewsItem[] = [];
  for (const item of items) {
    const fromTitle = parseEastMoneyTablePayload(item.title || "");
    const fromTrunk = parseEastMoneyTablePayload(item.trunk || "");
    const merged = [...fromTitle, ...fromTrunk];
    if (merged.length) {
      expanded.push(...merged);
      continue;
    }
    const title = item.title?.trim() || "";
    const trunk = item.trunk?.trim() || "";
    if (title && !title.startsWith("{")) {
      expanded.push(item);
      continue;
    }
    if (trunk && !trunk.startsWith("{")) {
      expanded.push({ ...item, title: title || trunk.slice(0, 48), trunk });
    }
  }
  return expanded;
}
