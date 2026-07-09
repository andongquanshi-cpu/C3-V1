import type { Material } from "@/lib/types";
import { cleanHotspotTitle, buildHotspotMaterialBody, filterHotspotQuality } from "@/lib/hotspot-display";

export const EASTMONEY_NEWS_SEARCH_URL = "https://mkapi2.dfcfs.com/finskillshub/api/claw/news-search";

export const EASTMONEY_SOURCE_LABEL = "东方财富妙想";

const EASTMONEY_ERROR_MESSAGES: Record<number, string> = {
  113: "东财 API 今日调用次数已达上限，请明日再试或更换 Key",
  114: "东财 API Key 无效或已过期，请到妙想 Skills 平台重新领取并更新 EASTMONEY_API_KEY",
  115: "未配置东财 API Key",
  116: "东财 API Key 不存在，请检查 EASTMONEY_API_KEY",
};

export interface EastMoneyNewsItem {
  title?: string;
  trunk?: string;
  url?: string;
  source?: string;
  publishTime?: string;
  secuList?: Array<{ secuCode?: string; secuName?: string; secuType?: string }>;
}

function isNewsItem(value: unknown): value is EastMoneyNewsItem {
  if (!value || typeof value !== "object") return false;
  const item = value as EastMoneyNewsItem;
  return Boolean(item.title?.trim() || item.trunk?.trim());
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.map((v) => String(v || "").trim()).filter(Boolean))];
}

export function buildEastMoneySearchQueries(
  tab: string,
  topic?: string,
  customQuery?: string,
  businessLine?: string,
) {
  const t = topic?.trim().slice(0, 60);
  const line = businessLine === "weisec" ? "weisec" : "licaitong";

  /** 语义搜索：query 要具体事件向，避免「XX热榜」返回聚合日报 */
  switch (tab) {
    case "trending":
    case "finance":
      return unique([
        line === "weisec"
          ? "今日A股市场重大事件与政策新闻"
          : "今日宏观经济政策与金融市场重大新闻",
      ]);
    case "tech":
      return unique([
        "今日半导体芯片人工智能行业重大新闻",
        "今日科技政策与科技创新重大事件",
      ]);
    case "policy":
      return unique(["今日国务院部委财经政策发布新闻"]);
    case "fund":
      return unique(["今日基金行业政策与市场重大新闻"]);
    case "sector":
    case "equity":
      return unique(["今日A股板块异动与行业重大新闻"]);
    case "custom":
      return unique([
        customQuery?.trim() ? `${customQuery.trim()} 最新重大新闻` : null,
        t ? `${t} 最新相关新闻` : null,
        line === "weisec" ? "今日A股重大财经新闻" : "今日宏观财经重大新闻",
      ]).slice(0, 2);
    default:
      return unique([t ? `${t} 最新相关新闻` : "今日财经重大新闻"]).slice(0, 1);
  }
}

export function parseEastMoneyNewsResponse(payload: unknown): EastMoneyNewsItem[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;

  if (root.success === false) {
    const code = Number(root.code ?? root.status);
    const message = EASTMONEY_ERROR_MESSAGES[code] || String(root.message || "东财资讯搜索失败");
    throw new Error(message);
  }

  const candidates: unknown[] = [];
  const data = root.data ?? root.result ?? root;

  if (Array.isArray(data)) {
    candidates.push(...data);
  } else if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    for (const key of ["list", "items", "newsList", "records", "data"]) {
      if (Array.isArray(record[key])) {
        candidates.push(...(record[key] as unknown[]));
      }
    }
    if (!candidates.length && isNewsItem(record)) {
      candidates.push(record);
    }
  }

  if (!candidates.length && isNewsItem(root)) {
    candidates.push(root);
  }

  return candidates.filter(isNewsItem);
}

