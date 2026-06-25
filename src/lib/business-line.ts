import type { BusinessLine, BriefInput, ContentType } from "@/lib/types";

export interface BusinessLineContentType {
  value: ContentType;
  label: string;
  description: string;
  needHotspot: boolean;
  recommended?: boolean;
  materialHint: string;
}

export interface BusinessLinePreset {
  id: BusinessLine;
  label: string;
  shortLabel: string;
  brandName: string;
  positioning: string;
  defaultContentType: ContentType;
  defaultTopic: string;
  defaultTargetUser: string;
  campaignGoal: string;
  targetUserOptions: string[];
  contentTypes: BusinessLineContentType[];
}

const WEISEC_CONTENT_TYPES: BusinessLineContentType[] = [
  {
    value: "brand-seed",
    label: "品牌种草类",
    description: "腾讯微证券小程序功能体验与信息整理，强调工具辅助而非交易指令。",
    needHotspot: false,
    recommended: true,
    materialHint: "可不填素材；补充用户洞察或竞品摘要有助于细化种草角度。",
  },
  {
    value: "stock-tutorial",
    label: "看盘入门类",
    description: "看盘、盯盘、术语与公开信息阅读，讲「怎么理解」不讲「买什么」。",
    needHotspot: false,
    materialHint: "可不填素材；可粘贴用户常见疑问或术语列表。",
  },
  {
    value: "hotspot-analysis",
    label: "热点分析类",
    description: "结合行情、政策或公告做降维解读，区分事实、观点与推测。",
    needHotspot: true,
    materialHint: "建议补充热点素材：可搜索或粘贴新闻、公告摘要。",
  },
  {
    value: "personal-exp",
    label: "个人经验类",
    description: "通勤看盘、收盘复盘、避坑心得等生活化投资信息场景。",
    needHotspot: false,
    materialHint: "可不填素材；真实场景描述会让口吻更自然。",
  },
];

const LICAITONG_CONTENT_TYPES: BusinessLineContentType[] = [
  {
    value: "finance-tips",
    label: "理财干货类",
    description: "基金认知、风险等级、流动性与定投框架，先风险后收益。",
    needHotspot: false,
    recommended: true,
    materialHint: "可不填素材；可粘贴新手常见误区或术语疑问。",
  },
  {
    value: "brand-seed",
    label: "品牌种草类",
    description: "理财通入口、产品浏览筛选、定投与持有管理，强调清楚比较而非推荐购买。",
    needHotspot: false,
    materialHint: "可不填素材；生活场景（工资到账、月末复盘）有助于种草表达。",
  },
  {
    value: "personal-exp",
    label: "个人经验类",
    description: "工资理财、家庭账本、长期规划等真实生活记录。",
    needHotspot: false,
    materialHint: "可不填素材；个人场景片段可提升可信度。",
  },
  {
    value: "stock-tutorial",
    label: "理财入门教程",
    description: "基金术语、风险等级、流动性与常见误解，用日常语言讲清概念。",
    needHotspot: false,
    materialHint: "可不填素材；一个具体术语或误解案例即可作为主题切入点。",
  },
];

export const BUSINESS_LINE_PRESETS: Record<BusinessLine, BusinessLinePreset> = {
  weisec: {
    id: "weisec",
    label: "腾讯微证券",
    shortLabel: "微证券",
    brandName: "腾讯微证券",
    positioning: "敏捷、清醒、懂市场但不带节奏的证券信息助手",
    defaultContentType: "brand-seed",
    defaultTopic: "腾讯微证券小程序如何帮助投资小白做日常盯盘",
    defaultTargetUser: "投资小白",
    campaignGoal: "内容种草和功能认知",
    targetUserOptions: ["投资小白", "忙碌上班族", "热点关注者", "微信高频用户", "轻量理财用户"],
    contentTypes: WEISEC_CONTENT_TYPES,
  },
  licaitong: {
    id: "licaitong",
    label: "腾讯理财通",
    shortLabel: "理财通",
    brandName: "腾讯理财通",
    positioning: "可靠、清楚、克制的日常理财助手",
    defaultContentType: "finance-tips",
    defaultTopic: "微信理财通里，新手怎么比较基金和查看风险等级",
    defaultTargetUser: "理财新手",
    campaignGoal: "理财认知与产品功能介绍",
    targetUserOptions: ["理财新手", "职场储蓄入门者", "家庭稳健规划者", "轻量理财用户", "微信高频用户"],
    contentTypes: LICAITONG_CONTENT_TYPES,
  },
};

export function getBusinessLinePreset(line?: BusinessLine) {
  return BUSINESS_LINE_PRESETS[line || "weisec"];
}

export function getContentTypesForLine(line?: BusinessLine) {
  return getBusinessLinePreset(line).contentTypes;
}

export function getContentTypeConfig(line: BusinessLine, contentType: ContentType) {
  return getContentTypesForLine(line).find((item) => item.value === contentType);
}

export function getContentTypeLabel(line: BusinessLine, contentType: ContentType) {
  return getContentTypeConfig(line, contentType)?.label || contentType;
}

export function isContentTypeAllowed(line: BusinessLine, contentType: ContentType) {
  return getContentTypesForLine(line).some((item) => item.value === contentType);
}

export function normalizeBusinessLine(value: unknown): BusinessLine {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "licaitong" || raw === "lct" || raw === "理财通") return "licaitong";
  return "weisec";
}

export function featureMatchesBusinessLine(feature: { businessLine?: string }, line: BusinessLine) {
  const featureLine = String(feature.businessLine || "all").toLowerCase();
  return featureLine === "all" || featureLine === line;
}

export function applyBusinessLineToBrief(brief: BriefInput, line: BusinessLine): BriefInput {
  const preset = getBusinessLinePreset(line);
  return {
    ...brief,
    businessLine: line,
    contentType: preset.defaultContentType,
    topic: preset.defaultTopic,
    targetUser: preset.defaultTargetUser,
    campaignGoal: preset.campaignGoal,
    selectedFeatureIds: [],
    selectedFeatureNames: [],
  };
}

export function normalizeBriefForBusinessLine(brief: BriefInput): BriefInput {
  const line = normalizeBusinessLine(brief.businessLine);
  const preset = getBusinessLinePreset(line);
  const contentType = isContentTypeAllowed(line, brief.contentType) ? brief.contentType : preset.defaultContentType;
  return {
    ...brief,
    businessLine: line,
    contentType,
    targetUser: preset.targetUserOptions.includes(brief.targetUser) ? brief.targetUser : preset.defaultTargetUser,
  };
}
