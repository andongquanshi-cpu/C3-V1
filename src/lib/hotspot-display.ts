import type { Material } from "@/lib/types";

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
  "36kr.com": "36氪",
  "gov.cn": "中国政府网",
  "pbc.gov.cn": "人民银行",
  "csrc.gov.cn": "证监会",
};

export const HOTSPOT_TAB_DOMAINS: Partial<Record<string, string[]>> = {
  finance: [
    "wallstreetcn.com",
    "cls.cn",
    "eastmoney.com",
    "yicai.com",
    "caixin.com",
    "stcn.com",
    "cnstock.com",
    "jiemian.com",
  ],
  policy: ["gov.cn", "pbc.gov.cn", "csrc.gov.cn", "yicai.com", "caixin.com", "cls.cn"],
  fund: ["eastmoney.com", "hexun.com", "yicai.com", "cls.cn", "caixin.com"],
  equity: ["eastmoney.com", "cls.cn", "stcn.com", "cnstock.com", "wallstreetcn.com", "yicai.com", "hexun.com"],
};

export function formatMaterialSource(source?: string) {
  if (!source || source === "Tavily") return "";
  if (source === "手动输入") return "手动粘贴";

  try {
    const url = source.startsWith("http") ? source : `https://${source}`;
    const host = new URL(url).hostname.replace(/^www\./, "");
    return CN_SOURCE_LABELS[host] || host;
  } catch {
    return "";
  }
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
    .replace(/Daily Briefing[^.!?。！？]*[.!?。！？]?/gi, " ")
    .replace(/Get ready for your day[^.!?。！？]*[.!?。！？]?/gi, " ")
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

export function normalizeHotspotFromTavily(item: {
  title?: string;
  content?: string;
  snippet?: string;
  url?: string;
}): Pick<Material, "title" | "body" | "source"> {
  const rawBody = item.snippet || item.content || "";
  return {
    title: cleanHotspotTitle(item.title),
    body: cleanHotspotSnippet(rawBody, 120),
    source: item.url || "",
  };
}

export function buildHotspotSearchQuery(tab: string, _topic?: string, customQuery?: string, businessLine?: string) {
  // 热点搜索用短 query，不用 Step1 整段主题（太长会导致 0 结果）
  switch (tab) {
    case "finance":
      return businessLine === "weisec" ? "今日 中国 A股 股市 财经 热点" : "今日 中国 A股 财经 市场 热点";
    case "policy":
      return businessLine === "weisec"
        ? "中国 证监会 证券 监管 政策 央行"
        : "中国 金融 政策 监管 央行 理财";
    case "fund":
      return "中国 基金 固收 债券 理财通 热点";
    case "equity":
      return "中国 A股 股市 行情 板块 热点";
    case "custom":
      return (customQuery || (businessLine === "weisec" ? "中国 A股 财经 热点" : "中国 理财 财经 热点")).trim();
    default:
      return businessLine === "weisec" ? "中国 A股 财经 热点" : "中国 财经 热点";
  }
}

export function buildHotspotSearchFallbackQuery(tab: string, customQuery?: string, businessLine?: string) {
  switch (tab) {
    case "finance":
      return businessLine === "weisec" ? "China A-share stock market news today" : "China finance stock market news today";
    case "policy":
      return businessLine === "weisec"
        ? "China CSRC securities regulation policy"
        : "China central bank financial regulation policy";
    case "fund":
      return "China fund bond fixed income wealth management";
    case "equity":
      return "China A-share stock market sector hotspot";
    case "custom":
      return customQuery || (businessLine === "weisec" ? "China stock market news" : "China finance news");
    default:
      return businessLine === "weisec" ? "China stock market news" : "China finance news";
  }
}
