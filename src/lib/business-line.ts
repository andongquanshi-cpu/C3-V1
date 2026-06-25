import type { BusinessLine, BriefInput } from "@/lib/types";

export interface BusinessLinePreset {
  id: BusinessLine;
  label: string;
  shortLabel: string;
  brandName: string;
  positioning: string;
  defaultTopic: string;
  defaultTargetUser: string;
  campaignGoal: string;
  targetUserOptions: string[];
}

export const BUSINESS_LINE_PRESETS: Record<BusinessLine, BusinessLinePreset> = {
  weisec: {
    id: "weisec",
    label: "腾讯微证券",
    shortLabel: "微证券",
    brandName: "腾讯微证券",
    positioning: "敏捷、清醒、懂市场但不带节奏的证券信息助手",
    defaultTopic: "腾讯微证券小程序如何帮助投资小白做日常盯盘",
    defaultTargetUser: "投资小白",
    campaignGoal: "内容种草和功能认知",
    targetUserOptions: ["投资小白", "忙碌上班族", "热点关注者", "微信高频用户", "轻量理财用户"],
  },
  licaitong: {
    id: "licaitong",
    label: "腾讯理财通",
    shortLabel: "理财通",
    brandName: "腾讯理财通",
    positioning: "可靠、清楚、克制的日常理财助手",
    defaultTopic: "微信理财通里，新手怎么比较基金和查看风险等级",
    defaultTargetUser: "理财新手",
    campaignGoal: "理财认知与产品功能介绍",
    targetUserOptions: ["理财新手", "职场储蓄入门者", "家庭稳健规划者", "轻量理财用户", "微信高频用户"],
  },
};

export function getBusinessLinePreset(line?: BusinessLine) {
  return BUSINESS_LINE_PRESETS[line || "weisec"];
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
    topic: preset.defaultTopic,
    targetUser: preset.defaultTargetUser,
    campaignGoal: preset.campaignGoal,
    selectedFeatureIds: [],
    selectedFeatureNames: [],
  };
}