/** 理财通：压低个股公告；财经热搜偏宏观/政策，基金内容留给「基金热榜」Tab */
const LICAITONG_STOCK_PATTERNS = [
  /[（(]?\d{6}[)）]?/,
  /涨停|跌停|连板|封板|拉升|异动/,
  /增持|减持|股东|董秘|业绩预告|业绩预增|扭亏|定增|回购股份|股东会|临时公告|董事会|监事会/,
  /IPO|上市首日|打新|中签|招股/,
  /被立案|被处罚|违规|停牌|复牌|退市/,
  /股价|个股|龙头股份|概念股走强/,
];

const LICAITONG_MACRO_POLICY_PATTERNS = [
  /央行|降准|降息|LPR|货币政策|外汇|汇率|国债|债券|利率|MLF/,
  /宏观|GDP|CPI|PPI|PMI|通胀|通缩|就业|进出口|社融/,
  /国务院|发改委|财政部|监管|证监会|银保监|金融监管|指导意见/,
  /碳达峰|碳中和|十五五|政策|法规|行动方案/,
  /美联储|全球经济|国际油价|黄金|大宗|地缘/,
  /理财|资管|储蓄|存款|保险/,
];

const LICAITONG_FUND_PRODUCT_PATTERNS = [
  /基金.*净值|净值.*基金|债基|货基|FOF|ETF联接/,
  /基金经理|重仓|申购|赎回|分红|规模.*亿/,
  /^\S*基金[：:]/,
];

export function scoreLicaitongHotspot(
  item: Pick<Material, "title" | "body">,
  tab: string = "trending",
) {
  const text = `${item.title || ""} ${item.body || ""}`;
  let score = 0;

  for (const pattern of LICAITONG_MACRO_POLICY_PATTERNS) {
    if (pattern.test(text)) score += 2;
  }

  if (tab === "fund") {
    for (const pattern of LICAITONG_FUND_PRODUCT_PATTERNS) {
      if (pattern.test(text)) score += 2;
    }
  } else {
    for (const pattern of LICAITONG_FUND_PRODUCT_PATTERNS) {
      if (pattern.test(text)) score -= 2;
    }
    if (/基金/.test(text) && !/政策|监管|改革|办法|规定/.test(text)) score -= 1;
  }

  for (const pattern of LICAITONG_STOCK_PATTERNS) {
    if (pattern.test(text)) score -= 3;
  }

  return score;
}

export function filterHotspotForBusinessLine<T extends Pick<Material, "title" | "body">>(
  items: T[],
  businessLine?: string,
  tab: string = "trending",
): T[] {
  const qualityFirst = filterHotspotQuality(items);
  if (businessLine === "weisec") return qualityFirst;

  const scored = qualityFirst.map((item) => ({ item, score: scoreLicaitongHotspot(item, tab) }));
  const preferred = scored.filter(({ score }) => score >= 0).map(({ item }) => item);
  if (preferred.length >= 3) return preferred;

  return scored.sort((a, b) => b.score - a.score).map(({ item }) => item);
}

export function normalizeHotspotFromEastMoney(
  item: EastMoneyNewsItem,
): Pick<Material, "title" | "body" | "source" | "tags"> {
  const fallbackTitle = item.title?.trim() || "财经资讯";
  const media = item.source?.trim();
  const secuHint = (item.secuList || [])
    .slice(0, 3)
    .map((sec) => sec.secuName)
    .filter(Boolean)
    .join("、");

  const bodyParts = [
    buildHotspotMaterialBody(item.trunk, 360),
    secuHint ? `关联标的：${secuHint}` : null,
    item.publishTime?.trim() ? `时间：${item.publishTime.trim()}` : null,
  ].filter(Boolean);

  const tags = ["热点"];
  if (media) tags.push(media);
  if (item.publishTime?.trim()) tags.push(item.publishTime.trim());

  const source = item.url?.startsWith("http")
    ? item.url
    : media && media !== EASTMONEY_SOURCE_LABEL
      ? media
      : EASTMONEY_SOURCE_LABEL;

  return {
    title: cleanHotspotTitle(fallbackTitle),
    body: bodyParts.join("\n"),
    source,
    tags,
  };
}

export function dedupeHotspotMaterials<T extends { title?: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = String(item.title || "").trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
