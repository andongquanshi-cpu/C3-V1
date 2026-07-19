import {
  dedupeHotspotMaterials,
  filterHotspotForBusinessLine,
  normalizeHotspotFromEastMoney,
  type EastMoneyNewsItem,
} from "@/lib/eastmoney-hotspot";
import { expandEastMoneyNewsItems, parseEastMoneyTablePayload } from "@/lib/eastmoney-table-parser";
import { buildHotspotMaterialId, filterHotspotQuality } from "@/lib/hotspot-display";

export const EASTMONEY_MCP_URL =
  process.env.EASTMONEY_MCP_URL?.trim() || "https://mxapi.eastmoney.com/mxds/mcp";

const NEWS_TOOL_PRIORITY = [
  "mx_finance_search_news",
  "mx_finance_search_notice",
];

const NEWS_TOOL_HINTS = ["search_news", "search_notice", "finance_search", "资讯", "news"];

const NEWS_TOOL_BLOCKLIST = ["screener", "macro", "bond", "fund_finance_data", "ashare_finance_data"];

type JsonRpcMessage = {
  jsonrpc?: string;
  id?: number | string;
  result?: unknown;
  error?: { message?: string; code?: number };
};

function parseMcpPayload(raw: string): JsonRpcMessage | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("{")) {
    try {
      return JSON.parse(trimmed) as JsonRpcMessage;
    } catch {
      return null;
    }
  }

  const dataLines = trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim());

  for (let i = dataLines.length - 1; i >= 0; i -= 1) {
    try {
      return JSON.parse(dataLines[i]) as JsonRpcMessage;
    } catch {
      // try older chunk
    }
  }
  return null;
}

