import type { BriefInput, BusinessLine } from "@/lib/types";

export interface TagStrategyRuntimeContext {
  businessLine: BusinessLine;
  offerId?: string;
  selectedFeatureIds?: string[];
  audienceTag?: string;
  targetUser?: string;
  embedLevel?: BriefInput["embedLevel"];
}

interface TagLineConfig {
  core: string[];
  brand: string[];
  offers: Record<string, string[]>;
  features: Record<string, string[]>;
}

const LINE_TAGS: Record<BusinessLine, TagLineConfig> = {
  weisec: {
    core: ["理财", "股票入门", "新手炒股", "炒股工具"],
    brand: ["微证券", "腾讯微证券", "微信炒股"],
    offers: {},
    features: {
      wzq_wechat_alerts: ["股价提醒", "微信提醒"],
      wzq_yuanbao_ai: ["AI财经助手", "金融黑话"],
      wzq_hot_rankings: ["股市热点", "热股榜"],
      wzq_news_digest: ["财经资讯", "股市复盘"],
      wzq_wechat_trading: ["炒股工具", "微信看盘"],
    },
  },
  licaitong: {
    core: ["理财", "理财小白", "资产配置", "稳健理财"],
    brand: ["理财通", "腾讯理财通", "微信理财"],
    offers: {
      "fixed-income-plus": ["固收加", "资产配置"],
    },
    features: {},
  },
};

function cleanTag(value: unknown) {
  return String(value || "")
    .replace(/^#+/, "")
    .replace(/\s+/g, "")
    .trim()
    .slice(0, 18);
}

function unique(items: string[]) {
  return [...new Set(items.map(cleanTag).filter(Boolean))];
}

function audienceTag(context: TagStrategyRuntimeContext) {
  const mapped: Record<string, string> = {
    student: "学生理财",
    mama: "家庭理财",
    "white-collar": "打工人理财",
  };
  if (context.audienceTag && mapped[context.audienceTag]) return mapped[context.audienceTag];
  const target = cleanTag(context.targetUser);
  if (!target) return "理财小白";
  if (target.includes("学生")) return "学生理财";
  if (target.includes("宝妈") || target.includes("家庭")) return "家庭理财";
  if (target.includes("白领") || target.includes("职场")) return "打工人理财";
  return target.length <= 8 ? target : "理财小白";
}

/**
 * 对模型标签做最后一道业务约束：保留主题词，同时确保 Offer/功能/品牌标签不被泛话题挤掉。
 */
export function buildProductAwareTags(
  modelTags: unknown[],
  context: TagStrategyRuntimeContext,
): string[] {
  const line = LINE_TAGS[context.businessLine];
  const pureContent = context.embedLevel === "none";
  const topicTags = unique(modelTags.map(String)).filter(
    (tag) => !line.brand.includes(tag),
  );
  const offerTags = pureContent || !context.offerId ? [] : line.offers[context.offerId] || [];
  const featureTags = pureContent
    ? []
    : (context.selectedFeatureIds || []).flatMap((id) => line.features[id] || []);
  const brandTags = pureContent ? [] : line.brand;

  const required = unique([
    ...line.core.slice(0, 2),
    ...topicTags.slice(0, pureContent ? 4 : 2),
    audienceTag(context),
    ...offerTags.slice(0, 2),
    ...featureTags.slice(0, 2),
    ...brandTags,
  ]);
  const fillers = unique([...topicTags, ...line.core, ...offerTags, ...featureTags]);
  const targetCount = pureContent ? 8 : 10;

  return unique([...required, ...fillers]).slice(0, targetCount);
}
