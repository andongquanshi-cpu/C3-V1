import type { Material } from "@/lib/types";
import { EASTMONEY_SOURCE_LABEL } from "@/lib/eastmoney-hotspot";

const CN_SOURCE_LABELS: Record<string, string> = {
  "wallstreetcn.com": "华尔街见闻",
  "cls.cn": "财联社",
  "eastmoney.com": "东方财富",
  "yicai.com": "第一财经",
  "caixin.com": "财新",
  "stcn.com": "证券时报",
  "cnstock.com": "上海证券报",
  "hexun.com": "和讯",
  "jiemian.com": "界面新闻",
  "gov.cn": "中国政府网",
  "pbc.gov.cn": "人民银行",
  "csrc.gov.cn": "证监会",
};

export function formatMaterialSource(source?: string) {
  if (!source || source === EASTMONEY_SOURCE_LABEL) return EASTMONEY_SOURCE_LABEL;
  if (source === "手动输入") return "手动粘贴";

  try {
    const url = source.startsWith("http") ? source : `https://${source}`;
    const host = new URL(url).hostname.replace(/^www\./, "");
    return CN_SOURCE_LABELS[host] || host;
  } catch {
    return source;
  }
}

export function getHotspotMaterialMeta(material: Pick<Material, "tags">) {
  const extra = material.tags?.filter((tag) => tag !== "热点") || [];
  const publishTime = extra.find((tag) => /^\d{4}[-/年]/.test(tag));
  const media = extra.find((tag) => tag !== publishTime);
  return { media, publishTime };
}

export function formatHotspotSourceLine(material: Pick<Material, "source" | "tags">) {
  const { media, publishTime } = getHotspotMaterialMeta(material);
  const linkLabel = formatMaterialSource(material.source);
  const parts: string[] = [];

  if (media && media !== linkLabel) parts.push(media);
  else if (linkLabel && linkLabel !== EASTMONEY_SOURCE_LABEL) parts.push(linkLabel);
  else parts.push(EASTMONEY_SOURCE_LABEL);

  if (publishTime) parts.push(publishTime);
  return parts.join(" · ");
}

export function cleanHotspotTitle(title?: string) {
  if (!title?.trim()) return "财经热点";
  return title
    .replace(/\s*[-|｜]\s*.+$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 72);
}

export function cleanHotspotSnippet(raw?: string, maxLen = 100) {
  if (!raw?.trim()) return "";

  let text = raw
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[#*_>`[\]()]/g, " ")
    .replace(/\bSubject:\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const chineseMatch = text.match(/[\u4e00-\u9fff0-9，。！？、：；""''（）【】《》…—\-·\s]{12,}/);
  if (chineseMatch) {
    text = chineseMatch[0].trim();
  } else if (text.length > maxLen) {
    text = text.slice(0, maxLen).trim();
  }

  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen).trim()}…`;
}

const HOTSPOT_BODY_GARBAGE_PATTERNS = [
  /MySQL|PostgreSQL|SQL查询|CONCAT\(|COALESCE\(/i,
  /NULL与空字符串|ArcGIS|OceanBase|ITPUB|php中文网/i,
  /^\s*\|/,
  /SELECT\s+|INSERT\s+/i,
];

/** 判断东财摘要是否可作为市场分析的事实依据 */
export function isUsableHotspotBody(text?: string) {
  const trimmed = String(text || "").trim();
  if (!trimmed || trimmed.startsWith("{") || trimmed.includes('"columns"')) return false;
  if (HOTSPOT_BODY_GARBAGE_PATTERNS.some((pattern) => pattern.test(trimmed))) return false;
  const chineseCount = (trimmed.match(/[\u4e00-\u9fff]/g) || []).length;
  return chineseCount >= 20;
}

/** 清洗后写入 Material.body，供角度/正文 Prompt 使用（UI 可不展示） */
export function buildHotspotMaterialBody(raw?: string, maxLen = 320) {
  if (!raw?.trim()) return "";
  const cleaned = cleanHotspotSnippet(raw, maxLen);
  return isUsableHotspotBody(cleaned) ? cleaned : "";
}

const LOW_QUALITY_TITLE_PATTERNS = [
  /日报$/,
  /^每日热点/,
  /^(科技|财经|AI|数码|产业)(科技|财经|AI|数码|财经)*日报$/,
  /^(早报|晚报|午间报|收盘|开盘)点评?$/,
  /ITPUB|php中文网|_博客|博客_/,
  /^热点(速递|合集|精选)/,
];

/** 是否为有信息量的新闻标题（排除 XX日报、聚合页名） */
export function isSubstantiveHotspotTitle(title?: string) {
  const t = String(title || "").trim();
  if (t.length < 12) return false;
  if (LOW_QUALITY_TITLE_PATTERNS.some((pattern) => pattern.test(t))) return false;
  const hasEventSignal =
    /发布|印发|宣布|涨|跌|突破|调整|警告|调查|合作|上市|改革|会议|讲话|方案|政策|数据|沪指|创业板|科创|芯片|半导体|AI|人工智能|央行|国务院|证监会|部门|公司|集团|股份|表示|称|披露|报告|显示|预计|推出|启动|落地/.test(
      t,
    );
  return hasEventSignal || t.length >= 22;
}

export function scoreHotspotMaterialQuality(item: Pick<Material, "title" | "body">) {
  let score = 0;
  if (isUsableHotspotBody(item.body)) score += 6;
  if (isSubstantiveHotspotTitle(item.title)) score += 4;
  if (LOW_QUALITY_TITLE_PATTERNS.some((pattern) => pattern.test(item.title || ""))) score -= 12;
  if (!item.body?.trim() && !isSubstantiveHotspotTitle(item.title)) score -= 5;
  return score;
}

export function isAcceptableHotspotMaterial(item: Pick<Material, "title" | "body">) {
  return scoreHotspotMaterialQuality(item) > 0;
}

/** 过滤东财搜索里的聚合页/日报/无摘要垃圾条目 */
export function filterHotspotQuality<T extends Pick<Material, "title" | "body">>(items: T[]): T[] {
  const accepted = items.filter(isAcceptableHotspotMaterial);
  if (accepted.length >= 3) return accepted;

  return items
    .map((item) => ({ item, score: scoreHotspotMaterialQuality(item) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}

/** 同一 URL/标题在多次搜索间保持稳定，避免勾选状态丢失 */
export function buildHotspotMaterialId(source: string | undefined, title: string): string {
  if (source?.startsWith("http")) {
    try {
      const url = new URL(source);
      const slug = `${url.hostname}${url.pathname}`
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 56);
      if (slug) return `hotspot_${slug}`;
    } catch {
      // fall through
    }
  }
  const titleSlug = title
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]/g, "")
    .slice(0, 48);
  return `hotspot_${titleSlug || "item"}`;
}

export function isSameHotspotMaterial(a: Pick<Material, "id" | "source" | "title">, b: Pick<Material, "id" | "source" | "title">) {
  if (a.id && b.id && a.id === b.id) return true;
  if (a.source && b.source && a.source.startsWith("http") && a.source === b.source) return true;
  return a.title.trim() === b.title.trim() && Boolean(a.title.trim());
}