function extractRpcError(message: JsonRpcMessage | null, fallback: string) {
  if (!message?.error) return null;
  return message.error.message || fallback;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function collectTextChunks(value: unknown, out: string[] = []) {
  if (typeof value === "string" && value.trim()) {
    out.push(value.trim());
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectTextChunks(item, out);
    return out;
  }
  const record = asRecord(value);
  if (!record) return out;

  if (typeof record.text === "string" && record.text.trim()) out.push(record.text.trim());
  if (typeof record.content === "string" && record.content.trim()) out.push(record.content.trim());
  if (Array.isArray(record.content)) {
    for (const item of record.content) collectTextChunks(item, out);
  }
  if (record.structuredContent) collectTextChunks(record.structuredContent, out);
  return out;
}

function tryParseEmbeddedJson(text: string): EastMoneyNewsItem[] {
  const tableItems = parseEastMoneyTablePayload(text);
  if (tableItems.length) return tableItems;

  try {
    const parsed = JSON.parse(text) as unknown;
    const fromParsed = parseEastMoneyTablePayload(parsed);
    if (fromParsed.length) return fromParsed;
    const record = asRecord(parsed);
    if (record?.title || record?.trunk) {
      return [
        {
          title: String(record.title || ""),
          trunk: String(record.trunk || record.content || ""),
          url: typeof record.url === "string" ? record.url : undefined,
        },
      ];
    }
  } catch {
    // fall through
  }

  const tableMatch = text.match(/\{[\s\S]*"columns"[\s\S]*"(?:list|items)"[\s\S]*\}/);
  if (tableMatch) {
    const parsed = parseEastMoneyTablePayload(tableMatch[0]);
    if (parsed.length) return parsed;
  }
  return [];
}

function newsItemsFromMcpResult(result: unknown): EastMoneyNewsItem[] {
  const tableFirst = parseEastMoneyTablePayload(result);
  if (tableFirst.length) return tableFirst;

  const record = asRecord(result);
  if (!record) return [];

  const direct: EastMoneyNewsItem[] = [];
  if (record.title || record.trunk) {
    direct.push({
      title: String(record.title || ""),
      trunk: String(record.trunk || ""),
      url: typeof record.url === "string" ? record.url : undefined,
      secuList: Array.isArray(record.secuList) ? (record.secuList as EastMoneyNewsItem["secuList"]) : undefined,
    });
  }

  const data = record.data;
  if (Array.isArray(data)) {
    for (const row of data) {
      const item = asRecord(row);
      if (item?.title || item?.trunk) {
        direct.push({
          title: String(item.title || ""),
          trunk: String(item.trunk || item.content || ""),
          url: typeof item.url === "string" ? item.url : undefined,
        });
      }
    }
  }

  if (direct.length) return expandEastMoneyNewsItems(direct);

  const texts = collectTextChunks(result);
  const fromText = texts.flatMap((text) => tryParseEmbeddedJson(text));
  if (fromText.length) return expandEastMoneyNewsItems(fromText);

  const joined = texts.join("\n\n").trim();
  const fromJoined = parseEastMoneyTablePayload(joined);
  if (fromJoined.length) return fromJoined;

  if (!joined) return [];

  const firstLine = joined.split("\n").find((line) => line.trim()) || "财经资讯";
  return [{ title: firstLine.slice(0, 72), trunk: joined }];
}

function pickNewsSearchTool(tools: unknown): string | null {
  const record = asRecord(tools);
  const list = Array.isArray(record?.tools) ? record.tools : Array.isArray(tools) ? tools : [];
  if (!list.length) return null;

  const scored = list
    .map((tool) => asRecord(tool))
    .filter(Boolean)
    .map((tool) => {
      const name = String(tool!.name || "");
      const description = String(tool!.description || "");
      const haystack = `${name} ${description}`.toLowerCase();
      let score = 0;

      const priorityIndex = NEWS_TOOL_PRIORITY.indexOf(name);
      if (priorityIndex >= 0) score += 100 - priorityIndex * 10;

      for (const hint of NEWS_TOOL_HINTS) {
        if (haystack.includes(hint.toLowerCase())) score += 5;
      }
      for (const blocked of NEWS_TOOL_BLOCKLIST) {
        if (haystack.includes(blocked)) score -= 20;
      }
      if (haystack.includes("search") && haystack.includes("news")) score += 8;

      return { name, score };
    })
    .filter((item) => item.name)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.name || null;
}

export class EastMoneyMcpClient {
  private sessionId: string | null = null;
  private newsToolName: string | null = null;
  private initialized = false;

  constructor(private readonly apiKey: string) {}

  private async post(method: string, params: Record<string, unknown> = {}) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      em_api_key: this.apiKey,
    };
    if (this.sessionId) headers["mcp-session-id"] = this.sessionId;

    const response = await fetch(EASTMONEY_MCP_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: `${method}_${Date.now()}`,
        method,
        params,
      }),
    });

    const sessionHeader =
      response.headers.get("mcp-session-id") ||
      response.headers.get("Mcp-Session-Id") ||
      response.headers.get("MCP-Session-Id");
    if (sessionHeader) this.sessionId = sessionHeader;

    const raw = await response.text();
    if (!response.ok) {
      throw new Error(raw || `东财 MCP 请求失败：${response.status}`);
    }

    const message = parseMcpPayload(raw);
    const rpcError = extractRpcError(message, "东财 MCP 返回错误");
    if (rpcError) throw new Error(rpcError);
    return message?.result ?? message;
  }

  private async ensureReady() {
    if (this.initialized) return;

    await this.post("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "c3-copilot", version: "1.0.0" },
    });

    try {
      await this.post("notifications/initialized", {});
    } catch {
      // 部分 MCP 服务不需要显式 initialized
    }

    const toolsResult = await this.post("tools/list", {});
    this.newsToolName = pickNewsSearchTool(toolsResult);
    this.initialized = true;
  }

  async searchNews(query: string) {
    await this.ensureReady();
    if (!this.newsToolName) {
      throw new Error("东财 MCP 未提供资讯搜索工具，请确认 mx-ds-mcp 已开通资讯能力");
    }

    const argumentCandidates = [{ query }, { toolQuery: query }];

    let lastError = "东财 MCP 资讯搜索失败";
    for (const args of argumentCandidates) {
      try {
        const result = await this.post("tools/call", {
          name: this.newsToolName,
          arguments: args,
        });
        const items = newsItemsFromMcpResult(result);
        if (items.length) return items;
      } catch (error) {
        lastError = error instanceof Error ? error.message : lastError;
      }
    }

    throw new Error(lastError);
  }
}

export async function searchEastMoneyNewsViaMcp(
  query: string,
  apiKey: string,
  options?: { businessLine?: string },
) {
  const client = new EastMoneyMcpClient(apiKey);
  const items = expandEastMoneyNewsItems(await client.searchNews(query));
  const normalized = dedupeHotspotMaterials(items).map((item) => {
    const material = normalizeHotspotFromEastMoney(item);
    return {
      ...material,
      id: buildHotspotMaterialId(material.source, material.title),
      createdAt: new Date().toISOString(),
    };
  });
  const qualityFiltered = filterHotspotQuality(normalized);
  return filterHotspotForBusinessLine(qualityFiltered, options?.businessLine, "custom");
}
